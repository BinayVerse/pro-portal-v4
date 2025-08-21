<template>
  <div class="min-h-screen bg-black flex">
    <!-- Sidebar -->
    <aside class="w-64 bg-dark-900 border-r border-dark-700 flex flex-col">
      <!-- Logo -->
      <div class="px-6 py-4 border-b border-dark-700">
        <NuxtLink to="/" class="flex items-center space-x-3">
          <img
            src="https://cdn.builder.io/api/v1/image/assets%2Fb2a7382a9c9146babd538ccc60e9d0b5%2Fbddd43caf4614f99a3fbff498927abcc?format=webp&width=800"
            alt="Provento Logo"
            class="w-8 h-8"
          />
          <span class="text-white text-xl font-semibold">provento.ai</span>
        </NuxtLink>
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
          >
            Users
          </UButton>

          <UButton
            to="/admin/documents"
            variant="ghost"
            justify="start"
            icon="heroicons:document-text"
            :color="$route.name === 'admin-documents' ? 'primary' : 'gray'"
            class="w-full"
          >
            Documents
          </UButton>

          <UButton
            to="/admin/analytics"
            variant="ghost"
            justify="start"
            icon="heroicons:chart-bar"
            :color="$route.name === 'admin-analytics' ? 'primary' : 'gray'"
            class="w-full"
          >
            Analytics
          </UButton>

          <!-- Integrations with submenu -->
          <div>
            <button
              @click="integrationsOpen = !integrationsOpen"
              class="w-full flex items-center justify-between space-x-3 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-dark-800 transition-colors duration-200"
              :class="{ 'bg-primary-500/20 text-primary-400': $route.path.includes('/admin/integrations') }"
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
              <NuxtLink
                to="/admin/integrations"
                class="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                :class="{ 'bg-primary-500/20 text-primary-400': $route.name === 'admin-integrations' }"
              >
                Overview
              </NuxtLink>
              <NuxtLink
                to="/admin/integrations/slack"
                class="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                :class="{ 'bg-primary-500/20 text-primary-400': $route.name === 'admin-integrations-slack' }"
              >
                Slack
              </NuxtLink>
              <NuxtLink
                to="/admin/integrations/teams"
                class="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                :class="{ 'bg-primary-500/20 text-primary-400': $route.name === 'admin-integrations-teams' }"
              >
                Teams
              </NuxtLink>
              <NuxtLink
                to="/admin/integrations/whatsapp"
                class="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                :class="{ 'bg-primary-500/20 text-primary-400': $route.name === 'admin-integrations-whatsapp' }"
              >
                WhatsApp
              </NuxtLink>
              <NuxtLink
                to="/admin/integrations/imessage"
                class="block px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
                :class="{ 'bg-primary-500/20 text-primary-400': $route.name === 'admin-integrations-imessage' }"
              >
                iMessage
              </NuxtLink>
            </div>
          </div>
        </div>
      </nav>
    </aside>

    <!-- Main content area -->
    <div class="flex-1 flex flex-col">
      <!-- Top header -->
      <header class="bg-dark-900 border-b border-dark-700 px-6 py-4">
        <div class="flex items-center justify-between">
          <h1 class="text-xl font-semibold text-white">{{ pageTitle }}</h1>

          <!-- Profile dropdown -->
          <UDropdown :items="profileItems" :popper="{ placement: 'bottom-end' }">
            <UButton variant="ghost" trailing-icon="heroicons:chevron-down">
              <UAvatar
                src=""
                alt="Admin"
                size="sm"
                :ui="{ background: 'bg-primary-500' }"
              >
                <span class="text-white text-sm font-medium">A</span>
              </UAvatar>
              <span class="hidden sm:block ml-2">Admin</span>
            </UButton>
          </UDropdown>
        </div>
      </header>

      <!-- Page content -->
      <main class="flex-1 p-6 bg-black">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const integrationsOpen = ref(true)

const profileItems = [
  [{
    label: 'My Account',
    icon: 'heroicons:user',
    click: () => {}
  }, {
    label: 'Change Password',
    icon: 'heroicons:key',
    click: () => {}
  }], [{
    label: 'Logout',
    icon: 'heroicons:arrow-right-on-rectangle',
    click: () => navigateTo('/login')
  }]
]

const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    'admin-dashboard': 'Dashboard',
    'admin-users': 'Users',
    'admin-documents': 'Documents',
    'admin-analytics': 'Analytics',
    'admin-integrations': 'Integrations Overview',
    'admin-integrations-teams': 'Teams Integration',
    'admin-integrations-slack': 'Slack Integration',
    'admin-integrations-whatsapp': 'WhatsApp Integration',
    'admin-integrations-imessage': 'iMessage Integration'
  }
  return titles[route.name as string] || 'Admin'
})
</script>
