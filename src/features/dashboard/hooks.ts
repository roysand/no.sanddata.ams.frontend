import { useEffect, useState } from 'react'
import {
  keepPreviousData,
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type UseQueryResult,
} from '@tanstack/react-query'
import { ApiError } from '../../lib/apiClient'
import {
  getCapacityCharge,
  getCurrentHourCost,
  getDailyCost,
  getDailyCostRange,
  getDayPrices,
  getHourlyCost,
  getHourlyCostPage,
  getLatestMeasurement,
  getMinuteConsumption,
  getMonthlyBill,
  getNorgesPrisSaving,
  getNorgesPrisStatus,
  getWaterHeaterPower,
  getWaterHeaterState,
  getEvChargerState,
  getHotWater,
  setHighDemand,
  setEvChargerInclude,
} from './api'
import { osloDayStartUtc, osloMonth, osloToday, sameHourYesterday } from './format'
import { addDays, dayStart, periodPlan, type Period, type PeriodWindow } from './periods'
import { heatmapDays, heatmapFrom } from './heatmap'
import { standbyDays, standbyFrom } from './standby'
import {
  RECENT_WINDOW_MS,
  recentWindow,
  rowsFromDaily,
  rowsFromHourly,
  type UsageRow,
} from './series'
import type { Consumption, DayPrices, HotWaterPeriod, HourlyCostItem } from './types'
import { usualPower } from './usual'

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
/** Hourly prices for one Oslo day (yyyy-MM-dd); today when no date is given. */
export function useDayPrices(locationId: string | undefined, date?: string) {
  return useQuery({
    queryKey: ['prices', date ?? 'today', locationId],
    queryFn: () => getDayPrices(locationId!, date),
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

/** A period and the one before it for one location: hourly rows for the day view, daily rows otherwise. */
async function fetchPeriod(locationId: string, period: Period, offset: number) {
  const plan = periodPlan(period, new Date(), offset)
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

function periodQuery(locationId: string, period: Period, offset = 0) {
  const plan = periodPlan(period, new Date(), offset)
  const isCurrent = offset === 0
  // Only the period going on now gets new readings.
  const refetchInterval: number | false = !isCurrent
    ? false
    : period === 'day'
      ? 5 * ONE_MINUTE
      : 15 * ONE_MINUTE
  return {
    queryKey: ['usage', locationId, period, plan.current.fromDate, plan.current.toDate],
    queryFn: () => fetchPeriod(locationId, period, offset),
    refetchInterval,
    // The year view reads a lot of data, and a past period rarely changes (only when prices are corrected); keep
    // them for a while instead of refetching on every visit.
    staleTime: period === 'year' || !isCurrent ? 15 * ONE_MINUTE : 0,
  }
}

/** A period (`offset` 0 = now, -1 = the one before, …) and the period before it, for the usage chart. */
export function usePeriodData(locationId: string | undefined, period: Period, offset = 0) {
  return useQuery({
    ...periodQuery(locationId ?? '', period, offset),
    enabled: !!locationId,
    // Keep the chart on screen while the next period loads, instead of flashing a skeleton at every step.
    placeholderData: keepPreviousData,
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

/** The last three hours of per-minute usage, with hourly rates for the cost, and the same three hours yesterday (same Oslo clock time). */
export function useRecentUsage(locationId: string | undefined) {
  return useQuery({
    queryKey: ['consumption', 'recent', locationId],
    queryFn: async () => {
      // On whole 5 minutes, so the steps line up with the water heater's (spec 014).
      const { startMs } = recentWindow(new Date())
      const previousStartMs = sameHourYesterday(new Date(startMs)).getTime()
      const iso = (ms: number) => new Date(ms).toISOString()
      // Hourly rows are keyed by the start of the hour, so ask from the hour the window begins in.
      const hourStart = (ms: number) => Math.floor(ms / HOUR_MS) * HOUR_MS
      const window = (from: number) =>
        Promise.all([
          getMinuteConsumption(locationId!, iso(from), iso(from + RECENT_WINDOW_MS)),
          getHourlyCost(locationId!, iso(hourStart(from)), iso(from + RECENT_WINDOW_MS)),
        ])
      const [[current, currentRates], [previous, previousRates]] = await Promise.all([
        window(startMs),
        window(previousStartMs),
      ])
      return {
        current: current.items,
        previous: previous.items,
        currentRates: currentRates.items,
        previousRates: previousRates.items,
        startMs,
        previousStartMs,
      }
    },
    enabled: !!locationId,
    refetchInterval: ONE_MINUTE,
  })
}

const TEN_SECONDS = 10_000

/** The newest reading for the "right now" card. The forwarder uploads about every 10 s, so poll at that pace. */
export function useLatestMeasurement(locationId: string | undefined) {
  return useQuery({
    queryKey: ['measurement', 'latest', locationId],
    queryFn: () => getLatestMeasurement(locationId!),
    enabled: !!locationId,
    refetchInterval: TEN_SECONDS,
  })
}

/** What Norgespris has saved. The key starts with `cost`, so a change to the price data refreshes it. */
export function useNorgesPrisSaving(locationId: string | undefined) {
  return useQuery({
    queryKey: ['cost', 'saving', locationId],
    queryFn: () => getNorgesPrisSaving(locationId!),
    enabled: !!locationId,
    refetchInterval: 15 * ONE_MINUTE,
  })
}

/**
 * The capacity charge of a month. Only the current month can still change, so only it is refreshed; the key starts
 * with `cost`, so a change to the price data refreshes it too.
 */
export function useCapacityCharge(
  locationId: string | undefined,
  month: string,
  isCurrent: boolean,
) {
  return useQuery({
    queryKey: ['cost', 'capacity', locationId, month],
    queryFn: () => getCapacityCharge(locationId!, month),
    enabled: !!locationId,
    refetchInterval: isCurrent ? 15 * ONE_MINUTE : false,
  })
}

/**
 * The bill of a month. Only the current month changes as readings arrive, so only it is refreshed. The key starts
 * with `cost`, so an admin pricing change refetches it.
 */
export function useMonthlyBill(locationId: string | undefined, month: string, isCurrent: boolean) {
  return useQuery({
    queryKey: ['cost', 'bill', locationId, month],
    queryFn: () => getMonthlyBill(locationId!, month),
    enabled: !!locationId,
    refetchInterval: isCurrent ? 15 * ONE_MINUTE : false,
  })
}

/**
 * The standby (base load) of the last 14 finished days, from their hourly use. It only changes when a day ends, so it
 * is fetched once an hour; the key holds the last day, so a new day fetches anew.
 */
export function useStandby(locationId: string | undefined) {
  const days = standbyDays(new Date())
  const first = days[0]
  const last = days[days.length - 1]
  return useQuery({
    queryKey: ['cost', 'standby', locationId, last],
    queryFn: async () => {
      const end = new Date(dayStart(addDays(last, 1)).getTime() - 1000).toISOString()
      const page = await getHourlyCost(locationId!, dayStart(first).toISOString(), end)
      return standbyFrom(page.items, new Date())
    },
    enabled: !!locationId,
    staleTime: 60 * ONE_MINUTE,
    refetchInterval: 60 * ONE_MINUTE,
  })
}

/**
 * The hourly figures of the last 4 finished weeks (672 hours, one page), shared by the heatmap and the usual power for
 * the warnings (spec 012), so they make one request. They only change when a day ends, so they are fetched once an
 * hour; the key holds the last day, so a new day fetches anew.
 */
function fourWeeksQuery(locationId: string | undefined) {
  const days = heatmapDays(new Date())
  const first = days[0]
  const last = days[days.length - 1]
  return {
    queryKey: ['cost', 'heatmap', locationId, last],
    queryFn: async () => {
      const end = new Date(dayStart(addDays(last, 1)).getTime() - 1000).toISOString()
      const page = await getHourlyCostPage(locationId!, dayStart(first).toISOString(), end, 1, 1000)
      return page.items
    },
    enabled: !!locationId,
    staleTime: 60 * ONE_MINUTE,
    refetchInterval: 60 * ONE_MINUTE,
  }
}

/** Average use per hour of each weekday over the last 4 finished weeks. */
export function useHeatmap(locationId: string | undefined) {
  return useQuery({ ...fourWeeksQuery(locationId), select: heatmapFrom })
}

/** The usual power for this Oslo hour and weekday: the median of the last 4 weeks, from the heatmap's request. */
export function useUsualPower(locationId: string | undefined, now: number) {
  return useQuery({
    ...fourWeeksQuery(locationId),
    select: (items: HourlyCostItem[]) => usualPower(items, new Date(now)),
  })
}

/** True for the API's 404, which for the water heater means "no heater here". */
export const isNotFound = (error: unknown) => error instanceof ApiError && error.status === 404

/**
 * The water heater's state, once a minute while the page is visible (each request makes the API ask OSO four
 * times). A 404 means there is no heater, so polling stops; no retries, since a failed read is tried again at the next
 * minute and OSO may already have taken 10 s to fail.
 */
export function useWaterHeaterState(locationId: string | undefined) {
  return useQuery({
    queryKey: ['water-heater', 'state', locationId],
    queryFn: () => getWaterHeaterState(locationId!),
    enabled: !!locationId,
    retry: false,
    refetchInterval: (query) => (isNotFound(query.state.error) ? false : ONE_MINUTE),
  })
}

/**
 * The car charger's state right now (spec 017, research R2), every 3 minutes: the API reads Zaptec no more often and
 * holds a failure for a minute, so asking sooner or retrying adds nothing. Shared by the Car tab and the Now page.
 * Asked only for a location with a charger; a 404 stops it.
 */
export function useEvChargerState(locationId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['ev-charger', 'state', locationId],
    queryFn: () => getEvChargerState(locationId!),
    enabled: !!locationId && enabled,
    retry: false,
    refetchInterval: (query) => (isNotFound(query.state.error) ? false : 3 * ONE_MINUTE),
  })
}

/**
 * The hot water used in a period (spec 018, research R2). The bars of the last period stay while the next loads. Only
 * the current period changes, so only it is read again, every 5 minutes.
 */
export function useHotWater(
  locationId: string | undefined,
  period: HotWaterPeriod,
  date: string,
  isCurrent: boolean,
) {
  return useQuery({
    queryKey: ['water-heater', 'hot-water', locationId, period, date],
    queryFn: () => getHotWater(locationId!, period, date),
    enabled: !!locationId,
    placeholderData: keepPreviousData,
    staleTime: 5 * ONE_MINUTE,
    refetchInterval: isCurrent ? 5 * ONE_MINUTE : false,
  })
}

/** The current time, refreshed every `intervalMs`, for text that moves on between fetches ("updated 2 minutes ago"). */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

/**
 * The month's days so far, for the Car tab's "Today" and "This month" (spec 013, research R5). One answer gives both,
 * so the month is never less than today. Every 15 minutes: Zaptec's sessions are read that often.
 */
export function useCarMonth(locationId: string | undefined) {
  const now = new Date()
  const month = osloMonth(now)
  return useQuery({
    queryKey: ['ev-charger', 'month', locationId, month],
    queryFn: () => getDailyCostRange(locationId!, `${month}-01`, osloToday(now)),
    enabled: !!locationId,
    refetchInterval: 15 * ONE_MINUTE,
  })
}

/**
 * Saves the "count the car charger with the house" setting (research R6). Every usage figure follows it, so on success
 * the location list (which holds the setting), the charts, the costs and the Car tab are fetched again.
 */
export function useEvChargerInclude(locationId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (include: boolean) => setEvChargerInclude(locationId, include),
    onSuccess: () =>
      Promise.all(
        [['locations'], ['usage'], ['cost'], ['ev-charger']].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  })
}

/**
 * Turns High Demand on or off (spec 020, research R2). The answer's state goes straight into the heater's cached state
 * for that location, so the tab shows it at once; without one, or when the outcome is unknown (503), the state is read
 * again. Never retried.
 */
export function useHighDemand(locationId: string) {
  const queryClient = useQueryClient()
  const stateKey = ['water-heater', 'state', locationId]
  return useMutation({
    mutationFn: (on: boolean) => setHighDemand(locationId, on),
    retry: 0,
    onSuccess: (answer) => {
      if (answer.state) queryClient.setQueryData(stateKey, answer.state)
      else return queryClient.invalidateQueries({ queryKey: stateKey })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 503) {
        return queryClient.invalidateQueries({ queryKey: stateKey })
      }
    },
  })
}

/**
 * The water heater's 5-minute steps for the "Last 3 hours" window that starts at `startMs` (spec 014, research R3). A
 * separate query, so a failure never holds back the house's power; asked for only for a location with a heater, once
 * the house's query has given the window.
 */
export function useRecentWaterHeater(
  locationId: string | undefined,
  startMs: number | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['water-heater', 'power', locationId, startMs],
    queryFn: () =>
      getWaterHeaterPower(
        locationId!,
        new Date(startMs!).toISOString(),
        new Date(startMs! + RECENT_WINDOW_MS).toISOString(),
      ),
    enabled: enabled && !!locationId && startMs !== undefined,
    refetchInterval: ONE_MINUTE,
    retry: false,
  })
}

/**
 * The Norgespris month of every location (spec 015, research R1), read once for all of them every 5 minutes. The key
 * starts with `cost`, so the car checkbox's invalidation of `['cost']` refreshes it at once.
 */
export function useNorgesPrisStatus() {
  return useQuery({
    queryKey: ['cost', 'norgespris-status'],
    queryFn: getNorgesPrisStatus,
    refetchInterval: 5 * ONE_MINUTE,
  })
}

/**
 * Tomorrow's prices for each of `locationIds` (spec 015, research R5), under the same key as `useDayPrices`, so the
 * cheapest-time card shares them. `now` moves the date at midnight.
 */
export function useTomorrowPrices(locationIds: string[], now: number) {
  const tomorrow = addDays(osloToday(new Date(now)), 1)
  return useQueries({
    queries: locationIds.map((id) => ({
      queryKey: ['prices', tomorrow, id],
      queryFn: () => getDayPrices(id, tomorrow),
      refetchInterval: 15 * ONE_MINUTE,
    })),
    combine: (results) =>
      Object.fromEntries(locationIds.map((id, i) => [id, results[i]?.data])) as Record<
        string,
        DayPrices | undefined
      >,
  })
}
