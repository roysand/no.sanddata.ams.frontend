import { lastOsloDays, osloDayStartUtc } from './format'

export type Period = 'day' | 'week' | 'month' | 'year'
export type Unit = 'kwh' | 'nok'

export interface Slot {
  /** Hour start (UTC ms, as a string) for day, yyyy-MM-dd for week and month, yyyy-MM for year. */
  key: string
  label: string
}

export interface PeriodWindow {
  /** As a heading: "Today", "Last 7 days", "October", "Mon 17 Nov". */
  title: string
  /** Inside a sentence: "today", "the 7 days before", "October". */
  inline: string
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
  /** 0 for the period that is going on now, -1 for the one before, and so on. */
  offset: number
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
const dayMonth = oslo({ day: 'numeric', month: 'short' })
const dayTitle = oslo({ weekday: 'short', day: 'numeric', month: 'short' })

/** A heading and the same words for inside a sentence (lower case unless it starts with a name). */
const named = (title: string, inline = title) => ({ title, inline })

/** Noon UTC of an Oslo date is always on that same date in Oslo, so it is a safe anchor for date maths. */
const anchor = (date: string) => new Date(`${date}T12:00:00Z`)
/** The UTC instant an Oslo date (yyyy-MM-dd) starts. */
export const dayStart = (date: string) => osloDayStartUtc(anchor(date))

export function addDays(date: string, days: number): string {
  const moved = anchor(date)
  moved.setUTCDate(moved.getUTCDate() + days)
  return moved.toISOString().slice(0, 10)
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function hourWindow(date: string, name: { title: string; inline: string }): PeriodWindow {
  const start = dayStart(date).getTime()
  const end = dayStart(addDays(date, 1)).getTime()
  const slots: Slot[] = []
  for (let t = start; t < end; t += HOUR_MS) {
    slots.push({ key: String(t), label: clock.format(new Date(t)) })
  }
  return {
    ...name,
    slots,
    fromDate: date,
    toDate: date,
    fromUtc: new Date(start).toISOString(),
    toUtc: new Date(end - 1000).toISOString(),
  }
}

function dayWindow(
  first: string,
  count: number,
  name: { title: string; inline: string },
  label: (d: string) => string,
) {
  const slots: Slot[] = Array.from({ length: count }, (_, i) => {
    const date = addDays(first, i)
    return { key: date, label: label(date) }
  })
  const last = slots[slots.length - 1].key
  return {
    ...name,
    slots,
    fromDate: first,
    toDate: last,
    fromUtc: dayStart(first).toISOString(),
    toUtc: new Date(dayStart(addDays(last, 1)).getTime() - 1000).toISOString(),
  } satisfies PeriodWindow
}

function monthWindow(year: number): PeriodWindow {
  const slots: Slot[] = Array.from({ length: 12 }, (_, i) => ({
    key: `${year}-${String(i + 1).padStart(2, '0')}`,
    label: monthName.format(new Date(Date.UTC(year, i, 15))),
  }))
  const first = `${year}-01-01`
  const last = `${year}-12-31`
  return {
    ...named(String(year)),
    slots,
    fromDate: first,
    toDate: last,
    fromUtc: dayStart(first).toISOString(),
    toUtc: new Date(dayStart(addDays(last, 1)).getTime() - 1000).toISOString(),
  }
}

/** "Mon 17 Nov", with the year when it is not this year. */
export function dayName(date: string, thisYear: number) {
  const text = dayTitle.format(anchor(date))
  return named(Number(date.slice(0, 4)) === thisYear ? text : `${text} ${date.slice(0, 4)}`)
}

/** "3–9 Nov" or "28 Oct – 3 Nov", with the year when the week ends in another year. */
function weekName(first: string, last: string, thisYear: number) {
  const [from, to] = [dayMonth.format(anchor(first)), dayMonth.format(anchor(last))]
  const sameMonth = first.slice(0, 7) === last.slice(0, 7)
  const text = sameMonth ? `${Number(first.slice(8, 10))}–${to}` : `${from} – ${to}`
  return named(Number(last.slice(0, 4)) === thisYear ? text : `${text} ${last.slice(0, 4)}`)
}

/** "October", or "October 2025" when it is not this year. */
export function monthTitle(year: number, month: number, thisYear: number) {
  const name = monthLong.format(new Date(Date.UTC(year, month - 1, 15)))
  return named(year === thisYear ? name : `${name} ${year}`)
}

/**
 * A period and the equivalent one before it, in Europe/Oslo time. `offset` 0 is the period going on now (today, the
 * last 7 days, this month, this year); -1 steps one period back, and so on.
 */
export function periodPlan(period: Period, now: Date, offset = 0): PeriodPlan {
  const today = lastOsloDays(now, 1)[0]
  const [thisYear, thisMonth] = today.split('-').map(Number)

  if (period === 'day') {
    const day = addDays(today, offset)
    const before = addDays(day, -1)
    const name = (date: string, back: number) =>
      back === 0
        ? named('Today', 'today')
        : back === -1
          ? named('Yesterday', 'yesterday')
          : dayName(date, thisYear)
    return {
      period,
      offset,
      current: hourWindow(day, name(day, offset)),
      previous: hourWindow(before, name(before, offset - 1)),
    }
  }

  if (period === 'week') {
    const label = (d: string) => weekday.format(anchor(d))
    const last = addDays(today, 7 * offset)
    const window = (end: string, name: { title: string; inline: string }) =>
      dayWindow(addDays(end, -6), 7, name, label)
    const lastBefore = addDays(last, -7)
    return {
      period,
      offset,
      current: window(
        last,
        offset === 0
          ? named('Last 7 days', 'the last 7 days')
          : weekName(addDays(last, -6), last, thisYear),
      ),
      previous: window(
        lastBefore,
        offset === 0
          ? named('The 7 days before', 'the 7 days before')
          : weekName(addDays(lastBefore, -6), lastBefore, thisYear),
      ),
    }
  }

  if (period === 'month') {
    const label = (d: string) => String(Number(d.slice(8, 10)))
    const pad = (n: number) => String(n).padStart(2, '0')
    const window = (back: number) => {
      const total = thisYear * 12 + (thisMonth - 1) + back
      const [year, month] = [Math.floor(total / 12), (total % 12) + 1]
      return dayWindow(
        `${year}-${pad(month)}-01`,
        daysInMonth(year, month),
        monthTitle(year, month, thisYear),
        label,
      )
    }
    return { period, offset, current: window(offset), previous: window(offset - 1) }
  }

  return {
    period,
    offset,
    current: monthWindow(thisYear + offset),
    previous: monthWindow(thisYear + offset - 1),
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
