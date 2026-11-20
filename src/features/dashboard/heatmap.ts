import { lastOsloDays } from './format'
import type { HourlyCostItem } from './types'

/** How many finished weeks the heatmap averages over. */
export const HEATMAP_WEEKS = 4

/** Monday first, as in Norway. */
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const WEEKDAY_NAMES = [
  'Mondays',
  'Tuesdays',
  'Wednesdays',
  'Thursdays',
  'Fridays',
  'Saturdays',
  'Sundays',
]

/** The weekday's full name, for sentences ("for a Saturday at this hour"). */
export const WEEKDAY_LONG = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const

const osloParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Oslo',
  weekday: 'short',
  hour: '2-digit',
  hourCycle: 'h23',
})

/**
 * The Oslo weekday (0 = Monday) and hour of an instant. The repeated hour on the night the clocks go back is the same
 * hour twice, as the meter readings count it.
 */
export function osloWeekdayHour(at: Date): { weekday: number; hour: number } | null {
  const parts = osloParts.formatToParts(at)
  const part = (type: string) => parts.find((p) => p.type === type)?.value
  const weekday = WEEKDAYS.findIndex((day) => day === part('weekday'))
  const hour = Number(part('hour'))
  if (weekday < 0 || !(hour >= 0 && hour < 24)) return null
  return { weekday, hour }
}

export interface HeatCell {
  /** 0 = Monday … 6 = Sunday */
  weekday: number
  /** Oslo hour of day, 0–23 */
  hour: number
  /** Average kWh in that hour on that weekday; null when there is no reading for it. */
  kwh: number | null
}

export interface Heatmap {
  /** 24 rows (hours 0–23) of 7 cells (Monday to Sunday). */
  rows: HeatCell[][]
  min: number
  max: number
  highest: HeatCell
  lowest: HeatCell
}

/** The finished Oslo days the heatmap covers, oldest first: the 28 days before today. */
export function heatmapDays(now: Date): string[] {
  const count = HEATMAP_WEEKS * 7
  return lastOsloDays(now, count + 1).slice(0, count)
}

/** "18–19" for the hour starting 18:00. */
export const hourRange = (hour: number) =>
  `${String(hour).padStart(2, '0')}–${String((hour + 1) % 24).padStart(2, '0')}`

/** "Mondays 18–19" */
export const cellName = (cell: HeatCell) => `${WEEKDAY_NAMES[cell.weekday]} ${hourRange(cell.hour)}`

/**
 * The average kWh of each hour of each weekday, in Oslo time. Each weekday occurs once a week, so a cell is the
 * average of up to 4 hours (5 on the night the clocks go back, when 02–03 happens twice). Null without readings.
 */
export function heatmapFrom(items: HourlyCostItem[]): Heatmap | null {
  const sums = Array.from({ length: 24 }, () => Array.from({ length: 7 }, () => ({ kwh: 0, n: 0 })))
  for (const item of items) {
    const at = osloWeekdayHour(new Date(item.hourStart))
    if (!at) continue
    const { weekday, hour } = at
    sums[hour][weekday].kwh += item.consumptionKwh
    sums[hour][weekday].n += 1
  }

  const rows = sums.map((cells, hour) =>
    cells.map((sum, weekday): HeatCell => ({
      weekday,
      hour,
      kwh: sum.n > 0 ? sum.kwh / sum.n : null,
    })),
  )
  const filled = rows.flat().filter((cell): cell is HeatCell & { kwh: number } => cell.kwh !== null)
  if (filled.length === 0) return null

  const highest = filled.reduce((a, b) => (b.kwh > a.kwh ? b : a))
  const lowest = filled.reduce((a, b) => (b.kwh < a.kwh ? b : a))
  return { rows, min: lowest.kwh, max: highest.kwh, highest, lowest }
}

/** Where a value sits between the lowest and the highest cell, 0–1 (0.5 when they are all the same). */
export function level(kwh: number, min: number, max: number): number {
  return max > min ? (kwh - min) / (max - min) : 0.5
}
