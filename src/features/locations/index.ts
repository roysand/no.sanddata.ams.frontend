// Public surface of the locations slice; other slices import from here, never from internal files.
export { useLocations, useCreateMeter, useCreateOwnLocation } from './hooks'

/** Self-service setup needs `POST /api/locations`, deployed 2026-10-09. Set to false to ship it dark. */
export const SELF_SERVICE_ENABLED = true
export { LocationForm } from './LocationForm'
export { MeterForm } from './MeterForm'
export { SensorKeyNotice } from './SensorKeyNotice'
export { createLocationAsAdmin } from './api'
export { MAX_OWN_LOCATIONS, LOCATION_LIMIT_MESSAGE, hasReachedLocationLimit } from './schema'
export { SetupWizard } from './SetupWizard'
export { SetupPage } from './SetupPage'
export { LocationsPage } from './LocationsPage'
export type {
  AdminLocation,
  CreatedLocation,
  LocationInput,
  LocationSummary,
  Meter,
  MeterInput,
  MeterSummary,
} from './types'
export type { LocationFormValues, MeterFormValues } from './schema'
export { toFormServerError } from './serverErrors'
