import type { ConsumptionItem, DailyCostItem, HourlyCostItem } from './types'
import type { Slot, Unit } from './periods'

const MINUTE_MS = 60_000
/** A reading older than this is not "now" any more. */
const STALE_AFTER_MS = 6 * MINUTE_MS

/** Power in kW from the latest per-minute energy reading (kWh per minute × 60), or null when it is stale or missing. */
export function currentPowerKw(items: ConsumptionItem[], now: Date): number | null {
  const latest = [...items].sort((a, b) => b.periodStart.localeCompare(a.periodStart))[0]
  if (!latest) return null
  if (now.getTime() - new Date(latest.periodStart).getTime() > STALE_AFTER_MS) return null
  return latest.consumptionKwh * 60
}

export interface HourTrend {
  direction: 'up' | 'down'
  /** Absolute difference in NOK. */
  amount: number
}

/**
 * Cost so far this hour against yesterday's same hour, scaled to the same elapsed part of the hour.
 * Null when yesterday has no price for that hour or the difference is under half an øre.
 */
export function hourTrend(
  costSoFar: number,
  yesterday: HourlyCostItem | undefined,
  elapsedFraction: number,
): HourTrend | null {
  const yesterdayCost = yesterday?.actual?.cost
  if (yesterdayCost === undefined) return null
  const difference = costSoFar - yesterdayCost * elapsedFraction
  if (Math.abs(difference) < 0.005) return null
  return { direction: difference < 0 ? 'down' : 'up', amount: Math.abs(difference) }
}

export interface UsagePoint {
  key: string
  label: string
  current: number | null
  previous: number | null
}

export interface UsageSeries {
  points: UsagePoint[]
  /** Total over the slots up to the last one with a current value. */
  total: number
  /** The previous period over the same slots, so the comparison is like for like. */
  previousTotal: number
  /** Null when there is nothing to compare with. */
  deltaPercent: number | null
  hasCurrent: boolean
  hasPrevious: boolean
}

/** One raw API row reduced to what the chart needs: where it falls and how much it holds. */
export interface UsageRow {
  key: string
  kwh: number
  /** null when the plan has no price for it. */
  nok: number | null
}

export function rowsFromHourly(items: HourlyCostItem[]): UsageRow[] {
  return items.map((item) => ({
    key: String(new Date(item.hourStart).getTime()),
    kwh: item.consumptionKwh,
    nok: item.actual?.cost ?? null,
  }))
}

/** Daily rows keyed by date, or by yyyy-MM when `byMonth` (the year view sums the days of a month). */
export function rowsFromDaily(items: DailyCostItem[], byMonth: boolean): UsageRow[] {
  const rows = new Map<string, UsageRow>()
  for (const item of items) {
    const key = byMonth ? item.date.slice(0, 7) : item.date
    const cost = item.actual?.cost ?? null
    const row = rows.get(key)
    if (!row) rows.set(key, { key, kwh: item.consumptionKwh, nok: cost })
    else {
      row.kwh += item.consumptionKwh
      row.nok = cost === null ? row.nok : (row.nok ?? 0) + cost
    }
  }
  return [...rows.values()]
}

function valuesBySlot(slots: Slot[], rows: UsageRow[], unit: Unit): (number | null)[] {
  const byKey = new Map(rows.map((row) => [row.key, row]))
  return slots.map((slot) => {
    const row = byKey.get(slot.key)
    if (!row) return null
    return unit === 'kwh' ? row.kwh : row.nok
  })
}

/** Aligns the current and previous period by position and totals them over the same slots. */
export function buildUsageSeries(
  currentSlots: Slot[],
  currentRows: UsageRow[],
  previousSlots: Slot[],
  previousRows: UsageRow[],
  unit: Unit,
): UsageSeries {
  const current = valuesBySlot(currentSlots, currentRows, unit)
  const previous = valuesBySlot(previousSlots, previousRows, unit)
  const points = currentSlots.map((slot, i) => ({
    key: slot.key,
    label: slot.label,
    current: current[i],
    previous: previous[i] ?? null,
  }))

  const last = current.reduce<number>((acc, value, i) => (value === null ? acc : i), -1)
  const upTo = points.slice(0, last + 1)
  const total = upTo.reduce((sum, point) => sum + (point.current ?? 0), 0)
  const previousTotal = upTo.reduce((sum, point) => sum + (point.previous ?? 0), 0)

  return {
    points,
    total,
    previousTotal,
    deltaPercent:
      previousTotal > 0 && last >= 0 ? ((total - previousTotal) / previousTotal) * 100 : null,
    hasCurrent: last >= 0,
    hasPrevious: previous.some((value) => value !== null),
  }
}

const BUCKET_MS = 5 * MINUTE_MS
const HOUR_MS = 60 * MINUTE_MS
export const RECENT_HOURS = 3
export const RECENT_WINDOW_MS = RECENT_HOURS * HOUR_MS
export const RECENT_BUCKETS = RECENT_WINDOW_MS / BUCKET_MS

export interface RecentPoint {
  label: string
  /** Average power in kW over the 5 minutes, null when there is no reading. */
  current: number | null
  previous: number | null
}

export interface RecentCost {
  /** NOK for the window, null when no hour with readings has a price. */
  cost: number | null
  /** Some readings fall in an hour without a price, so the cost is a lower bound. */
  incomplete: boolean
}

export interface RecentUsage {
  points: RecentPoint[]
  totalKwh: number
  /** Yesterday over the same elapsed time, so the comparison is like for like. */
  previousKwh: number
  deltaPercent: number | null
  cost: RecentCost
  previousCost: RecentCost
  costDeltaPercent: number | null
  hasCurrent: boolean
  hasPrevious: boolean
}

function bucketKw(items: ConsumptionItem[], startMs: number): (number | null)[] {
  const sums: (number | null)[] = Array(RECENT_BUCKETS).fill(null)
  for (const item of items) {
    const index = Math.floor((new Date(item.periodStart).getTime() - startMs) / BUCKET_MS)
    if (index < 0 || index >= RECENT_BUCKETS) continue
    sums[index] = (sums[index] ?? 0) + item.consumptionKwh
  }
  // kWh in 5 minutes is 12 times the average power in kW.
  return sums.map((sum) => (sum === null ? null : sum * 12))
}

function inWindow(item: ConsumptionItem, startMs: number, endMs: number): boolean {
  const t = new Date(item.periodStart).getTime()
  return t >= startMs && t < endMs
}

function totalKwh(items: ConsumptionItem[], startMs: number, endMs: number): number {
  return items
    .filter((item) => inWindow(item, startMs, endMs))
    .reduce((sum, item) => sum + item.consumptionKwh, 0)
}

/** Each minute of energy priced at the rate of the hour it falls in (the rates come from the hourly cost rows). */
function costOver(
  items: ConsumptionItem[],
  rates: HourlyCostItem[],
  startMs: number,
  endMs: number,
): RecentCost {
  const rateByHour = new Map(
    rates.map((row) => [new Date(row.hourStart).getTime(), row.actual?.ratePerKwh ?? null]),
  )
  let cost = 0
  let priced = 0
  let missing = 0
  for (const item of items.filter((i) => inWindow(i, startMs, endMs))) {
    const t = new Date(item.periodStart).getTime()
    const rate = rateByHour.get(Math.floor(t / HOUR_MS) * HOUR_MS) ?? null
    if (rate === null) missing += 1
    else {
      cost += item.consumptionKwh * rate
      priced += 1
    }
  }
  return { cost: priced === 0 ? null : cost, incomplete: missing > 0 }
}

const percent = (value: number | null, base: number | null) =>
  value !== null && base !== null && base > 0 ? ((value - base) / base) * 100 : null

export interface RecentUsageInput {
  current: ConsumptionItem[]
  previous: ConsumptionItem[]
  currentRates: HourlyCostItem[]
  previousRates: HourlyCostItem[]
  startMs: number
  previousStartMs: number
  now: Date
  /** Turns the start of a 5-minute step into the clock time shown on the axis. */
  label: (ms: number) => string
}

/** The last three hours in 5-minute steps against the same three hours yesterday (same Oslo clock time). */
export function buildRecentUsage(input: RecentUsageInput): RecentUsage {
  const { current, previous, startMs, previousStartMs } = input
  const currentKw = bucketKw(current, startMs)
  const previousKw = bucketKw(previous, previousStartMs)
  const elapsed = Math.min(Math.max(input.now.getTime() - startMs, 0), RECENT_WINDOW_MS)
  const kwh = totalKwh(current, startMs, startMs + elapsed)
  const previousKwh = totalKwh(previous, previousStartMs, previousStartMs + elapsed)
  const cost = costOver(current, input.currentRates, startMs, startMs + elapsed)
  const previousCost = costOver(previous, input.previousRates, previousStartMs, previousStartMs + elapsed)

  return {
    points: currentKw.map((value, i) => ({
      label: input.label(startMs + i * BUCKET_MS),
      current: value,
      previous: previousKw[i],
    })),
    totalKwh: kwh,
    previousKwh,
    deltaPercent: percent(kwh, previousKwh),
    cost,
    previousCost,
    costDeltaPercent: percent(cost.cost, previousCost.cost),
    hasCurrent: currentKw.some((value) => value !== null),
    hasPrevious: previousKw.some((value) => value !== null),
  }
}
