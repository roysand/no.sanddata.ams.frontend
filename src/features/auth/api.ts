import { api, refreshAccessToken } from '../../lib/apiClient'
import { authStore } from '../../lib/authStore'
import type { LoginResponse, MeResponse, RegisterResponse } from './types'

export function login(email: string, password: string) {
  return api.post<LoginResponse>('/api/auth/login', { email, password }, { auth: false })
}

export function register(firstName: string, lastName: string, email: string, password: string) {
  return api.post<RegisterResponse>(
    '/api/users',
    { firstName, lastName, email, password },
    { auth: false },
  )
}

export async function restoreSession(): Promise<void> {
  const accessToken = await refreshAccessToken()
  if (!accessToken) return

  const me = await api.get<MeResponse>('/api/auth/me')
  const current = authStore.getSession()
  if (current) authStore.setSession({ ...current, email: me.email, roles: me.roles })
}
