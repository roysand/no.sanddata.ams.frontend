import { osloToday } from './format'
import { osloWeekdayHour, WEEKDAY_LONG } from './heatmap'
import type {
  BillLine,
  CapacityCharge,
  ConsumptionItem,
  CurrentHourCost,
  HourlyCostItem,
  MonthlyBill,
} from './types'
import type { UsualPower } from './usual'

// The rules behind the warnings banner (spec 012). They are pure and take the time as a parameter, so they are tested at
// exact minutes. The thresholds are fixed in this version and named here, so the texts and tests agree.

/** The capacity warning judges an hour only after this many minutes: a few minutes are too few to judge an hour by. */
export const CAPACITY_MIN_MINUTES = 10
/** The power now is the mean over this many minutes, so a kettle or a heat pump starting doesn't count. */
export const USAGE_WINDOW_MINUTES = 15
/** Fewer readings than this in the window give no power now. */
export const USAGE_MIN_READINGS = 5
/** Usage is unusual at this many times the usual power … */
export const USAGE_RATIO = 2
/** … and at least this many kW above it, so small homes and quiet hours don't trigger it. */
export const USAGE_MIN_EXCESS_KW = 1
/** The usual power needs readings from this many of the last four weeks. */
export const USUAL_MIN_WEEKS = 3
/** A newest reading older than this means the power now is unknown; the same 6 minutes as `currentPowerKw`. */
export const STALE_AFTER_MINUTES = 6
/** The Norgespris credit may round a little below the energy's kWh; less than this is not over the limit. */
export const NORGESPRIS_MARGIN_KWH = 0.5

// ---- Capacity step (US1, research R1) -----------------------------------------------------------------------------

export interface CapacityWarning {
  /** Where the next step starts, in kW (the current step's upper limit). */
  nextStepKw: number
  /** The highest average power for the rest of the hour that keeps the step, rounded down; null once already lifted. */
  limitKw: number | null
}

const MINUTE_MS = 60_000

/**
 * Whether the hour going on now, at its pace so far, would lift the month's average of the three highest daily peaks
 * to the next capacity step. A day's peak is its highest hour, so only an hour that beats today's peak so far can
 * change the average.
 */
export function capacityWarning(input: {
  capacity: CapacityCharge | undefined
  todayHours: HourlyCostItem[] | undefined
  currentHour: CurrentHourCost | undefined
  now: Date
}): CapacityWarning | null {
  const { capacity, todayHours, currentHour, now } = input
  if (!capacity || !todayHours || !currentHour) return null
  const nextStepKw = capacity.set ? capacity.step?.upperKw : null
  if (nextStepKw === null || nextStepKw === undefined) return null

  const hourStart = new Date(currentHour.hourStart).getTime()
  const minutes = (now.getTime() - hourStart) / MINUTE_MS
  if (minutes <= CAPACITY_MIN_MINUTES || minutes >= 60) return null
  const soFar = currentHour.consumptionKwhSoFar
  const projected = (soFar * 60) / minutes

  const todayPeak = todayHours
    .filter((h) => new Date(h.hourStart).getTime() < hourStart)
    .reduce((max, h) => Math.max(max, h.consumptionKwh), 0)
  if (projected <= todayPeak) return null

  // The best other days of the month; today counts as one of the (at most) three days in the average.
  const today = osloToday(now)
  const others = capacity.peaks
    .filter((p) => p.date !== today)
    .map((p) => p.kw)
    .sort((a, b) => b - a)
  const days = Math.min(3, others.length + 1)
  const othersSum = others.slice(0, days - 1).reduce((sum, kw) => sum + kw, 0)
  const hourLimit = days * nextStepKw - othersSum
  if (projected < hourLimit) return null

  const left = hourLimit - soFar
  if (left <= 0) return { nextStepKw, limitKw: null }
  const restOfHour = (60 - minutes) / 60
  return { nextStepKw, limitKw: Math.floor((left / restOfHour) * 10) / 10 }
}

// ---- Unusual usage (US2, research R3) -----------------------------------------------------------------------------

export interface UsageWarning {
  /** The mean power over the last 15 minutes. */
  nowKw: number
  usualKw: number
  /** How many times the usual, rounded; null when the usual is 0. */
  ratio: number | null
  /** The Oslo weekday's name, for the text. */
  weekday: string
}

/**
 * Whether the location uses much more power now than usual for this hour and weekday: at least twice the usual, and
 * at least 1 kW above it. Only with three of the last four weeks to compare with, and a reading no older than 6
 * minutes.
 */
export function usageWarning(input: {
  minutes: ConsumptionItem[] | undefined
  usual: UsualPower | null | undefined
  now: Date
}): UsageWarning | null {
  const { minutes, usual, now } = input
  if (!minutes || !usual || usual.weeks < USUAL_MIN_WEEKS) return null

  const nowMs = now.getTime()
  const window = minutes.filter((m) => {
    const at = new Date(m.periodStart).getTime()
    return at <= nowMs && at > nowMs - USAGE_WINDOW_MINUTES * MINUTE_MS
  })
  if (window.length < USAGE_MIN_READINGS) return null
  const newest = Math.max(...window.map((m) => new Date(m.periodStart).getTime()))
  if (nowMs - newest > STALE_AFTER_MINUTES * MINUTE_MS) return null

  // A minute's kWh × 60 is its average kW.
  const nowKw = window.reduce((sum, m) => sum + m.consumptionKwh * 60, 0) / window.length
  const usualKw = usual.kw
  if (nowKw < USAGE_RATIO * usualKw || nowKw - usualKw < USAGE_MIN_EXCESS_KW) return null

  const at = osloWeekdayHour(now)
  return {
    nowKw,
    usualKw,
    ratio: usualKw > 0 ? Math.round(nowKw / usualKw) : null,
    weekday: at ? WEEKDAY_LONG[at.weekday] : '',
  }
}

// ---- Norgespris monthly limit (US3, research R7) ------------------------------------------------------------------

export interface NorgesPrisWarning {
  /** All the month's kWh, so far + projected. */
  projectedKwh: number
  /** The Norgespris monthly limit (5 000 kWh, 1 000 for a holiday home). */
  limitKwh: number
  /** True when the kWh used so far are already above the limit. */
  passed: boolean
}

const quantityOf = (lines: BillLine[], code: string) => lines.find((l) => l.code === code)?.quantity

/**
 * Whether the current month is expected to go over the Norgespris limit. The API doesn't send the limit, but the
 * expected bill shows it: the Norgespris credit covers only the kWh within the limit, while the energy line covers all
 * of them. So the month is projected over the limit exactly when the credit has fewer kWh, and the credit's kWh are
 * then the limit.
 */
export function norgesPrisWarning(bill: MonthlyBill | undefined): NorgesPrisWarning | null {
  if (!bill || bill.status !== 'Estimate' || !bill.projection) return null
  const total = quantityOf(bill.strom.lines, 'SpotEnergy')
  const within = quantityOf(bill.nettleie.lines, 'NorgesPrisCredit')
  if (total === undefined || within === undefined) return null
  if (total - within <= NORGESPRIS_MARGIN_KWH) return null
  return { projectedKwh: total, limitKwh: within, passed: total - bill.projection.kwh >= within }
}
