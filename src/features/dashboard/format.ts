import type { PricingModel } from './types'

const OSLO = 'Europe/Oslo'

const nok = new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' })
const decimal = new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 2 })
const hourFormat = new Intl.DateTimeFormat('nb-NO', {
  timeZone: OSLO,
  hour: '2-digit',
  minute: '2-digit',
})

export const formatNok = (value: number) => nok.format(value)
export const formatKwh = (value: number) => `${decimal.format(value)} kWh`
const rate = new Intl.NumberFormat('nb-NO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export const formatRate = (value: number) => `${rate.format(value)} kr/kWh`

/** "14:00" in Oslo time for a UTC ISO timestamp. */
export const formatClock = (isoUtc: string) => hourFormat.format(new Date(isoUtc))

/** "2026-10-03" -> "03.10." */
export const formatDay = (isoDate: string) => `${isoDate.slice(8, 10)}.${isoDate.slice(5, 7)}.`

export function modelLabel(model: PricingModel): string {
  return model === 'NorgesPris' ? 'Norgespris' : 'Spot price'
}

export function otherModel(model: PricingModel): PricingModel {
  return model === 'Spot' ? 'NorgesPris' : 'Spot'
}

/** Milliseconds Oslo is ahead of UTC at the given instant (3 600 000 in winter, 7 200 000 in summer). */
function osloOffsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: OSLO,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(at)
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value)
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour'),
    get('minute'),
    get('second'),
  )
  return asUtc - Math.floor(at.getTime() / 1000) * 1000
}

/** The UTC instant at which the current Oslo calendar day started (DST-safe: midnight is never in a shift). */
export function osloDayStartUtc(now: Date): Date {
  const offset = osloOffsetMs(now)
  const localNow = new Date(now.getTime() + offset)
  const localMidnightAsUtc = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate(),
  )
  return new Date(localMidnightAsUtc - osloOffsetMs(new Date(localMidnightAsUtc - offset)))
}

const HOUR_MS = 3_600_000

/** Every hour start (UTC instants) from Oslo midnight up to and including the current hour. */
export function hoursSinceOsloMidnight(now: Date): Date[] {
  const start = osloDayStartUtc(now).getTime()
  const hours: Date[] = []
  for (let t = start; t <= now.getTime(); t += HOUR_MS) hours.push(new Date(t))
  return hours
}

/** The last `count` Oslo calendar days as yyyy-MM-dd, oldest first, ending with today. */
export function lastOsloDays(now: Date, count: number): string[] {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: OSLO }).format(now) // yyyy-MM-dd
  const [y, m, d] = today.split('-').map(Number)
  return Array.from({ length: count }, (_, i) =>
    new Date(Date.UTC(y, m - 1, d - (count - 1 - i))).toISOString().slice(0, 10),
  )
}
