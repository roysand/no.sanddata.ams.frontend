import { z } from 'zod'

export const ZONES = ['NO1', 'NO2', 'NO3', 'NO4', 'NO5'] as const

/** A user may have at most this many locations through self-service; mirrors the API's limit. */
export const MAX_OWN_LOCATIONS = 4

export const LOCATION_LIMIT_MESSAGE = `You have the maximum of ${MAX_OWN_LOCATIONS} locations. Ask an administrator to add more.`

export function hasReachedLocationLimit(locationCount: number): boolean {
  return locationCount >= MAX_OWN_LOCATIONS
}

// Same rules as the API's CreateLocationValidator, so mistakes are caught before the request.
export const locationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  address: z
    .string()
    .trim()
    .min(1, 'Address is required')
    .max(100, 'Address must be at most 100 characters'),
  serialNumber: z
    .string()
    .trim()
    .min(1, 'Serial number is required')
    .max(100, 'Serial number must be at most 100 characters'),
  zone: z.enum(ZONES, { message: 'Choose a price zone (NO1–NO5)' }),
  hasNorgesPriceAgreement: z.boolean(),
  isActive: z.boolean(),
})

export type LocationFormValues = z.infer<typeof locationSchema>

// Same rules as the API's CreateMeterValidator.
export const meterSchema = z.object({
  locationId: z.string().min(1, 'Location is required'),
  deviceId: z
    .string()
    .trim()
    .min(1, 'Device id is required')
    .max(100, 'Device id must be at most 100 characters'),
  comment: z.string().max(200, 'Comment must be at most 200 characters').optional(),
})

export type MeterFormValues = z.infer<typeof meterSchema>

// What an owner may change on their location: the same name and address rules as the API's
// UpdateLocationValidator, plus the active flag. System fields (serial number, zone, Norgespris, key) are
// deliberately not part of this schema.
export const ownerLocationSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be at most 100 characters'),
  address: z
    .string()
    .trim()
    .min(1, 'Address is required')
    .max(100, 'Address must be at most 100 characters'),
  isActive: z.boolean(),
})

export type OwnerLocationFormValues = z.infer<typeof ownerLocationSchema>

// Same rule as the meter comment in the API's CreateMeterValidator.
export const meterCommentSchema = z.object({
  comment: z.string().max(200, 'Comment must be at most 200 characters').optional(),
})

export type MeterCommentFormValues = z.infer<typeof meterCommentSchema>
