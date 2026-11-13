import { buildPriceDay, priceRank, ratedHourCount } from './priceLevel'
import type { HourPrice } from './types'

const MIDNIGHT = Date.UTC(2026, 9, 31, 22) // 2026-11-01 00:00 Oslo is 23:00 UTC; any fixed hour works here

function day(rates: (number | null)[]): HourPrice[] {
  return rates.map((rate, i) => ({
    hourStart: new Date(MIDNIGHT + i * 3_600_000).toISOString(),
    ratePerKwh: 0.5, // the plan rate is not what the day is ranked on
    spotRatePerKwh: rate,
  }))
}

const PRICES = [
  0.74, 0.7, 0.66, 0.64, 0.69, 0.81, 1.08, 1.31, 1.42, 1.12, 0.88, 0.71, 0.55, 0.49, 0.46, 0.53,
  0.78, 1.21, 1.47, 1.33, 1.02, 0.84, 0.62, 0.58,
]

const at = (hour: number) => new Date(MIDNIGHT + hour * 3_600_000 + 20 * 60_000)

describe('buildPriceDay', () => {
  it('marks the lowest third cheap and the highest third expensive', () => {
    const result = buildPriceDay(day(PRICES), at(13))
    const levels = result.hours.map((h) => h.level)

    expect(levels.filter((l) => l === 'cheap')).toHaveLength(8)
    expect(levels.filter((l) => l === 'expensive')).toHaveLength(8)
    expect(levels.filter((l) => l === 'normal')).toHaveLength(8)
    expect(result.hours[13].level).toBe('cheap') // 0.49
    expect(result.hours[18].level).toBe('expensive') // 1.47
  })

  it('marks the four cheapest hours as best', () => {
    const result = buildPriceDay(day(PRICES), at(13))

    expect(result.best).toEqual([12, 13, 14, 15]) // 0.55, 0.49, 0.46, 0.53
    expect(result.hours.filter((h) => h.isBest)).toHaveLength(4)
  })

  it('flags the current hour and the hours already passed', () => {
    const result = buildPriceDay(day(PRICES), at(13))

    expect(result.hours[13].isCurrent).toBe(true)
    expect(result.hours.filter((h) => h.isCurrent)).toHaveLength(1)
    expect(result.hours[12].isPast).toBe(true)
    expect(result.hours[13].isPast).toBe(false)
    expect(result.hours[14].isPast).toBe(false)
  })

  it('keeps at most four best hours when several hours tie', () => {
    const result = buildPriceDay(day([1, 1, 1, 1, 1, 1, 2, 3]), at(0))

    expect(result.best).toHaveLength(4)
    expect(result.best).toEqual([0, 1, 2, 3])
  })

  it('calls everything normal and marks no best hours when every rate is equal', () => {
    const result = buildPriceDay(day(Array(24).fill(0.5)), at(5))

    expect(result.best).toEqual([])
    expect(result.hours.every((h) => h.level === 'normal' && !h.isBest)).toBe(true)
  })

  it('skips hours without a rate when ranking and choosing best hours', () => {
    const rates = [...PRICES.slice(0, 20), null, null, null, null]
    const result = buildPriceDay(day(rates), at(13))

    expect(result.hours[22].level).toBeNull()
    expect(result.best.every((i) => rates[i] !== null)).toBe(true)
    expect(ratedHourCount(result)).toBe(20)
  })

  it('has no levels or best hours when no hour has a rate yet', () => {
    const result = buildPriceDay(day(Array(24).fill(null)), at(13))

    expect(result.best).toEqual([])
    expect(result.hours.every((h) => h.level === null)).toBe(true)
  })

  it('handles a daylight-saving day with 23 hours', () => {
    const result = buildPriceDay(day(PRICES.slice(0, 23)), at(5))

    expect(result.hours).toHaveLength(23)
    expect(result.best).toHaveLength(4)
  })
})

describe('priceRank', () => {
  it('ranks 1 for the cheapest hour of the day', () => {
    const result = buildPriceDay(day(PRICES), at(13))

    expect(priceRank(result, 14)).toBe(1) // 0.46
    expect(priceRank(result, 13)).toBe(2) // 0.49
    expect(priceRank(result, 18)).toBe(24) // 1.47
  })

  it('is null for an hour without a rate', () => {
    const result = buildPriceDay(day([0.5, null]), at(0))

    expect(priceRank(result, 1)).toBeNull()
  })
})

describe('buildPriceDay with a flat plan rate', () => {
  it('ranks the day on the spot rate, not on the flat plan rate', () => {
    // Every hour has the same plan rate (Norgespris), but the market price moves.
    const result = buildPriceDay(day(PRICES), at(13))

    expect(result.hours[13].level).toBe('cheap')
    expect(result.hours[18].level).toBe('expensive')
    expect(result.best).toEqual([12, 13, 14, 15])
  })
})
