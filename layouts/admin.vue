<template>
  <div class="min-h-screen bg-black flex">
    <!-- Sidebar (fixed) -->
    <aside class="fixed left-0 top-0 bottom-0 w-64 bg-dark-900 border-r border-dark-700 flex flex-col overflow-auto z-40">
      <!-- Logo -->
      <div class="h-16 flex items-center border-b border-dark-700">
        <div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <NuxtLink to="/" class="flex items-center space-x-3">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2Fb2a7382a9c9146babd538ccc60e9d0b5%2Fbddd43caf4614f99a3fbff498927abcc?format=webp&width=800"
              alt="Provento Logo"
              class="w-8 h-8"
            />
            <span class="text-white text-xl font-semibold">provento.ai</span>
          </NuxtLink>
        </div>
      </div>

      <!-- Admin Navigation -->
      <nav class="flex-1 p-6">
        <div class="space-y-2">
          <UButton
            to="/admin/dashboard"
            variant="ghost"
            justify="start"
            icon="heroicons:squares-2x2"
            :color="$route.name === 'admin-dashboard' ? 'primary' : 'gray'"
            class="w-full"
            :disabled="!isProfileComplete"
            :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
          >
            Dashboard
          </UButton>

          <UButton
            to="/admin/users"
            variant="ghost"
            justify="start"
            icon="heroicons:users"
            :color="$route.name === 'admin-users' ? 'primary' : 'gray'"
            class="w-full"
            :disabled="!isProfileComplete"
            :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
          >
            Users
          </UButton>

          <UButton
            to="/admin/artefacts"
            variant="ghost"
            justify="start"
            icon="heroicons:document-text"
            :color="$route.name === 'admin-artefacts' ? 'primary' : 'gray'"
            class="w-full"
            :disabled="!isProfileComplete"
            :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
          >
            Artefacts
          </UButton>

          <UButton
            to="/admin/analytics"
            variant="ghost"
            justify="start"
            icon="heroicons:chart-bar"
            :color="$route.name === 'admin-analytics' ? 'primary' : 'gray'"
            class="w-full"
            :disabled="!isProfileComplete"
            :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
          >
            Analytics
          </UButton>

          <!-- Integrations with submenu -->
          <div>
            <button
              @click="integrationsOpen = !integrationsOpen"
              class="w-full flex items-center justify-between space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-dark-800 transition-colors duration-200"
              :class="{
                'bg-primary-500/20 text-primary-400': $route.path.includes('/admin/integrations'),
                'opacity-50 cursor-not-allowed pointer-events-none': !isProfileComplete,
              }"
              :disabled="!isProfileComplete"
              :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
            >
              <div class="flex items-center space-x-3">
                <UIcon name="heroicons:link" class="w-5 h-5" />
                <span>Integrations</span>
              </div>
              <UIcon
                name="heroicons:chevron-down"
                class="w-4 h-4 transition-transform duration-200"
                :class="{ 'rotate-180': integrationsOpen }"
              />
            </button>
            <div v-show="integrationsOpen" class="ml-8 mt-2 space-y-1">
              <UButton
                to="/admin/integrations"
                variant="ghost"
                justify="start"
                size="sm"
                icon="heroicons:eye"
                :color="$route.name === 'admin-integrations' ? 'primary' : 'gray'"
                class="w-full"
                :disabled="!isProfileComplete"
                :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
              >
                Overview
              </UButton>
              <UButton
                to="/admin/integrations/slack"
                variant="ghost"
                justify="start"
                size="sm"
                icon="i-mdi:slack"
                :color="$route.name === 'admin-integrations-slack' ? 'primary' : 'gray'"
                class="w-full"
                :disabled="!isProfileComplete"
                :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
              >
                Slack
              </UButton>
              <UButton
                to="/admin/integrations/teams"
                variant="ghost"
                justify="start"
                size="sm"
                icon="i-mdi:microsoft-teams"
                :color="$route.name === 'admin-integrations-teams' ? 'primary' : 'gray'"
                class="w-full"
                :disabled="!isProfileComplete"
                :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
              >
                Teams
              </UButton>
              <UButton
                to="/admin/integrations/whatsapp"
                variant="ghost"
                justify="start"
                size="sm"
                icon="i-mdi:whatsapp"
                :color="$route.name === 'admin-integrations-whatsapp' ? 'primary' : 'gray'"
                class="w-full"
                :disabled="!isProfileComplete"
                :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
              >
                WhatsApp
              </UButton>
              <UButton
                to="/admin/integrations/i-message"
                variant="ghost"
                justify="start"
                size="sm"
                icon="i-heroicons:chat-bubble-left-ellipsis"
                :color="$route.name === 'admin-integrations-i-message' ? 'primary' : 'gray'"
                class="w-full"
                :disabled="!isProfileComplete"
                :title="isClient && !isProfileComplete ? 'Complete your profile to access this section' : null"
              >
                iMessage
              </UButton>
            </div>
          </div>
        </div>
      </nav>
    </aside>

    <!-- Main content area (offset for fixed sidebar) -->
    <div class="ml-64 flex-1 flex flex-col" style="min-height:100vh;">
      <!-- Top header (fixed height) -->
      <header class="bg-dark-900 border-b border-dark-700 px-6 h-16 flex items-center z-50">
        <div class="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-end w-full">
          <UDropdown :items="profileItems" :popper="{ placement: 'bottom-end' }">
            <UButton variant="ghost" trailing-icon="heroicons:chevron-down">
              <UAvatar src="" :alt="profileStore.userProfile?.name?.toUpperCase()" size="sm" :ui="{ background: 'bg-primary-500' }" />
              <span class="hidden sm:block ml-2">{{ profileStore.userProfile?.name || profileStore.userProfile?.email || 'User' }}</span>
            </UButton>
          </UDropdown>
        </div>
      </header>

      <!-- Mandatory profile completion banner -->
      <div v-if="!isProfileComplete && $route.path !== '/admin/profile'" class="px-6 pt-4">
        <UAlert icon="i-heroicons-exclamation-triangle" color="yellow" variant="subtle" title="Please complete your profile to access the application.">
          Please complete your profile to access the application.
        </UAlert>
      </div>

      <!-- Page content (scrollable) -->
      <main class="p-6 bg-black overflow-auto" style="height: calc(100vh - 4rem);">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useAuthStore } from '~/stores/auth/index'
import { useProfileStore } from '~/stores/profile/index'

const route = useRoute()
const integrationsOpen = ref(true)
const isClient = ref(false)
onMounted(() => { isClient.value = true })
const auth = useAuthStore()
const profileStore = useProfileStore()

// Ensure profile is loaded
if (process.client) {
  void profileStore.fetchUserProfile().catch(() => {})
}

const isProfileComplete = computed(() => {
  const up: any = profileStore.userProfile || {}
  return !!(up && up.name && up.contact_number && up.company)
})

const getInitials = (name?: string, email?: string) => {
  if (!name && email) return (email[0] || '').toUpperCase()
  if (!name) return ''
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const profileItems = [
  [
    {
      label: 'My Account',
      icon: 'heroicons:user',
      click: () => navigateTo('/admin/profile'),
    },
    {
      label: 'Change Password',
      icon: 'heroicons:key',
      click: () => navigateTo('/change-password'),
    },
  ],
  [
    {
      label: 'Logout',
      icon: 'heroicons:arrow-right-on-rectangle',
      click: async () => {
        try {
          await auth.signOut()
        } catch (e) {
          console.error('Logout failed from profile dropdown', e)
          // Fallback navigation
          navigateTo('/login')
        }
      },
    },
  ],
]

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    'admin-dashboard': 'Dashboard',
    'admin-users': 'Users',
    'admin-artefacts': 'Artefacts',
    'admin-analytics': 'Analytics',
    'admin-integrations': 'Integrations Overview',
    'admin-integrations-teams': 'Teams Integration',
    'admin-integrations-slack': 'Slack Integration',
    'admin-integrations-whatsapp': 'WhatsApp Integration',
    'admin-integrations-i-message': 'iMessage Integration',
  }
  return titles[route.name as string] || 'Admin'
})
</script>
