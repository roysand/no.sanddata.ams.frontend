import { describe, expect, it } from 'vitest'
import type { HourlyCostItem } from './types'
import { usualPower } from './usual'

// Saturday 21 November 2026, 14:20 in Oslo.
const NOW = new Date('2026-11-21T13:20:00Z')

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

/** The hour 14–15 Oslo on the four Saturdays before NOW. */
const SATURDAYS = [
  '2026-10-24T12:00:00Z',
  '2026-10-31T13:00:00Z',
  '2026-11-07T13:00:00Z',
  '2026-11-14T13:00:00Z',
]

describe('usualPower', () => {
  it('is the median of the same hour on the same weekday', () => {
    const items = SATURDAYS.map((at, i) => hour(at, [0.8, 0.9, 1.0, 5.0][i]))

    expect(usualPower(items, NOW)).toEqual({ kw: 0.95, weeks: 4 })
  })

  it('is the middle value with three weeks of readings', () => {
    const items = SATURDAYS.slice(1).map((at, i) => hour(at, [1.2, 0.7, 3.0][i]))

    expect(usualPower(items, NOW)).toEqual({ kw: 1.2, weeks: 3 })
  })

  it('ignores other hours and other weekdays', () => {
    const items = [
      hour(SATURDAYS[3], 1),
      hour('2026-11-14T14:00:00Z', 9), // Saturday, 15:00
      hour('2026-11-15T13:00:00Z', 9), // Sunday, 14:00
    ]

    expect(usualPower(items, NOW)).toEqual({ kw: 1, weeks: 1 })
  })

  it('is null without a matching hour', () => {
    expect(usualPower([hour('2026-11-15T13:00:00Z', 1)], NOW)).toBeNull()
  })
})

describe('the usual power stays the house’s own (spec 013, FR-021)', () => {
  it('is the same when the car is counted with the house', () => {
    const items = SATURDAYS.map((at, i) => hour(at, [0.8, 0.9, 1.0, 5.0][i]))
    const withCar = items.map((item) => ({
      ...item,
      totalKwh: item.consumptionKwh + 7,
      evCharger: { kwh: 7, estimated: false, included: true },
    }))

    expect(usualPower(withCar, NOW)).toEqual(usualPower(items, NOW))
  })
})
