import { osloToday } from '../dashboard'
import type { KeyKind, KeyReminder } from './types'

const DAY_MS = 86_400_000
/** Keys are flagged this many days before they expire, the same window as the API's reminder list. */
export const REMINDER_WINDOW_DAYS = 30

const kindName = (kind: KeyKind) => (kind === 'SensorKey' ? 'sensor key' : 'water heater key')

/** "The sensor key for Hytta expires in 12 days", "… expired yesterday", from the API's whole Oslo days. */
export function reminderText(r: KeyReminder): string {
  const subject = `The ${kindName(r.kind)} for ${r.locationName}`
  const d = r.daysLeft
  if (d > 1) return `${subject} expires in ${d} days`
  if (d === 1) return `${subject} expires tomorrow`
  if (d === 0) return `${subject} expires today`
  if (d === -1) return `${subject} expired yesterday`
  return `${subject} expired ${-d} days ago`
}

/** What has stopped once a key has expired. */
export function expiredConsequence(kind: KeyKind): string {
  return kind === 'SensorKey'
    ? 'Readings are refused until it is replaced'
    : "Heater data can't be read until it is replaced"
}

/** The badge next to a key's date in Admin: none far ahead, a warning within 30 days, urgent once expired. */
export function expiryBadge(daysLeft: number): { text: string; urgent: boolean } | null {
  if (daysLeft > REMINDER_WINDOW_DAYS) return null
  if (daysLeft < 0) return { text: 'expired', urgent: true }
  if (daysLeft === 0) return { text: 'expires today', urgent: false }
  if (daysLeft === 1) return { text: 'expires tomorrow', urgent: false }
  return { text: `expires in ${daysLeft} days`, urgent: false }
}

const dayNumber = (date: string) => {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d) / DAY_MS
}

/** Whole calendar days from `today` to `date`, both yyyy-MM-dd; negative when `date` has passed. */
export function daysUntilDate(date: string, today: string): number {
  return dayNumber(date) - dayNumber(today)
}

/**
 * The last Oslo day a sensor key is valid: it is valid up to its expiry instant, so one that expires at exactly Oslo
 * midnight was last valid the day before. The same rule as the API's reminder list (API spec 015, research R3).
 */
export function sensorKeyLastDay(expiresAtIso: string): string {
  return osloToday(new Date(new Date(expiresAtIso).getTime() - 1))
}
