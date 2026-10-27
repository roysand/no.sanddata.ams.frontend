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
