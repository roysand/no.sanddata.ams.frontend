import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import { server } from '../../test/server'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { CapacityCard } from './CapacityCard'
import { addMonths, formatMonth, osloMonth } from './format'
import type { CapacityCharge } from './types'

const auth = (roles: string[]): AuthContextValue => ({
  isAuthenticated: true,
  isLoading: false,
  email: 'someone@sanddata.no',
  roles,
  login: async () => {},
  logout: () => {},
})

// The October 2026 Elvia bill of the holiday home: peaks 6.2, 5.1 and 4.9 kW, step 5-10 kW, 336 kr + 84 kr VAT.
const OCTOBER: CapacityCharge = {
  month: '2026-10',
  provisional: false,
  set: true,
  peaks: [
    { date: '2026-10-14', hourStartUtc: '2026-10-14T16:00:00Z', kw: 6.2 },
    { date: '2026-10-03', hourStartUtc: '2026-10-03T05:00:00Z', kw: 5.1 },
    { date: '2026-10-27', hourStartUtc: '2026-10-27T17:00:00Z', kw: 4.9 },
  ],
  averageKw: 5.4,
  step: { lowerKw: 5, upperKw: 10 },
  amountExclVat: 336,
  vat: 84,
  amount: 420,
  kwToNextStep: 4.6,
}

const NOT_SET: CapacityCharge = {
  month: '2026-11',
  provisional: true,
  set: false,
  peaks: [],
  averageKw: null,
  step: null,
  amountExclVat: null,
  vat: null,
  amount: null,
  kwToNextStep: null,
}

const thisMonth = osloMonth(new Date())

/** Answers with `answer(month)` and records the months asked for. */
function renderCard(answer: (month: string) => CapacityCharge | Response, roles = ['User']) {
  const months: string[] = []
  server.use(
    http.get('*/api/electricity-cost/capacity', ({ request }) => {
      const month = new URL(request.url).searchParams.get('month') ?? ''
      months.push(month)
      const result = answer(month)
      return result instanceof Response ? result : HttpResponse.json(result)
    }),
  )
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={auth(roles)}>
        <MemoryRouter>
          <CapacityCard locationId="l1" />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return months
}

const plain = (text: string | null) => (text ?? '').replace(/\s/g, ' ')

describe('CapacityCard', () => {
  it('shows the step, the amount, the peaks and the distance to the next step (the October bill)', async () => {
    renderCard(() => OCTOBER)

    expect(await screen.findByText('5–10 kW')).toBeInTheDocument()
    expect(plain(document.body.textContent)).toContain('420,00')
    expect(screen.getByText('incl. VAT')).toBeInTheDocument()
    expect(screen.getByText('5,4 kW')).toBeInTheDocument()
    expect(screen.getByText('Average of the three highest days')).toBeInTheDocument()
    expect(screen.getByText('14.10. 18:00')).toBeInTheDocument()
    expect(screen.getByText('6,2 kW')).toBeInTheDocument()
    expect(screen.getByText('03.10. 07:00')).toBeInTheDocument()
    expect(screen.getByText('27.10. 18:00')).toBeInTheDocument()
    expect(screen.getByText('4,6 kW below the next step')).toBeInTheDocument()
    expect(screen.queryByText('Provisional')).not.toBeInTheDocument()
  })

  it('starts at the current month, marks it provisional and cannot go past it', async () => {
    const months = renderCard((month) => ({ ...OCTOBER, month, provisional: true }))

    expect(await screen.findByText('Provisional')).toBeInTheDocument()
    expect(
      screen.getByText('A higher peak later this month can raise the step.'),
    ).toBeInTheDocument()
    expect(screen.getByText(formatMonth(thisMonth))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    expect(months).toEqual([thisMonth])
  })

  it('goes back a month and asks the API for it', async () => {
    const u = userEvent.setup()
    const previous = addMonths(thisMonth, -1)
    const months = renderCard((month) => ({ ...OCTOBER, month, provisional: month === thisMonth }))
    await screen.findByText('Provisional')

    await u.click(screen.getByRole('button', { name: 'Previous month' }))

    expect(await screen.findByText(formatMonth(previous))).toBeInTheDocument()
    expect(months).toContain(previous)
    expect(screen.queryByText('Provisional')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled()
  })

  it('says nothing about a next step on the top step', async () => {
    renderCard(() => ({ ...OCTOBER, step: { lowerKw: 100, upperKw: null }, kwToNextStep: null }))

    expect(await screen.findByText('100 kW and above')).toBeInTheDocument()
    expect(screen.queryByText(/below the next step/)).not.toBeInTheDocument()
  })

  it('says how many days the average is over early in the month', async () => {
    renderCard(() => ({ ...OCTOBER, peaks: OCTOBER.peaks.slice(0, 2), averageKw: 5.65 }))

    expect(await screen.findByText('Average of 2 days')).toBeInTheDocument()
    expect(screen.queryByText('27.10. 18:00')).not.toBeInTheDocument()
  })

  it('shows no VAT for a VAT-exempt location', async () => {
    renderCard(() => ({ ...OCTOBER, vat: 0, amount: 336 }))

    expect(await screen.findByText('No VAT for this location')).toBeInTheDocument()
    expect(screen.queryByText('incl. VAT')).not.toBeInTheDocument()
  })

  it('links an administrator to the pages where the charge is set up when it is not available', async () => {
    renderCard(() => NOT_SET, ['Admin'])

    expect(await screen.findByText(/Capacity charge not available for/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Grid tariffs' })).toHaveAttribute(
      'href',
      '/admin/grid-tariffs',
    )
    expect(screen.getByRole('link', { name: 'Location pricing' })).toHaveAttribute(
      'href',
      '/admin/location-pricing',
    )
    expect(screen.queryByText(/0,00/)).not.toBeInTheDocument()
  })

  it('asks a user to contact an administrator when it is not available', async () => {
    renderCard(() => NOT_SET)

    expect(await screen.findByText(/Ask an administrator/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })

  it('shows a skeleton while loading and the server message on error', async () => {
    renderCard(() =>
      HttpResponse.json({ message: 'Location not found', statusCode: 404 }, { status: 404 }),
    )

    expect(screen.getByLabelText('Loading the capacity charge')).toBeInTheDocument()
    expect(await screen.findByText(/not found/i)).toBeInTheDocument()
  })
})
