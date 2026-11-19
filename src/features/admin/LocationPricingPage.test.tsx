import { fireEvent, screen, waitFor, within } from '@testing-library/react'
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
  supplierMonthlyFee: 27.2,
  isComplete: true,
  electricityTaxExempt: false,
  vatExempt: false,
  isHolidayHome: false,
}
const cabin: LocationPricing = {
  locationId: 'loc-cabin',
  name: 'Cabin',
  gridTariffId: null,
  gridTariffName: null,
  supplierMarkupPerKwh: 0,
  supplierMonthlyFee: null,
  isComplete: false,
  electricityTaxExempt: false,
  vatExempt: false,
  isHolidayHome: true,
}

const owner = (email: string) => ({
  userId: email,
  email,
  firstName: 'A',
  lastName: 'B',
  role: 'Owner' as const,
})
const adminLocation = (id: string, name: string, address: string, owners: string[]) => ({
  id,
  name,
  address,
  serialNumber: id,
  zone: 'NO1',
  isActive: true,
  hasNorgesPriceAgreement: true,
  meters: [],
  users: owners.map(owner),
})
// Two locations may share a name, so the rows also show the address and the owners.
const adminLocations = [
  adminLocation('loc-home', 'Home', 'Storgata 1', ['anne@example.no']),
  adminLocation('loc-cabin', 'Cabin', 'Fjellveien 9', ['anne@example.no', 'bo@example.no']),
]

interface Put {
  locationId: string
  body: {
    gridTariffId: string | null
    supplierMarkupPerKwh: number
    supplierMonthlyFee?: number
    electricityTaxExempt: boolean
    vatExempt: boolean
    isHolidayHome: boolean
  }
}

/** Serves the lists, and applies a PUT to the list the way the API would. */
function setup(
  initial: (Partial<LocationPricing> & Pick<LocationPricing, 'locationId' | 'name'>)[] = [
    home,
    cabin,
  ],
  tariffs: GridTariff[] = [elvia, bkk],
) {
  let locations = initial
  const puts: Put[] = []
  server.use(
    http.get('*/api/admin/location-pricing', () => HttpResponse.json(locations)),
    http.get('*/api/admin/grid-tariffs', () => HttpResponse.json(tariffs)),
    http.get('*/api/admin/locations', () => HttpResponse.json(adminLocations)),
    http.put('*/api/admin/location-pricing/:id', async ({ params, request }) => {
      const body = (await request.json()) as Put['body']
      puts.push({ locationId: String(params.id), body })
      const tariff = tariffs.find((t) => t.id === body.gridTariffId)
      const current = locations.find((l) => l.locationId === params.id)!
      // An omitted fee keeps the stored one; complete needs both a tariff and a fee.
      const fee = body.supplierMonthlyFee ?? current.supplierMonthlyFee ?? null
      const updated: LocationPricing = {
        ...current,
        gridTariffId: body.gridTariffId,
        gridTariffName: tariff?.name ?? null,
        supplierMarkupPerKwh: body.supplierMarkupPerKwh,
        supplierMonthlyFee: fee,
        isComplete: body.gridTariffId !== null && fee !== null,
        electricityTaxExempt: body.electricityTaxExempt,
        vatExempt: body.vatExempt,
        isHolidayHome: body.isHolidayHome,
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
  it('lists every location with its tariff, its markup, its monthly fee and whether it is complete', async () => {
    setup()

    await screen.findByText('Home')
    expect(screen.getByRole('columnheader', { name: 'Monthly fee' })).toBeInTheDocument()
    // The flags are shown under the name when set, not in a column of their own.
    expect(
      screen.queryByRole('columnheader', { name: 'Exemptions and type' }),
    ).not.toBeInTheDocument()
    expect(rowFor('Cabin').cells[0]).toHaveTextContent('Holiday home')
    expect(rowFor('Home').cells[0]).not.toHaveTextContent(/exempt|Holiday home/)

    const homeRow = within(rowFor('Home'))
    expect(homeRow.getByText('Elvia, household')).toBeInTheDocument()
    expect(homeRow.getByText(/0,02 kr\/kWh/)).toBeInTheDocument()
    expect(homeRow.getByText('27,20 kr/month')).toBeInTheDocument()
    expect(homeRow.getByText('Complete')).toBeInTheDocument()

    // Neither a tariff nor a fee.
    const cabinRow = within(rowFor('Cabin'))
    expect(cabinRow.getAllByText('Not set')).toHaveLength(2)
    expect(cabinRow.getByText('Incomplete')).toBeInTheDocument()
  })

  it('says a location needs both a grid tariff and a monthly fee', async () => {
    setup()

    expect(
      await screen.findByText(/incomplete until it has both a grid tariff and a monthly fee/),
    ).toBeInTheDocument()
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
      fireEvent.change(within(dialog).getByLabelText(/Supplier monthly fee/), {
        target: { value: '27,20' },
      })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      await within(rowFor('Cabin')).findByText('BKK')
      expect(puts).toEqual([
        {
          locationId: 'loc-cabin',
          body: {
            gridTariffId: 'tariff-bkk',
            supplierMarkupPerKwh: 0.035,
            supplierMonthlyFee: 27.2,
            electricityTaxExempt: false,
            vatExempt: false,
            isHolidayHome: true,
          },
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
      expect(within(dialog).getByLabelText(/Supplier monthly fee/)).toHaveValue('27,2')
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

    it('starts with an empty fee field when no fee is set, and says what empty and 0 mean', async () => {
      const u = userEvent.setup()
      setup()
      await screen.findByText('Cabin')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Cabin' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Cabin' })

      expect(within(dialog).getByLabelText(/Supplier monthly fee/)).toHaveValue('')
      expect(
        within(dialog).getByText(
          'Enter 0 for a supplier without a monthly fee. Leaving it empty keeps the current value.',
        ),
      ).toBeInTheDocument()
    })

    it('leaves the fee out of the request when the field is empty, so the stored fee is kept', async () => {
      const u = userEvent.setup()
      const { puts } = setup()
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })
      fireEvent.change(within(dialog).getByLabelText(/Supplier monthly fee/), {
        target: { value: '' },
      })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(puts).toHaveLength(1))
      expect(puts[0].body).not.toHaveProperty('supplierMonthlyFee')
      expect(await within(rowFor('Home')).findByText('27,20 kr/month')).toBeInTheDocument()
    })

    it('shows what is wrong with the fee and sends nothing', async () => {
      const u = userEvent.setup()
      const { puts } = setup()
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })
      fireEvent.change(within(dialog).getByLabelText(/Supplier monthly fee/), {
        target: { value: '10001' },
      })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      expect(
        await within(dialog).findByText('Monthly fee can be at most 10000'),
      ).toBeInTheDocument()
      expect(puts).toHaveLength(0)
    })

    it('shows a refusal of the fee by the API under the fee field', async () => {
      const u = userEvent.setup()
      setup()
      server.use(
        http.put('*/api/admin/location-pricing/:id', () =>
          HttpResponse.json(
            {
              code: 'Validation.InvalidMonthlyFee',
              errors: {
                supplierMonthlyFee: [
                  'Monthly fee must be between 0 and 10000 with at most 4 decimals',
                ],
              },
            },
            { status: 400 },
          ),
        ),
      )
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      const message = await within(dialog).findByText(
        'Monthly fee must be between 0 and 10000 with at most 4 decimals',
      )
      // Right under the fee's help text, not in the general error at the bottom.
      expect(message.previousElementSibling).toHaveTextContent(/Enter 0 for a supplier/)
    })

    it('says the markup is added to every kWh, also under Norgespris', async () => {
      const u = userEvent.setup()
      setup()
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })

      expect(
        within(dialog).getByText('Added to every kWh, also under Norgespris.'),
      ).toBeInTheDocument()
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

  describe('exemptions and holiday home', () => {
    it('shows a badge for each flag that is set', async () => {
      setup([{ ...home, electricityTaxExempt: true, vatExempt: true }, cabin])
      await screen.findByText('Home')

      expect(within(rowFor('Home')).getByText('Tax exempt')).toBeInTheDocument()
      expect(within(rowFor('Home')).getByText('VAT exempt')).toBeInTheDocument()
      expect(within(rowFor('Home')).queryByText('Holiday home')).not.toBeInTheDocument()
      expect(within(rowFor('Cabin')).getByText('Holiday home')).toBeInTheDocument()
    })

    it('starts from the current flags, sends the changed ones and shows them', async () => {
      const u = userEvent.setup()
      const { puts } = setup()
      await screen.findByText('Home')

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Home' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Home' })
      expect(within(dialog).getByRole('checkbox', { name: 'Holiday home' })).not.toBeChecked()

      await u.click(within(dialog).getByRole('checkbox', { name: 'Holiday home' }))
      await u.click(within(dialog).getByRole('checkbox', { name: 'Exempt from VAT' }))
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      await within(rowFor('Home')).findByText('Holiday home')
      expect(within(rowFor('Home')).getByText('VAT exempt')).toBeInTheDocument()
      expect(puts[0].body).toMatchObject({
        electricityTaxExempt: false,
        vatExempt: true,
        isHolidayHome: true,
      })
    })

    it('reads a list without flags (an older API) as none set, and still saves', async () => {
      const u = userEvent.setup()
      const { puts } = setup([
        {
          locationId: 'loc-old',
          name: 'Old',
          gridTariffId: 'tariff-elvia',
          gridTariffName: 'Elvia, household',
          supplierMarkupPerKwh: 0,
          isComplete: true,
        },
      ])
      await screen.findByText('Old')
      expect(within(rowFor('Old')).queryByText(/exempt|Holiday home/)).not.toBeInTheDocument()
      // Nor a monthly fee: shown as not set.
      expect(within(rowFor('Old')).getByText('Not set')).toBeInTheDocument()

      await u.click(screen.getByRole('button', { name: 'Edit pricing for Old' }))
      const dialog = await screen.findByRole('dialog', { name: 'Pricing for Old' })
      await u.click(within(dialog).getByRole('button', { name: 'Save' }))

      await waitFor(() => expect(puts).toHaveLength(1))
      expect(puts[0].body).toMatchObject({
        electricityTaxExempt: false,
        vatExempt: false,
        isHolidayHome: false,
      })
    })
  })

  it('shows the address and the owners under each name, so locations with the same name can be told apart', async () => {
    setup()
    await screen.findByText('Home')

    expect(
      await within(rowFor('Home')).findByText('Storgata 1 · Owner: anne@example.no'),
    ).toBeInTheDocument()
    expect(
      within(rowFor('Cabin')).getByText('Fjellveien 9 · Owner: anne@example.no, bo@example.no'),
    ).toBeInTheDocument()
  })
})
