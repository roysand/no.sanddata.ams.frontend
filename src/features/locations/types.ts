export interface MeterSummary {
  id: string
  locationId: string
  deviceId: string
  comment: string | null
  isActive: boolean
}

export interface LocationSummary {
  id: string
  name: string
  address: string
  zone: string
  meters: MeterSummary[]
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
