import { describe, expect, it } from 'vitest'
import { LIVE_STATES, liveState } from '../../test/evCharger'
import { carMonth, formatDuration, liveView, sessionTimes } from './evCharger'
import type { DailyCostItem, EvChargerDayPart, EvChargerSession } from './types'

const part = (kwh: number, hoursWithoutMeterReading = 0): EvChargerDayPart => ({
  kwh,
  estimated: false,
  included: true,
  hoursWithoutMeterReading,
})

const day = (date: string, evCharger: EvChargerDayPart | null): DailyCostItem => ({
  date,
  consumptionKwh: 30,
  totalKwh: 30 + (evCharger?.kwh ?? 0),
  pricingModel: 'Spot',
  actual: null,
  comparison: null,
  waterHeater: null,
  evCharger,
})

const TODAY = '2026-11-20'

describe('carMonth', () => {
  it("gives today's kWh, the month's sum and since when the month's charging began", () => {
    const month = carMonth(
      [day('2026-11-01', null), day('2026-11-03', part(2)), day(TODAY, part(5))],
      TODAY,
    )
    expect(month).toEqual({ today: 5, month: 7, since: '2026-11-03', hoursWithoutReading: 0 })
  })

  it('gives no since when charging began on the 1st', () => {
    expect(carMonth([day('2026-11-01', part(1)), day(TODAY, part(5))], TODAY).since).toBeNull()
  })

  it('gives nulls without any charging, never zeros', () => {
    expect(carMonth([day('2026-11-01', null), day(TODAY, null)], TODAY)).toEqual({
      today: null,
      month: null,
      since: null,
      hoursWithoutReading: 0,
    })
  })

  it('gives no today when only earlier days had charging', () => {
    const month = carMonth([day('2026-11-03', part(2)), day(TODAY, null)], TODAY)
    expect(month.today).toBeNull()
    expect(month.month).toBe(2)
  })

  it('sums the charging hours without a house reading', () => {
    expect(
      carMonth([day('2026-11-03', part(2, 1)), day(TODAY, part(5, 2))], TODAY).hoursWithoutReading,
    ).toBe(3)
  })

  it('never gives a month below today', () => {
    const cases = [
      [day(TODAY, part(5))],
      [day('2026-11-02', part(0.1)), day(TODAY, part(9))],
      [day(TODAY, part(0))],
    ]
    for (const items of cases) {
      const { today, month } = carMonth(items, TODAY)
      expect(month ?? 0).toBeGreaterThanOrEqual(today ?? 0)
    }
  })
})

const session = (start: string, end: string): EvChargerSession => ({
  start,
  end,
  kwh: 23.4,
  estimated: false,
})

describe('sessionTimes', () => {
  it('gives the Oslo date and the start and end times of a session within one day', () => {
    expect(sessionTimes(session('2026-11-20T16:02:11Z', '2026-11-20T20:40:03Z'))).toEqual({
      date: 'Fri 20.11',
      from: '17:02',
      to: '21:40',
      minutes: 278,
    })
  })

  it('gives the end date as well when a session ends on a later Oslo day', () => {
    const times = sessionTimes(session('2026-11-20T22:10:00Z', '2026-11-21T01:30:00Z'))
    expect(times.date).toBe('Fri 20.11')
    expect(times.from).toBe('23:10')
    expect(times.to).toBe('21.11 02:30')
  })

  it('uses Oslo time across the October clock change', () => {
    // 25 October 2026: clocks go back from 03:00 CEST to 02:00 CET.
    const times = sessionTimes(session('2026-10-24T23:30:00Z', '2026-10-25T02:30:00Z'))
    expect(times.from).toBe('01:30')
    expect(times.to).toBe('03:30')
    expect(times.minutes).toBe(180)
  })
})

describe('formatDuration', () => {
  it('gives minutes, hours and minutes, or whole hours', () => {
    expect(formatDuration(45)).toBe('45 min')
    expect(formatDuration(278)).toBe('4 h 38 min')
    expect(formatDuration(720)).toBe('12 h')
  })
})

// 19:35:02 Oslo on 2026-11-24, a minute after the fixture's read.
const NOW = new Date('2026-11-24T18:35:02Z')
const live = (state: keyof typeof LIVE_STATES, patch = {}) =>
  liveState({ state, ...LIVE_STATES[state], ...patch })

describe('liveView (spec 017)', () => {
  it('gives every figure while charging, in Oslo time', () => {
    expect(liveView(live('charging'), NOW)).toEqual({
      heading: 'Charging',
      details: ['4,4 kW', '13,0 kWh this charge', 'charging since 16:37', 'plugged in at 15:52'],
      picture: 'charging',
      label: 'A car charging from the charger',
      age: 'updated 1 minute ago',
    })
  })

  it('gives no power and no charging start when connected or finished', () => {
    expect(liveView(live('connected'), NOW)).toMatchObject({
      heading: 'Connected, not charging',
      details: ['13,0 kWh this charge', 'plugged in at 15:52'],
      picture: 'plugged',
    })
    expect(liveView(live('finished'), NOW)).toMatchObject({
      heading: 'Finished charging',
      details: ['24,6 kWh this charge', 'plugged in at 15:52'],
      picture: 'plugged',
    })
  })

  it('shows 0 kWh for a new charge, and leaves out kWh it was not sent', () => {
    expect(liveView(live('connected', { sessionKwh: 0 }), NOW)?.details[0]).toBe(
      '0,0 kWh this charge',
    )
    expect(liveView(live('connected', { sessionKwh: null }), NOW)?.details).toEqual([
      'plugged in at 15:52',
    ])
  })

  it('gives no figures with no car, and only the last report when offline', () => {
    expect(liveView(live('noCar'), NOW)).toMatchObject({
      heading: 'No car connected',
      details: [],
      picture: 'noCar',
    })
    expect(liveView(live('offline'), NOW)).toMatchObject({
      heading: 'Offline',
      details: ['last reported 14:10'],
      picture: 'faded',
    })
    expect(liveView(live('offline', { lastReportedAt: null }), NOW)?.details).toEqual([])
  })

  it('shows the kWh of an unknown state, and nothing for a location without a charger', () => {
    expect(liveView(live('unknown'), NOW)).toMatchObject({
      heading: 'Status unknown',
      details: ['13,0 kWh this charge'],
      picture: 'faded',
    })
    expect(liveView(live('noCharger'), NOW)).toBeNull()
  })

  it('gives the date for a time on an earlier day', () => {
    const view = liveView(
      live('charging', {
        pluggedInAt: '2026-11-23T22:10:00Z',
        chargingSince: '2026-11-23T22:12:00Z',
      }),
      NOW,
    )
    expect(view?.details).toContain('charging since 23.11. 23:12')
    expect(view?.details).toContain('plugged in at 23.11. 23:10')
  })

  it('says how long ago the charger was read', () => {
    expect(liveView(live('noCar', { readAt: '2026-11-24T18:35:00Z' }), NOW)?.age).toBe(
      'updated just now',
    )
    expect(liveView(live('noCar', { readAt: '2026-11-24T18:30:00Z' }), NOW)?.age).toBe(
      'updated 5 minutes ago',
    )
  })
})
