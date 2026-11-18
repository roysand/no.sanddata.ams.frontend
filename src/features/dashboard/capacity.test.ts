import { averageLabel, isVatExempt, peakAxis, peakLabel, stepLabel } from './capacity'
import type { CapacityCharge } from './types'

const charge = (vat: number | null, amount: number | null): CapacityCharge => ({
  month: '2026-10',
  provisional: false,
  set: amount !== null,
  peaks: [],
  averageKw: null,
  step: null,
  amountExclVat: amount,
  vat,
  amount,
  kwToNextStep: null,
})

describe('isVatExempt', () => {
  it('is true only when an amount has no VAT', () => {
    expect(isVatExempt(charge(0, 336))).toBe(true)
    expect(isVatExempt(charge(84, 420))).toBe(false)
    expect(isVatExempt(charge(null, null))).toBe(false)
  })
})

describe('stepLabel', () => {
  it('shows a bounded step and the open top step', () => {
    expect(stepLabel({ lowerKw: 5, upperKw: 10 })).toBe('5–10 kW')
    expect(stepLabel({ lowerKw: 2.5, upperKw: 5 })).toBe('2,5–5 kW')
    expect(stepLabel({ lowerKw: 100, upperKw: null })).toBe('100 kW and above')
  })
})

describe('averageLabel', () => {
  it('names the number of days', () => {
    expect(averageLabel(3)).toBe('Average of the three highest days')
    expect(averageLabel(2)).toBe('Average of 2 days')
    expect(averageLabel(1)).toBe('Average of 1 day')
  })
})

describe('peakLabel', () => {
  it('shows the Oslo hour in winter and in summer time', () => {
    expect(peakLabel({ date: '2026-10-27', hourStartUtc: '2026-10-27T17:00:00Z', kw: 4.9 })).toBe(
      '27.10. 18:00',
    )
    expect(peakLabel({ date: '2026-10-14', hourStartUtc: '2026-10-14T16:00:00Z', kw: 6.2 })).toBe(
      '14.10. 18:00',
    )
  })
})

describe('peakAxis', () => {
  const peak = (kw: number) => ({ date: '2026-10-01', hourStartUtc: '2026-10-01T10:00:00Z', kw })

  it('tops out at the upper bound of the step when every peak is below it', () => {
    expect(peakAxis([peak(6.2), peak(5.1), peak(4.9)], { lowerKw: 5, upperKw: 10 })).toEqual({
      max: 10,
      ticks: [0, 5, 10],
    })
  })

  it('rounds up to the next 5 kW when a peak is above the step', () => {
    expect(peakAxis([peak(12.3), peak(4), peak(4)], { lowerKw: 5, upperKw: 10 })).toEqual({
      max: 15,
      ticks: [0, 5, 10, 15],
    })
  })

  it('rounds up the highest peak on the open top step', () => {
    expect(peakAxis([peak(103)], { lowerKw: 100, upperKw: null })).toEqual({
      max: 105,
      ticks: [0, 100, 105],
    })
  })

  it('starts the lowest step at 0 without a duplicate tick', () => {
    expect(peakAxis([peak(1.2)], { lowerKw: 0, upperKw: 2 })).toEqual({ max: 2, ticks: [0, 2] })
  })
})
