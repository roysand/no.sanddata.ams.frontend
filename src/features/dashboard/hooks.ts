import { useQuery } from '@tanstack/react-query'
import {
  getCurrentHourCost,
  getDailyCost,
  getHourlyCost,
  getMinuteConsumption,
} from './api'
import { osloDayStartUtc } from './format'

const ONE_MINUTE = 60_000

export function useCurrentHourCost(locationId: string | undefined) {
  return useQuery({
    queryKey: ['cost', 'current', locationId],
    queryFn: () => getCurrentHourCost(locationId!),
    enabled: !!locationId,
    refetchInterval: ONE_MINUTE,
  })
}

export function useTodayHourlyCost(locationId: string | undefined) {
  return useQuery({
    queryKey: ['cost', 'hourly-today', locationId],
    queryFn: () => getHourlyCost(locationId!, osloDayStartUtc(new Date()).toISOString()),
    enabled: !!locationId,
    refetchInterval: 5 * ONE_MINUTE,
  })
}

export function useDailyCost(locationId: string | undefined) {
  return useQuery({
    queryKey: ['cost', 'daily', locationId],
    queryFn: () => getDailyCost(locationId!),
    enabled: !!locationId,
    refetchInterval: 15 * ONE_MINUTE,
  })
}

export function useLastHourPower(locationId: string | undefined) {
  return useQuery({
    queryKey: ['consumption', 'minute', locationId],
    queryFn: () =>
      getMinuteConsumption(locationId!, new Date(Date.now() - 60 * ONE_MINUTE).toISOString()),
    enabled: !!locationId,
    refetchInterval: ONE_MINUTE,
  })
}
