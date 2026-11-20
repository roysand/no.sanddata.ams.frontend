import { describe, expect, it } from 'vitest'
import {
  elapsedMinutes,
  isPartlyMeasured,
  osloDayMinutes,
  restOf,
  shareOf,
  sumParts,
} from './waterHeater'
import type { WaterHeaterPart } from './types'

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
