import { addDays, periodPlan, slotKeyAt } from './periods'

const NOON = new Date('2026-11-13T11:30:00Z') // 12:30 in Oslo

describe('periodPlan', () => {
  it('day: 24 hourly slots for today and yesterday', () => {
    const plan = periodPlan('day', NOON)

    expect(plan.current.slots).toHaveLength(24)
    expect(plan.previous.slots).toHaveLength(24)
    expect(plan.current.slots[0].label).toBe('00')
    expect(plan.current.fromUtc).toBe('2026-11-12T23:00:00.000Z') // Oslo midnight in winter
    expect(plan.previous.fromUtc).toBe('2026-11-11T23:00:00.000Z')
  })

  it('day: has 23 hours when the clocks go forward and 25 when they go back', () => {
    expect(periodPlan('day', new Date('2026-03-29T10:00:00Z')).current.slots).toHaveLength(23)
    expect(periodPlan('day', new Date('2026-10-25T10:00:00Z')).current.slots).toHaveLength(25)
  })

  it('week: the last 7 Oslo days against the 7 days before', () => {
    const plan = periodPlan('week', NOON)

    expect(plan.current.slots.map((s) => s.key)).toEqual([
      '2026-11-07',
      '2026-11-08',
      '2026-11-09',
      '2026-11-10',
      '2026-11-11',
      '2026-11-12',
      '2026-11-13',
    ])
    expect(plan.previous.fromDate).toBe('2026-10-31')
    expect(plan.previous.toDate).toBe('2026-11-06')
  })

  it('month: the whole calendar month against the previous one, aligned by day number', () => {
    const plan = periodPlan('month', NOON)

    expect(plan.current.slots).toHaveLength(30) // November
    expect(plan.previous.slots).toHaveLength(31) // October
    expect(plan.current.fromDate).toBe('2026-11-01')
    expect(plan.current.toDate).toBe('2026-11-30')
    expect(plan.current.title).toBe('November')
    expect(plan.previous.title).toBe('October')
  })

  it('month: January compares with December of the year before', () => {
    const plan = periodPlan('month', new Date('2027-01-15T10:00:00Z'))

    expect(plan.previous.fromDate).toBe('2026-12-01')
    expect(plan.previous.slots).toHaveLength(31)
  })

  it('month: February has 28 or 29 days', () => {
    expect(periodPlan('month', new Date('2027-02-10T10:00:00Z')).current.slots).toHaveLength(28)
    expect(periodPlan('month', new Date('2028-02-10T10:00:00Z')).current.slots).toHaveLength(29)
  })

  it('year: twelve months against the year before', () => {
    const plan = periodPlan('year', NOON)

    expect(plan.current.slots).toHaveLength(12)
    expect(plan.current.slots[0]).toEqual({ key: '2026-01', label: 'Jan' })
    expect(plan.previous.slots[11].key).toBe('2025-12')
    expect(plan.current.title).toBe('2026')
  })
})

describe('slotKeyAt', () => {
  it('is the current Oslo hour for the day view', () => {
    const key = slotKeyAt('day', NOON)

    expect(new Date(Number(key)).toISOString()).toBe('2026-11-13T11:00:00.000Z')
  })

  it('is the Oslo date, or month, for the longer views', () => {
    expect(slotKeyAt('week', NOON)).toBe('2026-11-13')
    expect(slotKeyAt('month', NOON)).toBe('2026-11-13')
    expect(slotKeyAt('year', NOON)).toBe('2026-11')
  })

  it('uses the Oslo date near midnight', () => {
    expect(slotKeyAt('week', new Date('2026-11-13T23:30:00Z'))).toBe('2026-11-14')
  })
})

describe('addDays', () => {
  it('moves across month and year ends', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
})
