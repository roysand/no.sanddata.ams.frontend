import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { authStore } from '../../lib/authStore'
import { login as loginRequest, restoreSession } from './api'
import { AuthContext, type AuthContextValue } from './context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const session = useSyncExternalStore(authStore.subscribe, authStore.getSession)
  const [isLoading, setIsLoading] = useState(() => authStore.getStoredRefreshToken() !== null)

  useEffect(() => {
    if (!isLoading) return
    restoreSession().finally(() => setIsLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const value: AuthContextValue = {
    isAuthenticated: session !== null,
    isLoading,
    email: session?.email ?? null,
    roles: session?.roles ?? [],
    login: async (email, password) => {
      const response = await loginRequest(email, password)
      authStore.setSession({
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        email: response.email,
        roles: response.roles,
      })
    },
    logout: () => authStore.clearSession(),
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
