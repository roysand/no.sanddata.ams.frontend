import { addDays } from './periods'
import { osloToday } from './format'
import type { DayPrices, NorgesPrisStatusItem } from './types'

// The rules behind the Norgespris lines of the warnings banner (spec 015). They are pure and take the time as a
// parameter, so they are tested at exact minutes. The thresholds are fixed in this version and named here.

/** From this share of the limit, the location is approaching it. */
export const APPROACHING_SHARE = 0.9
/** An hour is expensive when its spot energy price is at least this many times the Norgespris price. */
export const EXPENSIVE_FACTOR = 4

const DAY_MS = 86_400_000

// ---- The limit (US1, US2, research R3) ----------------------------------------------------------------------------

export type LimitWarning =
  | { kind: 'over'; kwhSoFar: number; limitKwh: number; resetsAt: string }
  | {
      kind: 'approaching'
      kwhSoFar: number
      limitKwh: number
      /** Whole days (≥ 2) until the limit at the month's pace, or by Oslo date; null when not projected over it. */
      reachedIn: 'today' | 'tomorrow' | number | null
      projectedKwh: number | null
    }
  | { kind: 'projected'; projectedKwh: number; limitKwh: number }

/** At most one limit warning per location: over, then approaching, then projected over (FR-005). */
export function limitWarning(item: NorgesPrisStatusItem, now: Date): LimitWarning | null {
  const { limitKwh, kwhSoFar, projectedKwh, resetsAt } = item
  if (limitKwh === null) return null
  if (item.overLimit) return { kind: 'over', kwhSoFar, limitKwh, resetsAt }

  if (kwhSoFar >= APPROACHING_SHARE * limitKwh) {
    const reachedIn =
      projectedKwh !== null && projectedKwh > limitKwh
        ? daysUntilLimit(kwhSoFar, limitKwh, projectedKwh, resetsAt, now)
        : null
    return { kind: 'approaching', kwhSoFar, limitKwh, reachedIn, projectedKwh }
  }

  if (projectedKwh !== null && projectedKwh > limitKwh) {
    return { kind: 'projected', projectedKwh, limitKwh }
  }
  return null
}

/** The month's projected kWh still to come, spread evenly over the time left to the reset. */
function daysUntilLimit(
  kwhSoFar: number,
  limitKwh: number,
  projectedKwh: number,
  resetsAt: string,
  now: Date,
): 'today' | 'tomorrow' | number {
  const daysLeft = (new Date(resetsAt).getTime() - now.getTime()) / DAY_MS
  if (daysLeft <= 0) return 'today'
  const pacePerDay = (projectedKwh - kwhSoFar) / daysLeft
  const days = (limitKwh - kwhSoFar) / pacePerDay
  const reached = osloToday(new Date(now.getTime() + days * DAY_MS))
  const today = osloToday(now)
  if (reached <= today) return 'today'
  if (reached === addDays(today, 1)) return 'tomorrow'
  return Math.max(2, Math.round(days))
}

/** Whether a warning needs tomorrow's prices: only when the spot price changes the bill (FR-010). */
export function needsTomorrow(warning: LimitWarning | null): boolean {
  if (!warning) return false
  if (warning.kind === 'approaching') {
    return warning.projectedKwh !== null && warning.projectedKwh > warning.limitKwh
  }
  return true
}

// ---- Expensive hours tomorrow (US3, research R4) ------------------------------------------------------------------

export interface ExpensiveHours {
  /** Oslo clock hours; `toHour` is the end, so 22–24 ends at midnight. */
  ranges: { fromHour: number; toHour: number }[]
  /** Expensive hours in all. */
  hours: number
  /** The highest spot energy price among them. */
  maxPrice: number
}

const osloHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Oslo',
  hour: '2-digit',
  hourCycle: 'h23',
})

/**
 * The day's hours whose spot energy price is at least 4 × the Norgespris price, as ranges of consecutive hours. Null
 * when none is, when the Norgespris price is missing or not positive, or when the day isn't published.
 */
export function expensiveHours(
  day: DayPrices | undefined,
  pricePerKwh: number | null,
): ExpensiveHours | null {
  if (!day || pricePerKwh === null || pricePerKwh <= 0) return null
  const threshold = EXPENSIVE_FACTOR * pricePerKwh

  const ranges: ExpensiveHours['ranges'] = []
  let hours = 0
  let maxPrice = -Infinity
  let open = false
  for (const item of day.items) {
    const price = item.spotEnergyPricePerKwh ?? null
    if (price === null || price < threshold) {
      open = false
      continue
    }
    const hour = Number(osloHour.format(new Date(item.hourStart)))
    if (open) ranges[ranges.length - 1].toHour = hour + 1
    else ranges.push({ fromHour: hour, toHour: hour + 1 })
    open = true
    hours++
    maxPrice = Math.max(maxPrice, price)
  }
  return hours === 0 ? null : { ranges, hours, maxPrice }
}
