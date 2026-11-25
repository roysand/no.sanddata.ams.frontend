import { describe, expect, it } from 'vitest'
import { answer, hotWaterDay } from '../../test/hotWater'
import { dayStart } from './periods'
import { formatLitres, hotWaterRows, hotWaterView, mondayOf } from './hotWater'

// Wednesday 25 November 2026, 09:30 in Oslo.
const NOW = new Date('2026-11-25T08:30:00Z')

describe('hotWaterView (spec 018)', () => {
  it('names the day and asks for its date', () => {
    expect(hotWaterView('day', 0, NOW)).toEqual({
      date: '2026-11-25',
      title: 'Today',
      inline: 'today',
      canGoBack: true,
    })
    expect(hotWaterView('day', -1, NOW)).toMatchObject({ date: '2026-11-24', title: 'Yesterday' })
    expect(hotWaterView('day', -7, NOW)).toMatchObject({ date: '2026-11-18', title: 'Wed 18 Nov' })
  })

  it('stops going back at the first recorded day', () => {
    expect(hotWaterView('day', -1, NOW).canGoBack).toBe(false)
    expect(hotWaterView('week', 0, NOW).canGoBack).toBe(false)
    expect(hotWaterView('month', 0, NOW).canGoBack).toBe(false)
    expect(hotWaterView('year', 0, NOW).canGoBack).toBe(false)
    expect(hotWaterView('week', 0, new Date('2026-12-01T12:00:00Z')).canGoBack).toBe(true)
  })

  it('asks for the ISO week by its Monday, and names it', () => {
    expect(hotWaterView('week', 0, NOW)).toMatchObject({
      date: '2026-11-23',
      title: 'This week',
      inline: 'this week',
    })
    expect(hotWaterView('week', -1, NOW)).toMatchObject({
      date: '2026-11-16',
      title: 'Week 47 · 16–22 Nov',
    })
  })

  it('names a week across a year end by its ISO week and month names', () => {
    const january = new Date('2026-01-14T12:00:00Z')
    // Week 1 of 2026 runs Monday 29 December 2025 to Sunday 4 January 2026.
    expect(hotWaterView('week', -2, january)).toMatchObject({
      date: '2025-12-29',
      title: 'Week 1 · 29 Dec – 4 Jan',
    })
    expect(hotWaterView('week', -3, january).title).toBe('Week 52 · 22–28 Dec 2025')
  })

  it('takes a Sunday into the week that began the Monday before', () => {
    expect(mondayOf('2026-11-29')).toBe('2026-11-23')
    expect(mondayOf('2026-11-23')).toBe('2026-11-23')
  })

  it('steps months across a year end, with the year for another year', () => {
    expect(hotWaterView('month', 0, NOW)).toMatchObject({ date: '2026-11-01', title: 'November' })
    expect(hotWaterView('month', 1, NOW)).toMatchObject({ date: '2026-12-01', title: 'December' })
    expect(hotWaterView('month', -11, NOW)).toMatchObject({
      date: '2025-12-01',
      title: 'December 2025',
    })
  })

  it('names the year', () => {
    expect(hotWaterView('year', 0, NOW)).toMatchObject({ date: '2026-01-01', title: '2026' })
    expect(hotWaterView('year', -1, NOW)).toMatchObject({ date: '2025-01-01', title: '2025' })
  })
})

describe('hotWaterRows (spec 018)', () => {
  it('gives every hour of the day, with no litres after now', () => {
    const rows = hotWaterRows(hotWaterDay('2026-11-25', { 7: 38 }, { now: NOW }), NOW)

    expect(rows).toHaveLength(24)
    expect(rows[0]).toMatchObject({ label: '00', span: '00:00–01:00', litres: 0 })
    expect(rows[7]).toMatchObject({ label: '07', span: '07:00–08:00', litres: 38, partial: false })
    expect(rows[23].span).toBe('23:00–00:00')
    // 09:30: the 09 hour is going on; later hours are still to come.
    expect(rows[10].litres).toBeNull()
  })

  it('keeps a gap a gap and 0 L as 0', () => {
    const rows = hotWaterRows(hotWaterDay('2026-11-24', { 3: null, 4: 0 }, { now: NOW }), NOW)

    expect(rows[3]).toMatchObject({ litres: null, litresFull: null, litresPartial: null })
    expect(rows[4]).toMatchObject({ litres: 0, litresFull: 0 })
  })

  it('marks an hour recorded less than 90 % of the time, in its own series', () => {
    const day = hotWaterDay('2026-11-24', { 7: 20, 8: 30 }, { now: NOW, sampled: { 7: 30, 8: 55 } })
    const rows = hotWaterRows(day, NOW)

    expect(rows[7]).toMatchObject({
      partial: true,
      sampledShare: 0.5,
      litresFull: null,
      litresPartial: 20,
    })
    expect(rows[8]).toMatchObject({ partial: false, litresFull: 30 })
  })

  it('measures the hour going on now against its time so far', () => {
    // 09:30: 29 of the 30 minutes so far were recorded.
    const day = hotWaterDay('2026-11-25', { 9: 12 }, { now: NOW, sampled: { 9: 29 } })

    expect(hotWaterRows(day, NOW)[9]).toMatchObject({ partial: false, litres: 12 })
  })

  it('has 23 and 25 hours on the days the clocks change', () => {
    const later = new Date('2026-12-01T00:00:00Z')
    expect(hotWaterRows(hotWaterDay('2026-03-29', {}, { now: later }), later)).toHaveLength(23)
    const autumn = hotWaterRows(hotWaterDay('2026-10-25', {}, { now: later }), later)
    expect(autumn).toHaveLength(25)
    expect(autumn.map((row) => row.label).slice(1, 4)).toEqual(['01', '02', '02'])
  })

  it('gives a week Monday to Sunday', () => {
    const from = dayStart('2026-11-23').toISOString()
    const to = dayStart('2026-11-30').toISOString()
    const rows = hotWaterRows(
      answer('week', from, to, [{ start: from, litres: 120, sampledMinutes: 1440 }]),
      NOW,
    )

    expect(rows.map((row) => row.label)).toEqual(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'])
    expect(rows[0]).toMatchObject({ span: 'Mon 23 Nov', litres: 120 })
    expect(rows[3].litres).toBeNull()
  })

  it('gives a month day by day and a year month by month', () => {
    const month = hotWaterRows(
      answer('month', dayStart('2026-11-01').toISOString(), dayStart('2026-12-01').toISOString()),
      NOW,
    )
    expect(month).toHaveLength(30)
    expect(month[17]).toMatchObject({ label: '18', span: 'Wed 18 Nov' })

    const novemberStart = dayStart('2026-11-01').toISOString()
    const year = hotWaterRows(
      answer('year', dayStart('2026-01-01').toISOString(), dayStart('2027-01-01').toISOString(), [
        // About 23 of the 24,4 days of November so far were recorded.
        { start: novemberStart, litres: 250, sampledMinutes: 33_000 },
      ]),
      NOW,
    )
    expect(year.map((row) => row.label)).toHaveLength(12)
    expect(year[10]).toMatchObject({ label: 'Nov', span: 'November', litres: 250, partial: false })
    expect(year[9].litres).toBeNull()
  })
})

describe('formatLitres', () => {
  it('gives whole litres with a thin space for thousands', () => {
    expect(formatLitres(125).replace(/\s/g, ' ')).toBe('125 L')
    expect(formatLitres(1234).replace(/\s/g, ' ')).toBe('1 234 L')
  })
})
