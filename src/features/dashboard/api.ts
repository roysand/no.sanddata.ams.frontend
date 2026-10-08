import { api } from '../../lib/apiClient'
import type {
  Consumption,
  CurrentHourCost,
  DailyCost,
  PagedHourlyCost,
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

/** Hourly cost from `fromUtc` (ISO) until now. */
export function getHourlyCost(locationId: string, fromUtc: string) {
  return api.get<PagedHourlyCost>(
    `/api/electricity-cost/hourly?${query({ locationId, from: fromUtc, pageSize: 500 })}`,
  )
}

/** Daily cost; the API defaults to the last 7 Oslo days. */
export function getDailyCost(locationId: string) {
  return api.get<DailyCost>(`/api/electricity-cost/daily?${query({ locationId })}`)
}

export function getMinuteConsumption(locationId: string, fromUtc: string) {
  return api.get<Consumption>(
    `/api/consumption?${query({ locationId, granularity: 'minute', from: fromUtc })}`,
  )
}
