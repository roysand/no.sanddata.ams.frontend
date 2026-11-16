import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { PriceRatesPage } from './PriceRatesPage'
import type { PriceRate } from './types'

const rows: PriceRate[] = [
  {
    id: 'tax1',
    kind: 'ElectricityTax',
    validFrom: '2025-01-01',
    value: 0.09,
    status: 'Superseded',
  },
  {
    id: 'tax2',
    kind: 'ElectricityTax',
    validFrom: '2026-01-01',
    value: 0.0713,
    status: 'InEffect',
  },
  { id: 'tax3', kind: 'ElectricityTax', validFrom: '2027-01-01', value: 0.08, status: 'Upcoming' },
  { id: 'enova1', kind: 'EnovaFee', validFrom: '2026-01-01', value: 0.01, status: 'InEffect' },
  { id: 'vat1', kind: 'Vat', validFrom: '2020-01-01', value: 0.25, status: 'InEffect' },
]

function renderPage() {
  render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <PriceRatesPage />
    </QueryClientProvider>,
  )
}

function setup(data: PriceRate[] = rows) {
  server.use(http.get('*/api/admin/price-rates', () => HttpResponse.json(data)))
  renderPage()
}

const sectionOf = (title: string) =>
  screen
    .getByText(title, { selector: '[data-slot="card-title"]' })
    .closest('[data-slot="card"]') as HTMLElement

describe('PriceRatesPage', () => {
  it('shows the electricity tax, the Enova fee and VAT in their own sections', async () => {
    setup()

    await screen.findByText('Electricity tax', { selector: '[data-slot="card-title"]' })

    const tax = within(sectionOf('Electricity tax'))
    expect(tax.getByText('01.01.2025')).toBeInTheDocument()
    expect(tax.getByText(/0,0713 kr\/kWh/)).toBeInTheDocument()
    expect(tax.getByText('In effect')).toBeInTheDocument()
    expect(tax.getByText('Upcoming')).toBeInTheDocument()
    expect(tax.getByText('Superseded')).toBeInTheDocument()

    expect(within(sectionOf('Enova fee')).getByText(/0,01 kr\/kWh/)).toBeInTheDocument()
  })

  it('shows VAT as a percentage', async () => {
    setup()
    await screen.findByText('VAT', { selector: '[data-slot="card-title"]' })

    expect(within(sectionOf('VAT')).getByText(/25\s%/)).toBeInTheDocument()
  })

  it('highlights exactly one row per kind, the one in effect', async () => {
    setup()
    await screen.findByText('Electricity tax', { selector: '[data-slot="card-title"]' })

    const highlighted = within(sectionOf('Electricity tax'))
      .getAllByRole('row')
      .filter((row) => row.hasAttribute('aria-current'))

    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]).toHaveTextContent('01.01.2026')
  })

  it('says so for a kind without rows', async () => {
    setup(rows.filter((row) => row.kind !== 'EnovaFee'))
    await screen.findByText('Enova fee', { selector: '[data-slot="card-title"]' })

    expect(within(sectionOf('Enova fee')).getByText('No rows yet')).toBeInTheDocument()
  })

  it('offers delete only on the upcoming row', async () => {
    setup()
    await screen.findByText('Electricity tax', { selector: '[data-slot="card-title"]' })

    const deletes = screen.getAllByRole('button', { name: /^Delete / })

    expect(deletes).toHaveLength(1)
    expect(deletes[0]).toHaveAccessibleName('Delete Electricity tax from 01.01.2027')
  })

  it('shows loading and the message of a failed load', async () => {
    server.use(
      http.get('*/api/admin/price-rates', () =>
        HttpResponse.json({ message: 'Something broke' }, { status: 500 }),
      ),
    )
    renderPage()

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('Something broke')).toBeInTheDocument()
  })

  describe('deleting an upcoming row', () => {
    it('removes it and refreshes the list', async () => {
      const u = userEvent.setup()
      let current = rows
      const deleted: string[] = []
      server.use(
        http.get('*/api/admin/price-rates', () => HttpResponse.json(current)),
        http.delete('*/api/admin/price-rates/:id', ({ params }) => {
          deleted.push(String(params.id))
          current = current.filter((row) => row.id !== params.id)
          return new HttpResponse(null, { status: 204 })
        }),
      )
      renderPage()

      await u.click(
        await screen.findByRole('button', { name: 'Delete Electricity tax from 01.01.2027' }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Delete rate' })
      await u.click(within(dialog).getByRole('button', { name: 'Delete' }))

      await vi.waitFor(() => expect(screen.queryByText('01.01.2027')).not.toBeInTheDocument())
      expect(deleted).toEqual(['tax3'])
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('keeps the dialog open and shows the message when the API refuses', async () => {
      const u = userEvent.setup()
      setup()
      server.use(
        http.delete('*/api/admin/price-rates/:id', () =>
          HttpResponse.json(
            { errors: { generalErrors: ['A rate that has already started cannot be deleted'] } },
            { status: 409 },
          ),
        ),
      )

      await u.click(
        await screen.findByRole('button', { name: 'Delete Electricity tax from 01.01.2027' }),
      )
      const dialog = await screen.findByRole('dialog', { name: 'Delete rate' })
      await u.click(within(dialog).getByRole('button', { name: 'Delete' }))

      expect(
        await within(dialog).findByText('A rate that has already started cannot be deleted'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Delete rate' })).toBeInTheDocument()
    })
  })

  it('opens the add dialog for the section it was clicked in', async () => {
    const u = userEvent.setup()
    setup()

    await u.click(await screen.findByRole('button', { name: 'Add VAT rate' }))

    expect(await screen.findByRole('dialog', { name: 'Add VAT rate' })).toBeInTheDocument()
  })
})
