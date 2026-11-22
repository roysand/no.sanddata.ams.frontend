import { statusItem } from '../../test/warnings'
import { expensiveHours, limitWarning, needsTomorrow, type LimitWarning } from './norgesPris'
import type { DayPrices, HourPrice } from './types'

// Sunday 22 November 2026, 12:00 in Oslo; the limit resets 8,5 days later, at 00:00 on 1 December.
const NOW = new Date('2026-11-22T11:00:00Z')

describe('limitWarning', () => {
  it('is over at and above the limit', () => {
    expect(limitWarning(statusItem({ kwhSoFar: 1000, overLimit: true }), NOW)).toEqual({
      kind: 'over',
      kwhSoFar: 1000,
      limitKwh: 1000,
      resetsAt: '2026-11-30T23:00:00Z',
    })
    expect(
      limitWarning(statusItem({ kwhSoFar: 1084, overLimit: true, overLimitKwh: 84 }), NOW)?.kind,
    ).toBe('over')
  })

  it('gives nothing without a limit', () => {
    expect(limitWarning(statusItem({ limitKwh: null, overLimit: true }), NOW)).toBeNull()
  })

  it('is approaching from exactly 90 % of the limit', () => {
    expect(limitWarning(statusItem({ kwhSoFar: 900, projectedKwh: 950 }), NOW)?.kind).toBe(
      'approaching',
    )
    expect(limitWarning(statusItem({ kwhSoFar: 899.9, projectedKwh: 950 }), NOW)).toBeNull()
  })

  it('gives the days until the limit at the month’s pace', () => {
    // 328 kWh over 8,5 days is about 38,6 a day; 88 kWh to go takes about 2,3 days.
    expect(limitWarning(statusItem({ kwhSoFar: 912, projectedKwh: 1240 }), NOW)).toEqual({
      kind: 'approaching',
      kwhSoFar: 912,
      limitKwh: 1000,
      reachedIn: 2,
      projectedKwh: 1240,
    })
    // 20 kWh a day: 100 kWh to go take 5 days.
    expect(
      limitWarning(statusItem({ kwhSoFar: 900, projectedKwh: 900 + 20 * 8.5 }), NOW),
    ).toMatchObject({ reachedIn: 5 })
  })

  it('says today or tomorrow by the Oslo date', () => {
    const reachedIn = (kwhSoFar: number, projectedKwh: number) =>
      (limitWarning(statusItem({ kwhSoFar, projectedKwh }), NOW) as { reachedIn: unknown })
        .reachedIn
    // 850 kWh a day: 40 kWh to go are reached in about an hour, at 13:08 today.
    expect(reachedIn(960, 960 + 850 * 8.5)).toBe('today')
    // 50 kWh a day: 40 kWh to go take 0,8 days, until 07:12 tomorrow.
    expect(reachedIn(960, 960 + 50 * 8.5)).toBe('tomorrow')
  })

  it('gives the expected end when projected within the limit', () => {
    expect(limitWarning(statusItem({ kwhSoFar: 912, projectedKwh: 980 }), NOW)).toMatchObject({
      kind: 'approaching',
      reachedIn: null,
      projectedKwh: 980,
    })
  })

  it('gives neither without a projection', () => {
    expect(limitWarning(statusItem({ kwhSoFar: 912, projectedKwh: null }), NOW)).toMatchObject({
      kind: 'approaching',
      reachedIn: null,
      projectedKwh: null,
    })
  })

  it('is projected below 90 % and over the limit', () => {
    expect(limitWarning(statusItem({ kwhSoFar: 600, projectedKwh: 1240 }), NOW)).toEqual({
      kind: 'projected',
      projectedKwh: 1240,
      limitKwh: 1000,
    })
  })

  it('gives nothing below 90 % within the limit or without a projection', () => {
    expect(limitWarning(statusItem({ kwhSoFar: 600, projectedKwh: 900 }), NOW)).toBeNull()
    expect(limitWarning(statusItem({ kwhSoFar: 600, projectedKwh: null }), NOW)).toBeNull()
    expect(limitWarning(statusItem({ kwhSoFar: 0, projectedKwh: null }), NOW)).toBeNull()
  })

  it('puts over before approaching before projected', () => {
    expect(
      limitWarning(statusItem({ kwhSoFar: 1084, projectedKwh: 1240, overLimit: true }), NOW)?.kind,
    ).toBe('over')
    expect(limitWarning(statusItem({ kwhSoFar: 912, projectedKwh: 1240 }), NOW)?.kind).toBe(
      'approaching',
    )
  })
})

describe('needsTomorrow', () => {
  const approaching = (projectedKwh: number | null): LimitWarning => ({
    kind: 'approaching',
    kwhSoFar: 912,
    limitKwh: 1000,
    reachedIn: null,
    projectedKwh,
  })

  it('is true when the spot price changes the bill', () => {
    expect(needsTomorrow({ kind: 'over', kwhSoFar: 1084, limitKwh: 1000, resetsAt: '' })).toBe(true)
    expect(needsTomorrow({ kind: 'projected', projectedKwh: 1240, limitKwh: 1000 })).toBe(true)
    expect(needsTomorrow(approaching(1240))).toBe(true)
  })

  it('is false otherwise', () => {
    expect(needsTomorrow(approaching(980))).toBe(false)
    expect(needsTomorrow(approaching(null))).toBe(false)
    expect(needsTomorrow(null)).toBe(false)
  })
})

describe('expensiveHours', () => {
  /** Consecutive hours from `startUtc`, each with its spot energy price. */
  const day = (startUtc: string, prices: (number | null | undefined)[]): DayPrices => ({
    date: '2026-11-23',
    zone: 'NO1',
    pricingModel: 'NorgesPris',
    items: prices.map((price, i): HourPrice => {
      const item: HourPrice = {
        hourStart: new Date(new Date(startUtc).getTime() + i * 3_600_000).toISOString(),
        ratePerKwh: 0.5,
        spotRatePerKwh: price ?? null,
      }
      if (price !== undefined) item.spotEnergyPricePerKwh = price
      return item
    }),
  })
  /** 24 Oslo hours (UTC+1), at `high` in the given hours and 1,00 kr otherwise. */
  const winterDay = (expensive: number[], high = 2) =>
    day(
      '2026-11-22T23:00:00Z',
      Array.from({ length: 24 }, (_, h) => (expensive.includes(h) ? high : 1)),
    )

  it('counts an hour at exactly 4 × the Norgespris price', () => {
    expect(expensiveHours(winterDay([7]), 0.5)).toEqual({
      ranges: [{ fromHour: 7, toHour: 8 }],
      hours: 1,
      maxPrice: 2,
    })
    expect(expensiveHours(winterDay([7], 1.99), 0.5)).toBeNull()
  })

  it('joins consecutive hours into ranges, with the highest price', () => {
    const prices = Array.from({ length: 24 }, (_, h) =>
      [7, 8].includes(h) ? 2.1 : [17, 18, 19].includes(h) ? (h === 18 ? 2.6 : 2.2) : 0.8,
    )
    expect(expensiveHours(day('2026-11-22T23:00:00Z', prices), 0.5)).toEqual({
      ranges: [
        { fromHour: 7, toHour: 9 },
        { fromHour: 17, toHour: 20 },
      ],
      hours: 5,
      maxPrice: 2.6,
    })
  })

  it('ends a range at midnight at 24', () => {
    expect(expensiveHours(winterDay([22, 23]), 0.5)?.ranges).toEqual([{ fromHour: 22, toHour: 24 }])
  })

  it('never counts a null or negative price', () => {
    const prices = Array.from({ length: 24 }, (_, h) => (h === 3 ? null : h === 4 ? -0.2 : 0.1))
    expect(expensiveHours(day('2026-11-22T23:00:00Z', prices), 0.5)).toBeNull()
    expect(expensiveHours(day('2026-11-22T23:00:00Z', prices), -0.1)).toBeNull()
  })

  it('needs a positive Norgespris price', () => {
    expect(expensiveHours(winterDay([7]), null)).toBeNull()
    expect(expensiveHours(winterDay([7]), 0)).toBeNull()
  })

  it('gives nothing for a day not yet published, or from an API without the field', () => {
    expect(expensiveHours(undefined, 0.5)).toBeNull()
    expect(expensiveHours(day('2026-11-22T23:00:00Z', []), 0.5)).toBeNull()
    expect(expensiveHours(day('2026-11-22T23:00:00Z', Array(24).fill(undefined)), 0.5)).toBeNull()
  })

  it('reads the 23-hour day in Oslo clock hours', () => {
    // 28 March 2027: 02:00 doesn't exist, so the hour after 01 is 03.
    const prices = Array.from({ length: 23 }, (_, i) => (i === 1 || i === 2 ? 3 : 1))
    expect(expensiveHours(day('2027-03-27T23:00:00Z', prices), 0.5)?.ranges).toEqual([
      { fromHour: 1, toHour: 4 },
    ])
  })

  it('reads the 25-hour day in Oslo clock hours', () => {
    // 25 October 2026: 02 comes twice; 03 is the fifth hour.
    const prices = Array.from({ length: 25 }, (_, i) => (i === 4 ? 3 : 1))
    expect(expensiveHours(day('2026-10-24T22:00:00Z', prices), 0.5)?.ranges).toEqual([
      { fromHour: 3, toHour: 4 },
    ])
  })
})
