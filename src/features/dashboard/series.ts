import type {
  ConsumptionItem,
  DailyCostItem,
  EvChargerPart,
  HourlyCostItem,
  WaterHeaterPart,
  WaterHeaterPowerStep,
} from './types'
import { addDays, dayStart, type Slot, type Unit } from './periods'
import { elapsedMinutes, isPartlyMeasured, restOf, shareOf, sumParts } from './waterHeater'

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
  /** Water heating in the chosen unit, for the current period only; null without a heater figure. */
  heater: number | null
  /** Car charging in kWh when it is counted with the house (spec 013); always null in kr. */
  car: number | null
  /** Everything else: current − heater − car, or all of current when there is neither. */
  rest: number | null
  /** True when noticeably less of the slot's time than expected was sampled. */
  partly: boolean
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
  /** True when any slot of the current period has a water heating value. */
  hasHeater: boolean
  /** True when any slot of the current period has a car charging value. */
  hasCar: boolean
}

/** One raw API row reduced to what the chart needs: where it falls and how much it holds. */
export interface UsageRow {
  key: string
  /** The API's `totalKwh`: the house, plus the car when it is counted with the house (spec 013). */
  kwh: number
  /** null when the plan has no price for it. */
  nok: number | null
  /** The water heater's part (API spec 012); absent or null when the row has none. */
  heaterKwh?: number | null
  heaterNok?: number | null
  sampledMinutes?: number | null
  /** The minutes the sampled minutes are judged against: the slot's length, or its minutes so far. */
  expectedMinutes?: number
  /** The car's kWh when it is counted with the house; absent or null otherwise. Never priced. */
  carKwh?: number | null
  /** The car's own kWh, counted with the house or not, for the Car tab's chart (spec 019); null without charging. */
  carOwnKwh?: number | null
}

const HOUR_IN_MS = 3_600_000

/** The car's kWh only when it is counted: then it is in `totalKwh`, so drawing it as a part keeps the bar's height. */
const carKwhOf = (part: EvChargerPart | null) => (part?.included ? part.kwh : null)

function heaterFields(part: WaterHeaterPart | null) {
  return {
    heaterKwh: part?.kwh ?? null,
    heaterNok: part?.cost ?? null,
    sampledMinutes: part?.sampledMinutes ?? null,
  }
}

export function rowsFromHourly(items: HourlyCostItem[], now = new Date()): UsageRow[] {
  return items.map((item) => {
    const start = new Date(item.hourStart)
    return {
      key: String(start.getTime()),
      kwh: item.totalKwh,
      nok: item.actual?.cost ?? null,
      ...heaterFields(item.waterHeater),
      carKwh: carKwhOf(item.evCharger),
      carOwnKwh: item.evCharger?.kwh ?? null,
      expectedMinutes: elapsedMinutes(start, new Date(start.getTime() + HOUR_IN_MS), now),
    }
  })
}

/** The minutes of an Oslo day, or its minutes so far when it is today. */
const dayMinutes = (date: string, now: Date) =>
  elapsedMinutes(dayStart(date), dayStart(addDays(date, 1)), now)

/**
 * Daily rows keyed by date, or by yyyy-MM when `byMonth` (the year view sums the days of a month). A month's heater
 * part is the sum of its days' parts, judged against the minutes of the days that have one, so the days before the
 * heater was connected don't make the month look partly measured.
 */
export function rowsFromDaily(
  items: DailyCostItem[],
  byMonth: boolean,
  now = new Date(),
): UsageRow[] {
  const rows = new Map<string, { row: UsageRow; parts: WaterHeaterPart[] }>()
  for (const item of items) {
    const key = byMonth ? item.date.slice(0, 7) : item.date
    const cost = item.actual?.cost ?? null
    const part = item.waterHeater
    const car = carKwhOf(item.evCharger)
    const own = item.evCharger?.kwh ?? null
    const expected = part ? dayMinutes(item.date, now) : 0
    const entry = rows.get(key)
    if (!entry) {
      rows.set(key, {
        row: {
          key,
          kwh: item.totalKwh,
          nok: cost,
          ...heaterFields(part),
          expectedMinutes: expected,
          carKwh: car,
          carOwnKwh: own,
        },
        parts: part ? [part] : [],
      })
    } else {
      const { row } = entry
      row.kwh += item.totalKwh
      if (car !== null) row.carKwh = (row.carKwh ?? 0) + car
      if (own !== null) row.carOwnKwh = (row.carOwnKwh ?? 0) + own
      row.nok = cost === null ? row.nok : (row.nok ?? 0) + cost
      if (part) entry.parts.push(part)
      row.expectedMinutes = (row.expectedMinutes ?? 0) + expected
    }
  }
  return [...rows.values()].map(({ row, parts }) =>
    byMonth ? { ...row, ...heaterFields(sumParts(parts)) } : row,
  )
}

/**
 * The car's own kWh as rows of their own, for the Car tab's chart (spec 019): a slot without charging is 0 kWh, and a
 * period without any charging has no rows, so the chart says so instead of drawing zeros. In kWh only: never priced.
 */
export function carUsageRows(rows: UsageRow[]): UsageRow[] {
  if (!rows.some((row) => row.carOwnKwh != null)) return []
  return rows.map((row) => ({ key: row.key, kwh: row.carOwnKwh ?? 0, nok: null }))
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
  const rowsByKey = new Map(currentRows.map((row) => [row.key, row]))
  const points: UsagePoint[] = currentSlots.map((slot, i) => {
    const row = rowsByKey.get(slot.key)
    const value = current[i]
    // In kr, a part without a known cost gives no split for the slot.
    const heater =
      !row || value === null ? null : ((unit === 'kwh' ? row.heaterKwh : row.heaterNok) ?? null)
    // The car is counted in kWh only: it is never priced.
    const car = !row || value === null || unit !== 'kwh' ? null : (row.carKwh ?? null)
    const sampled = row?.sampledMinutes ?? null
    return {
      key: slot.key,
      label: slot.label,
      current: value,
      previous: previous[i] ?? null,
      heater,
      car,
      rest: heater === null && car === null ? value : restOf(value, (heater ?? 0) + (car ?? 0)),
      partly:
        heater !== null && sampled !== null && isPartlyMeasured(sampled, row?.expectedMinutes ?? 0),
    }
  })

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
    hasHeater: points.some((point) => point.heater !== null),
    hasCar: points.some((point) => point.car !== null),
  }
}

const BUCKET_MS = 5 * MINUTE_MS
const HOUR_MS = 60 * MINUTE_MS
export const RECENT_HOURS = 3
export const RECENT_WINDOW_MS = RECENT_HOURS * HOUR_MS
export const RECENT_BUCKETS = RECENT_WINDOW_MS / BUCKET_MS

/**
 * The "Last 3 hours" window: 36 steps on whole 5 minutes of the clock, the last one going on now (spec 014, R1). Whole
 * 5 minutes are the same in UTC and Oslo time, and they are where the water heater's steps start (API spec 017).
 */
export function recentWindow(now: Date): { startMs: number } {
  return {
    startMs: Math.floor(now.getTime() / BUCKET_MS) * BUCKET_MS - (RECENT_BUCKETS - 1) * BUCKET_MS,
  }
}

export interface RecentPoint {
  label: string
  /** Average power in kW over the minutes with a reading in the 5 minutes, null when there is none. */
  current: number | null
  previous: number | null
  /** The water heater's average kW in the step (spec 014); null without a step, or where the house has no reading. */
  heater: number | null
  /** What the chart draws: the heater, but never above the house (the two are measured apart). */
  heaterDrawn: number | null
  /** The house minus water heating, never below 0; null without a heater value. */
  rest: number | null
  /** A finished step with more than 2 minutes not sampled (spec 010's margin for 5 minutes). */
  partly: boolean
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
  /** True when any step has a water heating value. */
  hasHeater: boolean
  /** kWh the heater used in the steps so far (Σ kW × sampled time); null without steps, never 0 (spec 014, US3). */
  heaterKwh: number | null
  /** Water heating's share (0–1) of the house's kWh over the same time; null when the house has none. */
  heaterShare: number | null
}

/** More than this many unsampled seconds in a finished 5-minute step: max(2 minutes, 1 % of 5 minutes). */
const PARTLY_AFTER_SECONDS = 120

/**
 * The average power per step over the minutes that have a reading (kWh per minute × 60), so the step going on now and
 * a step with a missing minute read at their real power, as the water heater's steps do (spec 014, R2).
 */
function bucketKw(items: ConsumptionItem[], startMs: number): (number | null)[] {
  const sums: number[] = Array(RECENT_BUCKETS).fill(0)
  const counts: number[] = Array(RECENT_BUCKETS).fill(0)
  for (const item of items) {
    const index = Math.floor((new Date(item.periodStart).getTime() - startMs) / BUCKET_MS)
    if (index < 0 || index >= RECENT_BUCKETS) continue
    sums[index] += item.consumptionKwh
    counts[index] += 1
  }
  return sums.map((sum, i) => (counts[i] === 0 ? null : (sum / counts[i]) * 60))
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
  /** The water heater's 5-minute steps in today's window (API spec 017); absent without a heater. */
  heater?: WaterHeaterPowerStep[]
}

/** The heater steps by their place in the window; steps outside it are dropped. */
function heaterBySlot(steps: WaterHeaterPowerStep[], startMs: number) {
  const slots = new Map<number, WaterHeaterPowerStep>()
  for (const step of steps) {
    const index = Math.round((Date.parse(step.start) - startMs) / BUCKET_MS)
    if (index >= 0 && index < RECENT_BUCKETS) slots.set(index, step)
  }
  return slots
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
  const previousCost = costOver(
    previous,
    input.previousRates,
    previousStartMs,
    previousStartMs + elapsed,
  )

  const heater = heaterBySlot(input.heater ?? [], startMs)
  const points = currentKw.map((value, i): RecentPoint => {
    const stepStart = startMs + i * BUCKET_MS
    const step = value === null ? undefined : heater.get(i)
    const finished = stepStart + BUCKET_MS <= input.now.getTime()
    return {
      label: input.label(stepStart),
      current: value,
      previous: previousKw[i],
      heater: step?.powerKw ?? null,
      heaterDrawn: step && value !== null ? Math.min(step.powerKw, value) : null,
      rest: step && value !== null ? Math.max(0, value - step.powerKw) : null,
      partly: !!step && finished && 300 - step.sampledSeconds > PARTLY_AFTER_SECONDS,
    }
  })

  return {
    points,
    totalKwh: kwh,
    previousKwh,
    deltaPercent: percent(kwh, previousKwh),
    cost,
    previousCost,
    costDeltaPercent: percent(cost.cost, previousCost.cost),
    hasCurrent: currentKw.some((value) => value !== null),
    hasPrevious: previousKw.some((value) => value !== null),
    hasHeater: points.some((point) => point.heater !== null),
    ...heaterEnergy(input.heater ?? [], startMs + elapsed, kwh),
  }
}

/** The heater's kWh in the steps that started before `endMs`, by the API's energy rule, and its share of `houseKwh`. */
function heaterEnergy(steps: WaterHeaterPowerStep[], endMs: number, houseKwh: number) {
  const counted = steps.filter((step) => Date.parse(step.start) < endMs)
  if (counted.length === 0) return { heaterKwh: null, heaterShare: null }
  const heaterKwh = counted.reduce(
    (sum, step) => sum + (step.powerKw * step.sampledSeconds) / 3600,
    0,
  )
  return { heaterKwh, heaterShare: shareOf(heaterKwh, houseKwh) }
}

const kwText = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })

/**
 * The selected step's detail, after its clock time: "7,4 kW · Water heating 2 kW · Everything else 5,4 kW · yesterday
 * 6,1 kW". Water heating is left out without a heater value, never "0 kW".
 */
export function recentDetailText(point: RecentPoint, hasPrevious: boolean): string {
  if (point.current === null) return 'no reading'
  const parts = [`${kwText.format(point.current)} kW`]
  if (point.heater !== null) {
    parts.push(
      `Water heating ${kwText.format(point.heater)} kW${point.partly ? ' (partly measured)' : ''}`,
      `Everything else ${kwText.format(point.rest ?? 0)} kW`,
    )
  }
  if (hasPrevious && point.previous !== null) {
    parts.push(`yesterday ${kwText.format(point.previous)} kW`)
  }
  return parts.join(' · ')
}
