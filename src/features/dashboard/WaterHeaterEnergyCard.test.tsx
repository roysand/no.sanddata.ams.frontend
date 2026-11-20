import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { delay, http, HttpResponse } from 'msw'
import { november2026Estimate, withWaterHeater } from '../../test/bills'
import { server } from '../../test/server'
import { plain } from '../../test/text'
import { osloMonth } from './format'
import { WaterHeaterEnergyCard } from './WaterHeaterEnergyCard'
import type { HourlyCostItem, MonthlyBill, PagedHourlyCost, WaterHeaterPart } from './types'

const part = (kwh: number, cost: number | null): WaterHeaterPart => ({
  kwh,
  cost,
  sampledMinutes: 60,
  capped: false,
})

const hour = (i: number, kwh: number, waterHeater: WaterHeaterPart | null): HourlyCostItem => ({
  hourStart: new Date(Date.UTC(2026, 10, 19, 23 + i)).toISOString(),
  consumptionKwh: kwh,
  pricingModel: 'Spot',
  actual: { ratePerKwh: 1, cost: kwh },
  comparison: null,
  waterHeater,
})

/** Today: 13,5 kWh, of which 4,2 kWh (3,80 kr) water heating. */
const today = (
  items: HourlyCostItem[] = [
    hour(0, 6, part(3, 2.7)),
    hour(1, 4.5, part(1.2, 1.1)),
    hour(2, 3, null),
  ],
): PagedHourlyCost => ({ items, page: 1, pageSize: 500, totalCount: items.length })

const month = osloMonth(new Date())
/** The estimate fixture moved to this month, with a water heater part. */
const billWith = (patch: Parameters<typeof withWaterHeater>[1]) =>
  withWaterHeater({ ...november2026Estimate(), month }, patch)

function serve(hourly: PagedHourlyCost, bill: MonthlyBill) {
  server.use(
    http.get('*/api/electricity-cost/hourly', () => HttpResponse.json(hourly)),
    http.get('*/api/electricity-cost/bill', () => HttpResponse.json(bill)),
  )
}

function renderCard(
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
  render(
    <QueryClientProvider client={queryClient}>
      <WaterHeaterEnergyCard locationId="l1" />
    </QueryClientProvider>,
  )
}

const rowText = (term: string) =>
  plain(screen.getByText(term, { selector: 'dt' }).nextElementSibling?.textContent ?? '')

describe('WaterHeaterEnergyCard', () => {
  it("shows today's water heating with its share, and this month's from the bill", async () => {
    serve(today(), billWith({ firstHourUtc: '2026-11-19T18:00:00Z' }))
    renderCard()

    expect(await screen.findByText(/% of today's use/)).toBeInTheDocument()
    expect(rowText('Today')).toBe("4,2 kWh · 3,80 kr · 31 % of today's use")
    expect(await screen.findByText(/104,6 kWh/)).toBeInTheDocument()
    expect(rowText('This month')).toMatch(/^104,6 kWh · 94,12 kr/)
  })

  it('says since when when the heater was connected during the month', async () => {
    serve(today(), billWith({ firstHourUtc: '2026-11-19T18:00:00Z' }))
    renderCard()

    expect(await screen.findByText('since 19.11.2026')).toBeInTheDocument()
  })

  it('says there are no measurements yet, never zeros', async () => {
    serve(today([hour(0, 2, null)]), { ...november2026Estimate(), month, waterHeater: null })
    renderCard()

    expect(await screen.findAllByText('No measurements yet')).toHaveLength(2)
    expect(screen.queryByText(/0 kWh/)).not.toBeInTheDocument()
  })

  it('leaves the share out when there is no use today, and the cost out when it is unknown', async () => {
    serve(today([hour(0, 0, part(0, null))]), billWith({ cost: null }))
    renderCard()

    await screen.findByText(/104,6 kWh/)
    expect(rowText('Today')).toBe('0 kWh')
    expect(rowText('This month')).toMatch(/^104,6 kWh($|since)/)
  })

  it('shows what Now already loaded at once, from the shared cache', async () => {
    server.use(
      http.get('*/api/electricity-cost/hourly', async () => {
        await delay('infinite')
        return HttpResponse.json(today())
      }),
      http.get('*/api/electricity-cost/bill', async () => {
        await delay('infinite')
        return HttpResponse.json(billWith({}))
      }),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    queryClient.setQueryData(['cost', 'hourly-today', 'l1'], today())
    queryClient.setQueryData(['cost', 'bill', 'l1', month], billWith({}))
    renderCard(queryClient)

    expect(rowText('Today')).toBe("4,2 kWh · 3,80 kr · 31 % of today's use")
    expect(rowText('This month')).toMatch(/^104,6 kWh · 94,12 kr/)
  })
})
