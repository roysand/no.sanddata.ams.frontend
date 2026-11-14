import { api } from '../../lib/apiClient'
import type { Consumption, CurrentHourCost, DailyCost, DayPrices, PagedHourlyCost } from './types'

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
