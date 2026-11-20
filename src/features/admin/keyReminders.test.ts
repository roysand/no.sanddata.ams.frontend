import { describe, expect, it } from 'vitest'
import {
  daysUntilDate,
  expiredConsequence,
  expiryBadge,
  reminderText,
  sensorKeyLastDay,
} from './keyReminders'
import type { KeyKind, KeyReminder } from './types'

const reminder = (kind: KeyKind, daysLeft: number, locationName = 'Hytta'): KeyReminder => ({
  locationId: 'l1',
  locationName,
  kind,
  expiresOn: '2026-12-02',
  expiresAt: null,
  daysLeft,
  expired: daysLeft < 0,
})

describe('reminderText', () => {
  it.each([
    [12, 'The sensor key for Hytta expires in 12 days'],
    [1, 'The sensor key for Hytta expires tomorrow'],
    [0, 'The sensor key for Hytta expires today'],
    [-1, 'The sensor key for Hytta expired yesterday'],
    [-3, 'The sensor key for Hytta expired 3 days ago'],
  ])('a sensor key with %i days left: %s', (days, text) => {
    expect(reminderText(reminder('SensorKey', days))).toBe(text)
  })

  it('names the water heater key', () => {
    expect(reminderText(reminder('WaterHeaterKey', 12, 'Hjemme'))).toBe(
      'The water heater key for Hjemme expires in 12 days',
    )
    expect(reminderText(reminder('WaterHeaterKey', -1, 'Hjemme'))).toBe(
      'The water heater key for Hjemme expired yesterday',
    )
  })
})

describe('expiredConsequence', () => {
  it('says what has stopped', () => {
    expect(expiredConsequence('SensorKey')).toBe('Readings are refused until it is replaced')
    expect(expiredConsequence('WaterHeaterKey')).toBe(
      "Heater data can't be read until it is replaced",
    )
  })
})

describe('expiryBadge', () => {
  it.each([
    [31, null],
    [30, { text: 'expires in 30 days', urgent: false }],
    [1, { text: 'expires tomorrow', urgent: false }],
    [0, { text: 'expires today', urgent: false }],
    [-1, { text: 'expired', urgent: true }],
  ])('%i days left', (days, badge) => {
    expect(expiryBadge(days)).toEqual(badge)
  })
})

describe('daysUntilDate', () => {
  it('counts whole calendar days across the end of summer time', () => {
    expect(daysUntilDate('2026-11-09', '2026-10-10')).toBe(30)
  })

  it('counts across a year end, and negative when the date has passed', () => {
    expect(daysUntilDate('2027-01-02', '2026-12-30')).toBe(3)
    expect(daysUntilDate('2026-11-17', '2026-11-20')).toBe(-3)
  })
})

describe('sensorKeyLastDay', () => {
  it('is the day before when the key expires at exactly Oslo midnight', () => {
    // 2028-11-19T23:00Z is the start of 20 November in Oslo (winter time).
    expect(sensorKeyLastDay('2028-11-19T23:00:00Z')).toBe('2028-11-19')
  })

  it('is the day itself when it expires during the day', () => {
    expect(sensorKeyLastDay('2028-11-20T10:00:00Z')).toBe('2028-11-20')
  })
})
