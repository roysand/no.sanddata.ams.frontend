import { api } from '../../lib/apiClient'
import {
  createLocationAsAdmin,
  type AdminLocation,
  type CreatedLocation,
  type LocationInput,
  type LocationRole,
} from '../locations'
import type {
  AdminUser,
  CreateUserInput,
  GridTariff,
  GridTariffRate,
  GridTariffRateInput,
  LocationPricing,
  LocationPricingInput,
  NorgesPrisRate,
  NorgesPrisRateInput,
  PriceRate,
  PriceRateInput,
  PagedUsers,
} from './types'

export async function getUsers(page: number, pageSize: number, search: string) {
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

/**
 * Without `role` no body is sent, so the API's default (Owner) applies and the original flow is unchanged.
 * Linking again with another role changes the role.
 */
export function setLocationLink(
  userId: string,
  locationId: string,
  linked: boolean,
  role?: LocationRole,
) {
  const path = `/api/users/${userId}/locations/${locationId}`
  if (!linked) return api.delete<void>(path)
  return role ? api.put<void>(path, { role }) : api.put<void>(path)
}

/** An administrator resetting someone else's password does not need the current one. */
export function resetPassword(userId: string, newPassword: string) {
  return api.put<void>(`/api/users/${userId}/password`, { newPassword })
}

/** The location was created (and its key issued) but linking it to the user failed; the link can be retried. */
export class LocationNotLinkedError extends Error {
  constructor(
    public created: CreatedLocation,
    public cause: unknown,
  ) {
    super('The location was created but could not be linked to the user')
    this.name = 'LocationNotLinkedError'
  }
}

/** Creates a location (admin endpoint, which links nobody) and links it to `userId`. */
export async function createLocationForUser(userId: string, input: LocationInput) {
  const created = await createLocationAsAdmin(input)
  try {
    await setLocationLink(userId, created.location.id, true)
  } catch (error) {
    throw new LocationNotLinkedError(created, error)
  }
  return created
}

/** Every location in the system, including ones the caller is not linked to. */
export function getAdminLocations() {
  return api.get<AdminLocation[]>('/api/admin/locations')
}

/** Administrators may change every field; owners use the narrower endpoint in `features/locations`. */
export function updateLocationAsAdmin(id: string, input: LocationInput) {
  return api.put<AdminLocation>(`/api/admin/locations/${id}`, { id, ...input })
}

/** Every Norgespris rate, oldest start date first. */
export function getNorgesPrisRates() {
  return api.get<NorgesPrisRate[]>('/api/admin/norgespris')
}

export function addNorgesPrisRate(input: NorgesPrisRateInput) {
  return api.post<NorgesPrisRate>('/api/admin/norgespris', input)
}

/** Only a rate that has not started can be deleted; the API answers 409 otherwise. */
export function deleteNorgesPrisRate(id: string) {
  return api.delete<void>(`/api/admin/norgespris/${id}`)
}

/** Every location with its grid tariff and supplier markup, including ones the caller is not linked to. */
export function getLocationPricing() {
  return api.get<LocationPricing[]>('/api/admin/location-pricing')
}

/** Changing these recalculates every past hour of the location. */
export function setLocationPricing(locationId: string, input: LocationPricingInput) {
  return api.put<LocationPricing>(`/api/admin/location-pricing/${locationId}`, input)
}

export function getGridTariffs() {
  return api.get<GridTariff[]>('/api/admin/grid-tariffs')
}

export function createGridTariff(name: string) {
  return api.post<GridTariff>('/api/admin/grid-tariffs', { name })
}

export function addGridTariffRate(tariffId: string, input: GridTariffRateInput) {
  return api.post<GridTariffRate>(`/api/admin/grid-tariffs/${tariffId}/rates`, input)
}

/** Only a rate that has not started can be deleted; the API answers 409 otherwise. */
export function deleteGridTariffRate(tariffId: string, rateId: string) {
  return api.delete<void>(`/api/admin/grid-tariffs/${tariffId}/rates/${rateId}`)
}

export function getPriceRates() {
  return api.get<PriceRate[]>('/api/admin/price-rates')
}

export function addPriceRate(input: PriceRateInput) {
  return api.post<PriceRate>('/api/admin/price-rates', input)
}

/** Only a row that has not started can be deleted; the API answers 409 otherwise. */
export function deletePriceRate(id: string) {
  return api.delete<void>(`/api/admin/price-rates/${id}`)
}
