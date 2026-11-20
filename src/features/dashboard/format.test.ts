import { plain } from '../../test/text'
import {
  addMonths,
  formatAge,
  formatCelsius,
  formatClockSeconds,
  formatKw,
  formatKwh2,
  formatMonth,
  formatOsloDate,
  formatOsloDateTime,
  osloToday,
  addYearsToDate,
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

describe('formatAge', () => {
  it('says "just now" under a minute, and for a reading a few seconds ahead', () => {
    expect(formatAge(0)).toBe('updated just now')
    expect(formatAge(59)).toBe('updated just now')
    expect(formatAge(-5)).toBe('updated just now')
  })

  it('counts whole minutes, then whole hours', () => {
    expect(formatAge(94)).toBe('updated 1 minute ago')
    expect(formatAge(300)).toBe('updated 5 minutes ago')
    expect(formatAge(3599)).toBe('updated 59 minutes ago')
    expect(formatAge(3600)).toBe('updated 1 hour ago')
    expect(formatAge(7200)).toBe('updated 2 hours ago')
  })
})

describe('formatCelsius', () => {
  it('writes one decimal with a comma', () => {
    expect(plain(formatCelsius(70.1))).toBe('70,1 °C')
    expect(plain(formatCelsius(72))).toBe('72,0 °C')
  })
})

describe('formatOsloDate', () => {
  it('gives the Oslo calendar date', () => {
    // 23:30 UTC on the 19th is already the 20th in Oslo.
    expect(formatOsloDate('2026-11-19T23:30:00Z')).toBe('20.11.2026')
  })
})

describe('formatOsloDateTime', () => {
  const now = new Date('2026-11-19T10:00:00Z') // 11:00 in Oslo

  it('says today or tomorrow for those Oslo days', () => {
    expect(formatOsloDateTime('2026-11-19T18:40:00Z', now)).toBe('today 19:40')
    expect(formatOsloDateTime('2026-11-20T18:40:00Z', now)).toBe('tomorrow 19:40')
    // 23:30 UTC is 00:30 the next Oslo day.
    expect(formatOsloDateTime('2026-11-19T23:30:00Z', now)).toBe('tomorrow 00:30')
  })

  it('gives the date for a later day', () => {
    expect(formatOsloDateTime('2026-11-25T18:40:00Z', now)).toBe('25.11. 19:40')
  })

  it('follows the Oslo clock across the autumn clock change', () => {
    // Saturday 24 October is summer time (UTC+2); Sunday 25 October after 03:00 is winter time (UTC+1).
    const saturday = new Date('2026-10-24T10:00:00Z')
    expect(formatOsloDateTime('2026-10-25T18:40:00Z', saturday)).toBe('tomorrow 19:40')
    expect(formatOsloDateTime('2026-10-24T18:40:00Z', saturday)).toBe('today 20:40')
  })

  it('finds tomorrow late on the evening before the spring clock change', () => {
    // Saturday 28 March 2026 23:30 Oslo; Sunday has only 23 hours, so 24 hours later is already Monday.
    const lateSaturday = new Date('2026-03-28T22:30:00Z')
    expect(formatOsloDateTime('2026-03-29T10:00:00Z', lateSaturday)).toBe('tomorrow 12:00')
  })
})

describe('osloToday', () => {
  it('is the Oslo calendar date, which can be a day ahead of UTC', () => {
    expect(osloToday(new Date('2026-11-19T22:30:00Z'))).toBe('2026-11-19')
    expect(osloToday(new Date('2026-11-19T23:30:00Z'))).toBe('2026-11-20')
  })
})

describe('addYearsToDate', () => {
  it('moves by calendar years', () => {
    expect(addYearsToDate('2026-11-20', 1)).toBe('2027-11-20')
    expect(addYearsToDate('2026-11-20', 5)).toBe('2031-11-20')
  })

  it('turns 29 February into 28 February in a year without it', () => {
    expect(addYearsToDate('2028-02-29', 1)).toBe('2029-02-28')
  })
})
