import { osloWeekdayHour } from './heatmap'
import type { HourlyCostItem } from './types'

export interface UsualPower {
  /** The median kW (kWh in one hour) for this Oslo hour and weekday. */
  kw: number
  /** How many of those hours had readings: 4 in four normal weeks. */
  weeks: number
}

/**
 * The usual power for the Oslo hour and weekday of `now`, from four weeks of hourly figures (spec 012, research R2).
 * The median, so one evening with guests doesn't move it; null when no hour matches.
 */
export function usualPower(items: HourlyCostItem[], now: Date): UsualPower | null {
  const at = osloWeekdayHour(now)
  if (!at) return null
  const values = items
    .filter((item) => {
      const other = osloWeekdayHour(new Date(item.hourStart))
      return other !== null && other.weekday === at.weekday && other.hour === at.hour
    })
    .map((item) => item.consumptionKwh)
    .sort((a, b) => a - b)
  if (values.length === 0) return null
  const middle = Math.floor(values.length / 2)
  const kw = values.length % 2 === 1 ? values[middle] : (values[middle - 1] + values[middle]) / 2
  return { kw, weeks: values.length }
}
