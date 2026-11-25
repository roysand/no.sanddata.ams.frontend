import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { november2026Estimate } from '../../test/bills'
import { liveState } from '../../test/evCharger'
import type { MonthlyBill } from './types'
import {
  getCurrentHourCost,
  getDailyCost,
  getEvChargerState,
  getHotWater,
  getHourlyCost,
  getMonthlyBill,
  getNorgesPrisStatus,
  getWaterHeaterPower,
} from './api'

/** An API without spec 016: no totalKwh, totalKwhSoFar or evCharger anywhere. */
const hourWithout = {
  hourStart: '2026-11-20T10:00:00Z',
  consumptionKwh: 1.5,
  pricingModel: 'Spot',
  actual: null,
  comparison: null,
}
const dayWithout = {
  date: '2026-11-20',
  consumptionKwh: 30,
  pricingModel: 'Spot',
  actual: null,
  comparison: null,
}

describe('normalising the car charger fields (spec 013, research R1)', () => {
  it('reads an hourly item without them as the house only', async () => {
    server.use(
      http.get('*/api/electricity-cost/hourly', () =>
        HttpResponse.json({ items: [hourWithout], page: 1, pageSize: 500, totalCount: 1 }),
      ),
    )

    const [item] = (await getHourlyCost('l1', '2026-11-20T00:00:00Z')).items

    expect(item.totalKwh).toBe(1.5)
    expect(item.evCharger).toBeNull()
    expect(item.waterHeater).toBeNull()
  })

  it('reads a daily item without them as the house only', async () => {
    server.use(
      http.get('*/api/electricity-cost/daily', () => HttpResponse.json({ items: [dayWithout] })),
    )

    const [item] = (await getDailyCost('l1')).items

    expect(item.totalKwh).toBe(30)
    expect(item.evCharger).toBeNull()
  })

  it('reads the current hour without them as the house only', async () => {
    server.use(
      http.get('*/api/electricity-cost/current', () =>
        HttpResponse.json({
          hourStart: '2026-11-20T10:00:00Z',
          consumptionKwhSoFar: 0.7,
          pricingModel: 'Spot',
          actual: null,
          comparison: null,
        }),
      ),
    )

    const current = await getCurrentHourCost('l1')

    expect(current.totalKwhSoFar).toBe(0.7)
    expect(current.evCharger).toBeNull()
  })

  it('reads a bill without them as having no car figures', async () => {
    const older: Partial<MonthlyBill> = november2026Estimate()
    delete older.totalKwh
    delete older.evCharger
    server.use(http.get('*/api/electricity-cost/bill', () => HttpResponse.json(older)))

    const bill = await getMonthlyBill('l1', '2026-11')

    expect(bill.totalKwh).toBeNull()
    expect(bill.evCharger).toBeNull()
  })

  it('passes the fields through when the API sends them', async () => {
    const evCharger = { kwh: 3.2, estimated: false, included: true }
    server.use(
      http.get('*/api/electricity-cost/hourly', () =>
        HttpResponse.json({
          items: [{ ...hourWithout, totalKwh: 4.7, evCharger, waterHeater: null }],
          page: 1,
          pageSize: 500,
          totalCount: 1,
        }),
      ),
    )

    const [item] = (await getHourlyCost('l1', '2026-11-20T00:00:00Z')).items

    expect(item.totalKwh).toBe(4.7)
    expect(item.evCharger).toEqual(evCharger)
  })
})

describe('getWaterHeaterPower (spec 014)', () => {
  it('asks for the window it is given and returns the 5-minute steps', async () => {
    const asked: Record<string, string | null>[] = []
    const items = [{ start: '2026-11-20T19:40:00Z', powerKw: 2.03, sampledSeconds: 300 }]
    server.use(
      http.get('*/api/locations/l1/water-heater/power', ({ request }) => {
        const url = new URL(request.url)
        asked.push({ from: url.searchParams.get('from'), to: url.searchParams.get('to') })
        return HttpResponse.json({
          locationId: 'l1',
          from: '2026-11-20T17:40:00Z',
          to: '2026-11-20T20:40:00Z',
          stepSeconds: 300,
          items,
        })
      }),
    )

    const power = await getWaterHeaterPower(
      'l1',
      '2026-11-20T17:40:00.000Z',
      '2026-11-20T20:40:00.000Z',
    )

    expect(asked).toEqual([{ from: '2026-11-20T17:40:00.000Z', to: '2026-11-20T20:40:00.000Z' }])
    expect(power.items).toEqual(items)
  })
})

describe('getNorgesPrisStatus (spec 015)', () => {
  it('reads the status of every location', async () => {
    const item = {
      locationId: 'l2',
      month: '2026-11',
      limitKwh: 1000,
      kwhSoFar: 1084,
      projectedKwh: 1240,
      overLimit: true,
      overLimitKwh: 84,
      norgesPrisPricePerKwh: 0.5,
      resetsAt: '2026-11-30T23:00:00Z',
    }
    server.use(
      http.get('*/api/electricity-cost/norgespris-status', () =>
        HttpResponse.json({ asOf: '2026-11-22T11:00:00Z', items: [item] }),
      ),
    )

    const status = await getNorgesPrisStatus()

    expect(status.items).toEqual([item])
  })
})

describe('the car charging cost on the bill (spec 016)', () => {
  const part = {
    kwh: 212.7,
    estimated: false,
    included: false,
    hoursWithoutMeterReading: 0,
    firstHour: '2026-11-01T06:00:00Z',
    lastHour: '2026-11-20T21:00:00Z',
  }
  const serve = (evCharger: object) =>
    server.use(
      http.get('*/api/electricity-cost/bill', () =>
        HttpResponse.json({ ...november2026Estimate(), evCharger }),
      ),
    )

  it('reads a car part from an API without spec 019 as having no cost figures', async () => {
    serve(part)

    const bill = await getMonthlyBill('l1', '2026-11')

    expect(bill.evCharger).toEqual({ ...part, cost: null, pricedAt: null })
  })

  it('passes the cost and its rule through', async () => {
    serve({ ...part, cost: 106.35, pricedAt: 'NorgesPrisPrice' })

    const bill = await getMonthlyBill('l1', '2026-11')

    expect(bill.evCharger).toMatchObject({ cost: 106.35, pricedAt: 'NorgesPrisPrice' })
  })
})

describe('getEvChargerState (spec 017)', () => {
  const serve = (state: string) =>
    server.use(
      http.get('*/api/locations/:id/ev-charger/state', () =>
        HttpResponse.json({ ...liveState(), state }),
      ),
    )

  it('passes a known state through', async () => {
    serve('finished')

    expect((await getEvChargerState('l1')).state).toBe('finished')
  })

  it('reads a state the app does not know as unknown, keeping the figures', async () => {
    serve('paused')

    const live = await getEvChargerState('l1')

    expect(live.state).toBe('unknown')
    expect(live.sessionKwh).toBe(12.962)
  })
})

describe('getHotWater (spec 018)', () => {
  it('asks for the period and the date', async () => {
    const asked: { url?: URL } = {}
    server.use(
      http.get('*/api/locations/l1/water-heater/hot-water', ({ request }) => {
        asked.url = new URL(request.url)
        return HttpResponse.json({
          locationId: 'l1',
          period: 'week',
          from: '2026-11-22T23:00:00Z',
          to: '2026-11-29T23:00:00Z',
          totalLitres: null,
          sampledMinutes: 0,
          items: [],
        })
      }),
    )

    const answer = await getHotWater('l1', 'week', '2026-11-23')

    expect(asked.url?.searchParams.get('period')).toBe('week')
    expect(asked.url?.searchParams.get('date')).toBe('2026-11-23')
    expect(answer.totalLitres).toBeNull()
  })
})
