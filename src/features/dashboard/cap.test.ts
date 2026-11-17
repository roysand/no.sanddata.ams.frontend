import { isAboveCap, norgesPrisSide } from './cap'
import type { CurrentHourCost, PriceParts } from './types'

const parts: PriceParts = {
  energy: 0.4,
  markup: 0,
  grid: 0.2899,
  taxes: 0.0813,
  vat: 0.1928,
  total: 0.964,
  gridSet: true,
}
const own = { ratePerKwh: 1.224, costSoFar: 2.448, parts }
const other = { ratePerKwh: 1.5, costSoFar: 3, parts }

const current = (pricingModel: 'Spot' | 'NorgesPris'): CurrentHourCost => ({
  hourStart: '2026-11-10T13:00:00Z',
  consumptionKwhSoFar: 2,
  pricingModel,
  actual: own,
  comparison: other,
})

describe('norgesPrisSide', () => {
  it('is the own price on a Norgespris location', () => {
    expect(norgesPrisSide(current('NorgesPris'))).toBe(own)
  })

  it('is the comparison on a spot location', () => {
    expect(norgesPrisSide(current('Spot'))).toBe(other)
  })
})

describe('isAboveCap', () => {
  it('is false without a split', () => {
    expect(isAboveCap(own)).toBe(false)
    expect(isAboveCap({ ...own, cap: null })).toBe(false)
    expect(isAboveCap(null)).toBe(false)
  })

  it('is true when some kWh are above the limit', () => {
    const cap = { kwhWithinCap: 1.2, kwhAboveCap: 0.8, aboveCapParts: parts }
    expect(isAboveCap({ ...own, cap })).toBe(true)
  })
})
