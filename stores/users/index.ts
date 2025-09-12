// store/organization/index.ts

import { defineStore } from 'pinia'
import type {
  OrganizationState,
  OrganizationUser,
  Organization,
  OrganizationResponse,
} from './types'

import { handleError, handleSuccess, extractErrors } from '../../utils/apiHandler'
import { handleAuthError as handleAuthErrorShared } from '~/composables/useAuthError'

export const useUsersStore = defineStore('usersStore', {
  state: (): OrganizationState => ({
    loading: true,
    error: null,
    users: [],
    roles: [],
    userLoading: false,
    userError: null,
  }),

  getters: {
    isLoading: (state): boolean => state.loading,
    getError: (state): string | null => state.error,
    getRoles: (state) => state.roles,
    getUsers: (state) => state.users,
    isUserLoading: (state) => state.userLoading,
    getUserError: (state): string | null => state.userError,
  },

  actions: {

    mapOrganization(org: OrganizationResponse): Organization {
      return {
        id: org.org_id,
        name: org.org_name,
        docs_uploaded: org.docs_uploaded,
        users_count: org.users_count,
        total_tokens: org.total_tokens,
        org_plan: [
          {
            name: org.name,
            expire_at: org.expire_at,
            status: org.status,
          },
        ],
      }
    },

    // small helper for token headers
    getAuthHeaders(extra: Record<string, string> = {}) {
      let token: string | null = null
      if (process.client) {
        token = localStorage.getItem('authToken')
      }
      if (!token) {
        const authCookie = useCookie('authToken')
        token = authCookie.value || null
      }

      return {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extra,
      }
    },

    async handleAuthError(err: any): Promise<boolean> {
      return await handleAuthErrorShared(err)
    },

    async fetchRoles() {
      this.loading = true
      try {
        const data = await $fetch<{ data: any[] }>('/api/users/roles', {
          headers: this.getAuthHeaders(),
        })
        this.roles = data.data || []
      } catch (err: any) {
        console.error('Fetch roles error:', err)

        if (!this.handleAuthError(err)) {
          this.userError = handleError(err, 'Failed to fetch roles')
        }
      } finally {
        this.loading = false
      }
    },

    async fetchUsers() {
      this.userLoading = true
      try {
        const data = await $fetch<{ data: OrganizationUser[] }>('/api/users/all', {
          headers: this.getAuthHeaders(),
        })
        this.users = data.data || []
      } catch (err: any) {
        console.error('Fetch users error:', err)
        if (!this.handleAuthError(err)) {
          this.userError = handleError(err, 'Failed to fetch users')
        }
      } finally {
        this.userLoading = false
      }
    },

    async createUser(user: Partial<OrganizationUser>) {
      this.loading = true
      try {
        const response = await $fetch<{ status?: boolean; message?: string; errors?: any[] }>(
          '/api/users/create',
          {
            method: 'POST',
            body: user,
            headers: this.getAuthHeaders(),
          }
        )

        // If API explicitly returns failure (like status: 'error' or status === false)
        if (response?.status === false || response?.status === 'error') {
          const message = response.message || 'Error creating user'
          this.userError = message
          // Show the API message directly
          handleError({ response: { _data: { message } } }, message)
          return { success: false, message, errors: response.errors || [] }
        }

        handleSuccess('User added successfully!')
        return { success: true, message: 'User added successfully!' }
      } catch (err: any) {
        const isAuthError = await this.handleAuthError(err)
        if (isAuthError) {
          return { success: false, message: 'Unauthorized', errors: [] }
        }

        const message = handleError(err, 'Error creating user')
        this.userError = message
        return {
          success: false,
          message,
          errors:
            extractErrors(err),
        }
      } finally {
        this.loading = false
      }
    },

    async editUser(id: string, user: Partial<OrganizationUser>, silent = false) {
      try {
        const response = await $fetch<{ status?: boolean; message?: string; errors?: any[] }>(
          `/api/users/${id}`,
          {
            method: 'PUT',
            body: user,
            headers: this.getAuthHeaders(),
          }
        )

        // If API explicitly returns failure (e.g., status: 'error' or status === false)
        if (response?.status === false || response?.status === 'error') {
          const message = response.message || 'Error editing user'
          this.userError = message
          handleError({ response: { _data: { message } } }, message)
          return { success: false, message, errors: response.errors || [] }
        }

        if (!silent) handleSuccess('User edited successfully!')
        return { success: true, message: 'User edited successfully!' }
      } catch (err: any) {
        const isAuthError = await this.handleAuthError(err)
        if (isAuthError) {
          return { success: false, message: 'Unauthorized', errors: [] }
        }

        const message = handleError(err, 'Error editing user')
        this.userError = message
        return {
          success: false,
          message,
          errors:
            extractErrors(err),
        }
      }
    },

    async deleteUser(id: string) {
      try {
        await $fetch(`/api/users/${id}`, {
          method: 'DELETE',
          headers: this.getAuthHeaders(),
        })

        handleSuccess('User deleted successfully!')
      } catch (err: any) {
        if (!this.handleAuthError(err)) {
          this.userError = handleError(err, 'Error deleting user')
        }
      }
    },

    // Activate or deactivate a user (soft toggle using is_active column)
    async setUserActive(id: string, isActive: boolean) {
      try {
        const response = await $fetch<{ status: string; message?: string; data?: any }>(
          `/api/users/${id}/status`,
          {
            method: 'POST',
            body: { is_active: isActive },
            headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
          }
        )

        // Update local state if present
        const idx = this.users.findIndex((u: any) => String(u.user_id) === String(id) || String((u as any).id) === String(id))
        if (idx !== -1) {
          // Ensure we keep object reactivity and update status string
          this.users[idx] = { ...this.users[idx], is_active: isActive, status: isActive ? 'active' : 'inactive' }
        }

        handleSuccess(response.message || `User ${isActive ? 'activated' : 'deactivated'} successfully`)
        return { success: true, message: response.message || '' }
      } catch (err: any) {
        if (await this.handleAuthError(err)) {
          return { success: false, message: 'Unauthorized' }
        }
        const message = handleError(err, 'Error updating user status')
        this.userError = message
        return { success: false, message }
      }
    },

    async toggleUserActive(id: string) {
      // Toggle based on local state if available, otherwise fetch users first
      let user = this.users.find((u: any) => String(u.user_id) === String(id) || String((u as any).id) === String(id))
      if (!user) {
        await this.fetchUsers()
        user = this.users.find((u: any) => String(u.user_id) === String(id) || String((u as any).id) === String(id))
        if (!user) return { success: false, message: 'User not found' }
      }

      return await this.setUserActive(id, !user.is_active)
    },

    async createBulkUsers(jsonData: OrganizationUser) {
      this.userLoading = true
      try {
        const data = await $fetch<{
          status: boolean
          message: string
          errors?: any[]
        }>('/api/users/bulk-users', {
          method: 'POST' as any,
          body: jsonData,
          headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        })

        handleSuccess('Bulk users added successfully!')

        return { status: data.status, message: data.message, errors: data.errors || [] }
      } catch (err: any) {
        if (!this.handleAuthError(err)) {
          const message = handleError(err, 'Error uploading bulk users')
          return { status: false, message, errors: extractErrors(err) }
        }
        return { status: false, message: 'Unauthorized', errors: [] }
      } finally {
        this.userLoading = false
      }
    },

    async uploadAndValidateJson(jsonData: OrganizationUser) {
      this.userLoading = true
      try {
        const data = await $fetch<{
          status: boolean
          message: string
          data?: any
          errors?: any[]
        }>('/api/users/upload-json', {
          method: 'POST',
          body: jsonData,
          headers: this.getAuthHeaders({ 'Content-Type': 'application/json' }),
        })

        return {
          status: data.status,
          message: data.message,
          data: data.data || null,
          errors: data.errors || [],
        }
      } catch (err: any) {
        // 🔎 If it's a validation error (422), unwrap and return cleanly
        if (err?.response?.status === 422 && err?.response?._data) {
          const data = err.response._data
          return {
            status: false,
            message: data.message || 'Validation failed',
            data: null,
            errors: data.errors || [],
          }
        }

        if (this.handleAuthError(err)) {
          return { status: false, message: 'Unauthorized', errors: [] }
        }

        const message = handleError(err, 'Error validating JSON')
        return { status: false, message, errors: [] }
      } finally {
        this.userLoading = false
      }
    },
  },
})
