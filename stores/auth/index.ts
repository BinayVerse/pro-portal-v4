import type { AuthUser, ApiResponse } from "./types";
import { handleError, handleSuccess, extractErrors } from '../../utils/apiHandler'
import { handleAuthError as handleAuthErrorShared, clearAuth } from '~/composables/useAuthError'

export const useAuthStore = defineStore("authStore", {
  state: () => ({
    user: null as AuthUser | null,
    token: null as string | null,
    loading: false,
    error: null as string | null,
    initialized: false,
  }),

  getters: {
    isLoggedIn: (state) => !!state.user && !!state.token,
    isAuthenticated: (state) => !!state.user && !!state.token,
    isAdmin: (state) => state.user?.role_id === 1,
    getAuthUser(state) {
      return state.user || null
    },
  },

  actions: {
    // Helper methods
    setLoading(status: boolean) {
      this.loading = status;
    },

    setError(error: string | null) {
      this.error = error;
    },

    async handleAuthError(err: any): Promise<boolean> {
      return await handleAuthErrorShared(err)
    },

    handleError(error: any, fallbackMessage: string, silent: boolean = false): string {
      return handleError(error, fallbackMessage, silent)
    },


    setAuthUser(user: AuthUser | null, token?: string | null) {
      this.user = user;
      this.token = token || null;

      if (process.client) {
        if (user && token) {
          localStorage.setItem("authUser", JSON.stringify(user));
          localStorage.setItem("authToken", token);
        } else {
          localStorage.removeItem("authUser");
          localStorage.removeItem("authToken");
        }
      }
    },

    // Generic API call handler
    async apiCall<T>(endpoint: string, data?: any): Promise<T> {
      try {
        const response = await $fetch<ApiResponse<T>>(endpoint, {
          method: "POST",
          body: data,
          ignoreResponseError: true,
        });

        if (response?.status === "success") {
          return response.data || response as T;
        }

        // Handle structured error responses
        if (response?.status === "error") {
          const errorMessage = response.message || "Operation failed";
          this.setError(errorMessage);
          throw new Error(errorMessage);
        }

        // Fallback for legacy responses
        const errorMessage = response?.message || "Operation failed";
        this.setError(errorMessage);
        throw new Error(errorMessage);
      } catch (error: any) {
        // Use central handler to extract message and show notification
        const msg = handleError(error, 'An unexpected error occurred')
        this.setError(msg)
        throw new Error(msg)
      }
    },

    // Initialize store from localStorage or cookies
    async initializeAuth() {
      if (this.initialized) return;

      try {
        let user = null;
        let token = null;

        if (process.client) {
          // Client-side: try localStorage first
          const storedUser = localStorage.getItem("authUser");
          const storedToken = localStorage.getItem("authToken");

          if (storedUser && storedToken) {
            try {
              user = JSON.parse(storedUser);
              token = storedToken;
            } catch (e) {
              localStorage.removeItem("authUser");
              localStorage.removeItem("authToken");
            }
          } else {
            // If localStorage doesn't have auth but a cookie exists (SSR set), try reading cookie on client
            const tokenCookie = useCookie('auth-token');
            if (tokenCookie?.value) {
              token = tokenCookie.value;
              try {
                const response = await $fetch('/api/auth/profile', {
                  headers: { Authorization: `Bearer ${token}` },
                });
                if (response?.status === 'success') {
                  user = response.data;
                  // persist to localStorage for subsequent client loads
                  try {
                    localStorage.setItem('authToken', token);
                    localStorage.setItem('authUser', JSON.stringify(user));
                  } catch (e) {
                    // ignore localStorage errors
                  }
                } else {
                  // invalid token in cookie
                  tokenCookie.value = null;
                }
              } catch (err) {
                tokenCookie.value = null;
              }
            }
          }
        } else {
          // Server-side: try cookies
          const tokenCookie = useCookie('auth-token', {
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
          });

          if (tokenCookie.value) {
            token = tokenCookie.value;
            // Validate token and get user info
            try {
              const response = await $fetch('/api/auth/profile', {
                headers: {
                  'Authorization': `Bearer ${token}`
                }
              });

              if (response.status === 'success') {
                user = response.data;
              }
            } catch (error) {
              // Token is invalid, clear it
              tokenCookie.value = null;
            }
          }
        }

        if (user && token) {
          // Validate token before setting auth state
          try {
            const response = await $fetch('/api/auth/profile', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });

            if (response.status === 'success') {
              this.user = user;
              this.token = token;

              // Sync with cookies for SSR
              if (process.client) {
                const tokenCookie = useCookie('auth-token', {
                  secure: true,
                  sameSite: 'lax',
                  maxAge: 60 * 60 * 24 * 7
                });
                tokenCookie.value = token;
              }
            } else {
              await this.clearAuth();
            }
          } catch (error) {
            // Token validation failed
            await this.clearAuth();
          }
        }
      } finally {
        this.initialized = true;
      }
    },

    async clearAuth() {
      this.user = null;
      this.token = null;

      if (process.client) {
        localStorage.removeItem("authUser");
        localStorage.removeItem("authToken");
      }

      const tokenCookie = useCookie('auth-token');
      tokenCookie.value = null;
    },

    // Initialize store from localStorage (legacy support)
    initializeStore() {
      return this.initializeAuth();
    },

    // Auth actions
    async signup(formData: Record<string, any>) {
      this.setLoading(true);
      this.setError(null);

      try {
        await this.apiCall("/api/auth/signup", formData);
        this.setAuthUser(null);
      } finally {
        this.setLoading(false);
      }
    },

    async signIn(credentials: { email: string; password: string }) {
      this.setLoading(true);
      this.setError(null);

      try {
        const response: any = await this.apiCall("/api/auth/signin", credentials);

        if (response.user && response.token) {
          this.setAuthUser(response.user, response.token);

          // Set cookie for SSR
          const tokenCookie = useCookie('auth-token', {
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
          });
          tokenCookie.value = response.token;
        }

        return response;
      } finally {
        this.setLoading(false);
      }
    },

    async googleSignIn(formData: Record<string, any>) {
      this.setLoading(true);
      this.setError(null);

      try {
        const response: any = await this.apiCall("/api/auth/google-signin", formData);

        if (response.user && response.token) {
          this.setAuthUser(response.user, response.token);

          // Set cookie for SSR
          const tokenCookie = useCookie('auth-token', {
            secure: true,
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7
          });
          tokenCookie.value = response.token;
        }

        return {
          status: "success",
          message: response.message || "Sign-in successful!",
          redirect: response.redirect || "/admin/profile",
        };
      } finally {
        this.setLoading(false);
      }
    },

    async resetPassword(formData: Record<string, any>) {
      this.setLoading(true);
      this.setError(null);

      try {
        const response = await this.apiCall("/api/auth/reset-password", formData);
        return response;
      } finally {
        this.setLoading(false);
      }
    },

    async updatePassword(formData: Record<string, any>) {
      this.setLoading(true);
      this.setError(null);

      try {
        const response = await this.apiCall("/api/auth/update-password", formData);
        return response;
      } finally {
        this.setLoading(false);
      }
    },

    async changePassword(formData: Record<string, any>) {
      this.setLoading(true);
      this.setError(null);
      try {
        const token = this.token || useCookie('auth-token')?.value
        const response = await $fetch('/api/auth/change-password', {
          method: 'POST',
          body: formData,
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        return response
      } catch (error) {
        // Handle authentication errors first
        if (!await this.handleAuthError(error)) {
          this.error = handleError(error, 'Failed to change password');
        }
      } finally {
        this.setLoading(false);
      }
    },

    async signOut() {
      try {
        await this.clearAuth();
        await navigateTo("/");
      } catch (error: any) {
        console.error("Error during logout:", error.message);
      }
    },

    async fetchCurrentUser() {
      if (!this.token) return null;

      try {
        const response = await $fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${this.token}`
          }
        });

        if (response.status === 'success') {
          this.user = response.data;
          return response.data;
        } else {
          await this.clearAuth();
          return null;
        }
      } catch (error) {
        await this.clearAuth();
        return null;
      }
    },

    async handlePostLoginRedirect() {
      if (!process.client) return;

      const route = useRoute();
      const redirectTo = (route.query.redirect as string) || '/admin/dashboard';
      await navigateTo(redirectTo);
    },
  },
});
