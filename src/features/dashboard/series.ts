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
