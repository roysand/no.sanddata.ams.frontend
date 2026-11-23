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
  /** The meter's kWh so far plus the car's when it is counted with the house (API spec 016). */
  totalKwhSoFar: number
  /** Only set when a charging session ended in this hour: Zaptec gives completed sessions only. */
  evCharger: EvChargerPart | null
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

/**
 * The water heater's part of an hour or a day (API spec 012): its kWh (at most the item's kWh), the cost of those kWh
 * as their share of the actual cost (null without a price), the sampled minutes, and whether the kWh was capped at the
 * meter's. null on the item means no heater figure (no heater, before it was connected, an outage, or an API without
 * spec 012); never zeros.
 */
export interface WaterHeaterPart {
  kwh: number
  cost: number | null
  sampledMinutes: number
  capped: boolean
}

/** The water heater's part of a month's bill: the hours so far, never projected. */
export interface WaterHeaterBillPart extends WaterHeaterPart {
  /** UTC ISO; the first and last hour with a heater part. */
  firstHourUtc: string
  lastHourUtc: string
  estimate: false
}

/**
 * The car charger's part of an hour, a day or a month (API spec 016). The charger has its own supply, so its kWh are
 * not in `consumptionKwh`. `consumptionKwh` and every cost stay the house's own; `totalKwh` adds the car only when
 * `included`. null on the item means no charging data, never zeros.
 */
export interface EvChargerPart {
  kwh: number
  estimated: boolean
  /** The location's "count the car charger with the house" setting, when the figures were asked for. */
  included: boolean
}

export interface EvChargerDayPart extends EvChargerPart {
  /** Charging hours with no house reading: in the day's car kWh, but without an item in the hourly list. */
  hoursWithoutMeterReading: number
}

/** The car's part of a month's bill: the hours so far, never projected. */
export interface EvChargerBillPart extends EvChargerDayPart {
  /** UTC ISO; the first and last charging hour so far. */
  firstHour: string
  lastHour: string
  /** NOK incl. VAT, the hours so far, not rounded (API spec 019); null: not priced. Added to no sum. */
  cost: number | null
  /** The rule that priced the car; null only from an API without spec 019. */
  pricedAt: EvChargerPricedAt | null
}

/**
 * How the car's kWh were priced (API spec 019): at the Norgespris price incl. VAT when not counted with the house, at the
 * house's price per kWh when counted. A later rule may add a value, so any string is allowed.
 */
export type EvChargerPricedAt = 'NorgesPrisPrice' | 'HousePrice' | (string & {})

/** One completed charging session. */
export interface EvChargerSession {
  /** UTC ISO */
  start: string
  end: string
  kwh: number
  estimated: boolean
}

export interface HourlyCostItem {
  hourStart: string
  consumptionKwh: number
  /** `consumptionKwh` plus the car's kWh when the car is counted with the house; otherwise `consumptionKwh`. */
  totalKwh: number
  pricingModel: PricingModel
  actual: HourRateCost | null
  comparison: HourRateCost | null
  waterHeater: WaterHeaterPart | null
  evCharger: EvChargerPart | null
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
  /** `consumptionKwh` plus the car's kWh (including hours without a house reading) when the car is counted. */
  totalKwh: number
  pricingModel: PricingModel
  actual: DayCost | null
  comparison: DayCost | null
  waterHeater: WaterHeaterPart | null
  evCharger: EvChargerDayPart | null
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
  /**
   * Spot energy incl. VAT only; the same under or over the Norgespris limit (API spec 018). Absent from an API without
   * spec 018: treated as null.
   */
  spotEnergyPricePerKwh?: number | null
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

// ---- Monthly bill (API spec 010, GET /api/electricity-cost/bill) ------------------------------------------------

/** `Final` once the month has ended; `Estimate` for the current month (so far + projected). */
export type BillStatus = 'Estimate' | 'Final'

/** The invoice lines, in the order the API sends them. `NorgesPrisCredit` only for a Norgespris location. */
export type BillLineCode =
  | 'SupplierMonthlyFee'
  | 'SpotEnergy'
  | 'SupplierMarkup'
  | 'GridEnergyDay'
  | 'GridEnergyNight'
  | 'CapacityCharge'
  | 'ElectricityTax'
  | 'EnovaFee'
  | 'NorgesPrisCredit'

/** NOK at full precision (the client rounds). `amount = soFar + projected = amountExclVat + vat`. */
export interface BillAmounts {
  soFar: number
  projected: number
  amount: number
  amountExclVat: number
  vat: number
}

/**
 * One invoice line. A line with `set: false` (its setting is missing) has null amounts and is not in the sums of its
 * part or the total. `complete: false` means some hours could not be priced for it.
 */
export interface BillLine {
  /** A `BillLineCode`; a code this app does not know is still shown. */
  code: BillLineCode | string
  unit: 'kWh' | 'Month'
  /** kWh (so far + projected), or 1 for a monthly line. */
  quantity: number
  /** NOK per unit including VAT; null when not set or the quantity is 0. */
  unitPrice: number | null
  /** Fraction: 0.25, or 0 when exempt and for the Norgespris credit. */
  vatRate: number
  set: boolean
  complete: boolean
  soFar: number | null
  projected: number | null
  amount: number | null
  amountExclVat: number | null
  vat: number | null
}

export interface BillPart extends BillAmounts {
  name: 'Strom' | 'Nettleie'
  lines: BillLine[]
}

export interface BillProjection {
  fromUtc: string
  hours: number
  kwh: number
  basedOnHours: number
  /** How many days of recent use the projection is based on; 7 normally, fewer for a new location, 0 with none. */
  basedOnDays: number
  /** NOK per kWh excluding VAT; null when there was no spot price in the window. */
  assumedSpotPricePerKwh: number | null
}

/** The bill of one location and month. `Final` ⇒ `projection` null and every `projected` 0. */
export interface MonthlyBill {
  /** yyyy-MM */
  month: string
  status: BillStatus
  pricingModel: PricingModel
  /** False when a line is not set or not complete, or some hours with readings could not be priced. */
  isComplete: boolean
  hours: { inMonth: number; passed: number; withReadings: number; priced: number }
  projection: BillProjection | null
  capacity: {
    /** True for the current month: a higher peak can still raise the step. */
    provisional: boolean
    averageKw: number | null
    step: { lowerKw: number; upperKw: number | null } | null
  }
  strom: BillPart
  nettleie: BillPart
  total: BillAmounts
  waterHeater: WaterHeaterBillPart | null
  /** The meter's kWh so far plus the car's when counted; null from an API without spec 016. Never priced. */
  totalKwh: number | null
  evCharger: EvChargerBillPart | null
}

/** The water heater's average power over 5 minutes (API spec 017), for the "Last 3 hours" chart. */
export interface WaterHeaterPowerStep {
  /** UTC ISO, on whole 5 minutes (the same in Oslo time). */
  start: string
  /** The average over the sampled time only, not over the whole 5 minutes. Not capped at the meter's power. */
  powerKw: number
  /** 1–300: how much of the 5 minutes was sampled. The step going on now covers only up to now. */
  sampledSeconds: number
}

/** The heater's 5-minute steps in a window. A step without samples has no item: a gap, never 0 kW. */
export interface WaterHeaterPower {
  locationId: string
  /** The window used, UTC ISO. */
  from: string
  to: string
  stepSeconds: number
  items: WaterHeaterPowerStep[]
}

export type WaterHeaterMode = 'None' | 'Holiday' | 'Supercharge' | 'BlueBattery'

/** The OSO water heater's state, read from OSO when asked. A value OSO does not give is null, never 0. */
export interface WaterHeaterState {
  locationId: string
  /** UTC ISO; when the heater last reported. */
  readingTime: string
  /** Seconds between `readingTime` and the server's clock; never negative. */
  ageSeconds: number
  /** True when `ageSeconds` > 900. */
  isStale: boolean
  isOnline: boolean
  isHeating: boolean
  setPointCelsius: number | null
  temperatures: {
    topCelsius: number | null
    midCelsius: number | null
    lowCelsius: number | null
    fourthCelsius: number | null
  }
  hotWater: {
    /** Litres of 40 °C water available now and at most. */
    availableLitres40: number | null
    maxLitres40: number | null
    showers: number | null
    baths: number | null
    storedEnergyKwh: number | null
  }
  /** Small while idle (standby), so it is shown only while heating. */
  powerKw: number
  /** `start` and `end` are null for `None` and `BlueBattery`. */
  specialMode: {
    mode: WaterHeaterMode
    start: string | null
    end: string | null
    profileName: string | null
  }
  /** OSO's undocumented numbers, passed on as they are. */
  osoCodes: Record<string, number | null>
}

/** One location's Norgespris month (API spec 018), for a location with Norgespris that the caller can see. */
export interface NorgesPrisStatusItem {
  locationId: string
  /** yyyy-MM, Oslo month */
  month: string
  /** null: no limit set; never over */
  limitKwh: number | null
  /** The car's kWh included when it is counted with the house. */
  kwhSoFar: number
  /** The bill's projected month in all; null without a projection. */
  projectedKwh: number | null
  /** `kwhSoFar ≥ limitKwh` */
  overLimit: boolean
  /** 0 when not over */
  overLimitKwh: number
  /** Incl. VAT, no grid charge, taxes or markup; null if not set. */
  norgesPrisPricePerKwh: number | null
  /** UTC ISO, 00:00 Oslo on the 1st of next month */
  resetsAt: string
}

export interface NorgesPrisStatus {
  /** UTC ISO: when the figures were read */
  asOf: string
  /** In `GET /api/locations` order. */
  items: NorgesPrisStatusItem[]
}
