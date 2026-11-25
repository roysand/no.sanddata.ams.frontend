import { api } from '../../lib/apiClient'
import type {
  CapacityCharge,
  Consumption,
  CurrentHourCost,
  DailyCost,
  DailyCostItem,
  DayPrices,
  EvChargerBillPart,
  EvChargerLiveState,
  EvChargerLiveStatus,
  EvChargerSession,
  HotWater,
  HotWaterPeriod,
  HourlyCostItem,
  LatestMeasurement,
  MonthlyBill,
  NorgesPrisSaving,
  NorgesPrisStatus,
  PagedHourlyCost,
  WaterHeaterPower,
  WaterHeaterState,
} from './types'

/**
 * An API without spec 012 leaves `waterHeater` out, and one without spec 016 leaves `totalKwh`, `totalKwhSoFar` and
 * `evCharger` out. They are read as no heater figure, the house's kWh and no car figure everywhere.
 */
type Older<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
type RawHourlyItem = Older<HourlyCostItem, 'waterHeater' | 'totalKwh' | 'evCharger'>
type RawDailyItem = Older<DailyCostItem, 'waterHeater' | 'totalKwh' | 'evCharger'>
type RawPagedHourlyCost = Omit<PagedHourlyCost, 'items'> & { items: RawHourlyItem[] }
type RawDailyCost = { items: RawDailyItem[] }
type RawCurrentHourCost = Older<CurrentHourCost, 'totalKwhSoFar' | 'evCharger'>
/** An API without spec 019 leaves the car part's `cost` and `pricedAt` out: read as no cost figures. */
type RawEvChargerBillPart = Older<EvChargerBillPart, 'cost' | 'pricedAt'>
type RawMonthlyBill = Omit<
  Older<MonthlyBill, 'waterHeater' | 'totalKwh' | 'evCharger'>,
  'evCharger'
> & {
  evCharger?: RawEvChargerBillPart | null
}

function withParts<T extends RawHourlyItem | RawDailyItem>(item: T) {
  return {
    ...item,
    totalKwh: item.totalKwh ?? item.consumptionKwh,
    waterHeater: item.waterHeater ?? null,
    evCharger: item.evCharger ?? null,
  }
}

const normaliseHourly = (raw: RawPagedHourlyCost): PagedHourlyCost => ({
  ...raw,
  items: raw.items.map((item) => withParts(item)),
})
const normaliseDaily = (raw: RawDailyCost): DailyCost => ({
  items: raw.items.map((item) => withParts(item)),
})

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  return search.toString()
}

export function getCurrentHourCost(locationId: string): Promise<CurrentHourCost> {
  return api
    .get<RawCurrentHourCost>(`/api/electricity-cost/current?${query({ locationId })}`)
    .then((raw) => ({
      ...raw,
      totalKwhSoFar: raw.totalKwhSoFar ?? raw.consumptionKwhSoFar,
      evCharger: raw.evCharger ?? null,
    }))
}

/** Hourly cost from `fromUtc` (ISO) until `toUtc`, or until now when omitted. */
export function getHourlyCost(locationId: string, fromUtc: string, toUtc?: string) {
  return api
    .get<RawPagedHourlyCost>(
      `/api/electricity-cost/hourly?${query({ locationId, from: fromUtc, to: toUtc, pageSize: 500 })}`,
    )
    .then(normaliseHourly)
}

/** One page of hourly cost between two instants (ISO, both included), for paging through long ranges. */
export function getHourlyCostPage(
  locationId: string,
  fromUtc: string,
  toUtc: string,
  page: number,
  pageSize: number,
) {
  return api
    .get<RawPagedHourlyCost>(
      `/api/electricity-cost/hourly?${query({ locationId, from: fromUtc, to: toUtc, page, pageSize })}`,
    )
    .then(normaliseHourly)
}

/** Daily cost; the API defaults to the last 7 Oslo days. */
export function getDailyCost(locationId: string) {
  return api
    .get<RawDailyCost>(`/api/electricity-cost/daily?${query({ locationId })}`)
    .then(normaliseDaily)
}

/** Per-minute consumption from `fromUtc` until `toUtc`, or until now when omitted. */
export function getMinuteConsumption(locationId: string, fromUtc: string, toUtc?: string) {
  return api.get<Consumption>(
    `/api/consumption?${query({ locationId, granularity: 'minute', from: fromUtc, to: toUtc })}`,
  )
}

/** Hourly rates for one Oslo day (today when `date` is omitted), including hours without readings. */
export function getDayPrices(locationId: string, date?: string) {
  return api.get<DayPrices>(`/api/electricity-cost/prices?${query({ locationId, date })}`)
}

/** Daily cost for Oslo dates `fromDate` to `toDate` (yyyy-MM-dd, both included). */
export function getDailyCostRange(locationId: string, fromDate: string, toDate: string) {
  return api
    .get<RawDailyCost>(
      `/api/electricity-cost/daily?${query({ locationId, from: fromDate, to: toDate })}`,
    )
    .then(normaliseDaily)
}

/** The newest reading for a location, or null when it has none yet (the API answers 204). */
export async function getLatestMeasurement(locationId: string) {
  const latest = await api.get<LatestMeasurement | undefined>(
    `/api/measurements/latest?${query({ locationId })}`,
  )
  return latest ?? null
}

/** What Norgespris saves compared with spot terms: today, the last 7 days, the month and the year so far. */
export function getNorgesPrisSaving(locationId: string) {
  return api.get<NorgesPrisSaving>(`/api/electricity-cost/saving?${query({ locationId })}`)
}

/** The grid capacity charge of a month (yyyy-MM): the step, the amount and the three daily peaks behind it. */
export function getCapacityCharge(locationId: string, month: string) {
  return api.get<CapacityCharge>(`/api/electricity-cost/capacity?${query({ locationId, month })}`)
}

/** The bill of a month (yyyy-MM), line by line as the invoice: final for an ended month, an estimate for the current. */
export function getMonthlyBill(locationId: string, month: string): Promise<MonthlyBill> {
  return api
    .get<RawMonthlyBill>(`/api/electricity-cost/bill?${query({ locationId, month })}`)
    .then((raw) => ({
      ...raw,
      waterHeater: raw.waterHeater ?? null,
      totalKwh: raw.totalKwh ?? null,
      evCharger: raw.evCharger
        ? {
            ...raw.evCharger,
            cost: raw.evCharger.cost ?? null,
            pricedAt: raw.evCharger.pricedAt ?? null,
          }
        : null,
    }))
}

/** The water heater's state, read from OSO now. 404 when the location has no heater (or is not visible). */
export function getWaterHeaterState(locationId: string) {
  return api.get<WaterHeaterState>(`/api/locations/${locationId}/water-heater`)
}

/** The completed charging sessions of the last 30 days (the API's default range), newest first (API spec 016). */
export function getEvChargerSessions(locationId: string) {
  return api.get<{ items: EvChargerSession[] }>(`/api/locations/${locationId}/ev-charger/sessions`)
}

const LIVE_STATUSES: readonly EvChargerLiveStatus[] = [
  'charging',
  'connected',
  'finished',
  'noCar',
  'unknown',
  'offline',
  'noCharger',
]

/**
 * The car charger's state right now (API spec 021). A state the app doesn't know, perhaps added later, is read as
 * `unknown` (spec 017, research R1).
 */
export async function getEvChargerState(locationId: string): Promise<EvChargerLiveState> {
  const raw = await api.get<Omit<EvChargerLiveState, 'state'> & { state: string }>(
    `/api/locations/${locationId}/ev-charger/state`,
  )
  return { ...raw, state: isLiveStatus(raw.state) ? raw.state : 'unknown' }
}

const isLiveStatus = (state: string): state is EvChargerLiveStatus =>
  LIVE_STATUSES.some((known) => known === state)

/** The location's "count the car charger with the house" setting. Owner or Admin; a viewer gets 403. */
export function setEvChargerInclude(locationId: string, include: boolean) {
  return api.put<{ locationId: string; includeInTotals: boolean }>(
    `/api/locations/${locationId}/ev-charger/include`,
    { include },
  )
}

/** The water heater's average power per 5 minutes in a window (API spec 017). Send `from` on whole 5 minutes. */
export function getWaterHeaterPower(locationId: string, fromUtc: string, toUtc: string) {
  return api.get<WaterHeaterPower>(
    `/api/locations/${locationId}/water-heater/power?${query({ from: fromUtc, to: toUtc })}`,
  )
}

/**
 * The hot water used in the period of `period` that holds `date` (an Oslo yyyy-MM-dd), per hour, day or month (API
 * spec 020). Both are always sent, so the answer never depends on the server's idea of today.
 */
export function getHotWater(locationId: string, period: HotWaterPeriod, date: string) {
  return api.get<HotWater>(
    `/api/locations/${locationId}/water-heater/hot-water?${query({ period, date })}`,
  )
}

/** The Norgespris month of every location the caller can see that has Norgespris (API spec 018). */
export function getNorgesPrisStatus() {
  return api.get<NorgesPrisStatus>('/api/electricity-cost/norgespris-status')
}
