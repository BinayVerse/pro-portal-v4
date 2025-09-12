export default defineNuxtRouteMiddleware(async (to, from) => {
  const allowed = ['/login', '/signup', '/admin/profile', '/logout', '/book-meeting']
  const authStore = useAuthStore()
  const profileStore = useProfileStore()

  await authStore.initializeAuth()

  if (!authStore.isLoggedIn) return

  try {
    await profileStore.fetchUserProfile()
  } catch (e) {
    return
  }

  const up = profileStore.userProfile || {}
  const complete = !!(up && up.name && up.contact_number && up.company)

  if (!complete && !allowed.includes(to.path)) {
    return navigateTo({ path: '/admin/profile', query: { edit: '1' } })
  }
})
