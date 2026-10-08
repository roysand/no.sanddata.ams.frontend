import { api } from '../../lib/apiClient'
import type { CreatedLocation, LocationInput, LocationSummary, Meter, MeterInput } from './types'

export function getLocations() {
  return api.get<LocationSummary[]>('/api/locations')
}

/** Administrators only. Does not link the location to anyone; see `admin/api.ts`. */
export function createLocationAsAdmin(input: LocationInput) {
  return api.post<CreatedLocation>('/api/admin/locations', input)
}

export function createMeter(input: MeterInput) {
  return api.post<Meter>('/api/meters', input)
}
