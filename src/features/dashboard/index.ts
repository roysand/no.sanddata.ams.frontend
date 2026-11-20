// Public surface of the dashboard slice; other slices import from here, never from internal files.
export { useLocationSnapshots } from './hooks'
export { currentPowerKw } from './series'
export type { UsageRow } from './series'
export type { Period, Slot } from './periods'
export { addYearsToDate, formatNok, formatOsloDate, formatOsloDateTime, osloToday } from './format'
export { WarningBanner } from './WarningBanner'
export { EvChargerPage } from './EvChargerPage'
