import type { HourPrice } from './types'

export type PriceLevel = 'cheap' | 'normal' | 'expensive'

export interface PriceHour {
  hourStart: string
  /** NOK per kWh, null when the price is not available yet. */
  rate: number | null
  /** null when there is no rate for this hour. */
  level: PriceLevel | null
  isBest: boolean
  isPast: boolean
  isCurrent: boolean
}

export interface PriceDay {
  hours: PriceHour[]
  /** Indexes into `hours` of the cheapest hours (at most BEST_HOUR_COUNT). Empty when every rate is equal. */
  best: number[]
}

export const BEST_HOUR_COUNT = 4
const HOUR_MS = 3_600_000

/**
 * Based on the spot (market) price, so it tells when power is plentiful whatever plan the location is on.
 * Cheap is the lowest third of the day's rated hours, expensive the highest third, normal the rest. Best
 * hours are the cheapest few. When every rated hour costs the same everything is normal and nothing is
 * marked best.
 */
export function buildPriceDay(items: HourPrice[], now: Date): PriceDay {
  const rated = items
    .map((item) => item.spotRatePerKwh)
    .filter((rate): rate is number => rate !== null)
  const sorted = [...rated].sort((a, b) => a - b)
  const allEqual = sorted.length > 0 && sorted[0] === sorted[sorted.length - 1]
  const third = Math.ceil(sorted.length / 3)
  const cheapMax = sorted[third - 1]
  const expensiveMin = sorted[sorted.length - third]

  const levelOf = (rate: number | null): PriceLevel | null => {
    if (rate === null) return null
    if (allEqual) return 'normal'
    if (rate <= cheapMax) return 'cheap'
    if (rate >= expensiveMin) return 'expensive'
    return 'normal'
  }

  const best = allEqual
    ? []
    : items
        .map((item, index) => ({ rate: item.spotRatePerKwh, index }))
        .filter((entry): entry is { rate: number; index: number } => entry.rate !== null)
        .sort((a, b) => a.rate - b.rate || a.index - b.index)
        .slice(0, BEST_HOUR_COUNT)
        .map((entry) => entry.index)
        .sort((a, b) => a - b)

  const hours = items.map((item, index): PriceHour => {
    const start = new Date(item.hourStart).getTime()
    return {
      hourStart: item.hourStart,
      rate: item.spotRatePerKwh,
      level: levelOf(item.spotRatePerKwh),
      isBest: best.includes(index),
      isPast: start + HOUR_MS <= now.getTime(),
      isCurrent: start <= now.getTime() && now.getTime() < start + HOUR_MS,
    }
  })

  return { hours, best }
}

/** 1 = cheapest of the day's rated hours. Null when the hour has no rate. */
export function priceRank(day: PriceDay, index: number): number | null {
  const rate = day.hours[index]?.rate
  if (rate === null || rate === undefined) return null
  return day.hours.filter((hour) => hour.rate !== null && hour.rate < rate).length + 1
}

export function ratedHourCount(day: PriceDay): number {
  return day.hours.filter((hour) => hour.rate !== null).length
}
