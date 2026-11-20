export interface MeterSummary {
  id: string
  locationId: string
  deviceId: string
  comment: string | null
  isActive: boolean
}

export type LocationRole = 'Owner' | 'Viewer'

export interface LocationSummary {
  id: string
  name: string
  address: string
  zone: string
  serialNumber: string
  hasNorgesPriceAgreement: boolean
  /** Owners also receive their inactive locations; viewers only active ones. */
  isActive: boolean
  role: LocationRole
  meters: MeterSummary[]
  /**
   * True when an OSO water heater is connected (from the database, without reading the heater), so the Heater tab shows
   * with the other tabs. Absent from an API older than this field, which shows no Heater tab.
   */
  hasWaterHeater?: boolean
  /** True when a Zaptec car charger is connected, so the Car tab shows. False when the API is older than spec 016. */
  hasEvCharger: boolean
  /** The location's "count the car charger with the house" setting. False when the API is older than spec 016. */
  includeEvCharger: boolean
}

/** Someone with access to a location, as the admin lists show them. */
export interface LocationUser {
  userId: string
  email: string
  firstName: string
  lastName: string
  role: LocationRole
}

export interface LocationInput {
  name: string
  address: string
  serialNumber: string
  zone: string
  hasNorgesPriceAgreement: boolean
  isActive: boolean
}

export interface AdminLocation {
  id: string
  name: string
  address: string
  serialNumber: string
  zone: string
  isActive: boolean
  hasNorgesPriceAgreement: boolean
  meters: Meter[]
  /** Non-secret facts about the sensor key; the key itself is never returned. */
  apiKey?: ApiKeyInfo
  /** Who has access and in which role; absent until the API returns it (contracts/backend-required.md item 3). */
  users?: LocationUser[]
}

export interface ApiKeyInfo {
  description: string
  hint: string
  isActive: boolean
  expiresAt: string
  status: string
}

/** The only response that carries the sensor key; it is never shown again. */
export interface CreatedLocation {
  location: AdminLocation
  apiKey: string
}

export interface MeterInput {
  locationId: string
  deviceId: string
  comment?: string
}

export interface Meter {
  id: string
  locationId: string
  deviceId: string
  meterId: string | null
  meterType: string | null
  comment: string | null
  isActive: boolean
}
