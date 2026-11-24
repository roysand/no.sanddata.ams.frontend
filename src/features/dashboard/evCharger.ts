import { formatAge, formatKw, formatKwh1, formatOsloTimeOrDate } from './format'
import type { DailyCostItem, EvChargerLiveState, EvChargerSession } from './types'

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

// ---- The charger's state right now (spec 017) -----------------------------------------------------------------------

/** How the charger drawing looks: the green line moves only while `charging`. */
export type ChargerPicture = 'charging' | 'plugged' | 'noCar' | 'faded'

export interface LiveView {
  heading: string
  /** In the order shown, joined by " · ". */
  details: string[]
  picture: ChargerPicture
  /** The drawing's text for screen readers. */
  label: string
  /** "updated 2 minutes ago", from when the API read the charger. */
  age: string | null
}

const HEADING: Record<Exclude<EvChargerLiveState['state'], 'noCharger'>, string> = {
  charging: 'Charging',
  connected: 'Connected, not charging',
  finished: 'Finished charging',
  noCar: 'No car connected',
  offline: 'Offline',
  unknown: 'Status unknown',
}

export const PICTURE_LABEL: Record<ChargerPicture, string> = {
  charging: 'A car charging from the charger',
  plugged: 'A car connected to the charger, not charging',
  noCar: 'The charger with no car connected',
  faded: 'The car charger, state not known',
}

const PICTURE: Record<keyof typeof HEADING, ChargerPicture> = {
  charging: 'charging',
  connected: 'plugged',
  finished: 'plugged',
  noCar: 'noCar',
  offline: 'faded',
  unknown: 'faded',
}

/**
 * The Car tab's tile for a state (contracts/ui.md), or null for a location without a charger. Each detail is shown
 * only for the states the API sends it in, and a missing figure is left out, never shown as 0.
 */
export function liveView(live: EvChargerLiveState, now: Date): LiveView | null {
  if (live.state === 'noCharger') return null
  const { state } = live
  const at = (iso: string) => formatOsloTimeOrDate(iso, now)
  const details: string[] = []
  if (state === 'charging' && live.powerKw !== null) details.push(formatKw(live.powerKw))
  if (state !== 'offline' && state !== 'noCar' && live.sessionKwh !== null) {
    details.push(`${formatKwh1(live.sessionKwh)} this charge`)
  }
  if (state === 'charging' && live.chargingSince)
    details.push(`charging since ${at(live.chargingSince)}`)
  if (state !== 'offline' && live.pluggedInAt) details.push(`plugged in at ${at(live.pluggedInAt)}`)
  if (state === 'offline' && live.lastReportedAt)
    details.push(`last reported ${at(live.lastReportedAt)}`)

  const picture = PICTURE[state]
  return {
    heading: HEADING[state],
    details,
    picture,
    label: PICTURE_LABEL[picture],
    age: live.readAt ? formatAge((now.getTime() - new Date(live.readAt).getTime()) / 1000) : null,
  }
}
