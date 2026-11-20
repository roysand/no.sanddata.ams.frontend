import type { DailyCostItem, EvChargerSession } from './types'

const OSLO = 'Europe/Oslo'
const MINUTE_MS = 60_000

/** The car's charging today and this month so far, for the Car tab (spec 013, research R5). */
export interface CarMonth {
  /** kWh charged today; null when there was none, never 0. */
  today: number | null
  /** kWh charged this month so far; null when there was none, never 0. */
  month: number | null
  /** yyyy-MM-dd of the month's first charging day, when that is not the 1st. */
  since: string | null
  /** Charging hours without a house reading, so not in the hour-by-hour chart. */
  hoursWithoutReading: number
}

/**
 * Today and the month from the month's days (`items`, the 1st up to `today`). Both come from the same answer, so the
 * month can never be less than today, which a bill (finished hours only) and today's hours could disagree on.
 */
export function carMonth(items: DailyCostItem[], today: string): CarMonth {
  const charged = items
    .filter((item) => item.evCharger !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (charged.length === 0) return { today: null, month: null, since: null, hoursWithoutReading: 0 }
  const first = charged[0].date
  return {
    today: charged.find((item) => item.date === today)?.evCharger?.kwh ?? null,
    month: charged.reduce((sum, item) => sum + (item.evCharger?.kwh ?? 0), 0),
    since: first.endsWith('-01') ? null : first,
    hoursWithoutReading: charged.reduce(
      (sum, item) => sum + (item.evCharger?.hoursWithoutMeterReading ?? 0),
      0,
    ),
  }
}

const weekday = new Intl.DateTimeFormat('en-GB', { timeZone: OSLO, weekday: 'short' })
const dayMonth = new Intl.DateTimeFormat('nb-NO', {
  timeZone: OSLO,
  day: '2-digit',
  month: '2-digit',
})
const clock = new Intl.DateTimeFormat('nb-NO', {
  timeZone: OSLO,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})
const dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: OSLO })

/** "20.11", without the trailing dot nb-NO gives. */
const shortDate = (at: Date) => dayMonth.format(at).replace(/\.$/, '')

/**
 * A session's Oslo date ("Fri 20.11"), start and end times, and its length in minutes. The end carries its own date
 * ("21.11 02:30") when the session ends on a later Oslo day.
 */
export function sessionTimes(session: EvChargerSession) {
  const start = new Date(session.start)
  const end = new Date(session.end)
  const sameDay = dayKey.format(start) === dayKey.format(end)
  return {
    date: `${weekday.format(start)} ${shortDate(start)}`,
    from: clock.format(start),
    to: sameDay ? clock.format(end) : `${shortDate(end)} ${clock.format(end)}`,
    minutes: Math.round((end.getTime() - start.getTime()) / MINUTE_MS),
  }
}

/** "45 min", "4 h 38 min" or "12 h". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}
