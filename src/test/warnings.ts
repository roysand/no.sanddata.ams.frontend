import { http, HttpResponse } from 'msw'
import type {
  CapacityCharge,
  ConsumptionItem,
  CurrentHourCost,
  HourlyCostItem,
  MonthlyBill,
} from '../features/dashboard/types'
import { november2026Estimate, spotBill, withLine } from './bills'

/**
 * Everything the warnings banner (spec 012) reads, for MSW. The defaults are quiet: no warning is due. A field set to
 * `'fail'` answers 500 for that figure.
 */
export interface WarningFigures {
  capacity?: CapacityCharge | 'fail'
  /** Today's completed hours (the hourly request with pageSize 500). */
  today?: HourlyCostItem[] | 'fail'
  current?: CurrentHourCost | 'fail'
  /** Per-minute readings of the last hour. */
  minutes?: ConsumptionItem[] | 'fail'
  /** Four weeks of hourly figures (the heatmap's request, pageSize 1000). */
  fourWeeks?: HourlyCostItem[] | 'fail'
  bill?: MonthlyBill | 'fail'
}

const QUIET_CAPACITY: CapacityCharge = {
  month: '2026-11',
  provisional: true,
  set: false,
  peaks: [],
  averageKw: null,
  step: null,
  amountExclVat: null,
  vat: null,
  amount: null,
  kwToNextStep: null,
}

const fail = () => HttpResponse.json({ message: 'Boom' }, { status: 500 })
const page = (items: HourlyCostItem[]) =>
  HttpResponse.json({ items, page: 1, pageSize: items.length, totalCount: items.length })

export function warningHandlers(figures: WarningFigures = {}) {
  const {
    capacity = QUIET_CAPACITY,
    today = [],
    current = {
      hourStart: new Date().toISOString(),
      consumptionKwhSoFar: 0,
      totalKwhSoFar: 0,
      evCharger: null,
      pricingModel: 'Spot',
      actual: null,
      comparison: null,
    },
    minutes = [],
    fourWeeks = [],
    bill = spotBill(november2026Estimate()),
  } = figures
  return [
    http.get('*/api/electricity-cost/capacity', () =>
      capacity === 'fail' ? fail() : HttpResponse.json(capacity),
    ),
    http.get('*/api/electricity-cost/hourly', ({ request }) => {
      const fourWeeksAsked = new URL(request.url).searchParams.get('pageSize') === '1000'
      const items = fourWeeksAsked ? fourWeeks : today
      return items === 'fail' ? fail() : page(items)
    }),
    http.get('*/api/electricity-cost/current', () =>
      current === 'fail' ? fail() : HttpResponse.json(current),
    ),
    http.get('*/api/consumption', () =>
      minutes === 'fail' ? fail() : HttpResponse.json({ granularity: 'minute', items: minutes }),
    ),
    http.get('*/api/electricity-cost/bill', () =>
      bill === 'fail' ? fail() : HttpResponse.json(bill),
    ),
  ]
}

// ---- Figures that make each warning due, for the fixed clock below -------------------------------------------------

/** Friday 20 November 2026, 11:30 in Oslo: 30 minutes into the hour 11–12. */
export const WARNING_NOW = new Date('2026-11-20T10:30:00Z')
const NOW = WARNING_NOW

export const hour = (hourStart: string, kwh: number): HourlyCostItem => ({
  hourStart,
  consumptionKwh: kwh,
  totalKwh: kwh,
  pricingModel: 'Spot',
  actual: null,
  comparison: null,
  waterHeater: null,
  evCharger: null,
})

/** The 5–10 kW step, with the month's other best days at 9,5, 9,2 and 8,0 kW. */
const STEP_5_10: CapacityCharge = {
  month: '2026-11',
  provisional: true,
  set: true,
  peaks: [
    { date: '2026-11-03', hourStartUtc: '2026-11-03T17:00:00Z', kw: 9.5 },
    { date: '2026-11-09', hourStartUtc: '2026-11-09T17:00:00Z', kw: 9.2 },
    { date: '2026-11-12', hourStartUtc: '2026-11-12T17:00:00Z', kw: 8.0 },
  ],
  averageKw: 8.9,
  step: { lowerKw: 5, upperKw: 10 },
  amountExclVat: null,
  vat: null,
  amount: null,
  kwToNextStep: 1.1,
}

/** This hour at 6 kWh after 30 minutes: a pace of 12 kWh, above the 11,3 kWh the step allows. */
export const CAPACITY_DUE: WarningFigures = {
  capacity: STEP_5_10,
  today: [hour('2026-11-20T07:00:00Z', 3)],
  current: {
    hourStart: '2026-11-20T10:00:00Z',
    consumptionKwhSoFar: 6,
    totalKwhSoFar: 6,
    evCharger: null,
    pricingModel: 'Spot',
    actual: null,
    comparison: null,
  },
}

/** The last 15 minutes at `kw`, per minute. */
export const minutesAt = (kw: number): ConsumptionItem[] =>
  Array.from({ length: 15 }, (_, i) => ({
    periodStart: new Date(NOW.getTime() - i * 60_000).toISOString(),
    consumptionKwh: kw / 60,
  }))

/** The hour 11–12 Oslo on the four Fridays before NOW, at `kwh` each. */
export const fridaysAt = (kwh: number): HourlyCostItem[] =>
  [
    '2026-10-23T09:00:00Z',
    '2026-10-30T10:00:00Z',
    '2026-11-06T10:00:00Z',
    '2026-11-13T10:00:00Z',
  ].map((at) => hour(at, kwh))

export const USAGE_DUE: WarningFigures = { minutes: minutesAt(3.8), fourWeeks: fridaysAt(0.9) }

/** This month's expected bill with `total` kWh in all, `within` of them within the Norgespris limit. */
export const billWith = (total: number, within: number, projectedKwh: number): MonthlyBill => {
  const estimate = withLine(
    withLine(november2026Estimate(), 'SpotEnergy', { quantity: total }),
    'NorgesPrisCredit',
    { quantity: within },
  )
  return {
    ...estimate,
    projection: estimate.projection && { ...estimate.projection, kwh: projectedKwh },
  }
}

export const NORGESPRIS_DUE: WarningFigures = { bill: billWith(1240, 1000, 600) }

/** All three warnings due at once. */
export const ALL_DUE: WarningFigures = { ...CAPACITY_DUE, ...USAGE_DUE, ...NORGESPRIS_DUE }
