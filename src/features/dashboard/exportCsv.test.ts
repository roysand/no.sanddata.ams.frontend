import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { dailyCsv, exportFileName, fetchHourly, hourlyCsv } from './exportCsv'
import type { HourlyCostItem } from './types'

const hour = (hourStart: string, kwh = 1.2345): HourlyCostItem => ({
  hourStart,
  consumptionKwh: kwh,
  pricingModel: 'Spot',
  actual: { ratePerKwh: 1.23456, cost: 1.524 },
  comparison: null,
})

describe('hourlyCsv', () => {
  it('writes Oslo time, UTC, semicolons and decimal commas', () => {
    const lines = hourlyCsv([hour('2026-11-18T13:00:00Z')]).split('\r\n')

    expect(lines[0]).toBe(
      'Start (Oslo time);Start (UTC);Usage (kWh);Price model;Price (kr/kWh);Cost (kr);Other model;Other price (kr/kWh);Other cost (kr)',
    )
    expect(lines[1]).toBe(
      '2026-11-18 14:00;2026-11-18T13:00:00.000Z;1,235;Spot price;1,2346;1,52;Norgespris;;',
    )
  })

  it('keeps both hours apart on the night the clocks go back', () => {
    const csv = hourlyCsv([hour('2026-10-25T00:00:00Z'), hour('2026-10-25T01:00:00Z')])

    expect(csv.match(/2026-10-25 02:00/g)).toHaveLength(2)
    expect(csv).toContain('2026-10-25T00:00:00.000Z')
    expect(csv).toContain('2026-10-25T01:00:00.000Z')
  })
})

describe('dailyCsv', () => {
  it('writes one row per day with both costs', () => {
    const lines = dailyCsv([
      {
        date: '2026-11-17',
        consumptionKwh: 30.5,
        pricingModel: 'NorgesPris',
        actual: { cost: 40 },
        comparison: { cost: 45.555 },
      },
    ]).split('\r\n')

    expect(lines[0]).toBe('Date;Usage (kWh);Price model;Cost (kr);Other model;Other cost (kr)')
    expect(lines[1]).toBe('2026-11-17;30,500;Norgespris;40,00;Spot price;45,56')
  })
})

describe('exportFileName', () => {
  it('turns the location name into a safe file name', () => {
    expect(exportFileName('Hytta på Ørland', '2026-11-01', '2026-11-18', 'hour')).toBe(
      'hytta-pa-orland-hourly-2026-11-01-to-2026-11-18.csv',
    )
    expect(exportFileName('***', '2026-11-01', '2026-11-18', 'day')).toBe(
      'location-daily-2026-11-01-to-2026-11-18.csv',
    )
  })
})

describe('fetchHourly', () => {
  it('pages through the API from Oslo midnight to the end of the last day', async () => {
    const requests: URLSearchParams[] = []
    const total = 2500
    server.use(
      http.get('*/api/electricity-cost/hourly', ({ request }) => {
        const params = new URL(request.url).searchParams
        requests.push(params)
        const page = Number(params.get('page'))
        const size = Number(params.get('pageSize'))
        const count = Math.min(size, total - (page - 1) * size)
        return HttpResponse.json({
          items: Array.from({ length: count }, () => hour('2026-11-18T13:00:00Z')),
          page,
          pageSize: size,
          totalCount: total,
        })
      }),
    )

    const items = await fetchHourly('l1', '2026-11-01', '2026-11-18')

    expect(items).toHaveLength(total)
    expect(requests.map((params) => params.get('page'))).toEqual(['1', '2'])
    expect(requests[0].get('from')).toBe('2026-10-31T23:00:00.000Z')
    expect(requests[0].get('to')).toBe('2026-11-18T22:59:59.000Z')
  })
})

describe('number rounding in the CSV', () => {
  it('rounds tiny and negative values sensibly', () => {
    const csv = hourlyCsv([
      {
        ...hour('2026-11-18T13:00:00Z', 0.0000001),
        actual: { ratePerKwh: -0.12345, cost: -0.005 },
      },
    ])

    expect(csv).toContain(';0,000;Spot price;-0,1235;-0,01;')
  })
})
