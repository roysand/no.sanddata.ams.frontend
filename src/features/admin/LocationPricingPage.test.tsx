import { fireEvent, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { LocationPricingPage } from './LocationPricingPage'
import type { GridTariff, LocationPricing } from './types'

const elvia: GridTariff = { id: 'tariff-elvia', name: 'Elvia, household', rates: [] }
const bkk: GridTariff = { id: 'tariff-bkk', name: 'BKK', rates: [] }

const home: LocationPricing = {
  locationId: 'loc-home',
  name: 'Home',
  gridTariffId: 'tariff-elvia',
  gridTariffName: 'Elvia, household',
  supplierMarkupPerKwh: 0.02,
  isComplete: true,
}
const cabin: LocationPricing = {
  locationId: 'loc-cabin',
  name: 'Cabin',
  gridTariffId: null,
  gridTariffName: null,
  supplierMarkupPerKwh: 0,
  isComplete: false,
}

interface Put {
  locationId: string
  body: { gridTariffId: string | null; supplierMarkupPerKwh: number }
}

/** Serves the lists, and applies a PUT to the list the way the API would. */
function setup(initial: LocationPricing[] = [home, cabin], tariffs: GridTariff[] = [elvia, bkk]) {
  let locations = initial
  const puts: Put[] = []
  server.use(
    http.get('*/api/admin/location-pricing', () => HttpResponse.json(locations)),
    http.get('*/api/admin/grid-tariffs', () => HttpResponse.json(tariffs)),
    http.put('*/api/admin/location-pricing/:id', async ({ params, request }) => {
      const body = (await request.json()) as Put['body']
      puts.push({ locationId: String(params.id), body })
      const tariff = tariffs.find((t) => t.id === body.gridTariffId)
      const updated: LocationPricing = {
        ...locations.find((l) => l.locationId === params.id)!,
        gridTariffId: body.gridTariffId,
        gridTariffName: tariff?.name ?? null,
        supplierMarkupPerKwh: body.supplierMarkupPerKwh,
        isComplete: body.gridTariffId !== null,
      }
      locations = locations.map((l) => (l.locationId === params.id ? updated : l))
      return HttpResponse.json(updated)
    }),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <LocationPricingPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { puts, queryClient }
}

const rowFor = (name: string) => screen.getByText(name).closest('tr')!

describe('LocationPricingPage', () => {
  it('lists every location with its tariff, its markup and whether it is complete', async () => {
    setup()

    await screen.findByText('Home')

    const homeRow = within(rowFor('Home'))
    expect(homeRow.getByText('Elvia, household')).toBeInTheDocument()
    expect(homeRow.getByText(/0,02 kr\/kWh/)).toBeInTheDocument()
    expect(homeRow.getByText('Complete')).toBeInTheDocument()

    const cabinRow = within(rowFor('Cabin'))
    expect(cabinRow.getByText('Not set')).toBeInTheDocument()
    expect(cabinRow.getByText('Incomplete')).toBeInTheDocument()
  })

  it('says what a missing tariff means for the prices', async () => {
    setup()

    expect(
      await screen.findByText(/Without a grid tariff the grid part is left out/),
    ).toBeInTheDocument()
  })

  it('shows a loading message, and says so when there are no locations', async () => {
    setup([])

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('No locations yet')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('shows the server message when the list cannot be loaded', async () => {
    server.use(
      http.get('*/api/admin/location-pricing', () =>
        HttpResponse.json({ message: 'Something broke' }, { status: 500 }),
      ),
    )
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <LocationPricingPage />
        </MemoryRouter>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Something broke')).toBeInTheDocument()
  })

  describe('editing', () => {
    it('chooses a tariff and a markup, sends them as an id and a number, and refreshes the row', async () => {
      const u = userEvent.setup()
      const { puts } = setup()
      await screen.findByText('Cabin')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Cabin' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Cabin' })
      await u.click(within(dialog).getByRole('combobox', { name: 'Grid tariff' }))
      await u.click(await screen.findByRole('option', { name: 'BKK' }))
      const markup = within(dialog).getByLabelText(/Supplier markup/)
      fireEvent.change(markup, { target: { value: '0,035' } })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      await within(rowFor('Cabin')).findByText('BKK')
      expect(puts).toEqual([
        {
          locationId: 'loc-cabin',
          body: { gridTariffId: 'tariff-bkk', supplierMarkupPerKwh: 0.035 },
        },
      ])
      expect(within(rowFor('Cabin')).getByText('Complete')).toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('starts from the current values', async () => {
      const u = userEvent.setup()
      setup()
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })

      expect(within(dialog).getByLabelText(/Supplier markup/)).toHaveValue('0,02')
      expect(within(dialog).getByRole('combobox', { name: 'Grid tariff' })).toHaveTextContent(
        'Elvia, household',
      )
    })

    it('sends null when None is chosen', async () => {
      const u = userEvent.setup()
      const { puts } = setup()
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })
      await u.click(within(dialog).getByRole('combobox', { name: 'Grid tariff' }))
      await u.click(await screen.findByRole('option', { name: 'None' }))
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      await within(rowFor('Home')).findByText('Incomplete')
      expect(puts[0].body.gridTariffId).toBeNull()
    })

    it('warns that past hours are recalculated', async () => {
      const u = userEvent.setup()
      setup()
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))

      expect(
        await screen.findByText(/recalculates the costs shown for past hours/),
      ).toBeInTheDocument()
    })

    it('shows what is wrong with the markup and sends nothing', async () => {
      const u = userEvent.setup()
      const { puts } = setup()
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })
      const markup = within(dialog).getByLabelText(/Supplier markup/)
      fireEvent.change(markup, { target: { value: '' } })
      fireEvent.change(markup, { target: { value: '-1' } })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      expect(await within(dialog).findByText('Markup cannot be negative')).toBeInTheDocument()
      fireEvent.change(markup, { target: { value: '' } })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))
      expect(await within(dialog).findByText('Markup is required')).toBeInTheDocument()
      expect(puts).toHaveLength(0)
    })

    it('shows the message from the API and keeps the dialog open', async () => {
      const u = userEvent.setup()
      setup()
      server.use(
        http.put('*/api/admin/location-pricing/:id', () =>
          HttpResponse.json(
            { errors: { generalErrors: ['Grid tariff not found'] } },
            { status: 404 },
          ),
        ),
      )
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      expect(await within(dialog).findByText('Grid tariff not found')).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Pricing for Home' })).toBeInTheDocument()
    })

    it('points to the Grid tariffs page when there are no tariffs yet', async () => {
      const u = userEvent.setup()
      setup([cabin], [])
      await screen.findByText('Cabin')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Cabin' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Cabin' })

      expect(await within(dialog).findByText(/No tariffs yet/)).toBeInTheDocument()
      expect(
        within(dialog).getByRole('link', { name: /Add one on the Grid tariffs page/ }),
      ).toHaveAttribute('href', '/admin/grid-tariffs')
    })

    it('refreshes the cost and price figures that are already loaded', async () => {
      const u = userEvent.setup()
      const { queryClient } = setup()
      queryClient.setQueryData(['cost', 'current', 'loc-home'], { cost: 1 })
      queryClient.setQueryData(['prices', 'today', 'loc-home'], { prices: 1 })
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))
      await within(rowFor('Home')).findByText(/kr\/kWh/)

      await vi.waitFor(() => {
        expect(queryClient.getQueryState(['cost', 'current', 'loc-home'])?.isInvalidated).toBe(true)
        expect(queryClient.getQueryState(['prices', 'today', 'loc-home'])?.isInvalidated).toBe(true)
      })
    })
  })
})
