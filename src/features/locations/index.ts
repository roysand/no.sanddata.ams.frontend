// Public surface of the locations slice; other slices import from here, never from internal files.
export { useLocations, useCreateMeter } from './hooks'
export { LocationForm } from './LocationForm'
export { MeterForm } from './MeterForm'
export { SensorKeyNotice } from './SensorKeyNotice'
export { createLocationAsAdmin } from './api'
export { MAX_OWN_LOCATIONS } from './schema'
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
