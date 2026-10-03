import { api } from '../../lib/apiClient'
import type { AdminUser, CreateUserInput, PagedUsers } from './types'

export function getUsers(page: number, pageSize: number, search: string) {
  const params = new URLSearchParams({ pageNumber: String(page), pageSize: String(pageSize) })
  if (search) params.set('search', search)
  return api.get<PagedUsers>(`/api/users?${params}`)
}

export function createUser(input: CreateUserInput) {
  return api.post<AdminUser>('/api/users', input)
}

export function setUserActive(user: AdminUser, isActive: boolean) {
  return api.put<AdminUser>(`/api/users/${user.id}`, {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    isActive,
  })
}

export function deleteUser(userId: string) {
  return api.delete<void>(`/api/users/${userId}`)
}

export function setAdmin(userId: string, isAdmin: boolean) {
  const path = `/api/users/${userId}/roles/admin`
  return isAdmin ? api.put<void>(path) : api.delete<void>(path)
}

export function setLocationLink(userId: string, locationId: string, linked: boolean) {
  const path = `/api/users/${userId}/locations/${locationId}`
  return linked ? api.put<void>(path) : api.delete<void>(path)
}

/** An administrator resetting someone else's password does not need the current one. */
export function resetPassword(userId: string, newPassword: string) {
  return api.put<void>(`/api/users/${userId}/password`, { newPassword })
}
