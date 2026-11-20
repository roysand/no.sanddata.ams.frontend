import { addDays, dayStart } from './periods'
import type { WaterHeaterBillPart, WaterHeaterPart } from './types'

const MINUTE_MS = 60_000

/**
 * Everything else: the total minus water heating, never below 0. null when either is unknown, so an unknown part is
 * never shown as "all of it is the rest".
 */
export function restOf(total: number | null, heater: number | null): number | null {
  if (total === null || heater === null) return null
  return Math.max(0, total - heater)
}

/**
 * The sum of several parts (the days of a month in the year view, or the hours of today), with the API's rules: the
 * cost is null when any part's cost is unknown, and no parts at all give null, never zeros.
 */
export function sumParts(parts: (WaterHeaterPart | null)[]): WaterHeaterPart | null {
  const present = parts.filter((part): part is WaterHeaterPart => part !== null)
  if (present.length === 0) return null
  return {
    kwh: present.reduce((sum, part) => sum + part.kwh, 0),
    cost: present.some((part) => part.cost === null)
      ? null
      : present.reduce((sum, part) => sum + (part.cost ?? 0), 0),
    sampledMinutes: present.reduce((sum, part) => sum + part.sampledMinutes, 0),
    capped: present.some((part) => part.capped),
  }
}

/**
 * True when noticeably less than the slot's time was sampled. The margin (2 minutes, or 1 %) absorbs the API's
 * rounding down to whole minutes per hour and the age of the newest sample, so only real gaps are flagged.
 */
export function isPartlyMeasured(sampledMinutes: number, expectedMinutes: number): boolean {
  return expectedMinutes - sampledMinutes > Math.max(2, 0.01 * expectedMinutes)
}

/** The minutes in an Oslo calendar day (yyyy-MM-dd): 1380, 1440 or 1500 around the clock changes. */
export function osloDayMinutes(date: string): number {
  return (dayStart(addDays(date, 1)).getTime() - dayStart(date).getTime()) / MINUTE_MS
}

/** Whole minutes from `start` to the earlier of `end` and `now`; 0 before the start. */
export function elapsedMinutes(start: Date, end: Date, now: Date): number {
  const until = Math.min(end.getTime(), now.getTime())
  return Math.max(0, Math.floor((until - start.getTime()) / MINUTE_MS))
}

/** Water heating's share (0–1) of the total kWh; null when there is no total to share. */
export function shareOf(heaterKwh: number, totalKwh: number): number | null {
  if (totalKwh <= 0) return null
  return Math.min(1, heaterKwh / totalKwh)
}

/** The month's water heating up to now, with the first hour that has a part. */
export type MonthToNow = WaterHeaterPart & { firstHourUtc: string }

/**
 * The bill's water heating plus today's hours after the bill's last one. The API's bill stops at the start of the
 * running hour, while today's hours include it, so without this the month could show less than today. null when
 * neither has a part, never zeros.
 */
export function monthToNow(
  bill: WaterHeaterBillPart | null,
  todayHours: { hourStart: string; waterHeater: WaterHeaterPart | null }[],
): MonthToNow | null {
  const after = bill ? Date.parse(bill.lastHourUtc) : -Infinity
  const later = todayHours.filter((hour) => hour.waterHeater && Date.parse(hour.hourStart) > after)
  const part = sumParts([bill, ...later.map((hour) => hour.waterHeater)])
  if (!part) return null
  return { ...part, firstHourUtc: bill?.firstHourUtc ?? later[0].hourStart }
}
