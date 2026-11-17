import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { GridTariffsPage } from './GridTariffsPage'
import type { CapacityStepTable, GridTariff, GridTariffRate } from './types'

const rate = (
  id: string,
  validFrom: string,
  status: GridTariffRate['status'],
  day = 0.3,
  night = 0.2,
): GridTariffRate => ({ id, validFrom, dayRatePerKwh: day, nightRatePerKwh: night, status })

const elvia: GridTariff = {
  id: 'tariff-elvia',
  name: 'Elvia, household',
  rates: [
    rate('r1', '2026-01-01', 'Superseded'),
    rate('r2', '2026-07-01', 'InEffect', 0.3641, 0.2641),
    rate('r3', '2027-01-01', 'Upcoming', 0.35, 0.22),
  ],
}
const bkk: GridTariff = { id: 'tariff-bkk', name: 'BKK', rates: [] }

// Elvia's steps from 2026-07-01, excluding VAT (the published amounts divided by 1,25), shortened to four steps.
const ELVIA_STEPS = [
  { lowerKw: 0, upperKw: 2, monthlyAmount: 120 },
  { lowerKw: 2, upperKw: 5, monthlyAmount: 200 },
  { lowerKw: 5, upperKw: 10, monthlyAmount: 336 },
  { lowerKw: 10, upperKw: null, monthlyAmount: 540 },
]
const stepTables: CapacityStepTable[] = [
  { validFrom: '2026-07-01', status: 'InEffect', steps: ELVIA_STEPS },
  { validFrom: '2027-01-01', status: 'Upcoming', steps: ELVIA_STEPS },
]

function setup(
  tariffs: GridTariff[] = [elvia, bkk],
  steps: Record<string, CapacityStepTable[]> = { 'tariff-elvia': stepTables },
) {
  server.use(
    http.get('*/api/admin/grid-tariffs', () => HttpResponse.json(tariffs)),
    http.get('*/api/admin/grid-tariffs/:id/capacity-steps', ({ params }) =>
      HttpResponse.json(steps[String(params.id)] ?? []),
    ),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <GridTariffsPage />
    </QueryClientProvider>,
  )
}

const cardOf = (name: string) => screen.getByText(name).closest('[data-slot="card"]') as HTMLElement

describe('GridTariffsPage', () => {
  it('shows each tariff with its rates, the day and the night and weekend rate, and the status', async () => {
    setup()

    await screen.findByText('Elvia, household')

    const card = within(cardOf('Elvia, household'))
    expect(card.getByText(/0,3641 kr\/kWh/)).toBeInTheDocument()
    expect(card.getByText(/0,2641 kr\/kWh/)).toBeInTheDocument()
    expect(card.getByText('In effect')).toBeInTheDocument()
    expect(card.getByText('Upcoming')).toBeInTheDocument()
    expect(card.getByText('Superseded')).toBeInTheDocument()
    expect(card.getByText('01.07.2026')).toBeInTheDocument()
  })

  it('highlights exactly one rate per tariff, the one in effect', async () => {
    setup()
    await screen.findByText('Elvia, household')

    const highlighted = within(cardOf('Elvia, household'))
      .getAllByRole('row')
      .filter((row) => row.hasAttribute('aria-current'))

    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]).toHaveTextContent('01.07.2026')
  })

  it('says so for a tariff without rates', async () => {
    setup()
    await screen.findByText('BKK')

    expect(within(cardOf('BKK')).getByText('No rates yet')).toBeInTheDocument()
  })

  it('offers delete only on the upcoming rate', async () => {
    setup()
    await screen.findByText('Elvia, household')

    const deletes = screen.getAllByRole('button', { name: /^Delete rate from/ })

    expect(deletes).toHaveLength(1)
    expect(deletes[0]).toHaveAccessibleName('Delete rate from 01.01.2027 for Elvia, household')
  })

  it('shows loading, the empty state, and the message of a failed load', async () => {
    setup([])

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('No tariffs yet')).toBeInTheDocument()
  })

  it('shows the server message when the tariffs cannot be loaded', async () => {
    server.use(
      http.get('*/api/admin/grid-tariffs', () =>
        HttpResponse.json({ message: 'Something broke' }, { status: 500 }),
      ),
    )
    render(
      <QueryClientProvider
        client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
      >
        <GridTariffsPage />
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Something broke')).toBeInTheDocument()
  })

  describe('creating a tariff', () => {
    it('posts the name and shows the new tariff', async () => {
      const u = userEvent.setup()
      let tariffs: GridTariff[] = []
      const posted: unknown[] = []
      server.use(
        http.get('*/api/admin/grid-tariffs', () => HttpResponse.json(tariffs)),
        http.post('*/api/admin/grid-tariffs', async ({ request }) => {
          const body = (await request.json()) as { name: string }
          posted.push(body)
          const created: GridTariff = { id: 'new', name: body.name, rates: [] }
          tariffs = [...tariffs, created]
          return HttpResponse.json(created, { status: 201 })
        }),
      )
      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <GridTariffsPage />
        </QueryClientProvider>,
      )

      await u.click(await screen.findByRole('button', { name: 'New tariff' }))
      const dialog = await screen.findByRole('dialog', { name: 'New tariff' })
      fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Midtnett' } })
      await u.click(within(dialog).getByRole('button', { name: 'Create tariff' }))

      expect(await screen.findByText('Midtnett')).toBeInTheDocument()
      expect(posted).toEqual([{ name: 'Midtnett' }])
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('asks for a name before sending anything', async () => {
      const u = userEvent.setup()
      setup([])
      await u.click(await screen.findByRole('button', { name: 'New tariff' }))
      const dialog = await screen.findByRole('dialog', { name: 'New tariff' })

      await u.click(within(dialog).getByRole('button', { name: 'Create tariff' }))

      expect(await within(dialog).findByText('A name is required')).toBeInTheDocument()
    })

    it('shows the message of the API and keeps the dialog open when the name is taken', async () => {
      const u = userEvent.setup()
      setup([])
      server.use(
        http.post('*/api/admin/grid-tariffs', () =>
          HttpResponse.json(
            { errors: { generalErrors: ['Another grid tariff already has this name'] } },
            { status: 409 },
          ),
        ),
      )
      await u.click(await screen.findByRole('button', { name: 'New tariff' }))
      const dialog = await screen.findByRole('dialog', { name: 'New tariff' })
      fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Elvia' } })
      await u.click(within(dialog).getByRole('button', { name: 'Create tariff' }))

      expect(
        await within(dialog).findByText('Another grid tariff already has this name'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'New tariff' })).toBeInTheDocument()
    })
  })

  describe('deleting an upcoming rate', () => {
    it('removes it and refreshes the list', async () => {
      const u = userEvent.setup()
      let current: GridTariff = elvia
      const deleted: string[] = []
      server.use(
        http.get('*/api/admin/grid-tariffs', () => HttpResponse.json([current])),
        http.delete('*/api/admin/grid-tariffs/:tariffId/rates/:rateId', ({ params }) => {
          deleted.push(`${params.tariffId}/${params.rateId}`)
          current = { ...current, rates: current.rates.filter((r) => r.id !== params.rateId) }
          return new HttpResponse(null, { status: 204 })
        }),
      )
      render(
        <QueryClientProvider
          client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
        >
          <GridTariffsPage />
        </QueryClientProvider>,
      )

      await u.click(
        await screen.findByRole('button', {
          name: 'Delete rate from 01.01.2027 for Elvia, household',
        }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Delete rate' })
      await u.click(within(dialog).getByRole('button', { name: 'Delete' }))

      await vi.waitFor(() => expect(screen.queryByText('01.01.2027')).not.toBeInTheDocument())
      expect(deleted).toEqual(['tariff-elvia/r3'])
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('keeps the dialog open and shows the message when the API refuses', async () => {
      const u = userEvent.setup()
      setup()
      server.use(
        http.delete('*/api/admin/grid-tariffs/:tariffId/rates/:rateId', () =>
          HttpResponse.json(
            { errors: { generalErrors: ['A rate that has already started cannot be deleted'] } },
            { status: 409 },
          ),
        ),
      )

      await u.click(
        await screen.findByRole('button', {
          name: 'Delete rate from 01.01.2027 for Elvia, household',
        }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Delete rate' })
      await u.click(within(dialog).getByRole('button', { name: 'Delete' }))

      expect(
        await within(dialog).findByText('A rate that has already started cannot be deleted'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Delete rate' })).toBeInTheDocument()
    })

    it('does nothing when cancelled', async () => {
      const u = userEvent.setup()
      setup()
      let deleted = false
      server.use(
        http.delete('*/api/admin/grid-tariffs/:tariffId/rates/:rateId', () => {
          deleted = true
          return new HttpResponse(null, { status: 204 })
        }),
      )

      await u.click(
        await screen.findByRole('button', {
          name: 'Delete rate from 01.01.2027 for Elvia, household',
        }),
      )
      await u.click(
        within(await screen.findByRole('dialog', { name: 'Delete rate' })).getByRole('button', {
          name: 'Cancel',
        }),
      )

      expect(deleted).toBe(false)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('opens the add rate dialog for the tariff', async () => {
    const u = userEvent.setup()
    setup()

    await u.click(await screen.findByRole('button', { name: 'Add rate to BKK' }))

    expect(await screen.findByRole('dialog', { name: 'Add rate to BKK' })).toBeInTheDocument()
  })

  describe('capacity steps', () => {
    const stepsOf = async (tariff: string) =>
      within(await screen.findByRole('region', { name: `Capacity steps of ${tariff}` }))

    it('lists each table with its start date, status and steps', async () => {
      setup()
      const section = await stepsOf('Elvia, household')

      const july = within(
        await section.findByRole('group', { name: 'Capacity steps from 01.07.2026' }),
      )
      expect(july.getByText('In effect')).toBeInTheDocument()
      expect(july.getByText('5–10 kW')).toBeInTheDocument()
      expect(july.getByText('336,00 kr/month')).toBeInTheDocument()
      expect(july.getByText('10 kW and above')).toBeInTheDocument()
      expect(
        section.getByRole('group', { name: 'Capacity steps from 01.01.2027' }),
      ).toHaveTextContent('Upcoming')
    })

    it('says so for a tariff without steps', async () => {
      setup()
      const section = await stepsOf('BKK')

      expect(await section.findByText('No capacity steps yet')).toBeInTheDocument()
    })

    it('offers delete only on the upcoming table and deletes it by its start date', async () => {
      const deleted: string[] = []
      server.use(
        http.delete('*/api/admin/grid-tariffs/:id/capacity-steps/:validFrom', ({ params }) => {
          deleted.push(`${String(params.id)} ${String(params.validFrom)}`)
          return new HttpResponse(null, { status: 204 })
        }),
      )
      const u = userEvent.setup()
      setup()
      const section = await stepsOf('Elvia, household')
      await section.findByRole('group', { name: 'Capacity steps from 01.07.2026' })

      const deletes = section.getAllByRole('button', { name: /^Delete capacity steps from/ })
      expect(deletes).toHaveLength(1)
      expect(deletes[0]).toHaveAccessibleName(
        'Delete capacity steps from 01.01.2027 for Elvia, household',
      )

      await u.click(deletes[0])
      const dialog = await screen.findByRole('dialog', { name: 'Delete capacity steps' })
      await u.click(within(dialog).getByRole('button', { name: 'Delete' }))

      await waitFor(() => expect(deleted).toEqual(['tariff-elvia 2027-01-01']))
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', { name: 'Delete capacity steps' }),
        ).not.toBeInTheDocument(),
      )
    })

    it('shows the server message when a delete is refused', async () => {
      server.use(
        http.delete('*/api/admin/grid-tariffs/:id/capacity-steps/:validFrom', () =>
          HttpResponse.json({ message: 'The steps have already started' }, { status: 409 }),
        ),
      )
      const u = userEvent.setup()
      setup()
      const section = await stepsOf('Elvia, household')
      await u.click(
        await section.findByRole('button', { name: /^Delete capacity steps from 01.01.2027/ }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Delete capacity steps' })
      await u.click(within(dialog).getByRole('button', { name: 'Delete' }))

      expect(await within(dialog).findByText(/already started/)).toBeInTheDocument()
    })
  })
})
