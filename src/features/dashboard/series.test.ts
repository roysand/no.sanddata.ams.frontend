import {
  buildRecentUsage,
  buildUsageSeries,
  carUsageRows,
  currentPowerKw,
  hourTrend,
  rowsFromDaily,
  recentDetailText,
  recentWindow,
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

  describe("the car's own kWh, for the Car tab's chart (spec 019)", () => {
    it('gives the car its own kWh whether or not it is counted with the house', () => {
      const [counted, apart, none] = rowsFromHourly(
        [
          hourItem('2026-11-20T18:00:00Z', 1, car(3, true)),
          hourItem('2026-11-20T19:00:00Z', 1, car(2, false)),
          hourItem('2026-11-20T20:00:00Z', 1, null),
        ],
        LATER,
      )

      expect(counted.carOwnKwh).toBe(3)
      expect(apart).toMatchObject({ carKwh: null, carOwnKwh: 2 })
      expect(none.carOwnKwh).toBeNull()
    })

    it("sums the days' own car kWh into months for the year", () => {
      const rows = rowsFromDaily(
        [
          dayItem('2026-11-19', 20, car(10, false)),
          dayItem('2026-11-20', 20, car(5, true)),
          dayItem('2026-10-20', 20, null),
        ],
        true,
        LATER,
      )

      expect(rows.find((row) => row.key === '2026-11')?.carOwnKwh).toBe(15)
      expect(rows.find((row) => row.key === '2026-10')?.carOwnKwh).toBeNull()
    })

    it('turns house rows into car rows, a slot without charging being 0 kWh', () => {
      const rows = rowsFromHourly(
        [
          hourItem('2026-11-20T18:00:00Z', 1, car(3, false)),
          hourItem('2026-11-20T19:00:00Z', 1, null),
        ],
        LATER,
      )

      expect(carUsageRows(rows)).toEqual([
        { key: rows[0].key, kwh: 3, nok: null },
        { key: rows[1].key, kwh: 0, nok: null },
      ])
    })

    it('gives no rows for a period without any charging, so nothing is charted as 0', () => {
      const rows = rowsFromHourly([hourItem('2026-11-20T18:00:00Z', 1, null)], LATER)

      expect(carUsageRows(rows)).toEqual([])
    })
  })
})

describe('recentWindow (spec 014, US2)', () => {
  const FIVE_MIN = 5 * 60_000

  it('puts the 36 steps on whole 5 minutes, the last one going on now', () => {
    // 20:37:10 in Oslo (CET).
    const { startMs } = recentWindow(new Date('2026-11-20T19:37:10Z'))

    expect(startMs).toBe(Date.UTC(2026, 10, 20, 16, 40))
    expect(new Date(startMs + 35 * FIVE_MIN).toISOString()).toBe('2026-11-20T19:35:00.000Z')
  })

  it('starts the last step at now when now is on whole 5 minutes', () => {
    expect(recentWindow(new Date('2026-11-20T19:35:00Z')).startMs).toBe(
      Date.UTC(2026, 10, 20, 16, 40),
    )
  })
})

describe('buildRecentUsage power per step (spec 014, research R2)', () => {
  const START = Date.UTC(2026, 10, 13, 10, 0)
  const minute = (offsetMin: number, kwh: number) => ({
    periodStart: new Date(START + offsetMin * 60_000).toISOString(),
    consumptionKwh: kwh,
  })
  const build = (current: { periodStart: string; consumptionKwh: number }[], now: number) =>
    buildRecentUsage({
      current,
      previous: [],
      currentRates: [],
      previousRates: [],
      startMs: START,
      previousStartMs: START - 86_400_000,
      now: new Date(now),
      label: (ms) => new Date(ms).toISOString().slice(11, 16),
    })

  it('averages a step over the minutes that have a reading, so the step going on now does not dip', () => {
    // 2 minutes at 0,1 kWh: 6 kW, not the 2,4 kW a 5-minute average gave.
    const result = build([minute(0, 0.1), minute(1, 0.1)], START + 2 * 60_000)

    expect(result.points[0].current).toBeCloseTo(6, 5)
  })

  it('gives the same power as before for a full step, and none for a step without readings', () => {
    const result = build(
      [0, 1, 2, 3, 4].map((m) => minute(m, 0.05)),
      START + 3 * 3_600_000,
    )

    expect(result.points[0].current).toBeCloseTo(3, 5)
    expect(result.points[1].current).toBeNull()
    expect(result.totalKwh).toBeCloseTo(0.25, 5)
  })
})

describe('buildRecentUsage water heating (spec 014, US1)', () => {
  const START = Date.UTC(2026, 10, 20, 17, 0)
  const MIN = 60_000
  const AFTER = new Date(START + 3 * 3_600_000)
  /** The house at `kw` for every minute of the 5-minute steps listed. */
  const house = (kw: number, steps: number[]) =>
    steps.flatMap((step) =>
      [0, 1, 2, 3, 4].map((m) => ({
        periodStart: new Date(START + (step * 5 + m) * MIN).toISOString(),
        consumptionKwh: kw / 60,
      })),
    )
  const step = (index: number, powerKw: number, sampledSeconds = 300) => ({
    start: new Date(START + index * 5 * MIN).toISOString(),
    powerKw,
    sampledSeconds,
  })
  const build = (
    current: { periodStart: string; consumptionKwh: number }[],
    heater: ReturnType<typeof step>[] | undefined,
    now = AFTER,
  ) =>
    buildRecentUsage({
      current,
      previous: [],
      currentRates: [],
      previousRates: [],
      startMs: START,
      previousStartMs: START - 86_400_000,
      now,
      label: (ms) => new Date(ms).toISOString().slice(11, 16),
      heater,
    })

  it('puts each heater step on the house step of the same 5 minutes', () => {
    const result = build(house(7.4, [2]), [step(2, 2)])

    expect(result.points[2]).toMatchObject({ heater: 2, heaterDrawn: 2, partly: false })
    expect(result.points[2].rest).toBeCloseTo(5.4, 5)
    expect(result.hasHeater).toBe(true)
  })

  it('ignores steps outside the window', () => {
    const result = build(house(5, [0, 35]), [step(-1, 2), step(36, 2)])

    expect(result.points.every((point) => point.heater === null)).toBe(true)
    expect(result.hasHeater).toBe(false)
  })

  it('has no heater value where the house has no reading', () => {
    const result = build(house(5, [0]), [step(3, 2)])

    expect(result.points[3]).toMatchObject({ heater: null, heaterDrawn: null, rest: null })
  })

  it('never draws the heater above the house, but keeps its own value for the detail', () => {
    const result = build(house(2, [4]), [step(4, 3)])

    expect(result.points[4]).toMatchObject({ heater: 3, heaterDrawn: 2, rest: 0 })
  })

  it('marks a finished step with more than 2 minutes unsampled as partly measured', () => {
    const result = build(house(5, [1, 2]), [step(1, 2, 170), step(2, 2, 200)])

    expect(result.points[1].partly).toBe(true)
    expect(result.points[2].partly).toBe(false)
  })

  it('does not mark the step going on now as partly measured', () => {
    const now = new Date(START + 10 * MIN + 170_000) // 2 min 50 s into step 2
    const result = build(house(5, [2]), [step(2, 2, 170)], now)

    expect(result.points[2].partly).toBe(false)
  })

  it('has no water heating without heater steps', () => {
    for (const heater of [undefined, []]) {
      const result = build(house(5, [0]), heater)
      expect(result.hasHeater).toBe(false)
      expect(result.points[0]).toMatchObject({ heater: null, heaterDrawn: null, rest: null })
    }
  })
})

describe('recentDetailText (spec 014, US1)', () => {
  const point = (patch: Record<string, unknown>) => ({
    label: '19:40',
    current: 7.4,
    previous: 6.1,
    heater: null,
    heaterDrawn: null,
    rest: null,
    partly: false,
    ...patch,
  })

  it('gives the house, the water heating and everything else, then yesterday', () => {
    expect(recentDetailText(point({ heater: 2, heaterDrawn: 2, rest: 5.4 }), true)).toBe(
      '7,4 kW · Water heating 2 kW · Everything else 5,4 kW · yesterday 6,1 kW',
    )
  })

  it('notes a partly measured step', () => {
    expect(
      recentDetailText(point({ heater: 2, heaterDrawn: 2, rest: 5.4, partly: true }), false),
    ).toBe('7,4 kW · Water heating 2 kW (partly measured) · Everything else 5,4 kW')
  })

  it('says nothing about water heating without a heater value', () => {
    expect(recentDetailText(point({}), true)).toBe('7,4 kW · yesterday 6,1 kW')
  })

  it('says when the house has no reading', () => {
    expect(recentDetailText(point({ current: null, previous: null }), true)).toBe('no reading')
  })
})

describe('buildRecentUsage water heating kWh (spec 014, US3)', () => {
  const START = Date.UTC(2026, 10, 20, 17, 0)
  const MIN = 60_000
  const house = (kw: number, steps: number[]) =>
    steps.flatMap((step) =>
      [0, 1, 2, 3, 4].map((m) => ({
        periodStart: new Date(START + (step * 5 + m) * MIN).toISOString(),
        consumptionKwh: kw / 60,
      })),
    )
  const step = (index: number, powerKw: number, sampledSeconds = 300) => ({
    start: new Date(START + index * 5 * MIN).toISOString(),
    powerKw,
    sampledSeconds,
  })
  const build = (
    current: { periodStart: string; consumptionKwh: number }[],
    heater: ReturnType<typeof step>[] | undefined,
    now: number,
  ) =>
    buildRecentUsage({
      current,
      previous: [],
      currentRates: [],
      previousRates: [],
      startMs: START,
      previousStartMs: START - 86_400_000,
      now: new Date(now),
      label: (ms) => new Date(ms).toISOString().slice(11, 16),
      heater,
    })
  const twelve = Array.from({ length: 12 }, (_, i) => i)

  it('sums kW × sampled time over the steps so far, with its share of the house', () => {
    const result = build(
      house(8, twelve),
      twelve.map((i) => step(i, 2)),
      START + 3_600_000,
    )

    expect(result.heaterKwh).toBeCloseTo(2, 5)
    expect(result.heaterShare).toBeCloseTo(0.25, 5)
  })

  it('does not count steps after now', () => {
    const result = build(house(8, [0]), [step(0, 2), step(20, 2)], START + 5 * MIN)

    expect(result.heaterKwh).toBeCloseTo(2 / 12, 5)
  })

  it('caps the share at 100 %, and gives none without house kWh', () => {
    expect(build(house(1, [0]), [step(0, 3)], START + 5 * MIN).heaterShare).toBe(1)
    expect(build([], [step(0, 3)], START + 5 * MIN).heaterShare).toBeNull()
  })

  it('gives no water heating kWh without steps', () => {
    const result = build(house(8, [0]), [], START + 5 * MIN)

    expect(result.heaterKwh).toBeNull()
    expect(result.heaterShare).toBeNull()
  })
})
