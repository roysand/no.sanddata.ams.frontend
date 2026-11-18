import { fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { ExportCard } from './ExportCard'

describe('ExportCard', () => {
  let saved: Blob | null = null

  beforeEach(() => {
    saved = null
    URL.createObjectURL = vi.fn((blob: Blob) => {
      saved = blob
      return 'blob:export'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('downloads the chosen days as a CSV file', async () => {
    server.use(
      http.get('*/api/electricity-cost/daily', () =>
        HttpResponse.json({
          items: [
            {
              date: '2026-11-01',
              consumptionKwh: 20,
              pricingModel: 'Spot',
              actual: { cost: 25 },
              comparison: { cost: 22 },
            },
          ],
        }),
      ),
    )
    const user = userEvent.setup()
    renderWithQuery(<ExportCard locationId="l1" locationName="Home" />)

    await user.click(screen.getByRole('button', { name: 'Day by day' }))
    await user.click(screen.getByRole('button', { name: /Download CSV/ }))

    expect(await screen.findByText('Downloaded 1 rows.')).toBeInTheDocument()
    expect(await saved!.text()).toContain('2026-11-01;20,000;Spot price;25,00;Norgespris;22,00')
  })

  it('will not export a range that ends before it starts', async () => {
    renderWithQuery(<ExportCard locationId="l1" locationName="Home" />)

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2026-11-10' } })
    fireEvent.change(screen.getByLabelText('To'), { target: { value: '2026-11-05' } })

    expect(screen.getByText('The first date must not be after the last.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Download CSV/ })).toBeDisabled()
  })

  it('limits hour by hour to a year but allows longer day by day', async () => {
    const user = userEvent.setup()
    renderWithQuery(<ExportCard locationId="l1" locationName="Home" />)

    fireEvent.change(screen.getByLabelText('From'), { target: { value: '2024-01-01' } })

    expect(screen.getByText(/Hour by hour covers at most 366 days/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Day by day' }))
    expect(screen.queryByText(/covers at most/)).not.toBeInTheDocument()
  })
})
