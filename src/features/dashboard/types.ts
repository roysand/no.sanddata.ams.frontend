export type { LocationSummary, MeterSummary } from '../locations/types'

/** "Spot" or "NorgesPris": the location's enrolled pricing model (actual) or the other one (comparison). */
export type PricingModel = 'Spot' | 'NorgesPris'

export interface CurrentRateCost {
  ratePerKwh: number
  costSoFar: number
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
  ratePerKwh: number
  cost: number
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
