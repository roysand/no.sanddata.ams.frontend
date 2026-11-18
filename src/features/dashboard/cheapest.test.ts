import { cheapestWindow, type RatedHour } from './cheapest'

const HOUR = 3_600_000
const START = Date.UTC(2026, 10, 17, 23) // midnight in Oslo

function hours(rates: (number | null)[], tomorrowFrom = 24): RatedHour[] {
  return rates.map((rate, i) => ({
    hourStart: new Date(START + i * HOUR).toISOString(),
    rate,
    tomorrow: i >= tomorrowFrom,
  }))
}

const at = (hour: number, minute = 0) => new Date(START + hour * HOUR + minute * 60_000)

describe('cheapestWindow', () => {
  it('finds the cheapest run of hours in a row', () => {
    const result = cheapestWindow(hours([5, 4, 1, 2, 1, 6, 3]), 3, at(0))

    expect(result?.best.start).toBe(new Date(START + 2 * HOUR).toISOString())
    expect(result?.best.end).toBe(new Date(START + 5 * HOUR).toISOString())
    expect(result?.best.average).toBeCloseTo(4 / 3)
  })

  it('starts no earlier than the current hour and compares with starting now', () => {
    const result = cheapestWindow(hours([1, 1, 5, 4, 3, 2]), 2, at(2, 30))

    expect(result?.best.start).toBe(new Date(START + 4 * HOUR).toISOString())
    expect(result?.now?.start).toBe(new Date(START + 2 * HOUR).toISOString())
    expect(result?.now?.average).toBe(4.5)
  })

  it('picks the earliest run when two cost the same', () => {
    const result = cheapestWindow(hours([3, 1, 3, 1, 3]), 1, at(0))

    expect(result?.best.start).toBe(new Date(START + HOUR).toISOString())
  })

  it('leaves out runs with an hour that has no price', () => {
    const result = cheapestWindow(hours([1, null, 1, 2, 9]), 2, at(0))

    expect(result?.best.start).toBe(new Date(START + 2 * HOUR).toISOString())
  })

  it('can run past midnight into tomorrow', () => {
    const rates = [...Array(22).fill(5), 2, 2, 1, 1, 5]
    const result = cheapestWindow(hours(rates), 4, at(20))

    expect(result?.best.hours.map((hour) => hour.tomorrow)).toEqual([false, false, true, true])
  })

  it('gives null when too few priced hours are left', () => {
    expect(cheapestWindow(hours([1, 2, 3]), 2, at(2))).toBeNull()
  })
})
