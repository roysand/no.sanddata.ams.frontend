import { describe, expect, it } from 'vitest'
import { capacityWarning, usageWarning } from './warnings'
import type { CapacityCharge, ConsumptionItem, CurrentHourCost, HourlyCostItem } from './types'

// Friday 20 November 2026, 11:30 in Oslo: the hour 11–12 started at 10:00 UTC, 30 minutes ago.
const NOW = new Date('2026-11-20T10:30:00Z')
const HOUR_START = '2026-11-20T10:00:00Z'

const capacity = (
  peaks: { date: string; kw: number }[],
  upperKw: number | null = 10,
  set = true,
): CapacityCharge => ({
  month: '2026-11',
  provisional: true,
  set,
  peaks: peaks.map((p) => ({ ...p, hourStartUtc: `${p.date}T17:00:00Z` })),
  averageKw: null,
  step: { lowerKw: 5, upperKw },
  amountExclVat: null,
  vat: null,
  amount: null,
  kwToNextStep: null,
})

const current = (soFar: number, hourStart = HOUR_START): CurrentHourCost => ({
  hourStart,
  consumptionKwhSoFar: soFar,
  totalKwhSoFar: soFar,
  evCharger: null,
  pricingModel: 'Spot',
  actual: null,
  comparison: null,
})

const hour = (hourStart: string, kwh: number): HourlyCostItem => ({
  hourStart,
  consumptionKwh: kwh,
  totalKwh: kwh,
  pricingModel: 'Spot',
  actual: null,
  comparison: null,
  waterHeater: null,
  evCharger: null,
})

const OTHER_DAYS = [
  { date: '2026-11-03', kw: 9.5 },
  { date: '2026-11-09', kw: 9.2 },
  { date: '2026-11-12', kw: 8.0 },
]

const warn = (overrides: Partial<Parameters<typeof capacityWarning>[0]> = {}) =>
  capacityWarning({
    capacity: capacity(OTHER_DAYS),
    todayHours: [hour('2026-11-20T07:00:00Z', 3)],
    currentHour: current(6),
    now: NOW,
    ...overrides,
  })

describe('capacityWarning', () => {
  it('warns when this hour at its pace would lift the three-peak average, with the limit for the rest of the hour', () => {
    // 6 kWh in 30 minutes is 12 kWh for the hour; the hour may reach 3 × 10 − 9,5 − 9,2 = 11,3 kWh,
    // so 5,3 kWh are left for the last half hour: 10,6 kW.
    expect(warn()).toEqual({ nextStepKw: 10, limitKw: 10.6 })
  })

  it("leaves today's own peak out of the other days", () => {
    const peaks = [{ date: '2026-11-20', kw: 9.8 }, ...OTHER_DAYS.slice(0, 2)]

    expect(warn({ capacity: capacity(peaks) })).toEqual({ nextStepKw: 10, limitKw: 10.6 })
  })

  it('averages over the days so far early in the month', () => {
    // Two days (one other at 4 kW, and today): the hour may reach 2 × 10 − 4 = 16 kWh.
    expect(
      warn({ capacity: capacity([{ date: '2026-11-01', kw: 4 }]), currentHour: current(7.9) }),
    ).toBeNull()
    expect(
      warn({ capacity: capacity([{ date: '2026-11-01', kw: 4 }]), currentHour: current(8.5) }),
    ).toEqual({
      nextStepKw: 10,
      limitKw: 15,
    })
    // The first day: the hour alone is the average, so its limit is the step itself.
    expect(warn({ capacity: capacity([]), currentHour: current(5) })).toEqual({
      nextStepKw: 10,
      limitKw: 10,
    })
  })

  it('does not judge the first 10 minutes of an hour', () => {
    expect(warn({ now: new Date('2026-11-20T10:10:00Z'), currentHour: current(3) })).toBeNull()
  })

  it('does not warn while the pace keeps the step', () => {
    expect(warn({ currentHour: current(5.5) })).toBeNull()
  })

  it("does not warn for an hour that doesn't beat today's peak so far", () => {
    expect(warn({ todayHours: [hour('2026-11-20T07:00:00Z', 13)] })).toBeNull()
  })

  it('does not warn in the top step, without steps, or without figures', () => {
    expect(warn({ capacity: capacity(OTHER_DAYS, null) })).toBeNull()
    expect(warn({ capacity: capacity(OTHER_DAYS, 10, false) })).toBeNull()
    expect(warn({ capacity: undefined })).toBeNull()
    expect(warn({ todayHours: undefined })).toBeNull()
    expect(warn({ currentHour: undefined })).toBeNull()
  })

  it('says the step is already lifted once the hour has passed its limit', () => {
    expect(warn({ currentHour: current(11.5) })).toEqual({ nextStepKw: 10, limitKw: null })
  })

  it('rounds the limit down, so keeping it keeps the step', () => {
    // 45 minutes in, 8,51 kWh so far (a pace of 11,35 kWh): 2,79 kWh left for 15 minutes is 11,16 kW, so 11,1.
    expect(
      warn({ now: new Date('2026-11-20T10:45:00Z'), currentHour: current(8.51) })?.limitKw,
    ).toBe(11.1)
  })
})

describe('usageWarning', () => {
  /** `count` per-minute readings at `kw`, the newest `ageMinutes` before NOW. */
  const readings = (kw: number, count = 15, ageMinutes = 0): ConsumptionItem[] =>
    Array.from({ length: count }, (_, i) => ({
      periodStart: new Date(NOW.getTime() - (ageMinutes + i) * 60_000).toISOString(),
      consumptionKwh: kw / 60,
    }))
  const usual = (kw: number, weeks = 4) => ({ kw, weeks })

  it('warns at twice the usual and at least 1 kW above it', () => {
    const w = usageWarning({ minutes: readings(3.8), usual: usual(0.9), now: NOW })

    expect(w?.nowKw).toBeCloseTo(3.8, 10)
    expect(w).toMatchObject({ usualKw: 0.9, ratio: 4, weekday: 'Friday' })
  })

  it('does not warn below twice the usual', () => {
    expect(usageWarning({ minutes: readings(1.7), usual: usual(0.9), now: NOW })).toBeNull()
  })

  it('does not warn less than 1 kW above the usual, even at three times it', () => {
    expect(usageWarning({ minutes: readings(0.9), usual: usual(0.3), now: NOW })).toBeNull()
  })

  it('needs three of the last four weeks to compare with', () => {
    expect(usageWarning({ minutes: readings(3.8), usual: usual(0.9, 2), now: NOW })).toBeNull()
    expect(usageWarning({ minutes: readings(3.8), usual: null, now: NOW })).toBeNull()
  })

  it('needs a fresh reading and enough readings in the last 15 minutes', () => {
    expect(usageWarning({ minutes: readings(3.8, 8, 7), usual: usual(0.9), now: NOW })).toBeNull()
    expect(usageWarning({ minutes: readings(3.8, 4), usual: usual(0.9), now: NOW })).toBeNull()
    expect(usageWarning({ minutes: undefined, usual: usual(0.9), now: NOW })).toBeNull()
  })

  it('warns against a usual of 0, without a ratio', () => {
    expect(usageWarning({ minutes: readings(1.2), usual: usual(0), now: NOW })).toMatchObject({
      usualKw: 0,
      ratio: null,
    })
  })
})
