import { ApiError, api } from '../../lib/apiClient'
import {
  createLocationAsAdmin,
  type AdminLocation,
  type CreatedLocation,
  type LocationInput,
  type LocationRole,
} from '../locations'
import type {
  AdminUser,
  CapacityStepTable,
  CapacityStepTableInput,
  CreateUserInput,
  GridTariff,
  GridTariffRate,
  GridTariffRateInput,
  KeyReminders,
  LocationPricing,
  LocationPricingInput,
  NorgesPrisRate,
  NorgesPrisRateInput,
  PriceRate,
  PriceRateInput,
  PagedUsers,
  RotatedKey,
  EvChargerSettings,
  WaterHeaterInput,
  ZaptecCharger,
  WaterHeaterSettings,
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
export async function getLocationPricing(): Promise<LocationPricing[]> {
  type Optional = 'electricityTaxExempt' | 'vatExempt' | 'isHolidayHome' | 'supplierMonthlyFee'
  const items = await api.get<
    (Omit<LocationPricing, Optional> & Partial<Pick<LocationPricing, Optional>>)[]
  >('/api/admin/location-pricing')
  // An API older than the exemptions sends no flags, and one older than the bill (API spec 010) no monthly fee: read
  // them as not set.
  return items.map((item) => ({
    ...item,
    supplierMonthlyFee: item.supplierMonthlyFee ?? null,
    electricityTaxExempt: item.electricityTaxExempt ?? false,
    vatExempt: item.vatExempt ?? false,
    isHolidayHome: item.isHolidayHome ?? false,
  }))
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

/** A tariff's capacity step tables, oldest start date first. */
export function getCapacitySteps(tariffId: string) {
  return api.get<CapacityStepTable[]>(`/api/admin/grid-tariffs/${tariffId}/capacity-steps`)
}

export function addCapacitySteps(tariffId: string, input: CapacityStepTableInput) {
  return api.post<CapacityStepTable>(`/api/admin/grid-tariffs/${tariffId}/capacity-steps`, input)
}

/** Only a table that has not started can be deleted; the API answers 409 otherwise. */
export function deleteCapacitySteps(tariffId: string, validFrom: string) {
  return api.delete<void>(`/api/admin/grid-tariffs/${tariffId}/capacity-steps/${validFrom}`)
}

const waterHeaterPath = (locationId: string) => `/api/admin/locations/${locationId}/water-heater`

const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404

/** An API without spec 015 leaves `keyExpiresOn` out; it is read as null (no date shown). */
type RawWaterHeaterSettings = Omit<WaterHeaterSettings, 'keyExpiresOn'> & {
  keyExpiresOn?: string | null
}
const withKeyExpiry = (settings: RawWaterHeaterSettings): WaterHeaterSettings => ({
  ...settings,
  keyExpiresOn: settings.keyExpiresOn ?? null,
})

/**
 * The heater connected to a location, or `null` when there is none. The API answers 404 both for "no heater" and
 * "no such location"; the dialog is open on a location that exists, so 404 means not connected.
 */
export async function getWaterHeaterSettings(
  locationId: string,
): Promise<WaterHeaterSettings | null> {
  try {
    return withKeyExpiry(await api.get<RawWaterHeaterSettings>(waterHeaterPath(locationId)))
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

/** Connects or replaces the heater; the API checks the pair with OSO first (up to 10 s). */
export function connectWaterHeater(locationId: string, input: WaterHeaterInput) {
  return api
    .put<RawWaterHeaterSettings>(waterHeaterPath(locationId), {
      subscriptionKey: input.subscriptionKey,
      deviceId: input.deviceId,
      keyExpiresOn: input.keyExpiresOn,
    })
    .then(withKeyExpiry)
}

/** Changes only the OSO key's expiry date (yyyy-MM-dd); the key is not needed and OSO is not called. */
export function setWaterHeaterKeyExpiry(locationId: string, keyExpiresOn: string) {
  return api
    .put<RawWaterHeaterSettings>(`${waterHeaterPath(locationId)}/key-expiry`, { keyExpiresOn })
    .then(withKeyExpiry)
}

/** The keys due within 30 days or expired, for administrators; soonest first. */
export function getKeyReminders() {
  return api.get<KeyReminders>('/api/admin/key-reminders')
}

/**
 * Issues a new sensor key; the old one stops working at once. The new key is only in this answer: the caller shows it
 * once and keeps it nowhere else.
 */
export function rotateSensorKey(locationId: string) {
  return api.post<RotatedKey>(`/api/admin/locations/${locationId}/api-key/rotate`)
}

/** Removes the connection. A 404 means it is already gone, which is what was asked for. */
export async function removeWaterHeater(locationId: string): Promise<void> {
  try {
    await api.delete<void>(waterHeaterPath(locationId))
  } catch (error) {
    if (!isNotFound(error)) throw error
  }
}

const evChargerPath = (locationId: string) => `/api/admin/locations/${locationId}/ev-charger`

/** The chargers the server's Zaptec sign-in can see. 503 when the sign-in is not set up, is rejected or Zaptec is down. */
export function getZaptecChargers() {
  return api.get<ZaptecCharger[]>('/api/admin/ev-chargers')
}

/**
 * The charger connected to a location, or `null` when there is none. The API answers 404 both for "not connected" and
 * "no such location"; the dialog is open on a location that exists, so 404 means not connected.
 */
export async function getEvChargerSettings(locationId: string): Promise<EvChargerSettings | null> {
  try {
    return await api.get<EvChargerSettings>(evChargerPath(locationId))
  } catch (error) {
    if (isNotFound(error)) return null
    throw error
  }
}

/** Connects or replaces the charger; the API checks with Zaptec that its sign-in can see it first. */
export function connectEvCharger(locationId: string, chargerId: string) {
  return api.put<EvChargerSettings>(evChargerPath(locationId), { chargerId })
}

/** Removes the connection; the charging already read is kept. A 404 means it is already gone. */
export async function removeEvCharger(locationId: string): Promise<void> {
  try {
    await api.delete<void>(evChargerPath(locationId))
  } catch (error) {
    if (!isNotFound(error)) throw error
  }
}
