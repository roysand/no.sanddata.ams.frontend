import type { AdminUser } from './types'

/**
 * The user's locations as { id, name } pairs.
 * The API builds `locations` (names) and `locationIds` from the same collection, so index i of one matches
 * index i of the other (verified in the API's UserMapper); the test pins this assumption.
 */
export function userLocationOptions(user: AdminUser) {
  return user.locationIds.map((id, index) => ({ id, name: user.locations[index] ?? id }))
}
