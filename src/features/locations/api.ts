import { api } from '../../lib/apiClient'
import type { CreatedLocation, LocationInput, LocationSummary, Meter, MeterInput } from './types'

/** An API older than spec 016 leaves the car charger flags out; they are read as false. */
type RawLocationSummary = Omit<LocationSummary, 'hasEvCharger' | 'includeEvCharger'> &
  Partial<Pick<LocationSummary, 'hasEvCharger' | 'includeEvCharger'>>

export async function getLocations(): Promise<LocationSummary[]> {
  const locations = await api.get<RawLocationSummary[]>('/api/locations')
  return locations.map((location) => ({
    ...location,
    hasEvCharger: location.hasEvCharger === true,
    includeEvCharger: location.includeEvCharger === true,
  }))
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

/** An owner changes only name, address and the active flag; system fields cannot be sent from here. */
export function updateOwnLocation(
  id: string,
  input: { name: string; address: string; isActive: boolean },
) {
  return api.put<LocationSummary>(`/api/locations/${id}`, input)
}

export function updateMeterComment(id: string, comment: string | null) {
  return api.put<Meter>(`/api/meters/${id}`, { comment })
}
