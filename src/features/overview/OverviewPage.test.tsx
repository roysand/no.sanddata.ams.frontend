import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { periodPlan } from '../dashboard/periods'
import { renderWithQuery } from '../../test/render'
import { server } from '../../test/server'
import { OverviewPage } from './OverviewPage'

const location = (id: string, name: string, isActive = true) => ({
  id,
  name,
  address: 'Somewhere 1',
  zone: 'NO1',
  serialNumber: `SN-${id}`,
  hasNorgesPriceAgreement: false,
  isActive,
  role: 'Owner',
  meters: [],
})

interface Usage {
  hours: number
  kwhPerHour: number
  cost: number | null
  powerKwhPerMinute?: number
}

const USAGE: Record<string, Usage> = {
  l1: { hours: 3, kwhPerHour: 2, cost: 2, powerKwhPerMinute: 0.057 }, // 6 kWh, 6 kr, 3.42 kW
  l2: { hours: 1, kwhPerHour: 1, cost: 20, powerKwhPerMinute: 0.017 }, // 1 kWh, 20 kr, 1.02 kW
}

function useApi(locations = [location('l1', 'Home'), location('l2', 'Cabin')], usage = USAGE) {
  const plan = periodPlan('day', new Date())
  server.use(
    http.get('*/api/locations', () => HttpResponse.json(locations)),
    http.get('*/api/electricity-cost/hourly', ({ request }) => {
      const url = new URL(request.url)
      const u = usage[url.searchParams.get('locationId')!]
      const isCurrent = url.searchParams.get('from') === plan.current.fromUtc
      const slots = isCurrent ? plan.current.slots.slice(0, u.hours) : []
      return HttpResponse.json({
        items: slots.map((slot) => ({
          hourStart: new Date(Number(slot.key)).toISOString(),
          consumptionKwh: u.kwhPerHour,
          pricingModel: 'Spot',
          actual: u.cost === null ? null : { ratePerKwh: 1, cost: u.cost },
          comparison: null,
        })),
        page: 1,
        pageSize: 500,
        totalCount: slots.length,
      })
    }),
    http.get('*/api/consumption', ({ request }) => {
      const u = usage[new URL(request.url).searchParams.get('locationId')!]
      const minute = new Date(Math.floor(Date.now() / 60_000) * 60_000 - 60_000)
      return HttpResponse.json({
        granularity: 'minute',
        items: [{ periodStart: minute.toISOString(), consumptionKwh: u.powerKwhPerMinute ?? 0 }],
      })
    }),
  )
}

function renderOverview() {
  return renderWithQuery(
    <MemoryRouter initialEntries={['/locations']}>
      <Routes>
        <Route path="/locations" element={<OverviewPage />} />
        <Route path="/" element={<p>Dashboard page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('OverviewPage', () => {
  beforeEach(() => localStorage.clear())

  it('shows combined power, energy and cost that equal the sum of the locations', async () => {
    useApi()
    renderOverview()

    expect(await screen.findByText('kW now')).toBeInTheDocument()
    expect(await screen.findByText(/4,44/)).toBeInTheDocument() // 3.42 + 1.02 kW
    expect(screen.getByText(/7 kWh/, { selector: 'dd' })).toBeInTheDocument() // 6 + 1
    expect(screen.getAllByText(/26,00/).length).toBeGreaterThan(0) // 6 + 20 kr
  })

  it('lists each location with its figures, highest cost first', async () => {
    useApi()
    renderOverview()

    const cards = await screen.findAllByRole('button', { name: /Open details/ })
    expect(cards).toHaveLength(2)
    expect(within(cards[0]).getByText('Cabin')).toBeInTheDocument() // 20 kr
    expect(within(cards[1]).getByText('Home')).toBeInTheDocument() // 6 kr
    expect(within(cards[1]).getByText(/3,42 kW/)).toBeInTheDocument()
    expect(within(cards[1]).getByText(/86% of total use/)).toBeInTheDocument() // 6 of 7 kWh
  })

  it('opens the dashboard of the tapped location and remembers it', async () => {
    useApi()
    const user = userEvent.setup()
    renderOverview()

    await user.click(await screen.findByRole('button', { name: /Home.*Open details/ }))

    expect(await screen.findByText('Dashboard page')).toBeInTheDocument()
    expect(localStorage.getItem('ams.selectedLocation')).toBe('l1')
  })

  it('leaves inactive locations out', async () => {
    useApi([location('l1', 'Home'), location('l2', 'Cabin'), location('l3', 'Old', false)], {
      ...USAGE,
      l3: { hours: 1, kwhPerHour: 9, cost: 9 },
    })
    renderOverview()

    await screen.findAllByRole('button', { name: /Open details/ })
    expect(screen.queryByRole('button', { name: /Old/ })).not.toBeInTheDocument()
    expect(screen.getByText('2 locations')).toBeInTheDocument()
  })

  it('shows energy and marks cost as not available when prices are missing', async () => {
    useApi(undefined, {
      l1: { hours: 3, kwhPerHour: 2, cost: null, powerKwhPerMinute: 0.057 },
      l2: { hours: 1, kwhPerHour: 1, cost: null, powerKwhPerMinute: 0.017 },
    })
    renderOverview()

    expect(await screen.findByText(/Cost appears when prices are available/)).toBeInTheDocument()
    expect(screen.getAllByText('price not available yet')).toHaveLength(2)
    expect(screen.getByText(/7 kWh/, { selector: 'dd' })).toBeInTheDocument()
  })

  it('keeps the other locations when one request fails and marks the failed one incomplete', async () => {
    useApi()
    server.use(
      http.get('*/api/electricity-cost/hourly', ({ request }) => {
        const url = new URL(request.url)
        if (url.searchParams.get('locationId') === 'l2') {
          return HttpResponse.json({ title: 'boom' }, { status: 500 })
        }
        const plan = periodPlan('day', new Date())
        const isCurrent = url.searchParams.get('from') === plan.current.fromUtc
        return HttpResponse.json({
          items: isCurrent
            ? plan.current.slots.slice(0, 3).map((slot) => ({
                hourStart: new Date(Number(slot.key)).toISOString(),
                consumptionKwh: 2,
                pricingModel: 'Spot',
                actual: { ratePerKwh: 1, cost: 2 },
                comparison: null,
              }))
            : [],
          page: 1,
          pageSize: 500,
          totalCount: 3,
        })
      }),
    )
    renderOverview()

    const cards = await screen.findAllByRole('button', { name: /Open details/ })
    expect(cards).toHaveLength(2)
    expect(screen.getByText(/Cost \(incomplete\)|Cost today \(incomplete\)/)).toBeInTheDocument()
  })

  it('switches the period', async () => {
    useApi()
    const user = userEvent.setup()
    renderOverview()
    await screen.findAllByRole('button', { name: /Open details/ })

    await user.click(screen.getByRole('button', { name: 'Week' }))

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true')
  })
})
