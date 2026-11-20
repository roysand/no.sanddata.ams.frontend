import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { MemoryRouter } from 'react-router-dom'
import {
  emptyBill,
  july2026Bill,
  NOT_SET,
  november2026Estimate,
  spotBill,
  withLine,
  withWaterHeater,
} from '../../test/bills'
import { server } from '../../test/server'
import { plain } from '../../test/text'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { BillCard } from './BillCard'
import type { MonthlyBill } from './types'

const auth = (roles: string[]): AuthContextValue => ({
  isAuthenticated: true,
  isLoading: false,
  email: 'someone@sanddata.no',
  roles,
  login: async () => {},
  logout: () => {},
})

// Mid-August 2026 in Oslo: the last finished month is July, the month of the reference invoice.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-08-15T10:00:00Z'))
})
afterEach(() => vi.useRealTimers())

const august = { ...november2026Estimate(), month: '2026-08' }

const byMonth: Record<string, MonthlyBill> = {
  '2026-08': august,
  '2026-07': july2026Bill,
  '2026-06': emptyBill('2026-06'),
}

/** Serves a bill per month (`answer`), and records the months asked for. */
function renderCard(
  answer: (month: string) => MonthlyBill | Response = (month) => byMonth[month],
  roles = ['User'],
) {
  const months: string[] = []
  server.use(
    http.get('*/api/electricity-cost/bill', ({ request }) => {
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
          <BillCard locationId="l1" />
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return months
}

const lineText = (name: string) => plain(screen.getByText(name).closest('li')!.textContent)
const sectionText = (name: string) => plain(screen.getByRole('region', { name }).textContent)

describe('BillCard', () => {
  it('opens on the last finished month, marked as final, with no so-far split', async () => {
    const months = renderCard()

    expect(await screen.findByText('Final')).toBeInTheDocument()
    expect(months).toEqual(['2026-07'])
    expect(screen.getByText('July 2026')).toBeInTheDocument()
    expect(screen.queryByText('Estimate')).not.toBeInTheDocument()
    expect(screen.queryByText(/so far/)).not.toBeInTheDocument()
  })

  it('shows every line of the July 2026 invoice with its quantity, price, VAT and amount', async () => {
    renderCard()
    await screen.findByText('Final')

    expect(lineText('Monthly fee')).toMatch(/1 month × 34,00 kr\/month VAT 25 %.*34,00 kr/)
    expect(lineText('Energy at spot price')).toMatch(
      /240,31 kWh × 155,52 øre\/kWh VAT 25 %.*373,74 kr/,
    )
    expect(lineText('Markup')).toMatch(/240,31 kWh × 3,99 øre\/kWh VAT 25 %.*9,59 kr/)
    expect(lineText('Grid energy, weekdays 06–22')).toMatch(
      /95,58 kWh × 36,24 øre\/kWh VAT 25 %.*34,64 kr/,
    )
    expect(lineText('Grid energy, nights and weekends')).toMatch(
      /144,73 kWh × 21,24 øre\/kWh VAT 25 %.*30,74 kr/,
    )
    expect(lineText('Capacity charge')).toMatch(/1 month × 420,00 kr\/month VAT 25 %.*420,00 kr/)
    expect(lineText('Electricity tax')).toMatch(/240,31 kWh × 8,91 øre\/kWh VAT 25 %.*21,41 kr/)
    expect(lineText('Enova fee')).toMatch(/240,31 kWh × 1,25 øre\/kWh VAT 25 %.*3,01 kr/)
    expect(lineText('Norgespris credit')).toMatch(
      /240,31 kWh × -105,52 øre\/kWh VAT 0 %.*-253,58 kr/,
    )
  })

  it('lists the lines in the order of the invoice, with the invoice names beside them', async () => {
    renderCard()
    await screen.findByText('Final')

    const names = (region: string) =>
      within(screen.getByRole('region', { name: region }))
        .getAllByRole('listitem')
        .map((li) => li.querySelector('span')!.firstChild!.textContent)
    expect(names('Strøm (supplier)')).toEqual(['Monthly fee', 'Energy at spot price', 'Markup'])
    expect(names('Nettleie (grid)')).toEqual([
      'Grid energy, weekdays 06–22',
      'Grid energy, nights and weekends',
      'Capacity charge',
      'Electricity tax',
      'Enova fee',
      'Norgespris credit',
    ])
    expect(screen.getByText('(Din strømpris)')).toBeInTheDocument()
  })

  it('shows the subtotals and the total, each with the amount excluding VAT and the VAT', async () => {
    renderCard()
    await screen.findByText('Final')

    expect(sectionText('Strøm (supplier)')).toContain(
      'Sum Strøm333,86 kr excl. VAT + 83,47 kr VAT417,33 kr',
    )
    expect(sectionText('Nettleie (grid)')).toContain(
      'Sum Nettleie154,26 kr excl. VAT + 101,96 kr VAT256,22 kr',
    )
    expect(plain(document.body.textContent)).toContain(
      'Total including VAT488,12 kr excl. VAT + 185,43 kr VAT673,55 kr',
    )
  })

  it('has no Norgespris credit for a spot location', async () => {
    renderCard(() => spotBill())
    await screen.findByText('Final')
    expect(screen.queryByText('Norgespris credit')).not.toBeInTheDocument()
  })

  it('steps forward to the current month as an estimate, and no further', async () => {
    const u = userEvent.setup()
    renderCard()
    await screen.findByText('Final')
    expect(screen.getByRole('button', { name: 'Next month' })).toBeEnabled()

    await u.click(screen.getByRole('button', { name: 'Next month' }))

    expect(await screen.findByText('Estimate')).toBeInTheDocument()
    expect(screen.getByText('August 2026')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next month' })).toBeDisabled()
    const spot = august.strom.lines.find((l) => l.code === 'SpotEnergy')!
    expect(lineText('Energy at spot price')).toContain(
      plain(`so far ${fmt(spot.soFar!)} · rest of the month ${fmt(spot.projected!)}`),
    )
    expect(plain(document.body.textContent)).toContain(
      plain(`so far ${fmt(august.total.soFar)} · rest of the month ${fmt(august.total.projected)}`),
    )
  })

  it('stops stepping back at a month without readings', async () => {
    const u = userEvent.setup()
    const months = renderCard()
    await screen.findByText('Final')

    await u.click(screen.getByRole('button', { name: 'Previous month' }))

    expect(await screen.findByText('No readings in June 2026.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous month' })).toBeDisabled()
    expect(screen.queryByText('Monthly fee')).not.toBeInTheDocument()
    expect(months).toEqual(['2026-07', '2026-06'])
  })

  it('shows the server message when the month is refused', async () => {
    renderCard(() =>
      HttpResponse.json(
        { code: 'Bill.MonthNotStarted', message: 'The month has not started' },
        { status: 400 },
      ),
    )
    expect(await screen.findByText('The month has not started')).toBeInTheDocument()
  })

  it('shows a line that is not set as "Not set", never as 0 kr', async () => {
    renderCard(() => withLine(july2026Bill, 'SupplierMonthlyFee', NOT_SET))
    await screen.findByText('Final')

    const fee = screen.getByText('Monthly fee').closest('li')!
    expect(within(fee).getByText('Not set')).toBeInTheDocument()
    expect(plain(fee.textContent)).not.toMatch(/\d kr$/)
  })

  describe('an incomplete bill', () => {
    const missingFee = () => () => ({
      ...withLine(july2026Bill, 'SupplierMonthlyFee', NOT_SET),
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
      renderCard(() => ({
        ...withLine(july2026Bill, 'SpotEnergy', { complete: false }),
        isComplete: false,
      }))
      expect(
        await screen.findByText('Energy at spot price may be too low: some hours have no price'),
      ).toBeInTheDocument()
      const spot = screen.getByText('Energy at spot price').closest('li')!
      expect(within(spot).getByText('may be too low')).toBeInTheDocument()
    })
  })
})

const fmt = (value: number) =>
  new Intl.NumberFormat('nb-NO', { style: 'currency', currency: 'NOK' }).format(value)

describe('BillCard water heating', () => {
  const july = (part: Parameters<typeof withWaterHeater>[1]) => (month: string) =>
    month === '2026-07' ? withWaterHeater(july2026Bill, part) : byMonth[month]

  it('says how much of the month was water heating, below the total', async () => {
    renderCard(july({ firstHourUtc: '2026-06-30T22:00:00Z' })) // 1 July 00:00 in Oslo
    await screen.findByText('Final')

    expect(
      screen.getByText(/^Water heating in July 2026: 104,6 kWh · 94,12\skr$/),
    ).toBeInTheDocument()
    expect(screen.queryByText(/not part of the estimate/)).not.toBeInTheDocument()
  })

  it('says since when when the heater was connected during the month', async () => {
    renderCard(july({ firstHourUtc: '2026-07-18T18:00:00Z' }))
    await screen.findByText('Final')

    expect(screen.getByText(/^Water heating since 18\.07\.2026: 104,6 kWh/)).toBeInTheDocument()
  })

  it('leaves the cost out when it is unknown', async () => {
    renderCard(july({ cost: null }))
    await screen.findByText('Final')

    expect(screen.getByText(/^Water heating since 18\.07\.2026: 104,6 kWh$/)).toBeInTheDocument()
  })

  it('changes no amount on the bill', async () => {
    renderCard(july({}))
    await screen.findByText('Final')

    expect(sectionText('Strøm (supplier)')).toContain(
      'Sum Strøm333,86 kr excl. VAT + 83,47 kr VAT417,33 kr',
    )
    expect(plain(document.body.textContent)).toContain(
      'Total including VAT488,12 kr excl. VAT + 185,43 kr VAT673,55 kr',
    )
  })

  it('has no line without a part', async () => {
    renderCard()
    await screen.findByText('Final')

    expect(screen.queryByText(/Water heating/)).not.toBeInTheDocument()
  })
})
