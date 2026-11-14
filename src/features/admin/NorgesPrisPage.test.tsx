import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { NorgesPrisPage } from './NorgesPrisPage'
import type { NorgesPrisRate } from './types'

const old: NorgesPrisRate = {
  id: 'r1',
  validFrom: '2020-01-01',
  ratePerKwh: 0.4,
  taxPerKwh: 0,
  totalPerKwh: 0.4,
  status: 'Superseded',
}
const current: NorgesPrisRate = {
  id: 'r2',
  validFrom: '2026-10-05',
  ratePerKwh: 0.45,
  taxPerKwh: 0.0123,
  totalPerKwh: 0.4623,
  status: 'InEffect',
}
const upcoming: NorgesPrisRate = {
  id: 'r3',
  validFrom: '2027-01-01',
  ratePerKwh: 0.5,
  taxPerKwh: 0,
  totalPerKwh: 0.5,
  status: 'Upcoming',
}

function serveRates(rates: NorgesPrisRate[]) {
  server.use(http.get('*/api/admin/norgespris', () => HttpResponse.json(rates)))
}

const rowFor = (text: string) => screen.getByText(text).closest('tr')!

describe('NorgesPrisPage', () => {
  it('lists every rate with its start date, amounts and status', async () => {
    serveRates([old, current, upcoming])
    renderWithQuery(<NorgesPrisPage />)

    await screen.findByText('05.10.2026')
    const currentRow = rowFor('05.10.2026')
    expect(within(currentRow).getByText(/0,45 kr\/kWh/)).toBeInTheDocument()
    expect(within(currentRow).getByText(/0,0123 kr\/kWh/)).toBeInTheDocument()
    expect(within(currentRow).getByText(/0,4623 kr\/kWh/)).toBeInTheDocument()
    expect(within(currentRow).getByText('In effect')).toBeInTheDocument()
    expect(within(rowFor('01.01.2020')).getByText('Superseded')).toBeInTheDocument()
    expect(within(rowFor('01.01.2027')).getByText('Upcoming')).toBeInTheDocument()
  })

  it('highlights exactly one row, the rate in effect', async () => {
    serveRates([old, current, upcoming])
    renderWithQuery(<NorgesPrisPage />)

    await screen.findByText('05.10.2026')

    const highlighted = screen.getAllByRole('row').filter((row) => row.hasAttribute('aria-current'))
    expect(highlighted).toHaveLength(1)
    expect(highlighted[0]).toHaveTextContent('05.10.2026')
  })

  it('offers delete only on the upcoming rate', async () => {
    serveRates([old, current, upcoming])
    renderWithQuery(<NorgesPrisPage />)

    await screen.findByText('05.10.2026')

    expect(screen.getAllByRole('button', { name: /^Delete rate from/ })).toHaveLength(1)
    expect(
      within(rowFor('01.01.2027')).getByRole('button', { name: 'Delete rate from 01.01.2027' }),
    ).toBeInTheDocument()
  })

  it('shows a loading message and then the rates', async () => {
    serveRates([current])
    renderWithQuery(<NorgesPrisPage />)

    expect(screen.getByText('Loading…')).toBeInTheDocument()
    expect(await screen.findByText('05.10.2026')).toBeInTheDocument()
    expect(screen.queryByText('Loading…')).not.toBeInTheDocument()
  })

  it('shows the server message when the list cannot be loaded', async () => {
    server.use(
      http.get('*/api/admin/norgespris', () =>
        HttpResponse.json({ message: 'Something broke' }, { status: 500 }),
      ),
    )
    renderWithQuery(<NorgesPrisPage />)

    expect(await screen.findByText('Something broke')).toBeInTheDocument()
  })

  it('says so when there are no rates', async () => {
    serveRates([])
    renderWithQuery(<NorgesPrisPage />)

    expect(await screen.findByText('No rates yet')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  describe('deleting an upcoming rate', () => {
    it('removes it and refreshes the list', async () => {
      const u = userEvent.setup()
      let rates = [old, current, upcoming]
      server.use(
        http.get('*/api/admin/norgespris', () => HttpResponse.json(rates)),
        http.delete('*/api/admin/norgespris/:id', ({ params }) => {
          rates = rates.filter((rate) => rate.id !== params.id)
          return new HttpResponse(null, { status: 204 })
        }),
      )
      renderWithQuery(<NorgesPrisPage />)

      await u.click(await screen.findByRole('button', { name: 'Delete rate from 01.01.2027' }))
      const dialog = await screen.findByRole('dialog', { name: 'Delete rate' })
      await u.click(within(dialog).getByRole('button', { name: 'Delete' }))

      await screen.findByText('05.10.2026')
      expect(screen.queryByText('01.01.2027')).not.toBeInTheDocument()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('keeps the dialog open and shows the message when the API refuses', async () => {
      const u = userEvent.setup()
      serveRates([old, current, upcoming])
      server.use(
        http.delete('*/api/admin/norgespris/:id', () =>
          HttpResponse.json(
            { errors: { generalErrors: ['A rate that has already started cannot be deleted'] } },
            { status: 409 },
          ),
        ),
      )
      renderWithQuery(<NorgesPrisPage />)

      await u.click(await screen.findByRole('button', { name: 'Delete rate from 01.01.2027' }))
      const dialog = await screen.findByRole('dialog', { name: 'Delete rate' })
      await u.click(within(dialog).getByRole('button', { name: 'Delete' }))

      expect(
        await within(dialog).findByText('A rate that has already started cannot be deleted'),
      ).toBeInTheDocument()
      expect(screen.getByRole('dialog', { name: 'Delete rate' })).toBeInTheDocument()
    })

    it('does nothing when cancelled', async () => {
      const u = userEvent.setup()
      serveRates([old, current, upcoming])
      let deleted = false
      server.use(
        http.delete('*/api/admin/norgespris/:id', () => {
          deleted = true
          return new HttpResponse(null, { status: 204 })
        }),
      )
      renderWithQuery(<NorgesPrisPage />)

      await u.click(await screen.findByRole('button', { name: 'Delete rate from 01.01.2027' }))
      await u.click(
        within(await screen.findByRole('dialog', { name: 'Delete rate' })).getByRole('button', {
          name: 'Cancel',
        }),
      )

      expect(deleted).toBe(false)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('opens the add dialog from the Add rate button', async () => {
    const u = userEvent.setup()
    serveRates([current])
    renderWithQuery(<NorgesPrisPage />)

    await u.click(screen.getByRole('button', { name: 'Add rate' }))

    expect(await screen.findByRole('dialog', { name: 'Add rate' })).toBeInTheDocument()
  })
})
