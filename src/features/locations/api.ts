import { api } from '../../lib/apiClient'
import type { CreatedLocation, LocationInput, LocationSummary, Meter, MeterInput } from './types'

/**
 * Until the API returns `role` and `isActive` (specs/002-location-editing-sharing/contracts/backend-required.md
 * item 4) a missing role means Owner and a missing flag means active, which is what those locations were.
 * The cast is the same gap: the old response also lacks `serialNumber` and `hasNorgesPriceAgreement`, which
 * only the owner edit screen reads. Remove this normalisation once the API is deployed.
 */
export async function getLocations(): Promise<LocationSummary[]> {
  const locations = await api.get<Partial<LocationSummary>[]>('/api/locations')
  return locations.map((location) => ({
    ...location,
    role: location.role ?? 'Owner',
    isActive: location.isActive ?? true,
  })) as LocationSummary[]
}

/** The caller creates a location that belongs to them; the API links it and returns the sensor key once. */
export function createOwnLocation(input: LocationInput) {
  return api.post<CreatedLocation>('/api/locations', input)
}

/** Administrators only. Does not link the location to anyone; see `admin/api.ts`. */
export function createLocationAsAdmin(input: LocationInput) {
  return api.post<CreatedLocation>('/api/admin/locations', input)
}

export function createMeter(input: MeterInput) {
  return api.post<Meter>('/api/meters', input)
}
