import { formatAge, formatKw, formatKwh1, formatOsloTimeOrDate } from './format'
import type { DailyCostItem, EvChargerLiveState } from './types'

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

// ---- The charger's state right now (spec 017) -----------------------------------------------------------------------

/** How the charger drawing looks: the green line moves only while `charging`. */
export type ChargerPicture = 'charging' | 'plugged' | 'noCar' | 'faded'

export interface LiveView {
  heading: string
  /** In the order shown, joined by " · ". */
  details: string[]
  /** The same, on up to three lines for the Now tile: the speed, the charge's kWh, and the times (each a part). */
  lines: string[][]
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
  const power =
    state === 'charging' && live.powerKw !== null
      ? `${formatKw(live.powerKw)} charging speed`
      : null
  const charge =
    state !== 'offline' && state !== 'noCar' && live.sessionKwh !== null
      ? `${formatKwh1(live.sessionKwh)} this charge`
      : null
  const times = [
    state === 'charging' && live.chargingSince ? `charging since ${at(live.chargingSince)}` : null,
    state !== 'offline' && live.pluggedInAt ? `plugged in at ${at(live.pluggedInAt)}` : null,
    state === 'offline' && live.lastReportedAt ? `last reported ${at(live.lastReportedAt)}` : null,
  ].filter((text) => text !== null)
  const lines = [power ? [power] : [], charge ? [charge] : [], times].filter(
    (line) => line.length > 0,
  )

  const picture = PICTURE[state]
  return {
    heading: HEADING[state],
    details: [power, charge, ...times].filter((text) => text !== null),
    lines,
    picture,
    label: PICTURE_LABEL[picture],
    age: live.readAt ? formatAge((now.getTime() - new Date(live.readAt).getTime()) / 1000) : null,
  }
}
