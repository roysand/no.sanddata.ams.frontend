import { formatClock, osloToday } from './format'
import { addDays, dayName, dayStart, monthTitle } from './periods'
import type { HotWater, HotWaterPeriod } from './types'

// The rules behind the Heater tab's "Hot water used" card (spec 018). Pure, with the time as a parameter, so they are
// tested at exact minutes.

/** The first day with recorded hot water: API spec 020 started storing the tank's litres then. */
export const HISTORY_START = '2026-11-24'
/** A part recorded less than this share of its time is marked as partly recorded: its litres are likely too low. */
export const PARTIAL_SHARE = 0.9

const HOUR_MS = 3_600_000
const MINUTE_MS = 60_000

const oslo = (options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', ...options })
const weekdayShort = oslo({ weekday: 'short' })
const dayOfMonth = oslo({ day: 'numeric' })
const monthShort = oslo({ month: 'short' })
const monthLong = oslo({ month: 'long' })

/** Noon UTC of an Oslo date is always on that date in Oslo: a safe anchor for formatting a date. */
const anchor = (date: string) => new Date(`${date}T12:00:00Z`)
const pad = (n: number) => String(n).padStart(2, '0')

// ---- The period shown (research R3) ---------------------------------------------------------------------------------

export interface HotWaterView {
  /** The Oslo date to ask for: the period's first day. */
  date: string
  /** As a heading: "Today", "This week", "Week 47 · 16–22 Nov", "November", "2026". */
  title: string
  /** Inside a sentence: "today", "this week", or the title. */
  inline: string
  /** False for the period that holds the first recorded day. */
  canGoBack: boolean
}

/** The Monday of the ISO week that holds an Oslo date. */
export function mondayOf(date: string): string {
  const isoDay = (anchor(date).getUTCDay() + 6) % 7
  return addDays(date, -isoDay)
}

/** The ISO week number and its year (the year of the week's Thursday). */
function isoWeek(monday: string): { week: number; year: number } {
  const thursday = addDays(monday, 3)
  const year = Number(thursday.slice(0, 4))
  const dayOfYear = (anchor(thursday).getTime() - anchor(`${year}-01-01`).getTime()) / 86_400_000
  return { week: Math.floor(dayOfYear / 7) + 1, year }
}

function weekTitle(monday: string, thisYear: number): string {
  const sunday = addDays(monday, 6)
  const { week, year } = isoWeek(monday)
  const [a, b] = [anchor(monday), anchor(sunday)]
  const range =
    monday.slice(0, 7) === sunday.slice(0, 7)
      ? `${dayOfMonth.format(a)}–${dayOfMonth.format(b)} ${monthShort.format(b)}`
      : `${dayOfMonth.format(a)} ${monthShort.format(a)} – ${dayOfMonth.format(b)} ${monthShort.format(b)}`
  return `Week ${week} · ${range}${year === thisYear ? '' : ` ${year}`}`
}

/** The period `offset` steps from the current one (0 now, −1 the one before), in Oslo time. */
export function hotWaterView(period: HotWaterPeriod, offset: number, now: Date): HotWaterView {
  const today = osloToday(now)
  const [thisYear, thisMonth] = today.split('-').map(Number)
  const view = (date: string, title: string, inline = title): HotWaterView => ({
    date,
    title,
    inline,
    canGoBack: date > HISTORY_START,
  })

  if (period === 'day') {
    const date = addDays(today, offset)
    if (offset === 0) return view(date, 'Today', 'today')
    if (offset === -1) return view(date, 'Yesterday', 'yesterday')
    return view(date, dayName(date, thisYear).title)
  }
  if (period === 'week') {
    const monday = addDays(mondayOf(today), 7 * offset)
    return offset === 0
      ? view(monday, 'This week', 'this week')
      : view(monday, weekTitle(monday, thisYear))
  }
  if (period === 'month') {
    const total = thisYear * 12 + (thisMonth - 1) + offset
    const [year, month] = [Math.floor(total / 12), (total % 12) + 1]
    const title = monthTitle(year, month, thisYear).title
    return view(`${year}-${pad(month)}-01`, title)
  }
  return view(`${thisYear + offset}-01-01`, String(thisYear + offset))
}

// ---- The bars (research R4) -----------------------------------------------------------------------------------------

export interface HotWaterRow {
  /** The part's start, UTC ISO. */
  key: string
  /** On the axis: "07", "Mon", "18", "Nov". */
  label: string
  /** In the tooltip: "07:00–08:00", "Mon 23 Nov", "November". */
  span: string
  /** Null for a part with no recorded time, and for one still to come: a gap, never 0. */
  litres: number | null
  /** Recorded less than 90 % of its time so far: likely too low. */
  partial: boolean
  /** The share of the part's time so far that was recorded; null for a part with no item. */
  sampledShare: number | null
  /** The bar's two series: one of them is always null. */
  litresFull: number | null
  litresPartial: number | null
}

interface Part {
  start: number
  end: number
  label: string
  span: string
}

/** Every part of the whole period, so the axis stays put while the current period fills in. */
function parts(answer: HotWater, thisYear: number): Part[] {
  const from = new Date(answer.from).getTime()
  const to = new Date(answer.to).getTime()
  const list: Part[] = []

  if (answer.period === 'day') {
    // Hour steps in UTC give 23 or 25 hours on the days the clocks change.
    for (let t = from; t < to; t += HOUR_MS) {
      const [start, end] = [new Date(t).toISOString(), new Date(t + HOUR_MS).toISOString()]
      list.push({
        start: t,
        end: t + HOUR_MS,
        label: formatClock(start).slice(0, 2),
        span: `${formatClock(start)}–${formatClock(end)}`,
      })
    }
    return list
  }

  if (answer.period === 'year') {
    const year = Number(osloToday(new Date(from)).slice(0, 4))
    for (let month = 1; month <= 12; month++) {
      const first = `${year}-${pad(month)}-01`
      const next = month === 12 ? `${year + 1}-01-01` : `${year}-${pad(month + 1)}-01`
      list.push({
        start: dayStart(first).getTime(),
        end: dayStart(next).getTime(),
        label: monthShort.format(anchor(first)),
        span: monthLong.format(anchor(first)),
      })
    }
    return list
  }

  // A week or a month: one part per Oslo date.
  const last = osloToday(new Date(to - 1))
  for (let date = osloToday(new Date(from)); date <= last; date = addDays(date, 1)) {
    list.push({
      start: dayStart(date).getTime(),
      end: dayStart(addDays(date, 1)).getTime(),
      label:
        answer.period === 'week'
          ? weekdayShort.format(anchor(date))
          : String(Number(date.slice(8, 10))),
      span: dayName(date, thisYear).title,
    })
  }
  return list
}

/** One row per part of the answer's whole period, with its litres, gaps and the partly recorded mark. */
export function hotWaterRows(answer: HotWater, now: Date): HotWaterRow[] {
  const byStart = new Map(answer.items.map((item) => [new Date(item.start).getTime(), item]))
  const thisYear = Number(osloToday(now).slice(0, 4))

  return parts(answer, thisYear).map((part) => {
    const item = byStart.get(part.start)
    const litres = item?.litres ?? null
    // The part going on now is measured against its time so far, so it isn't marked for being unfinished.
    const minutes =
      (Math.min(part.end, Math.max(now.getTime(), part.start)) - part.start) / MINUTE_MS
    const sampledShare = item
      ? minutes > 0
        ? Math.min(item.sampledMinutes / minutes, 1)
        : 1
      : null
    const partial = litres !== null && sampledShare !== null && sampledShare < PARTIAL_SHARE
    return {
      key: new Date(part.start).toISOString(),
      label: part.label,
      span: part.span,
      litres,
      partial,
      sampledShare,
      litresFull: partial ? null : litres,
      litresPartial: partial ? litres : null,
    }
  })
}

const litresFormat = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
/** 1234 -> "1 234 L" */
export const formatLitres = (litres: number) => `${litresFormat.format(litres)} L`
