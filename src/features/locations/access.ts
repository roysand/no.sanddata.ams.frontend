import type { LocationSummary } from './types'

/**
 * Whether to offer edit actions for a location. This only decides what the screen shows (UX);
 * the API refuses edits by non-owners on its own.
 */
export function canEdit(location: Pick<LocationSummary, 'role'>): boolean {
  return location.role === 'Owner'
}

/** The locations the user owns; viewing a shared location does not count towards the self-service limit. */
export function ownedLocations<T extends Pick<LocationSummary, 'role'>>(locations: T[]): T[] {
  return locations.filter(canEdit)
}
