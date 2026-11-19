import { api } from '../../lib/apiClient'
import type {
  CapacityCharge,
  Consumption,
  CurrentHourCost,
  DailyCost,
  DayPrices,
  LatestMeasurement,
  MonthlyBill,
  NorgesPrisSaving,
  PagedHourlyCost,
  WaterHeaterState,
} from './types'

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value))
  }
  return search.toString()
}

export function getCurrentHourCost(locationId: string) {
  return api.get<CurrentHourCost>(`/api/electricity-cost/current?${query({ locationId })}`)
}

/** Hourly cost from `fromUtc` (ISO) until `toUtc`, or until now when omitted. */
export function getHourlyCost(locationId: string, fromUtc: string, toUtc?: string) {
  return api.get<PagedHourlyCost>(
    `/api/electricity-cost/hourly?${query({ locationId, from: fromUtc, to: toUtc, pageSize: 500 })}`,
  )
}

/** One page of hourly cost between two instants (ISO, both included), for paging through long ranges. */
export function getHourlyCostPage(
  locationId: string,
  fromUtc: string,
  toUtc: string,
  page: number,
  pageSize: number,
) {
  return api.get<PagedHourlyCost>(
    `/api/electricity-cost/hourly?${query({ locationId, from: fromUtc, to: toUtc, page, pageSize })}`,
  )
}

/** Daily cost; the API defaults to the last 7 Oslo days. */
export function getDailyCost(locationId: string) {
  return api.get<DailyCost>(`/api/electricity-cost/daily?${query({ locationId })}`)
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
  return api.get<DailyCost>(
    `/api/electricity-cost/daily?${query({ locationId, from: fromDate, to: toDate })}`,
  )
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
export function getMonthlyBill(locationId: string, month: string) {
  return api.get<MonthlyBill>(`/api/electricity-cost/bill?${query({ locationId, month })}`)
}

/** The water heater's state, read from OSO now. 404 when the location has no heater (or is not visible). */
export function getWaterHeaterState(locationId: string) {
  return api.get<WaterHeaterState>(`/api/locations/${locationId}/water-heater`)
}
