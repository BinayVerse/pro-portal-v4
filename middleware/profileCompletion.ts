export default defineNuxtRouteMiddleware(async (to, from) => {
  // Allowed paths when profile incomplete
  const allowed = ['/login', '/signup', '/admin/profile', '/logout','/book-meeting']
  const authStore = useAuthStore()
  const profileStore = useProfileStore()

  // Ensure auth is initialized and profile loaded
  await authStore.initializeAuth()

  // If not logged in, do nothing here (auth middleware handles)
  if (!authStore.isLoggedIn) return

  // Ensure profile is fetched
  try {
    await profileStore.fetchUserProfile()
  } catch (e) {
    // If fetching profile fails, allow auth middleware to handle it
    return
  }

  const complete = !!(profileStore.userProfile && profileStore.userProfile.name && profileStore.userProfile.contact_number && profileStore.userProfile.company)

  if (!complete && !allowed.includes(to.path)) {
    // redirect to admin profile edit
    return navigateTo({ path: '/admin/profile', query: { edit: '1' } })
  }
})
