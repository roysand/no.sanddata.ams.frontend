// Public surface of the locations slice; other slices import from here, never from internal files.
export { useLocations, useCreateMeter, useCreateOwnLocation } from './hooks'

/** Self-service setup needs `POST /api/locations`, deployed 2026-10-09. Set to false to ship it dark. */
export const SELF_SERVICE_ENABLED = true

/**
 * Gates the administrator Locations page and the owner edit actions (feature 002), so the frontend can be
 * merged before the API ships roles. Remove it, and the normalisation in api.ts, once the API is deployed.
 */
export const LOCATION_SHARING_ENABLED = true
export { LocationForm } from './LocationForm'
export { MeterForm } from './MeterForm'
export { SensorKeyNotice } from './SensorKeyNotice'
export { createLocationAsAdmin } from './api'
export { MAX_OWN_LOCATIONS, LOCATION_LIMIT_MESSAGE, hasReachedLocationLimit } from './schema'
export { ConfirmDeactivateDialog } from './ConfirmDeactivateDialog'
export { canEdit, ownedLocations } from './access'
export { SetupWizard } from './SetupWizard'
export { SetupPage } from './SetupPage'
export { LocationsPage } from './LocationsPage'
export type {
  AdminLocation,
  ApiKeyInfo,
  LocationRole,
  LocationUser,
  CreatedLocation,
  LocationInput,
  LocationSummary,
  Meter,
  MeterInput,
  MeterSummary,
} from './types'
export { ownerLocationSchema, meterCommentSchema } from './schema'
export type {
  LocationFormValues,
  MeterFormValues,
  OwnerLocationFormValues,
  MeterCommentFormValues,
} from './schema'
export { toFormServerError } from './serverErrors'
