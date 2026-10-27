import type { AdminUser } from './types'

/** The user's locations as { id, name } pairs. */
export function userLocationOptions(user: AdminUser) {
  return user.locationAccess.map((access) => ({ id: access.locationId, name: access.name }))
}
