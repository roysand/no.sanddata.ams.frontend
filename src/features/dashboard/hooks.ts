import { useQueries, useQuery, type UseQueryResult } from '@tanstack/react-query'
import {
  getCurrentHourCost,
  getDailyCost,
  getDailyCostRange,
  getDayPrices,
  getHourlyCost,
  getMinuteConsumption,
} from './api'
import { osloDayStartUtc, sameHourYesterday } from './format'
import { periodPlan, type Period, type PeriodWindow } from './periods'
import { rowsFromDaily, rowsFromHourly, type UsageRow } from './series'
import type { Consumption } from './types'

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

/** Today's hourly prices (all 24 hours, including the ones still to come). Prices rarely change within the day. */
export function useDayPrices(locationId: string | undefined) {
  return useQuery({
    queryKey: ['prices', 'today', locationId],
    queryFn: () => getDayPrices(locationId!),
    enabled: !!locationId,
    refetchInterval: 15 * ONE_MINUTE,
  })
}

const HOUR_MS = 3_600_000

/** The same Oslo clock hour yesterday, for the trend in the "right now" card. */
export function useYesterdayHour(
  locationId: string | undefined,
  currentHourStartUtc: string | undefined,
) {
  return useQuery({
    queryKey: ['cost', 'hourly-yesterday', locationId, currentHourStartUtc],
    queryFn: async () => {
      const from = sameHourYesterday(new Date(currentHourStartUtc!))
      const page = await getHourlyCost(
        locationId!,
        from.toISOString(),
        new Date(from.getTime() + HOUR_MS - 1000).toISOString(),
      )
      return page.items[0] ?? null
    },
    enabled: !!locationId && !!currentHourStartUtc,
    staleTime: 30 * 60_000,
  })
}

/** Current and previous period for one location: hourly rows for the day view, daily rows otherwise. */
async function fetchPeriod(locationId: string, period: Period) {
  const plan = periodPlan(period, new Date())
  const rowsFor = async (window: PeriodWindow): Promise<UsageRow[]> =>
    period === 'day'
      ? rowsFromHourly((await getHourlyCost(locationId, window.fromUtc, window.toUtc)).items)
      : rowsFromDaily(
          (await getDailyCostRange(locationId, window.fromDate, window.toDate)).items,
          period === 'year',
        )
  const [current, previous] = await Promise.all([rowsFor(plan.current), rowsFor(plan.previous)])
  return { plan, current, previous }
}

function periodQuery(locationId: string, period: Period) {
  const plan = periodPlan(period, new Date())
  return {
    queryKey: ['usage', locationId, period, plan.current.fromDate, plan.current.toDate],
    queryFn: () => fetchPeriod(locationId, period),
    refetchInterval: period === 'day' ? 5 * ONE_MINUTE : 15 * ONE_MINUTE,
    // The year view reads a lot of data; keep it for a while instead of refetching on every visit.
    staleTime: period === 'year' ? 15 * ONE_MINUTE : 0,
  }
}

/** Current and previous period for the usage chart. */
export function usePeriodData(locationId: string | undefined, period: Period) {
  return useQuery({
    ...periodQuery(locationId ?? '', period),
    enabled: !!locationId,
  })
}

/**
 * Today's hourly usage, the current power and the chosen period for each location, for the all-locations
 * page. One request per location and kind, so a failing location only affects its own card.
 */
export function useLocationSnapshots(locationIds: string[], period: 'day' | 'week' | 'month') {
  const results = useQueries({
    queries: locationIds.flatMap((id) => [
      periodQuery(id, 'day'),
      {
        queryKey: ['consumption', 'minute', id],
        queryFn: () =>
          getMinuteConsumption(id, new Date(Date.now() - 60 * ONE_MINUTE).toISOString()),
        refetchInterval: ONE_MINUTE,
      },
      periodQuery(id, period),
    ]),
  })

  return locationIds.map((id, i) => ({
    id,
    day: results[i * 3] as UseQueryResult<Awaited<ReturnType<typeof fetchPeriod>>>,
    power: results[i * 3 + 1] as UseQueryResult<Consumption>,
    period: results[i * 3 + 2] as UseQueryResult<Awaited<ReturnType<typeof fetchPeriod>>>,
  }))
}
