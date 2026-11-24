import type { PricingModel } from './types'

const OSLO = 'Europe/Oslo'

const nok = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' })
const decimal = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })
const twoDecimals = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const hourFormat = new Intl.DateTimeFormat('nb-NO', {
  timeZone: OSLO,
  hour: '2-digit',
  minute: '2-digit',
})

export const formatNok = (value: number) => nok.format(value)
export const formatKwh = (value: number) => `${decimal.format(value)} kWh`
/** Always two decimals, as on an invoice: 240.31 -> "240,31 kWh", 1 -> "1,00 kWh". */
export const formatKwh2 = (value: number) => `${twoDecimals.format(value)} kWh`
const rate = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const formatRate = (value: number) => `${rate.format(value)} kr/kWh`

/** "14:00" in Oslo time for a UTC ISO timestamp. */
export const formatClock = (isoUtc: string) => hourFormat.format(new Date(isoUtc))

const secondsFormat = new Intl.DateTimeFormat('nb-NO', {
  timeZone: OSLO,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** "14:03:27" in Oslo time for a UTC ISO timestamp. */
export const formatClockSeconds = (isoUtc: string) => secondsFormat.format(new Date(isoUtc))

const osloDate = new Intl.DateTimeFormat('nb-NO', {
  timeZone: OSLO,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

/** "20.11.2026": the Oslo calendar date of a UTC ISO timestamp. */
export const formatOsloDate = (isoUtc: string) => osloDate.format(new Date(isoUtc))

/** "2026-10-03" -> "03.10." */
export const formatDay = (isoDate: string) => `${isoDate.slice(8, 10)}.${isoDate.slice(5, 7)}.`

export function modelLabel(model: PricingModel): string {
  return model === 'NorgesPris' ? 'Norgespris' : 'Spot price'
}

export function otherModel(model: PricingModel): PricingModel {
  return model === 'Spot' ? 'NorgesPris' : 'Spot'
}

/** Milliseconds Oslo is ahead of UTC at the given instant (3 600 000 in winter, 7 200 000 in summer). */
function osloOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: OSLO,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return asUtc - Math.floor(at.getTime() / 1000) * 1000
}

/** The UTC instant at which the current Oslo calendar day started (DST-safe: midnight is never in a shift). */
export function osloDayStartUtc(now: Date): Date {
  const offset = osloOffsetMs(now)
  const localNow = new Date(now.getTime() + offset)
  const localMidnightAsUtc = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
  )
  return new Date(localMidnightAsUtc - osloOffsetMs(new Date(localMidnightAsUtc - offset)))
}

const HOUR_MS = 3_600_000

/** Every hour start (UTC instants) from Oslo midnight up to and including the current hour. */
export function hoursSinceOsloMidnight(now: Date): Date[] {
  const start = osloDayStartUtc(now).getTime()
  const hours: Date[] = []
  for (let t = start; t <= now.getTime(); t += HOUR_MS) hours.push(new Date(t))
  return hours
}

/** The last `count` Oslo calendar days as yyyy-MM-dd, oldest first, ending with today. */
export function lastOsloDays(now: Date, count: number): string[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: OSLO }).format(now) // yyyy-MM-dd
  const [y, m, d] = today.split('-').map(Number)
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (count - 1 - i))).toISOString().slice(0, 10),
  )
}

/** The same Oslo wall-clock time one calendar day earlier (DST-safe: yesterday may have 23 or 25 hours). */
export function sameHourYesterday(hourStartUtc: Date): Date {
  const local = new Date(hourStartUtc.getTime() + osloOffsetMs(hourStartUtc))
  const wall = Date.UTC(
    local.getUTCFullYear(),
    local.getUTCMonth(),
    local.getUTCDate() - 1,
    local.getUTCHours(),
    local.getUTCMinutes(),
  )
  // Wall-clock time to instant: subtract the offset in force at that moment (settled in two steps).
  const first = wall - osloOffsetMs(new Date(wall))
  return new Date(wall - osloOffsetMs(new Date(first)))
}

const krPerKwh = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
})

/** 0.0813 -> "0,0813 kr/kWh"; the parts of a price need up to four decimals, the precision of the API. */
export const formatKrPerKwh = (value: number) => `${krPerKwh.format(value)} kr/kWh`

const whole = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

/**
 * How to say a Norgespris saving: positive is "Saved", negative is an "Extra cost" (shown without the minus sign, the
 * word carries it), and a difference that rounds to nothing is "No difference".
 */
export function formatSaving(saving: number): {
  label: 'Saved' | 'Extra cost' | 'No difference'
  amount: string
} {
  const rounded = Math.round(saving * 100) / 100
  if (rounded === 0) return { label: 'No difference', amount: whole.format(0) }
  return {
    label: rounded > 0 ? 'Saved' : 'Extra cost',
    amount: whole.format(Math.abs(rounded)),
  }
}

export const SAVING_PERIOD_LABELS = {
  Today: 'Today',
  Last7Days: 'Last 7 days',
  MonthToDate: 'This month',
  YearToDate: 'This year',
} as const

const monthName = new Intl.DateTimeFormat('en-GB', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})
const oneDecimal = new Intl.NumberFormat('nb-NO', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})

/** The Oslo calendar month of an instant, yyyy-MM. */
export const osloMonth = (now: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: OSLO }).format(now).slice(0, 7)

/** "2026-01" moved by `n` months ("2025-12" for -1). */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number)
  const total = y * 12 + (m - 1) + n
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, '0')}`
}

/** "2026-10" -> "October 2026" */
export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return monthName.format(new Date(Date.UTC(y, m - 1, 1)))
}

/** 5.4 -> "5,4 kW" */
export const formatKw = (value: number) => `${oneDecimal.format(value)} kW`

/** 70.1 -> "70,1 °C" */
/** Always one decimal: 12.962 -> "13,0 kWh". */
export const formatKwh1 = (value: number) => `${oneDecimal.format(value)} kWh`

export const formatCelsius = (value: number) => `${oneDecimal.format(value)} °C`

/** How old a reading is, in words: "updated just now", "updated 5 minutes ago", "updated 2 hours ago". */
export function formatAge(seconds: number): string {
  const age = Math.max(seconds, 0)
  if (age < 60) return 'updated just now'
  if (age < 3600) {
    const minutes = Math.floor(age / 60)
    return `updated ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`
  }
  const hours = Math.floor(age / 3600)
  return `updated ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`
}

const osloDayKey = (at: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: OSLO }).format(at)

/** Today's Oslo calendar date as yyyy-MM-dd, the form date inputs and the API use. */
export function osloToday(now = new Date()): string {
  return osloDayKey(now)
}

/**
 * A yyyy-MM-dd date moved by whole years on the calendar. 29 February becomes 28 February in a year without it, as
 * the API's DateOnly.AddYears does.
 */
export function addYearsToDate(date: string, years: number): string {
  const [y, m, d] = date.split('-').map(Number)
  const lastDay = new Date(Date.UTC(y + years, m, 0)).getUTCDate()
  return new Date(Date.UTC(y + years, m - 1, Math.min(d, lastDay))).toISOString().slice(0, 10)
}

/** "today 19:40", "tomorrow 19:40" or "25.11. 19:40", in Oslo time. */
export function formatOsloDateTime(isoUtc: string, now = new Date()): string {
  const at = new Date(isoUtc)
  const day = osloDayKey(at)
  const clock = formatClock(isoUtc)
  if (day === osloDayKey(now)) return `today ${clock}`
  // Step the calendar date, not 24 hours: an Oslo day around a clock change has 23 or 25 hours.
  const tomorrow = new Date(`${osloDayKey(now)}T00:00:00Z`)
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  if (day === tomorrow.toISOString().slice(0, 10)) return `tomorrow ${clock}`
  return `${formatDay(day)} ${clock}`
}

/** "16:37" for a time on the Oslo day of `now`, otherwise "23.11. 23:10", in Oslo time. */
export function formatOsloTimeOrDate(isoUtc: string, now = new Date()): string {
  const clock = formatClock(isoUtc)
  const day = osloDayKey(new Date(isoUtc))
  return day === osloDayKey(now) ? clock : `${formatDay(day)} ${clock}`
}
