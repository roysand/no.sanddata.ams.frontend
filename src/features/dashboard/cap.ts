import type { CurrentHourCost, CurrentRateCost, HourRateCost } from './types'

/** The Norgespris side of the hour: the location's own price on Norgespris, the comparison on spot. */
export function norgesPrisSide(current: CurrentHourCost): CurrentRateCost | null {
  return current.pricingModel === 'NorgesPris' ? current.actual : current.comparison
}

/** Whether some kWh of the hour are above the Norgespris monthly limit and priced on spot terms. */
export function isAboveCap(rate: CurrentRateCost | HourRateCost | null | undefined): boolean {
  return (rate?.cap?.kwhAboveCap ?? 0) > 0
}
