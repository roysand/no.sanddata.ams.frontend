import type { Slot, UsageRow } from '../dashboard'

export interface LocationFigures {
  id: string
  name: string
  usesNorgesPris: boolean
  powerKw: number | null
  /** Energy and cost for the chosen period. */
  periodRows: UsageRow[]
  previousRows: UsageRow[]
  /** Today's hourly rows and slots, for the small usage trend. */
  dayRows: UsageRow[]
  daySlots: Slot[]
  /** True when any request for this location failed. */
  failed: boolean
}

export interface LocationSummary {
  id: string
  name: string
  usesNorgesPris: boolean
  powerKw: number | null
  kwh: number
  /** null when no hour in the period has a price. */
  cost: number | null
  previousCost: number | null
  trend: number[]
  /** Part of the cost is missing (an unpriced hour, or a failed request). */
  incomplete: boolean
  sharePercent: number
}

export interface OverviewTotals {
  powerKw: number
  kwh: number
  cost: number | null
  /** Change in cost against the previous period, or null when it cannot be told. */
  deltaPercent: number | null
  incomplete: boolean
}

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0)

function costOf(rows: UsageRow[]): { cost: number | null; missing: boolean } {
  const priced = rows.filter((row) => row.nok !== null)
  return {
    cost: priced.length === 0 ? null : sum(priced.map((row) => row.nok as number)),
    missing: priced.length < rows.length,
  }
}

export function summarizeLocation(figures: LocationFigures): LocationSummary {
  const { cost, missing } = costOf(figures.periodRows)
  const previous = costOf(figures.previousRows)
  const byKey = new Map(figures.dayRows.map((row) => [row.key, row.kwh]))

  return {
    id: figures.id,
    name: figures.name,
    usesNorgesPris: figures.usesNorgesPris,
    powerKw: figures.powerKw,
    kwh: sum(figures.periodRows.map((row) => row.kwh)),
    cost,
    previousCost: previous.cost,
    trend: figures.daySlots.map((slot) => byKey.get(slot.key) ?? 0),
    incomplete: figures.failed || missing,
    sharePercent: 0,
  }
}

/** Orders by cost (highest first, unpriced last) and fills in each location's share of the combined energy. */
export function rankLocations(summaries: LocationSummary[]): LocationSummary[] {
  const totalKwh = sum(summaries.map((summary) => summary.kwh))
  return summaries
    .map((summary) => ({
      ...summary,
      sharePercent: totalKwh > 0 ? Math.round((summary.kwh / totalKwh) * 100) : 0,
    }))
    .sort((a, b) => (b.cost ?? -1) - (a.cost ?? -1) || b.kwh - a.kwh)
}

export function totalsOf(summaries: LocationSummary[]): OverviewTotals {
  const priced = summaries.filter((summary) => summary.cost !== null)
  const cost = priced.length === 0 ? null : sum(priced.map((summary) => summary.cost as number))
  const previous = summaries.filter((summary) => summary.previousCost !== null)
  const previousCost =
    previous.length === 0 ? null : sum(previous.map((s) => s.previousCost as number))

  return {
    powerKw: sum(summaries.map((summary) => summary.powerKw ?? 0)),
    kwh: sum(summaries.map((summary) => summary.kwh)),
    cost,
    deltaPercent:
      cost !== null && previousCost !== null && previousCost > 0
        ? ((cost - previousCost) / previousCost) * 100
        : null,
    // A location without any price also leaves the total short.
    incomplete: summaries.some((summary) => summary.incomplete || summary.cost === null),
  }
}
