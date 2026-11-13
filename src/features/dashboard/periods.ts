import { lastOsloDays, osloDayStartUtc } from './format'

export type Period = 'day' | 'week' | 'month' | 'year'
export type Unit = 'kwh' | 'nok'

export interface Slot {
  /** Hour start (UTC ms, as a string) for day, yyyy-MM-dd for week and month, yyyy-MM for year. */
  key: string
  label: string
}

export interface PeriodWindow {
  title: string
  slots: Slot[]
  /** Oslo dates (yyyy-MM-dd), inclusive, for the daily endpoint. */
  fromDate: string
  toDate: string
  /** UTC instants, for the hourly endpoint. */
  fromUtc: string
  toUtc: string
}

export interface PeriodPlan {
  period: Period
  current: PeriodWindow
  previous: PeriodWindow
}

const HOUR_MS = 3_600_000
const oslo = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', ...options })
const clock = oslo({ hour: '2-digit', hourCycle: 'h23' })
const weekday = oslo({ weekday: 'short' })
const monthName = oslo({ month: 'short' })
const monthLong = oslo({ month: 'long' })

/** Noon UTC of an Oslo date is always on that same date in Oslo, so it is a safe anchor for date maths. */
const anchor = (date: string) => new Date(`${date}T12:00:00Z`)
const dayStart = (date: string) => osloDayStartUtc(anchor(date))

export function addDays(date: string, days: number): string {
  const moved = anchor(date)
  moved.setUTCDate(moved.getUTCDate() + days)
  return moved.toISOString().slice(0, 10)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function hourWindow(date: string, title: string): PeriodWindow {
  const start = dayStart(date).getTime()
  const end = dayStart(addDays(date, 1)).getTime()
  const slots: Slot[] = []
  for (let t = start; t < end; t += HOUR_MS) {
    slots.push({ key: String(t), label: clock.format(new Date(t)) })
  }
  return {
    title,
    slots,
    fromDate: date,
    toDate: date,
    fromUtc: new Date(start).toISOString(),
    toUtc: new Date(end - 1000).toISOString(),
  }
}

function dayWindow(first: string, count: number, title: string, label: (d: string) => string) {
  const slots: Slot[] = Array.from({ length: count }, (_, i) => {
    const date = addDays(first, i)
    return { key: date, label: label(date) }
  })
  const last = slots[slots.length - 1].key
  return {
    title,
    slots,
    fromDate: first,
    toDate: last,
    fromUtc: dayStart(first).toISOString(),
    toUtc: new Date(dayStart(addDays(last, 1)).getTime() - 1000).toISOString(),
  } satisfies PeriodWindow
}

function monthWindow(year: number, title: string): PeriodWindow {
  const slots: Slot[] = Array.from({ length: 12 }, (_, i) => ({
    key: `${year}-${String(i + 1).padStart(2, '0')}`,
    label: monthName.format(new Date(Date.UTC(year, i, 15))),
  }))
  const first = `${year}-01-01`
  const last = `${year}-12-31`
  return {
    title,
    slots,
    fromDate: first,
    toDate: last,
    fromUtc: dayStart(first).toISOString(),
    toUtc: new Date(dayStart(addDays(last, 1)).getTime() - 1000).toISOString(),
  }
}

/** The current period and the equivalent previous one, in Europe/Oslo time. */
export function periodPlan(period: Period, now: Date): PeriodPlan {
  const today = lastOsloDays(now, 1)[0]
  const [year, month] = today.split('-').map(Number)

  if (period === 'day') {
    return {
      period,
      current: hourWindow(today, 'Today'),
      previous: hourWindow(addDays(today, -1), 'Yesterday'),
    }
  }

  if (period === 'week') {
    const label = (d: string) => weekday.format(anchor(d))
    return {
      period,
      current: dayWindow(addDays(today, -6), 7, 'Last 7 days', label),
      previous: dayWindow(addDays(today, -13), 7, 'The 7 days before', label),
    }
  }

  if (period === 'month') {
    const label = (d: string) => String(Number(d.slice(8, 10)))
    const previousMonth = month === 1 ? 12 : month - 1
    const previousYear = month === 1 ? year - 1 : year
    const pad = (n: number) => String(n).padStart(2, '0')
    return {
      period,
      current: dayWindow(
        `${year}-${pad(month)}-01`,
        daysInMonth(year, month),
        monthLong.format(anchor(today)),
        label,
      ),
      previous: dayWindow(
        `${previousYear}-${pad(previousMonth)}-01`,
        daysInMonth(previousYear, previousMonth),
        monthLong.format(anchor(`${previousYear}-${pad(previousMonth)}-15`)),
        label,
      ),
    }
  }

  return {
    period,
    current: monthWindow(year, String(year)),
    previous: monthWindow(year - 1, String(year - 1)),
  }
}

/** The slot key of the current moment inside a window (used to stop the current line at "now"). */
export function slotKeyAt(period: Period, now: Date): string {
  if (period === 'day') {
    const start = osloDayStartUtc(now).getTime()
    return String(start + Math.floor((now.getTime() - start) / HOUR_MS) * HOUR_MS)
  }
  const today = lastOsloDays(now, 1)[0]
  return period === 'year' ? today.slice(0, 7) : today
}
