import { dayStart } from './periods'
import { cellName, heatmapDays, heatmapFrom, hourRange, level, osloWeekdayHour } from './heatmap'
import type { HourlyCostItem } from './types'

const NOW = new Date('2026-11-19T10:00:00Z') // Thursday, 11:00 in Oslo

/** Every hour of the given Oslo days, with `kwh(date, hour)`. */
function hours(days: string[], kwh: (date: string, hour: number) => number): HourlyCostItem[] {
  return days.flatMap((date) => {
    const start = dayStart(date).getTime()
    const end = dayStart(nextDay(date)).getTime()
    const items: HourlyCostItem[] = []
    for (let t = start, h = 0; t < end; t += 3_600_000, h++) {
      items.push({
        hourStart: new Date(t).toISOString(),
        consumptionKwh: kwh(date, h),
        pricingModel: 'Spot',
        actual: null,
        comparison: null,
        waterHeater: null,
      })
    }
    return items
  })
}
const nextDay = (date: string) => {
  const d = new Date(`${date}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

describe('heatmapDays', () => {
  it('is the 4 finished weeks before today', () => {
    const days = heatmapDays(NOW)
    expect(days).toHaveLength(28)
    expect(days[0]).toBe('2026-10-22')
    expect(days[27]).toBe('2026-11-18')
  })
})

describe('heatmapFrom', () => {
  it('averages each hour of each weekday, Monday first, in Oslo time', () => {
    // Mondays 16 and 9 Nov: 18–19 uses 3 and 2 kWh; every other hour 1 kWh.
    const items = hours(['2026-11-09', '2026-11-16', '2026-11-17'], (date, hour) =>
      hour === 18 && date === '2026-11-16' ? 3 : hour === 18 && date === '2026-11-09' ? 2 : 1,
    )

    const map = heatmapFrom(items)!

    expect(map.rows).toHaveLength(24)
    expect(map.rows[18][0]).toEqual({ weekday: 0, hour: 18, kwh: 2.5 })
    expect(map.rows[18][1].kwh).toBe(1) // Tuesday
    expect(map.rows[18][2].kwh).toBeNull() // no Wednesday
    expect(map.highest).toEqual({ weekday: 0, hour: 18, kwh: 2.5 })
    expect(map.max).toBe(2.5)
    expect(map.min).toBe(1)
  })

  it('puts the doubled hour of the night the clocks go back in 02–03', () => {
    // Sunday 25 Oct 2026 has 25 hours: 00, 01, 02, 02, 03, …
    const map = heatmapFrom(hours(['2026-10-25'], (_, h) => h))!
    expect(map.rows[2][6].kwh).toBe(2.5) // the 3rd and 4th hours of the day, both 02 in Oslo
    expect(map.rows[23][6].kwh).toBe(24)
  })

  it('has nothing without readings', () => {
    expect(heatmapFrom([])).toBeNull()
  })
})

describe('labels', () => {
  it('names hours and cells', () => {
    expect(hourRange(18)).toBe('18–19')
    expect(hourRange(23)).toBe('23–00')
    expect(cellName({ weekday: 0, hour: 7, kwh: 1 })).toBe('Mondays 07–08')
  })

  it('places a value between the lowest and the highest', () => {
    expect(level(1, 1, 3)).toBe(0)
    expect(level(3, 1, 3)).toBe(1)
    expect(level(2, 1, 3)).toBe(0.5)
    expect(level(2, 2, 2)).toBe(0.5)
  })
})

describe('osloWeekdayHour', () => {
  it('gives the Oslo weekday and hour', () => {
    // Saturday 21 November 2026, 14:30 in Oslo.
    expect(osloWeekdayHour(new Date('2026-11-21T13:30:00Z'))).toEqual({ weekday: 5, hour: 14 })
  })

  it('gives the repeated hour twice on the night the clocks go back', () => {
    // 25 October 2026: 02:00–03:00 happens first in summer time, then in winter time.
    expect(osloWeekdayHour(new Date('2026-10-25T00:30:00Z'))).toEqual({ weekday: 6, hour: 2 })
    expect(osloWeekdayHour(new Date('2026-10-25T01:30:00Z'))).toEqual({ weekday: 6, hour: 2 })
  })
})
