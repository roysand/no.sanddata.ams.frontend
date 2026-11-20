import { describe, expect, it } from 'vitest'
import {
  monthToNow,
  elapsedMinutes,
  isPartlyMeasured,
  osloDayMinutes,
  restOf,
  shareOf,
  sumParts,
} from './waterHeater'
import type { WaterHeaterBillPart, WaterHeaterPart } from './types'

const part = (
  kwh: number,
  cost: number | null,
  sampledMinutes = 60,
  capped = false,
): WaterHeaterPart => ({
  kwh,
  cost,
  sampledMinutes,
  capped,
})

describe('restOf', () => {
  it('is the total minus water heating', () => {
    expect(restOf(3.412, 2.104)).toBeCloseTo(1.308, 10)
  })

  it('is never negative', () => {
    expect(restOf(1, 1.2)).toBe(0)
  })

  it('is unknown when either side is unknown', () => {
    expect(restOf(null, 1)).toBeNull()
    expect(restOf(1, null)).toBeNull()
  })
})

describe('sumParts', () => {
  it('adds kWh, cost and minutes and skips hours without a part', () => {
    expect(sumParts([part(1.5, 1.2, 60), null, part(0.5, 0.3, 30, true)])).toEqual({
      kwh: 2,
      cost: 1.5,
      sampledMinutes: 90,
      capped: true,
    })
  })

  it('has no cost when one part has none, but keeps the kWh', () => {
    const sum = sumParts([part(1, 1), part(1, null)])
    expect(sum?.kwh).toBe(2)
    expect(sum?.cost).toBeNull()
  })

  it('gives nothing, not zeros, without any part', () => {
    expect(sumParts([])).toBeNull()
    expect(sumParts([null, null])).toBeNull()
  })
})

describe('isPartlyMeasured', () => {
  it.each([
    [59, 60, false],
    [57, 60, true],
    [1430, 1440, false],
    [1420, 1440, true],
    [2, 5, true],
    [3, 5, false],
  ])('%i of %i minutes → %s', (sampled, expected, partly) => {
    expect(isPartlyMeasured(sampled, expected)).toBe(partly)
  })
})

describe('osloDayMinutes', () => {
  it('knows the clock-change days', () => {
    expect(osloDayMinutes('2026-03-29')).toBe(1380)
    expect(osloDayMinutes('2026-10-25')).toBe(1500)
    expect(osloDayMinutes('2026-11-20')).toBe(1440)
  })
})

describe('elapsedMinutes', () => {
  const start = new Date('2026-11-20T10:00:00Z')
  const end = new Date('2026-11-20T11:00:00Z')

  it('counts up to now while the slot is going on', () => {
    expect(elapsedMinutes(start, end, new Date('2026-11-20T10:25:30Z'))).toBe(25)
  })

  it('stops at the end of the slot', () => {
    expect(elapsedMinutes(start, end, new Date('2026-11-21T00:00:00Z'))).toBe(60)
  })

  it('is 0 before the slot starts', () => {
    expect(elapsedMinutes(start, end, new Date('2026-11-20T09:00:00Z'))).toBe(0)
  })
})

describe('shareOf', () => {
  it('is the heater part of the total', () => {
    expect(shareOf(4.2, 13.5)).toBeCloseTo(0.311, 3)
  })

  it('needs a total', () => {
    expect(shareOf(1, 0)).toBeNull()
  })

  it('is at most all of it', () => {
    expect(shareOf(2, 1)).toBe(1)
  })
})

describe('monthToNow', () => {
  const p = (kwh: number, cost: number | null): WaterHeaterPart => ({
    kwh,
    cost,
    sampledMinutes: 60,
    capped: false,
  })
  const bill: WaterHeaterBillPart = {
    ...p(4.69, 4.23),
    firstHourUtc: '2026-11-19T18:00:00Z',
    lastHourUtc: '2026-11-20T16:00:00Z',
    estimate: false,
  }
  const hours = [
    { hourStart: '2026-11-20T16:00:00Z', waterHeater: p(2, 1.8) },
    { hourStart: '2026-11-20T17:00:00Z', waterHeater: p(0.8, 0.72) },
  ]

  it("adds only today's hours after the bill's last one", () => {
    const month = monthToNow(bill, hours)
    expect(month?.kwh).toBeCloseTo(5.49)
    expect(month?.cost).toBeCloseTo(4.95)
    expect(month?.firstHourUtc).toBe('2026-11-19T18:00:00Z')
  })

  it('is the bill as is when today has nothing later', () => {
    expect(monthToNow(bill, hours.slice(0, 1))).toMatchObject({ kwh: 4.69, cost: 4.23 })
  })

  it("starts at today's first part when the bill has none yet", () => {
    expect(
      monthToNow(null, [{ hourStart: '2026-11-20T08:00:00Z', waterHeater: null }, ...hours]),
    ).toMatchObject({
      kwh: 2.8,
      firstHourUtc: '2026-11-20T16:00:00Z',
    })
  })

  it('is null when neither has a part, never zeros', () => {
    expect(monthToNow(null, [{ hourStart: '2026-11-20T08:00:00Z', waterHeater: null }])).toBeNull()
  })
})
