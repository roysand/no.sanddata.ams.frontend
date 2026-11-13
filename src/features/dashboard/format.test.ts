import { sameHourYesterday } from './format'

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
