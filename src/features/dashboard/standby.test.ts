import { dayStart } from './periods'
import { standbyDays, standbyFrom } from './standby'
import type { HourlyCostItem } from './types'

const NOW = new Date('2026-11-19T10:00:00Z') // 11:00 in Oslo

/** One Oslo day of hourly use: `kwh(hour)` per hour, priced at `rate` kr/kWh (or unpriced). */
function day(date: string, kwh: (hour: number) => number, rate: number | null = 2, hours = 24) {
  const start = dayStart(date).getTime()
  return Array.from({ length: hours }, (_, h): HourlyCostItem => ({
    hourStart: new Date(start + h * 3_600_000).toISOString(),
    consumptionKwh: kwh(h),
    pricingModel: 'Spot',
    actual: rate === null ? null : { ratePerKwh: rate, cost: kwh(h) * rate },
    comparison: null,
  }))
}

/** 0.3 kWh at 03:00, 1 kWh the rest of the day. */
const night = (low: number) => (hour: number) => (hour === 3 ? low : 1)

describe('standbyDays', () => {
  it('is the 14 finished Oslo days before today', () => {
    const days = standbyDays(NOW)
    expect(days).toHaveLength(14)
    expect(days[0]).toBe('2026-11-05')
    expect(days[13]).toBe('2026-11-18')
  })
})

describe('standbyFrom', () => {
  const days = standbyDays(NOW)

  it("takes each day's quietest hour, in watts, and the median of them", () => {
    const lows = [0.3, 0.25, 0.32, 0.29, 0.31]
    const items = lows.flatMap((low, i) => day(days[i], night(low)))

    const standby = standbyFrom(items, NOW)!

    expect(standby.days.map((d) => Math.round(d.watts))).toEqual([300, 250, 320, 290, 310])
    expect(standby.days[0].date).toBe('2026-11-05')
    expect(standby.days[0].hourStart).toBe('2026-11-05T02:00:00.000Z') // 03:00 in Oslo
    expect(standby.watts).toBeCloseTo(300)
  })

  it('is not moved by one odd night', () => {
    const lows = [0.3, 0.3, 0.3, 2.5, 0.3]
    const standby = standbyFrom(
      lows.flatMap((low, i) => day(days[i], night(low))),
      NOW,
    )!
    expect(standby.watts).toBeCloseTo(300)
  })

  it('gives the share of use, a year of standby and what it costs at the average price', () => {
    // Every day: 23 hours of 1 kWh and 0.3 kWh at 03:00 = 23.3 kWh; standby 0.3 kW x 24 h = 7.2 kWh.
    const standby = standbyFrom(
      days.slice(0, 7).flatMap((d) => day(d, night(0.3), 2)),
      NOW,
    )!

    expect(standby.share).toBeCloseTo(7.2 / 23.3)
    expect(standby.kwhPerYear).toBeCloseTo(0.3 * 24 * 365)
    expect(standby.ratePerKwh).toBeCloseTo(2)
    expect(standby.costPerYear).toBeCloseTo(0.3 * 24 * 365 * 2)
  })

  it('has no price or cost without priced hours', () => {
    const standby = standbyFrom(
      days.slice(0, 3).flatMap((d) => day(d, night(0.3), null)),
      NOW,
    )!
    expect(standby.ratePerKwh).toBeNull()
    expect(standby.costPerYear).toBeNull()
  })

  it('skips a day with too few readings, and today', () => {
    const items = [
      ...day(days[0], night(0.3)),
      ...day(days[1], night(0.3)),
      ...day(days[2], night(0.3)),
      ...day(days[3], () => 0.05, 2, 12), // the meter was off half the day
      ...day('2026-11-19', () => 0.01, 2, 11), // today, not finished
    ]
    const standby = standbyFrom(items, NOW)!
    expect(standby.days.map((d) => d.date)).toEqual([days[0], days[1], days[2]])
    expect(standby.watts).toBeCloseTo(300)
  })

  it('needs at least 3 days', () => {
    expect(standbyFrom([...day(days[0], night(0.3)), ...day(days[1], night(0.3))], NOW)).toBeNull()
    expect(standbyFrom([], NOW)).toBeNull()
  })
})
