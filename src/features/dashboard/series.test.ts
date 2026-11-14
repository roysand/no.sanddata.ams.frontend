import {
  buildRecentUsage,
  buildUsageSeries,
  currentPowerKw,
  hourTrend,
  rowsFromDaily,
  rowsFromHourly,
} from './series'
import type { HourlyCostItem } from './types'

const NOW = new Date('2026-11-13T12:24:30Z')

describe('currentPowerKw', () => {
  it('converts the latest per-minute energy to kW', () => {
    const items = [
      { periodStart: '2026-11-13T12:22:00Z', consumptionKwh: 0.04 },
      { periodStart: '2026-11-13T12:23:00Z', consumptionKwh: 0.057 },
    ]

    expect(currentPowerKw(items, NOW)).toBeCloseTo(3.42, 2)
  })

  it('is null without readings', () => {
    expect(currentPowerKw([], NOW)).toBeNull()
  })

  it('is null when the latest reading is stale', () => {
    const items = [{ periodStart: '2026-11-13T12:10:00Z', consumptionKwh: 0.05 }]

    expect(currentPowerKw(items, NOW)).toBeNull()
  })
})

describe('hourTrend', () => {
  const yesterday = (cost: number | null): HourlyCostItem => ({
    hourStart: '2026-11-12T12:00:00Z',
    consumptionKwh: 2,
    pricingModel: 'Spot',
    actual: cost === null ? null : { ratePerKwh: 1, cost },
    comparison: null,
  })

  it('is down when this hour is cheaper than yesterday at the same point', () => {
    const trend = hourTrend(0.67, yesterday(1.96), 0.5) // yesterday scaled: 0.98

    expect(trend?.direction).toBe('down')
    expect(trend?.amount).toBeCloseTo(0.31, 2)
  })

  it('is up when this hour is more expensive', () => {
    expect(hourTrend(1.5, yesterday(2), 0.5)?.direction).toBe('up')
  })

  it('is null when yesterday has no row or no price', () => {
    expect(hourTrend(1, undefined, 0.5)).toBeNull()
    expect(hourTrend(1, yesterday(null), 0.5)).toBeNull()
  })

  it('is null when the difference is negligible', () => {
    expect(hourTrend(1, yesterday(2), 0.5)).toBeNull()
  })
})

describe('buildUsageSeries', () => {
  const slots = [
    { key: 'a', label: 'A' },
    { key: 'b', label: 'B' },
    { key: 'c', label: 'C' },
  ]
  const prevSlots = [
    { key: 'x', label: 'A' },
    { key: 'y', label: 'B' },
    { key: 'z', label: 'C' },
  ]

  it('aligns the periods by position and compares over the same slots only', () => {
    const series = buildUsageSeries(
      slots,
      [
        { key: 'a', kwh: 2, nok: 4 },
        { key: 'b', kwh: 3, nok: 6 },
      ],
      prevSlots,
      [
        { key: 'x', kwh: 1, nok: 2 },
        { key: 'y', kwh: 2, nok: 4 },
        { key: 'z', kwh: 10, nok: 20 },
      ],
      'kwh',
    )

    expect(series.points.map((p) => p.current)).toEqual([2, 3, null])
    expect(series.points.map((p) => p.previous)).toEqual([1, 2, 10])
    expect(series.total).toBe(5)
    expect(series.previousTotal).toBe(3) // the third previous slot has no current counterpart yet
    expect(series.deltaPercent).toBeCloseTo(66.67, 1)
    expect(series.hasPrevious).toBe(true)
  })

  it('uses cost when the unit is NOK and treats unpriced rows as gaps', () => {
    const series = buildUsageSeries(
      slots,
      [
        { key: 'a', kwh: 2, nok: null },
        { key: 'b', kwh: 3, nok: 6 },
      ],
      prevSlots,
      [],
      'nok',
    )

    expect(series.points.map((p) => p.current)).toEqual([null, 6, null])
    expect(series.total).toBe(6)
  })

  it('has no comparison without a previous period', () => {
    const series = buildUsageSeries(slots, [{ key: 'a', kwh: 2, nok: 4 }], prevSlots, [], 'kwh')

    expect(series.hasPrevious).toBe(false)
    expect(series.deltaPercent).toBeNull()
  })

  it('has nothing to show without current data', () => {
    const series = buildUsageSeries(slots, [], prevSlots, [], 'kwh')

    expect(series.hasCurrent).toBe(false)
    expect(series.total).toBe(0)
  })
})

describe('row builders', () => {
  it('keys hourly rows by instant and keeps unpriced hours as null cost', () => {
    const rows = rowsFromHourly([
      {
        hourStart: '2026-11-13T10:00:00Z',
        consumptionKwh: 1.5,
        pricingModel: 'Spot',
        actual: { ratePerKwh: 1, cost: 1.5 },
        comparison: null,
      },
      {
        hourStart: '2026-11-13T11:00:00Z',
        consumptionKwh: 2,
        pricingModel: 'Spot',
        actual: null,
        comparison: null,
      },
    ])

    expect(rows[0]).toEqual({ key: String(Date.UTC(2026, 10, 13, 10)), kwh: 1.5, nok: 1.5 })
    expect(rows[1].nok).toBeNull()
  })

  it('sums days into months for the year view', () => {
    const rows = rowsFromDaily(
      [
        {
          date: '2026-10-30',
          consumptionKwh: 10,
          pricingModel: 'Spot',
          actual: { cost: 12 },
          comparison: null,
        },
        {
          date: '2026-10-31',
          consumptionKwh: 5,
          pricingModel: 'Spot',
          actual: { cost: 6 },
          comparison: null,
        },
        {
          date: '2026-11-01',
          consumptionKwh: 7,
          pricingModel: 'Spot',
          actual: null,
          comparison: null,
        },
      ],
      true,
    )

    expect(rows).toEqual([
      { key: '2026-10', kwh: 15, nok: 18 },
      { key: '2026-11', kwh: 7, nok: null },
    ])
  })
})

describe('buildRecentUsage', () => {
  const START = Date.UTC(2026, 10, 13, 10, 0)
  const YESTERDAY = Date.UTC(2026, 10, 12, 10, 0)
  const HOURS_3 = 3 * 3_600_000
  const NOW_AFTER_WINDOW = new Date(START + HOURS_3)
  const label = (ms: number) => new Date(ms).toISOString().slice(11, 16)
  const minute = (base: number, offsetMin: number, kwh: number) => ({
    periodStart: new Date(base + offsetMin * 60_000).toISOString(),
    consumptionKwh: kwh,
  })
  const rate = (base: number, hourOffset: number, ratePerKwh: number | null): HourlyCostItem => ({
    hourStart: new Date(base + hourOffset * 3_600_000).toISOString(),
    consumptionKwh: 1,
    pricingModel: 'Spot',
    actual: ratePerKwh === null ? null : { ratePerKwh, cost: ratePerKwh },
    comparison: null,
  })
  const input = (overrides: Partial<Parameters<typeof buildRecentUsage>[0]> = {}) => ({
    current: [],
    previous: [],
    currentRates: [],
    previousRates: [],
    startMs: START,
    previousStartMs: YESTERDAY,
    now: NOW_AFTER_WINDOW,
    label,
    ...overrides,
  })

  it('turns per-minute energy into kW per 5 minutes over three hours and totals the energy', () => {
    // 0.05 kWh every minute for the first five minutes = 0.25 kWh in 5 min = 3 kW.
    const current = [0, 1, 2, 3, 4].map((m) => minute(START, m, 0.05))
    const result = buildRecentUsage(input({ current }))

    expect(result.points).toHaveLength(36)
    expect(result.points[0].current).toBeCloseTo(3, 5)
    expect(result.points[1].current).toBeNull()
    expect(result.points[0].label).toBe('10:00')
    expect(result.points[35].label).toBe('12:55')
    expect(result.totalKwh).toBeCloseTo(0.25, 5)
    expect(result.hasCurrent).toBe(true)
    expect(result.hasPrevious).toBe(false)
  })

  it('compares energy with yesterday over the same elapsed time', () => {
    const current = [0, 1].map((m) => minute(START, m, 0.1)) // 0.2 kWh in the first 2 minutes
    const previous = [
      minute(YESTERDAY, 0, 0.05),
      minute(YESTERDAY, 1, 0.05), // 0.1 kWh in the same 2 minutes
      minute(YESTERDAY, 150, 5), // later than "now" in the window, must not count
    ]
    const result = buildRecentUsage(input({ current, previous, now: new Date(START + 2 * 60_000) }))

    expect(result.totalKwh).toBeCloseTo(0.2, 5)
    expect(result.previousKwh).toBeCloseTo(0.1, 5)
    expect(result.deltaPercent).toBeCloseTo(100, 5)
    expect(result.hasPrevious).toBe(true)
  })

  it('prices each minute at the rate of the hour it falls in', () => {
    // 1 kWh in the first hour at 0.50 and 2 kWh in the second hour at 1.00.
    const current = [minute(START, 10, 1), minute(START, 70, 2)]
    const result = buildRecentUsage(
      input({ current, currentRates: [rate(START, 0, 0.5), rate(START, 1, 1)] }),
    )

    expect(result.cost.cost).toBeCloseTo(2.5, 5)
    expect(result.cost.incomplete).toBe(false)
  })

  it('compares cost with yesterday', () => {
    const current = [minute(START, 10, 1)]
    const previous = [minute(YESTERDAY, 10, 1)]
    const result = buildRecentUsage(
      input({
        current,
        previous,
        currentRates: [rate(START, 0, 1.5)],
        previousRates: [rate(YESTERDAY, 0, 1)],
      }),
    )

    expect(result.cost.cost).toBeCloseTo(1.5, 5)
    expect(result.previousCost.cost).toBeCloseTo(1, 5)
    expect(result.costDeltaPercent).toBeCloseTo(50, 5)
  })

  it('marks the cost incomplete when one hour has no price, and has none when nothing is priced', () => {
    const current = [minute(START, 10, 1), minute(START, 70, 2)]
    const partly = buildRecentUsage(
      input({ current, currentRates: [rate(START, 0, 0.5), rate(START, 1, null)] }),
    )
    const nothing = buildRecentUsage(input({ current, currentRates: [rate(START, 0, null)] }))

    expect(partly.cost.cost).toBeCloseTo(0.5, 5)
    expect(partly.cost.incomplete).toBe(true)
    expect(nothing.cost.cost).toBeNull()
    expect(nothing.costDeltaPercent).toBeNull()
  })

  it('has no change when yesterday has no energy', () => {
    const result = buildRecentUsage(input({ current: [minute(START, 0, 0.1)] }))

    expect(result.deltaPercent).toBeNull()
  })

  it('ignores readings outside the three-hour window', () => {
    const result = buildRecentUsage(
      input({ current: [minute(START, -10, 9), minute(START, 190, 9)] }),
    )

    expect(result.hasCurrent).toBe(false)
    expect(result.totalKwh).toBe(0)
  })
})
