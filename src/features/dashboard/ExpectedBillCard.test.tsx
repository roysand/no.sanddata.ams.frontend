import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { NOT_SET, november2026Estimate, spotBill, withLine } from '../../test/bills'
import { server } from '../../test/server'
import { plain } from '../../test/text'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { ExpectedBillCard } from './ExpectedBillCard'
import { formatMonth, formatNok, osloMonth } from './format'
import type { MonthlyBill } from './types'

const auth = (roles: string[]): AuthContextValue => ({
  isAuthenticated: true,
  isLoading: false,
  email: 'someone@sanddata.no',
  roles,
  login: async () => {},
  logout: () => {},
})

const thisMonth = osloMonth(new Date())
const estimate = november2026Estimate()

/** Serves `answer` for the bill and records the months asked for. */
function renderCard(answer: MonthlyBill | Response, roles = ['User']) {
  const months: string[] = []
  server.use(
    http.get('*/api/electricity-cost/bill', ({ request }) => {
      const url = new URL(request.url)
      months.push(url.searchParams.get('month') ?? '')
      return answer instanceof Response ? answer : HttpResponse.json(answer)
    }),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth(roles)}>
        <MemoryRouter>
          <ExpectedBillCard locationId="l1" />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return months
}

const text = () => plain(document.body.textContent)
const OPEN_STROM = (u: ReturnType<typeof userEvent.setup>) =>
  u.click(screen.getByText('Strøm (supplier)'))
const kr = (value: number) => plain(formatNok(value))

describe('ExpectedBillCard', () => {
  it('shows the expected total of the current month, so far and the rest, marked as an estimate', async () => {
    const months = renderCard(estimate)

    expect(await screen.findByText('Estimate')).toBeInTheDocument()
    expect(months).toEqual([thisMonth])
    expect(screen.getByText(formatMonth(thisMonth))).toBeInTheDocument()
    expect(screen.getByText('Estimate')).toBeInTheDocument()

    const summary = within(screen.getByRole('group', { name: 'Expected total' }))
    expect(plain(summary.getByText(/kr$/).textContent)).toBe(kr(estimate.total.amount))
    expect(text()).toContain(`So far${kr(estimate.total.soFar)}`)
    expect(text()).toContain(`Rest of the month${kr(estimate.total.projected)}`)
    expect(screen.getByText('Estimated from the last 7 days of use.')).toBeInTheDocument()
  })

  it('shows the capacity step and says it is provisional', async () => {
    renderCard(estimate)

    expect(await screen.findByText(/5–10 kW/)).toBeInTheDocument()
    expect(
      screen.getByText(/provisional: a higher peak later in the month can raise it/),
    ).toBeInTheDocument()
  })

  it('keeps Strøm and Nettleie closed, and shows their lines when opened', async () => {
    const u = userEvent.setup()
    renderCard(estimate)
    await screen.findByText('Estimate')

    const strom = screen.getByText('Strøm (supplier)').closest('details')!
    const nettleie = screen.getByText('Nettleie (grid)').closest('details')!
    expect(strom).not.toHaveAttribute('open')
    expect(nettleie).not.toHaveAttribute('open')
    expect(plain(strom.querySelector('summary')!.textContent)).toContain(kr(estimate.strom.amount))

    await u.click(screen.getByText('Strøm (supplier)'))
    expect(strom).toHaveAttribute('open')
    expect(within(strom).getByText('Monthly fee')).toBeInTheDocument()
    expect(within(strom).getByText('Energy at spot price')).toBeInTheDocument()
    expect(within(strom).getByText('Markup')).toBeInTheDocument()
    const spot = estimate.strom.lines.find((l) => l.code === 'SpotEnergy')!
    expect(plain(strom.textContent)).toContain('240,31 kWh')
    expect(plain(strom.textContent)).toContain(
      `so far ${kr(spot.soFar!)} · rest of the month ${kr(spot.projected!)}`,
    )

    await u.click(screen.getByText('Nettleie (grid)'))
    expect(within(nettleie).getByText('Capacity charge')).toBeInTheDocument()
    expect(within(nettleie).getByText('Norgespris credit')).toBeInTheDocument()
  })

  it('says when the estimate rests on few days, and when there is no use to estimate from', async () => {
    renderCard({
      ...estimate,
      projection: { ...estimate.projection!, basedOnDays: 2, basedOnHours: 48 },
    })
    expect(
      await screen.findByText('Based on 2 days of use, so the estimate is uncertain.'),
    ).toBeInTheDocument()
  })

  it('says there is no use yet to estimate from', async () => {
    renderCard({
      ...estimate,
      projection: { ...estimate.projection!, basedOnDays: 0, basedOnHours: 0, kwh: 0 },
    })
    expect(
      await screen.findByText(
        'No use yet to estimate from, so the rest of the month only has the fixed amounts.',
      ),
    ).toBeInTheDocument()
  })

  it('explains the Norgespris credit only for a Norgespris location', async () => {
    renderCard(estimate)
    expect(
      await screen.findByText(/credits the difference down to the Norgespris rate/),
    ).toBeInTheDocument()
  })

  it('has no Norgespris explanation for a spot location', async () => {
    renderCard(spotBill(estimate))
    await screen.findByText('Estimate')
    expect(screen.queryByText(/Norgespris rate/)).not.toBeInTheDocument()
  })

  it('shows a skeleton while loading', async () => {
    renderCard(estimate)
    expect(screen.getByLabelText('Loading the expected bill')).toBeInTheDocument()
    await screen.findByText('Estimate')
  })

  it('shows the server message when the bill cannot be loaded', async () => {
    renderCard(HttpResponse.json({ message: 'Something broke' }, { status: 500 }))
    expect(await screen.findByText('Something broke')).toBeInTheDocument()
  })

  it('shows a fee line that is not set as "Not set", not as 0 kr', async () => {
    const u = userEvent.setup()
    renderCard(
      withLine(estimate, 'SupplierMonthlyFee', {
        set: false,
        unitPrice: null,
        soFar: null,
        projected: null,
        amount: null,
        amountExclVat: null,
        vat: null,
      }),
    )
    await screen.findByText('Estimate')

    await u.click(screen.getByText('Strøm (supplier)'))
    const fee = screen.getByText('Monthly fee').closest('li')!
    expect(within(fee).getByText('Not set')).toBeInTheDocument()
    expect(plain(fee.textContent)).not.toContain('0,00 kr')
  })

  describe('an incomplete bill', () => {
    const missingFee = () => ({
      ...withLine(estimate, 'SupplierMonthlyFee', NOT_SET),
      isComplete: false,
    })

    it('says it is incomplete and why', async () => {
      renderCard(missingFee())
      expect(await screen.findByText('Incomplete')).toBeInTheDocument()
      expect(screen.getByText('Without the lines that are not set.')).toBeInTheDocument()
      expect(screen.getByText('Monthly fee not set')).toBeInTheDocument()
    })

    it('gives an administrator a link to the location pricing', async () => {
      renderCard(missingFee(), ['User', 'Admin'])
      expect(await screen.findByRole('link', { name: 'Location pricing' })).toHaveAttribute(
        'href',
        '/admin/location-pricing',
      )
      expect(screen.queryByText(/Ask an administrator/)).not.toBeInTheDocument()
    })

    it('tells other users to ask an administrator', async () => {
      renderCard(missingFee())
      expect(await screen.findByText(/Ask an administrator/)).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Location pricing' })).not.toBeInTheDocument()
    })

    it('marks a line that could not be priced for every hour as possibly too low', async () => {
      const u = userEvent.setup()
      renderCard({ ...withLine(estimate, 'SpotEnergy', { complete: false }), isComplete: false })
      expect(
        await screen.findByText('Energy at spot price may be too low: some hours have no price'),
      ).toBeInTheDocument()
      await OPEN_STROM(u)
      const spot = screen.getByText('Energy at spot price').closest('li')!
      expect(within(spot).getByText('may be too low')).toBeInTheDocument()
    })
  })
})
