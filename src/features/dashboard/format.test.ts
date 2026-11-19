import {
  addMonths,
  formatClockSeconds,
  formatKw,
  formatKwh2,
  formatMonth,
  osloMonth,
  sameHourYesterday,
} from './format'

describe('sameHourYesterday', () => {
  it('is 24 hours earlier on an ordinary day', () => {
    const result = sameHourYesterday(new Date('2026-11-13T12:00:00Z'))

    expect(result.toISOString()).toBe('2026-11-12T12:00:00.000Z')
  })

  it('keeps the same Oslo clock hour across the autumn clock change', () => {
    // 2026-10-26 12:00 Oslo (winter, UTC+1) -> yesterday 12:00 Oslo was already winter time too (the clocks went back at 03:00).
    const result = sameHourYesterday(new Date('2026-10-26T11:00:00Z'))

    expect(result.toISOString()).toBe('2026-10-25T11:00:00.000Z')
  })

  it('keeps the same Oslo clock hour across the spring clock change', () => {
    // 2026-03-30 12:00 Oslo (summer, UTC+2) -> yesterday 12:00 Oslo was already summer time (the clocks went forward at 02:00).
    const result = sameHourYesterday(new Date('2026-03-30T10:00:00Z'))

    expect(result.toISOString()).toBe('2026-03-29T10:00:00.000Z')
  })
})

describe('formatClockSeconds', () => {
  it('shows hours, minutes and seconds in Oslo time', () => {
    expect(formatClockSeconds('2026-11-13T11:34:56Z')).toBe('12:34:56') // winter, UTC+1
    expect(formatClockSeconds('2026-07-13T11:04:05Z')).toBe('13:04:05') // summer, UTC+2
  })

  it('shows midnight as 00 and not 24', () => {
    expect(formatClockSeconds('2026-11-12T23:00:09Z')).toBe('00:00:09')
  })
})

describe('osloMonth', () => {
  it('is already the next month in Oslo late on the last UTC evening of a month', () => {
    expect(osloMonth(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11')
  })

  it('is the same month in the middle of it', () => {
    expect(osloMonth(new Date('2026-07-15T12:00:00Z'))).toBe('2026-07')
  })
})

describe('addMonths', () => {
  it('moves across a year boundary both ways', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2025-12', 1)).toBe('2026-01')
    expect(addMonths('2026-10', -10)).toBe('2025-12')
  })
})

describe('formatMonth and formatKw', () => {
  it('names the month', () => {
    expect(formatMonth('2026-10')).toBe('October 2026')
  })

  it('shows kW with one decimal and a decimal comma', () => {
    expect(formatKw(5.4)).toBe('5,4 kW')
    expect(formatKw(6)).toBe('6,0 kW')
  })
})

describe('formatKwh2', () => {
  it('always shows two decimals, as an invoice does', () => {
    expect(formatKwh2(240.31)).toBe('240,31 kWh')
    expect(formatKwh2(1)).toBe('1,00 kWh')
    expect(formatKwh2(95.575)).toBe('95,58 kWh')
  })
})
