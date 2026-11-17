export type { LocationSummary, MeterSummary } from '../locations/types'

/** "Spot" or "NorgesPris": the location's enrolled pricing model (actual) or the other one (comparison). */
export type PricingModel = 'Spot' | 'NorgesPris'

/**
 * The parts of the price of one kWh in NOK; the total includes VAT, the parts above it do not. `grid` is null (and
 * `gridSet` false) when the location has no grid tariff yet. The parts add up exactly to `total`.
 */
export interface PriceParts {
  energy: number
  markup: number
  grid: number | null
  taxes: number
  vat: number
  total: number
  gridSet: boolean
}

/**
 * How an hour on Norgespris terms is split by the monthly limit (5 000 kWh, 1 000 for a holiday home): the kWh within
 * the limit are priced by `parts`, the kWh above it on spot terms by `aboveCapParts`.
 */
export interface CapSplit {
  kwhWithinCap: number
  kwhAboveCap: number
  aboveCapParts: PriceParts
}

export interface CurrentRateCost {
  /** The blended rate of the hour when `cap` is set. */
  ratePerKwh: number
  costSoFar: number
  /** Absent when the API is older than the full-price calculation. */
  parts?: PriceParts
  /** null when nothing is above the monthly limit; absent on an API without the limit. */
  cap?: CapSplit | null
}

export interface CurrentHourCost {
  hourStart: string
  consumptionKwhSoFar: number
  pricingModel: PricingModel
  /** null when price or exchange-rate data is not available yet */
  actual: CurrentRateCost | null
  comparison: CurrentRateCost | null
}

export interface HourRateCost {
  /** The blended rate of the hour when `cap` is set. */
  ratePerKwh: number
  cost: number
  parts?: PriceParts
  cap?: CapSplit | null
}

export interface HourlyCostItem {
  hourStart: string
  consumptionKwh: number
  pricingModel: PricingModel
  actual: HourRateCost | null
  comparison: HourRateCost | null
}

export interface PagedHourlyCost {
  items: HourlyCostItem[]
  page: number
  pageSize: number
  totalCount: number
}

export interface DayCost {
  cost: number
}

export interface DailyCostItem {
  /** Oslo calendar day, yyyy-MM-dd */
  date: string
  consumptionKwh: number
  pricingModel: PricingModel
  actual: DayCost | null
  comparison: DayCost | null
}

export interface DailyCost {
  items: DailyCostItem[]
}

export interface ConsumptionItem {
  periodStart: string
  consumptionKwh: number
}

/** The newest reading for a location. `isStale` is decided by the API (Measurements:StaleAfterSeconds). */
export interface LatestMeasurement {
  timestamp: string
  meterId: string
  powerWatts: number
  isStale: boolean
}

export interface Consumption {
  granularity: 'minute' | 'hour'
  items: ConsumptionItem[]
}

/** One hour of the Oslo day. A rate is null when its price or exchange rate is not available yet. */
export interface HourPrice {
  hourStart: string
  /** The rate under the location's own plan; flat for a Norgespris location. */
  ratePerKwh: number | null
  /** The spot (market) rate: when power is plentiful and cheap, whatever plan the location is on. */
  spotRatePerKwh: number | null
}

export interface DayPrices {
  /** Oslo calendar day, yyyy-MM-dd */
  date: string
  zone: string
  pricingModel: PricingModel
  /** One item per real hour of the day: 23, 24 or 25 on the daylight-saving days. */
  items: HourPrice[]
}

export type SavingPeriodName = 'Today' | 'Last7Days' | 'MonthToDate' | 'YearToDate'

/**
 * What Norgespris saves compared with spot terms over a period of Oslo days: the cost on spot terms minus the cost on
 * Norgespris terms, in NOK including VAT. Negative means Norgespris cost more. Hours where either side could not be
 * priced are left out, so `hoursCounted` can be less than `hoursWithConsumption`.
 */
export interface SavingPeriod {
  period: SavingPeriodName
  from: string
  to: string
  saving: number
  hoursCounted: number
  hoursWithConsumption: number
}

export interface NorgesPrisSaving {
  periods: SavingPeriod[]
}

/** One of the hours behind the capacity charge: the highest hour of its Oslo day. */
export interface CapacityPeak {
  /** Oslo calendar day, yyyy-MM-dd */
  date: string
  hourStartUtc: string
  kw: number
}

/**
 * The grid capacity charge of one month: the step that the average of the three highest daily peaks falls in. When
 * `set` is false (no grid tariff, no step table for the month, or no consumption) the figures are null.
 */
export interface CapacityCharge {
  /** yyyy-MM */
  month: string
  /** true for the current month: a higher peak can still raise the step. */
  provisional: boolean
  set: boolean
  peaks: CapacityPeak[]
  averageKw: number | null
  /** `upperKw` is null for the top step. */
  step: { lowerKw: number; upperKw: number | null } | null
  amountExclVat: number | null
  /** 0 for a VAT-exempt location. */
  vat: number | null
  amount: number | null
  /** null for the top step. */
  kwToNextStep: number | null
}
