import { lastOsloDays } from './format'
import type { HourlyCostItem } from './types'

/** How many finished days the standby is measured over. */
export const STANDBY_DAYS = 14
/** A day with fewer hours than this (the meter was off part of it) could miss its quietest hour, so it is skipped. */
const MIN_HOURS_IN_DAY = 20
/** Fewer days than this is too little to call anything "always on". */
const MIN_DAYS = 3

const whole = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 })
/** 312.4 -> "312 W" */
export const formatWatts = (watts: number) => `${whole.format(watts)} W`

const osloDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Oslo' })

/** The quietest hour of one Oslo day. */
export interface QuietHour {
  /** yyyy-MM-dd */
  date: string
  hourStart: string
  /** The average power over that hour, watts (kWh in the hour × 1000). */
  watts: number
}

export interface Standby {
  /** The power the home always draws: the median of the days' quietest hours, watts. */
  watts: number
  days: QuietHour[]
  /** Standby's share of all the kWh on the days measured, 0–1. */
  share: number
  /** kWh a year if the standby stays the same. */
  kwhPerYear: number
  /** The average price paid per kWh on the days measured (incl. VAT, grid and taxes); null without prices. */
  ratePerKwh: number | null
  /** What a year of standby costs at that price; null without prices. */
  costPerYear: number | null
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** The finished Oslo days the standby is measured over, oldest first: the 14 days before today. */
export function standbyDays(now: Date): string[] {
  return lastOsloDays(now, STANDBY_DAYS + 1).slice(0, STANDBY_DAYS)
}

/**
 * The standby (base load) from the hourly use of the last finished days: each day's quietest hour, usually at night,
 * and the median of those, so one odd night (a freezer defrosting, a car charging) does not decide it. Null when
 * there are fewer than 3 days with enough readings.
 */
export function standbyFrom(items: HourlyCostItem[], now: Date): Standby | null {
  const wanted = new Set(standbyDays(now))
  const byDay = new Map<string, HourlyCostItem[]>()
  for (const item of items) {
    const date = osloDate.format(new Date(item.hourStart))
    if (!wanted.has(date)) continue
    byDay.set(date, [...(byDay.get(date) ?? []), item])
  }

  const counted = [...byDay.entries()]
    .filter(([, hours]) => hours.length >= MIN_HOURS_IN_DAY)
    .sort(([a], [b]) => a.localeCompare(b))
  if (counted.length < MIN_DAYS) return null

  const days = counted.map(([date, hours]) => {
    const quietest = hours.reduce((low, h) => (h.consumptionKwh < low.consumptionKwh ? h : low))
    return { date, hourStart: quietest.hourStart, watts: quietest.consumptionKwh * 1000 }
  })
  const watts = median(days.map((d) => d.watts))

  const hours = counted.flatMap(([, h]) => h)
  const totalKwh = hours.reduce((sum, h) => sum + h.consumptionKwh, 0)
  const standbyKwh = (watts / 1000) * hours.length
  const priced = hours.filter((h) => h.actual !== null)
  const pricedKwh = priced.reduce((sum, h) => sum + h.consumptionKwh, 0)
  const ratePerKwh =
    pricedKwh > 0 ? priced.reduce((sum, h) => sum + (h.actual?.cost ?? 0), 0) / pricedKwh : null
  const kwhPerYear = (watts / 1000) * 24 * 365

  return {
    watts,
    days,
    share: totalKwh > 0 ? Math.min(standbyKwh / totalKwh, 1) : 0,
    kwhPerYear,
    ratePerKwh,
    costPerYear: ratePerKwh === null ? null : kwhPerYear * ratePerKwh,
  }
}
