import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { november2026Estimate } from '../../test/bills'
import type { MonthlyBill } from './types'
import { getCurrentHourCost, getDailyCost, getHourlyCost, getMonthlyBill } from './api'

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
