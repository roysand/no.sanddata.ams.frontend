import {
  buildRecentUsage,
  buildUsageSeries,
  currentPowerKw,
  hourTrend,
  rowsFromDaily,
  rowsFromHourly,
} from './series'
import type { DailyCostItem, HourlyCostItem, WaterHeaterPart } from './types'

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
    totalKwh: 2,
    pricingModel: 'Spot',
    actual: cost === null ? null : { ratePerKwh: 1, cost },
    comparison: null,
    waterHeater: null,
    evCharger: null,
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
        totalKwh: 1.5,
        pricingModel: 'Spot',
        actual: { ratePerKwh: 1, cost: 1.5 },
        comparison: null,
        waterHeater: null,
        evCharger: null,
      },
      {
        hourStart: '2026-11-13T11:00:00Z',
        consumptionKwh: 2,
        totalKwh: 2,
        pricingModel: 'Spot',
        actual: null,
        comparison: null,
        waterHeater: null,
        evCharger: null,
      },
    ])

    expect(rows[0]).toMatchObject({ key: String(Date.UTC(2026, 10, 13, 10)), kwh: 1.5, nok: 1.5 })
    expect(rows[1].nok).toBeNull()
  })

  it('sums days into months for the year view', () => {
    const rows = rowsFromDaily(
      [
        {
          date: '2026-10-30',
          consumptionKwh: 10,
          totalKwh: 10,
          pricingModel: 'Spot',
          actual: { cost: 12 },
          comparison: null,
          waterHeater: null,
          evCharger: null,
        },
        {
          date: '2026-10-31',
          consumptionKwh: 5,
          totalKwh: 5,
          pricingModel: 'Spot',
          actual: { cost: 6 },
          comparison: null,
          waterHeater: null,
          evCharger: null,
        },
        {
          date: '2026-11-01',
          consumptionKwh: 7,
          totalKwh: 7,
          pricingModel: 'Spot',
          actual: null,
          comparison: null,
          waterHeater: null,
          evCharger: null,
        },
      ],
      true,
    )

    expect(rows).toMatchObject([
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
    totalKwh: 1,
    pricingModel: 'Spot',
    actual: ratePerKwh === null ? null : { ratePerKwh, cost: ratePerKwh },
    comparison: null,
    waterHeater: null,
    evCharger: null,
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

describe('water heating in the chart series', () => {
  const part = (kwh: number, cost: number | null, sampledMinutes = 60): WaterHeaterPart => ({
    kwh,
    cost,
    sampledMinutes,
    capped: false,
  })
  const hourItem = (
    hourStart: string,
    kwh: number,
    cost: number | null,
    waterHeater: WaterHeaterPart | null,
  ): HourlyCostItem => ({
    hourStart,
    consumptionKwh: kwh,
    totalKwh: kwh,
    pricingModel: 'Spot',
    actual: cost === null ? null : { ratePerKwh: 1, cost },
    comparison: null,
    waterHeater,
    evCharger: null,
  })
  const dayItem = (
    date: string,
    kwh: number,
    waterHeater: WaterHeaterPart | null,
  ): DailyCostItem => ({
    date,
    consumptionKwh: kwh,
    totalKwh: kwh,
    pricingModel: 'Spot',
    actual: { cost: kwh },
    comparison: null,
    waterHeater,
    evCharger: null,
  })
  const slots = (keys: string[]) => keys.map((key) => ({ key, label: key }))
  const LATER = new Date('2026-12-01T00:00:00Z')

  it('reads the hour part and judges the minutes against the hour, or the minutes so far', () => {
    const rows = rowsFromHourly(
      [
        hourItem('2026-11-20T10:00:00Z', 3.4, 3.1, part(2.1, 1.9, 60)),
        hourItem('2026-11-20T11:00:00Z', 1, 1, part(0.2, 0.2, 25)),
      ],
      new Date('2026-11-20T11:26:00Z'),
    )

    expect(rows[0]).toMatchObject({
      heaterKwh: 2.1,
      heaterNok: 1.9,
      sampledMinutes: 60,
      expectedMinutes: 60,
    })
    expect(rows[1].expectedMinutes).toBe(26)
  })

  it('sums the days of a month and judges them against the days that have a part', () => {
    const rows = rowsFromDaily(
      [
        dayItem('2026-11-18', 20, null),
        dayItem('2026-11-19', 20, part(2, 1.8, 250)),
        dayItem('2026-11-20', 20, part(5, null, 1440)),
      ],
      true,
      LATER,
    )

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kwh: 60, heaterKwh: 7, heaterNok: null, sampledMinutes: 1690 })
    expect(rows[0].expectedMinutes).toBe(2880)
  })

  it('judges a clock-change day against its own length', () => {
    const [row] = rowsFromDaily([dayItem('2026-10-25', 20, part(2, 2, 1500))], false, LATER)

    expect(row.expectedMinutes).toBe(1500)
  })

  it('gives the current points water heating and the rest in kWh', () => {
    const rows = rowsFromHourly(
      [
        hourItem('2026-11-20T10:00:00Z', 3.412, 3.1166, part(2.104, 1.9218, 60)),
        hourItem('2026-11-20T11:00:00Z', 1, 1, null),
        hourItem('2026-11-20T12:00:00Z', 1, 1, part(0.5, 0.5, 40)),
      ],
      LATER,
    )
    const keys = rows.map((row) => row.key)
    const series = buildUsageSeries(slots(keys), rows, slots(keys), rows, 'kwh')

    expect(series.hasHeater).toBe(true)
    expect(series.points[0].heater).toBe(2.104)
    expect(series.points[0].rest).toBeCloseTo(1.308, 10)
    expect(series.points[0].partly).toBe(false)
    expect(series.points[1]).toMatchObject({ heater: null, rest: 1, partly: false })
    expect(series.points[2].partly).toBe(true)
  })

  it('gives no split in kr when the heater cost is unknown', () => {
    const rows = rowsFromHourly([hourItem('2026-11-20T10:00:00Z', 2, 2, part(1, null))], LATER)
    const keys = rows.map((row) => row.key)

    const series = buildUsageSeries(slots(keys), rows, slots(keys), [], 'nok')

    expect(series.points[0]).toMatchObject({ current: 2, heater: null, rest: 2 })
    expect(series.hasHeater).toBe(false)
  })

  it('has no water heating without parts', () => {
    const rows = rowsFromHourly([hourItem('2026-11-20T10:00:00Z', 2, 2, null)], LATER)
    const keys = rows.map((row) => row.key)

    const series = buildUsageSeries(slots(keys), rows, slots(keys), rows, 'kwh')

    expect(series.hasHeater).toBe(false)
    expect(series.points[0]).toMatchObject({
      current: 2,
      previous: 2,
      heater: null,
      rest: 2,
      partly: false,
    })
  })
})

describe('car charging in the chart series (spec 013)', () => {
  const LATER = new Date('2026-12-01T00:00:00Z')
  const slots = (keys: string[]) => keys.map((key) => ({ key, label: key }))
  const car = (kwh: number, included: boolean) => ({ kwh, estimated: false, included })

  /** House `house` kWh (cost = kWh), with an optional car part; `totalKwh` as the API gives it. */
  const hourItem = (
    hourStart: string,
    house: number,
    evCharger: { kwh: number; estimated: boolean; included: boolean } | null,
    waterHeater: WaterHeaterPart | null = null,
  ): HourlyCostItem => ({
    hourStart,
    consumptionKwh: house,
    totalKwh: house + (evCharger?.included ? evCharger.kwh : 0),
    pricingModel: 'Spot',
    actual: { ratePerKwh: 1, cost: house },
    comparison: null,
    waterHeater,
    evCharger,
  })
  const dayItem = (
    date: string,
    house: number,
    evCharger: { kwh: number; estimated: boolean; included: boolean } | null,
  ): DailyCostItem => ({
    date,
    consumptionKwh: house,
    totalKwh: house + (evCharger?.included ? evCharger.kwh : 0),
    pricingModel: 'Spot',
    actual: { cost: house },
    comparison: null,
    waterHeater: null,
    evCharger: evCharger && { ...evCharger, hoursWithoutMeterReading: 0 },
  })

  it('charts the total with the car, and keeps the cost the house’s own', () => {
    const [row] = rowsFromHourly([hourItem('2026-11-20T18:00:00Z', 1, car(3, true))], LATER)

    expect(row).toMatchObject({ kwh: 4, nok: 1, carKwh: 3 })
  })

  it('has no car part, and the house only, when the car is not counted', () => {
    const [row] = rowsFromHourly([hourItem('2026-11-20T18:00:00Z', 1, car(3, false))], LATER)

    expect(row).toMatchObject({ kwh: 1, nok: 1, carKwh: null })
  })

  it("sums the days' car parts for a month in the year view, and gives null without any", () => {
    const rows = rowsFromDaily(
      [
        dayItem('2026-11-18', 20, null),
        dayItem('2026-11-19', 20, car(10, true)),
        dayItem('2026-11-20', 20, car(5, true)),
        dayItem('2026-10-20', 20, null),
      ],
      true,
      LATER,
    )
    const november = rows.find((row) => row.key === '2026-11')!
    const october = rows.find((row) => row.key === '2026-10')!

    expect(november).toMatchObject({ kwh: 75, carKwh: 15 })
    expect(october.carKwh).toBeNull()
  })

  it('gives the car part in kWh and never in kr', () => {
    const rows = rowsFromHourly([hourItem('2026-11-20T18:00:00Z', 1, car(3, true))], LATER)
    const keys = rows.map((row) => row.key)

    const kwh = buildUsageSeries(slots(keys), rows, slots(keys), [], 'kwh')
    const nok = buildUsageSeries(slots(keys), rows, slots(keys), [], 'nok')

    expect(kwh.points[0]).toMatchObject({ current: 4, car: 3, rest: 1 })
    expect(kwh.hasCar).toBe(true)
    expect(nok.points[0]).toMatchObject({ current: 1, car: null, rest: 1 })
    expect(nok.hasCar).toBe(false)
  })

  it('takes both water heating and the car out of everything else, never below 0', () => {
    const rows = rowsFromHourly(
      [
        hourItem('2026-11-20T18:00:00Z', 2, car(3, true), {
          kwh: 0.5,
          cost: 0.5,
          sampledMinutes: 60,
          capped: false,
        }),
        hourItem('2026-11-20T19:00:00Z', 0, car(3, true), {
          kwh: 0.5,
          cost: 0.5,
          sampledMinutes: 60,
          capped: false,
        }),
      ],
      LATER,
    )
    const keys = rows.map((row) => row.key)

    const series = buildUsageSeries(slots(keys), rows, slots(keys), [], 'kwh')

    expect(series.points[0]).toMatchObject({ current: 5, heater: 0.5, car: 3, rest: 1.5 })
    expect(series.points[1].rest).toBe(0)
  })

  it('has no car without parts', () => {
    const rows = rowsFromHourly([hourItem('2026-11-20T18:00:00Z', 2, null)], LATER)
    const keys = rows.map((row) => row.key)

    const series = buildUsageSeries(slots(keys), rows, slots(keys), [], 'kwh')

    expect(series.hasCar).toBe(false)
    expect(series.points[0]).toMatchObject({ current: 2, car: null, rest: 2 })
  })

  it('compares with the previous period on the same basis', () => {
    const current = rowsFromHourly([hourItem('2026-11-20T18:00:00Z', 1, car(3, true))], LATER)
    const previous = rowsFromHourly([hourItem('2026-11-19T18:00:00Z', 1, car(2, true))], LATER)

    const series = buildUsageSeries(
      slots(current.map((row) => row.key)),
      current,
      slots(previous.map((row) => row.key)),
      previous,
      'kwh',
    )

    expect(series.points[0]).toMatchObject({ current: 4, previous: 3 })
  })
})
