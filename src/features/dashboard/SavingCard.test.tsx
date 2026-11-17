import { screen, within } from '@testing-library/react'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { SavingCard } from './SavingCard'
import type { NorgesPrisSaving, SavingPeriod, SavingPeriodName } from './types'

function period(
  name: SavingPeriodName,
  saving: number,
  counted = 10,
  withConsumption = counted,
): SavingPeriod {
  return {
    period: name,
    from: '2026-11-01',
    to: '2026-11-16',
    saving,
    hoursCounted: counted,
    hoursWithConsumption: withConsumption,
  }
}

const normal: NorgesPrisSaving = {
  periods: [
    period('Today', 12.3),
    period('Last7Days', -4.5),
    period('MonthToDate', 20.1),
    period('YearToDate', 1234.56),
  ],
}

function renderCard(saving: NorgesPrisSaving | Response, hasAgreement = true) {
  server.use(
    http.get('*/api/electricity-cost/saving', () =>
      saving instanceof Response ? saving : HttpResponse.json(saving),
    ),
  )
  return renderWithQuery(<SavingCard locationId="l1" hasNorgesPriceAgreement={hasAgreement} />)
}

const cellFor = (label: string) => screen.getByText(label).closest('div')!
const plain = (text: string | null) => (text ?? '').replace(/\s/g, ' ')

describe('SavingCard', () => {
  it('shows the four periods with the amount and the word that says which way it went', async () => {
    renderCard(normal)

    await screen.findByText('Today')

    expect(plain(cellFor('Today').textContent)).toContain('12,30')
    expect(within(cellFor('Today')).getByText('Saved')).toBeInTheDocument()
    expect(plain(cellFor('Last 7 days').textContent)).toContain('4,50')
    expect(within(cellFor('Last 7 days')).getByText('Extra cost')).toBeInTheDocument()
    expect(within(cellFor('This month')).getByText('Saved')).toBeInTheDocument()
    expect(plain(cellFor('This year').textContent)).toContain('1 234,56')
  })

  it('never shows a minus sign: an extra cost is worded, not signed', async () => {
    renderCard(normal)
    await screen.findByText('Today')

    expect(cellFor('Last 7 days')).not.toHaveTextContent('-')
    expect(cellFor('Last 7 days')).not.toHaveTextContent('−')
  })

  it('says No difference for a saving that rounds to nothing', async () => {
    renderCard({
      periods: [
        period('Today', 0.001),
        period('Last7Days', 0),
        period('MonthToDate', 1),
        period('YearToDate', 2),
      ],
    })
    await screen.findByText('Today')

    expect(within(cellFor('Today')).getByText('No difference')).toBeInTheDocument()
    expect(within(cellFor('Last 7 days')).getByText('No difference')).toBeInTheDocument()
  })

  it('is titled for a location with the Norgespris agreement', async () => {
    renderCard(normal, true)

    expect(await screen.findByText('What Norgespris has saved')).toBeInTheDocument()
  })

  it('is titled as a what-if for a spot location', async () => {
    renderCard(normal, false)

    expect(await screen.findByText('What Norgespris would have saved')).toBeInTheDocument()
  })

  it('says how many hours the figure is based on when some hours have no spot price', async () => {
    renderCard({
      periods: [
        period('Today', 1, 5, 5),
        period('Last7Days', 2, 160, 162),
        period('MonthToDate', 3, 380, 380),
        period('YearToDate', 4, 2100, 2110),
      ],
    })
    await screen.findByText('Today')

    const note = screen.getByText(/Hours without a spot price yet are left out/)
    expect(plain(note.textContent)).toContain('last 7 days is based on 160 of 162 hours')
    expect(plain(note.textContent)).toContain('this year is based on 2 100 of 2 110 hours')
    expect(note.textContent).not.toContain('today is based on')
  })

  it('shows no such note when every hour was counted', async () => {
    renderCard(normal)
    await screen.findByText('Today')

    expect(
      screen.queryByText(/Hours without a spot price yet are left out/),
    ).not.toBeInTheDocument()
  })

  it('says the monthly limit is applied and the monthly fees are not included', async () => {
    renderCard(normal)

    expect(await screen.findByText(/Compared at full price including VAT/)).toBeInTheDocument()
    expect(
      screen.getByText(
        /Norgespris monthly limit \(5 000 kWh, 1 000 for a holiday home\) is applied/,
      ),
    ).toBeInTheDocument()
    expect(screen.getByText(/Monthly fees are not included/)).toBeInTheDocument()
    expect(screen.queryByText(/not taken into account/)).not.toBeInTheDocument()
  })

  it('says No readings yet instead of showing zeros when there is no data', async () => {
    renderCard({
      periods: [
        period('Today', 0, 0, 0),
        period('Last7Days', 0, 0, 0),
        period('MonthToDate', 0, 0, 0),
        period('YearToDate', 0, 0, 0),
      ],
    })

    expect(await screen.findByText('No readings yet')).toBeInTheDocument()
    expect(screen.queryByText('Today')).not.toBeInTheDocument()
  })

  it('shows the periods in a fixed order even when the API sends them in another', async () => {
    renderCard({
      periods: [
        period('YearToDate', 4),
        period('Today', 1),
        period('MonthToDate', 3),
        period('Last7Days', 2),
      ],
    })
    await screen.findByText('Today')

    const labels = screen.getAllByRole('term').map((term) => term.textContent)
    expect(labels).toEqual(['Today', 'Last 7 days', 'This month', 'This year'])
  })

  it('shows a loading skeleton while it waits', () => {
    renderCard(normal)

    expect(screen.getByLabelText('Loading the saving')).toBeInTheDocument()
  })

  it('shows the server message when the saving cannot be loaded', async () => {
    renderCard(HttpResponse.json({ message: 'Location not found' }, { status: 404 }) as Response)

    expect(await screen.findByText('Location not found')).toBeInTheDocument()
  })
})
