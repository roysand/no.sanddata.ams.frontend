import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../auth/context'
import { PriceBreakdownButton } from './PriceBreakdownDialog'
import type { CurrentHourCost, PriceParts } from './types'

const auth = (roles: string[]): AuthContextValue => ({
  isAuthenticated: true,
  isLoading: false,
  email: 'someone@sanddata.no',
  roles,
  login: async () => {},
  logout: () => {},
})

// Spot: (1.58 + 0.02 + 0.30 + 0.0813) x 1.25 = 2.476625.   Norgespris: (0.40 + 0 + 0.30 + 0.0813) x 1.25 = 0.976625.
const SPOT: PriceParts = {
  energy: 1.58,
  markup: 0.02,
  grid: 0.3,
  taxes: 0.0813,
  vat: 0.495325,
  total: 2.476625,
  gridSet: true,
}
const NORGESPRIS: PriceParts = {
  energy: 0.4,
  markup: 0,
  grid: 0.3,
  taxes: 0.0813,
  vat: 0.195325,
  total: 0.976625,
  gridSet: true,
}

function hour(overrides: Partial<CurrentHourCost> = {}): CurrentHourCost {
  return {
    hourStart: '2026-11-16T12:00:00Z', // 13:00 in Oslo
    consumptionKwhSoFar: 1.2,
    pricingModel: 'Spot',
    actual: { ratePerKwh: SPOT.total, costSoFar: 1.5, parts: SPOT },
    comparison: { ratePerKwh: NORGESPRIS.total, costSoFar: 0.6, parts: NORGESPRIS },
    ...overrides,
  }
}

function renderButton(current: CurrentHourCost, roles: string[] = ['User']) {
  return render(
    <AuthContext.Provider value={auth(roles)}>
      <MemoryRouter>
        <PriceBreakdownButton current={current} />
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

async function open(current: CurrentHourCost, roles?: string[]) {
  const u = userEvent.setup()
  renderButton(current, roles)
  await u.click(screen.getByRole('button', { name: 'What is in the price' }))
  return { u, dialog: await screen.findByRole('dialog', { name: 'What is in the price' }) }
}

const rowOf = (dialog: HTMLElement, label: string) => within(dialog).getByText(label).closest('tr')!
const plain = (text: string | null) => (text ?? '').replace(/\s/g, ' ')

describe('PriceBreakdownButton and dialog', () => {
  it('shows the parts of both plans, the own plan first', async () => {
    const { dialog } = await open(hour())

    const headers = within(dialog)
      .getAllByRole('columnheader')
      .map((h) => h.textContent)
    expect(headers).toEqual(['', 'Spot price', 'Norgespris'])

    expect(plain(rowOf(dialog, 'Energy').textContent)).toContain('1,58 kr/kWh')
    expect(plain(rowOf(dialog, 'Energy').textContent)).toContain('0,40 kr/kWh')
    expect(plain(rowOf(dialog, 'Grid charge').textContent)).toContain('0,30 kr/kWh')
    expect(plain(rowOf(dialog, 'Taxes').textContent)).toContain('0,0813 kr/kWh')
    expect(plain(rowOf(dialog, 'VAT').textContent)).toContain('0,4953 kr/kWh')
    expect(plain(rowOf(dialog, 'Total, incl. VAT').textContent)).toContain('2,4766 kr/kWh')
    expect(plain(rowOf(dialog, 'Total, incl. VAT').textContent)).toContain('0,9766 kr/kWh')
  })

  it('puts the Norgespris plan first on a Norgespris location, with no markup', async () => {
    const { dialog } = await open(
      hour({
        pricingModel: 'NorgesPris',
        actual: { ratePerKwh: NORGESPRIS.total, costSoFar: 0.6, parts: NORGESPRIS },
        comparison: { ratePerKwh: SPOT.total, costSoFar: 1.5, parts: SPOT },
      }),
    )

    expect(
      within(dialog)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['', 'Norgespris', 'Spot price'])
    // The first value column is the Norgespris plan: no supplier markup under Norgespris.
    const markupCells = within(rowOf(dialog, 'Supplier markup')).getAllByRole('cell')
    expect(plain(markupCells[1].textContent)).toBe('0,00 kr/kWh')
    expect(plain(markupCells[2].textContent)).toBe('0,02 kr/kWh')
  })

  it('shows one column when the other plan has no parts', async () => {
    const { dialog } = await open(hour({ comparison: null }))

    expect(within(dialog).getAllByRole('columnheader')).toHaveLength(2)
    expect(within(dialog).queryByText('Norgespris')).not.toBeInTheDocument()
  })

  it('says which parts are excluding VAT, and what monthly amounts are not included', async () => {
    const { dialog } = await open(hour())

    expect(within(dialog).getByText(/excluding VAT; the total includes VAT/)).toBeInTheDocument()
    expect(within(dialog).getByText(/monthly fee is not included/)).toBeInTheDocument()
    expect(within(dialog).getByText(/capacity charge is a monthly amount/)).toBeInTheDocument()
    expect(within(dialog).queryByText(/grid fixed fee/)).not.toBeInTheDocument()
  })

  it('names the hour in Oslo time', async () => {
    const { dialog } = await open(hour())

    expect(within(dialog).getByText(/One kWh at 13:00 today/)).toBeInTheDocument()
  })

  it('closes again', async () => {
    const { u, dialog } = await open(hour())

    await u.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  describe('a location without a grid tariff', () => {
    const noGrid = (parts: PriceParts): PriceParts => ({ ...parts, grid: null, gridSet: false })
    const gridMissing = () =>
      hour({
        actual: { ratePerKwh: 2, costSoFar: 1, parts: noGrid(SPOT) },
        comparison: { ratePerKwh: 0.7, costSoFar: 0.5, parts: noGrid(NORGESPRIS) },
      })

    it('shows the grid charge as Not set and explains what that means', async () => {
      const { dialog } = await open(gridMissing())

      expect(within(rowOf(dialog, 'Grid charge')).getAllByText('Not set')).toHaveLength(2)
      expect(within(dialog).getByRole('note')).toHaveTextContent(
        /grid charge has not been set for this location yet/,
      )
    })

    it('links an administrator to the Location pricing page', async () => {
      const { dialog } = await open(gridMissing(), ['Admin'])

      expect(
        within(dialog).getByRole('link', { name: 'Set it on the Location pricing page' }),
      ).toHaveAttribute('href', '/admin/location-pricing')
    })

    it('tells an ordinary user to ask an administrator', async () => {
      const { dialog } = await open(gridMissing(), ['User'])

      expect(within(dialog).getByText(/Ask an administrator to set it/)).toBeInTheDocument()
      expect(within(dialog).queryByRole('link')).not.toBeInTheDocument()
    })

    it('shows no warning when the grid charge is set', async () => {
      const { dialog } = await open(hour())

      expect(within(dialog).queryByRole('note')).not.toBeInTheDocument()
    })
  })

  it('shows no button when the hour has no price yet', () => {
    renderButton(hour({ actual: null, comparison: null }))

    expect(screen.queryByRole('button', { name: 'What is in the price' })).not.toBeInTheDocument()
  })

  it('shows no button when the API sent no parts (an older API)', () => {
    renderButton(
      hour({
        actual: { ratePerKwh: 0.49, costSoFar: 0.67 },
        comparison: { ratePerKwh: 0.6, costSoFar: 0.9 },
      }),
    )

    expect(screen.queryByRole('button', { name: 'What is in the price' })).not.toBeInTheDocument()
  })

  describe('an hour across the Norgespris monthly limit', () => {
    const cap = { kwhWithinCap: 1.2, kwhAboveCap: 0.8, aboveCapParts: SPOT }
    const headersOf = (dialog: HTMLElement) =>
      within(dialog)
        .getAllByRole('columnheader')
        .map((h) => plain(h.textContent))

    it('splits the Norgespris column into the kWh within and above the limit', async () => {
      const { dialog } = await open(
        hour({
          pricingModel: 'NorgesPris',
          actual: { ratePerKwh: 1.224, costSoFar: 2.448, parts: NORGESPRIS, cap },
          comparison: { ratePerKwh: SPOT.total, costSoFar: 3, parts: SPOT },
        }),
      )

      expect(headersOf(dialog)).toEqual([
        '',
        'Norgespris, within limit (1,2 kWh)',
        'Above limit, spot (0,8 kWh)',
        'Spot price',
      ])
      expect(plain(rowOf(dialog, 'Energy').textContent)).toContain('0,40 kr/kWh')
      expect(plain(rowOf(dialog, 'Energy').textContent)).toContain('1,58 kr/kWh')
      expect(within(dialog).getByText(/monthly limit was reached this hour/)).toBeInTheDocument()
      expect(within(dialog).getByText(/blended: 1,224 kr\/kWh/)).toBeInTheDocument()
    })

    it('shows only the above-limit column when the whole hour is above it', async () => {
      const { dialog } = await open(
        hour({
          pricingModel: 'NorgesPris',
          actual: {
            ratePerKwh: SPOT.total,
            costSoFar: 3,
            parts: NORGESPRIS,
            cap: { ...cap, kwhWithinCap: 0, kwhAboveCap: 2 },
          },
          comparison: { ratePerKwh: SPOT.total, costSoFar: 3, parts: SPOT },
        }),
      )

      expect(headersOf(dialog)).toEqual(['', 'Above limit, spot (2 kWh)', 'Spot price'])
      expect(within(dialog).getByText(/The whole hour is above/)).toBeInTheDocument()
    })

    it('splits the comparison column on a spot location', async () => {
      const { dialog } = await open(
        hour({ comparison: { ratePerKwh: 1.224, costSoFar: 2.448, parts: NORGESPRIS, cap } }),
      )

      expect(headersOf(dialog)).toEqual([
        '',
        'Spot price',
        'Norgespris, within limit (1,2 kWh)',
        'Above limit, spot (0,8 kWh)',
      ])
    })

    it('says nothing about the limit without kWh above it', async () => {
      const { dialog } = await open(
        hour({
          comparison: { ratePerKwh: NORGESPRIS.total, costSoFar: 1, parts: NORGESPRIS, cap: null },
        }),
      )

      expect(headersOf(dialog)).toEqual(['', 'Spot price', 'Norgespris'])
      expect(within(dialog).queryByText(/monthly limit/)).not.toBeInTheDocument()
    })
  })
})
