import type {
  AnalyticsState,
  TokenUsageData,
  AppTokenUsage,
  ApiResponse,
  DocumentAnalysis,
} from './types';
import { handleError, handleSuccess, extractErrors } from '../../utils/apiHandler'
import { handleAuthError as handleAuthErrorShared } from '~/composables/useAuthError'

export const useAnalyticsStore = defineStore('analyticsStore', {
  state: (): AnalyticsState => ({
    loading: false,
    error: null,
    tokenDetails: [],
    appTokenDetails: [],
    orgDocList: [],
    organizationDetails: null,
    orgUserList: [],
    userAppWiseTokenDetail: [] as AppTokenUsage[],
    activeUsersCount: 0,
    totalQueriesCount: 0,
  }),

  getters: {
    isLoading: (state): boolean => state.loading,
    getError: (state): string | null => state.error,
    getTokenDetails: (state): TokenUsageData[] => state.tokenDetails,
    getAppTokenDetails: (state): AppTokenUsage[] => state.appTokenDetails,
    getOrgDocList: (state): DocumentAnalysis[] => state.orgDocList,
    getOrganizationDetails: (state): any | null => state.organizationDetails,
    getOrganizationUsers: (state): any[] => state.orgUserList,
    getUserAppWiseTokenDetail: (state): AppTokenUsage[] => state.userAppWiseTokenDetail,
  },

  actions: {
    handleError(error: any, defaultMessage: string, silent: boolean = false): string {
      const msg = handleError(error, defaultMessage, silent)
      this.error = msg
      return msg
    },

    handleSuccess(message: string): void {
      this.error = null
      handleSuccess(message)
    },

    getAuthHeaders(): Record<string, string> {
      const token = localStorage.getItem('authToken');
      return {
        Authorization: `Bearer ${token}`,
      };
    },

    async fetchTokenWiseDetail(orgId: string, startDate: string, endDate: string, timezone: string) {
      try {
        this.loading = true;
        const response = await $fetch<{ data: TokenUsageData[] }>(
          `/api/analytics/${orgId}/tokenData?startDate=${startDate}&endDate=${endDate}&timezone=${encodeURIComponent(timezone)}`,
          { headers: this.getAuthHeaders() }
        );
        this.tokenDetails = response.data || [];
      } catch (error) {
        if (await handleAuthErrorShared(error)) return;
        this.handleError(error, 'Failed to fetch token details');
      } finally {
        this.loading = false;
      }
    },

    async fetchAppWiseTokenDetail(orgId: string, startDate: string, endDate: string, timezone: string) {
      try {
        this.loading = true;
        const response = await $fetch<{ data: AppTokenUsage[] }>(
          `/api/analytics/${orgId}/appwiseTokenUsage?startDate=${startDate}&endDate=${endDate}&timezone=${encodeURIComponent(timezone)}`,
          { headers: this.getAuthHeaders() }
        );
        this.appTokenDetails = response.data || [];
      } catch (error) {
        if (await handleAuthErrorShared(error)) return;
        this.handleError(error, 'Failed to fetch app token usage');
      } finally {
        this.loading = false;
      }
    },

    async fetchUserAppWiseTokenDetail(orgId: string, startDate: string, endDate: string, timezone: string) {
      try {
        this.loading = true;

        const response = await $fetch<ApiResponse<AppTokenUsage[]>>(
          `/api/analytics/${orgId}/userAppwiseTokenUsage?startDate=${startDate}&endDate=${endDate}&timezone=${encodeURIComponent(timezone)}`,
          { headers: this.getAuthHeaders() }
        );

        this.userAppWiseTokenDetail = response.data;

        // Parse the counts to numbers
        this.activeUsersCount = Number(response.meta.active_users_count) || 0;
        this.totalQueriesCount = Number(response.meta.total_queries_count) || 0;

      } catch (error) {
        if (await handleAuthErrorShared(error)) return;
        this.handleError(error, 'Failed to fetch app token usage');
      } finally {
        this.loading = false;
      }
    },
    async fetchOrganizationDetail(id: string, startDate?: string, endDate?: string, timezone?: string) {
      try {
        this.loading = true;

        const params = new URLSearchParams();
        if (startDate) params.append("startDate", startDate);
        if (endDate) params.append("endDate", endDate);
        if (timezone) params.append("timezone", timezone);

        const response = await $fetch<{ data: any }>(
          `/api/analytics/${id}${params.toString() ? `?${params.toString()}` : ""}`,
          { headers: this.getAuthHeaders() }
        );

        this.organizationDetails = response.data || null;
      } catch (error) {
        if (await handleAuthErrorShared(error)) return;
        this.handleError(error, 'Failed to fetch organization details');
      } finally {
        this.loading = false;
      }
    },

    async fetchOrganizationDocuments(id: string) {
      try {
        this.loading = true;
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

        const response = await $fetch<{ data: DocumentAnalysis[] }>(
          `/api/analytics/${id}/documents`,
          {
            method: 'POST',
            headers: this.getAuthHeaders(),
            body: { timezone: userTimezone },
          }
        );

        this.orgDocList = response.data || [];
      } catch (error) {
        if (await handleAuthErrorShared(error)) return;
        this.handleError(error, 'Failed to fetch documents');
      } finally {
        this.loading = false;
      }
    },

    async fetchOrganizationUsers(id: string) {
      try {
        this.loading = true;
        const response = await $fetch<{ data: any[] }>(
          `/api/analytics/${id}/users`,
          { headers: this.getAuthHeaders() }
        );
        this.orgUserList = response.data || [];
      } catch (error) {
        if (await handleAuthErrorShared(error)) return;
        this.handleError(error, 'Failed to fetch users');
      } finally {
        this.loading = false;
      }
    },

    async fetchOrgDatas(id: string, startDate: string, endDate: string, timezone: string) {
      try {
        this.loading = true;
        await Promise.all([
          this.fetchTokenWiseDetail(id, startDate, endDate, timezone),
          this.fetchAppWiseTokenDetail(id, startDate, endDate, timezone),
          this.fetchUserAppWiseTokenDetail(id, startDate, endDate, timezone),
          this.fetchOrganizationDocuments(id),
        ]);
      } catch (error) {
        if (await handleAuthErrorShared(error)) return;
        this.handleError(error, 'Failed to fetch organization-related data');
      } finally {
        this.loading = false;
      }
    },

  },
});
