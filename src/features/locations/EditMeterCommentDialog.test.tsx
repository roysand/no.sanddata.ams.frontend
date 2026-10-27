import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { server } from '../../test/server'
import { renderWithQuery } from '../../test/render'
import { EditMeterCommentDialog } from './EditMeterCommentDialog'
import type { MeterSummary } from './types'

const meter: MeterSummary = {
  id: 'm1',
  locationId: 'loc-1',
  deviceId: 'AA:BB',
  comment: 'Old',
  isActive: true,
}

function setup() {
  const bodies: unknown[] = []
  const onClose = vi.fn()
  server.use(
    http.put('*/api/meters/m1', async ({ request }) => {
      const body = await request.json()
      bodies.push(body)
      return HttpResponse.json({ ...meter, ...(body as object) })
    }),
    http.get('*/api/locations', () => HttpResponse.json([])),
  )
  renderWithQuery(<EditMeterCommentDialog meter={meter} onClose={onClose} />)
  return { bodies, onClose }
}

describe('EditMeterCommentDialog', () => {
  it('saves the comment', async () => {
    const u = userEvent.setup()
    const { bodies, onClose } = setup()

    const comment = screen.getByLabelText('Comment')
    expect(comment).toHaveValue('Old')
    await u.clear(comment)
    await u.type(comment, 'Garage')
    await u.click(screen.getByRole('button', { name: 'Save' }))

    await vi.waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(bodies).toEqual([{ comment: 'Garage' }])
  })

  it('rejects 201 characters before sending', async () => {
    const u = userEvent.setup()
    const { bodies } = setup()

    const comment = screen.getByLabelText('Comment')
    await u.clear(comment)
    await u.click(comment)
    await u.paste('x'.repeat(201))
    await u.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Comment must be at most 200 characters')).toBeInTheDocument()
    expect(bodies).toEqual([])
  })

  it("shows the server's message", async () => {
    const u = userEvent.setup()
    setup()
    server.use(
      http.put('*/api/meters/m1', () =>
        HttpResponse.json(
          {
            message: 'Bad request',
            errors: { generalErrors: ['Something went wrong on the server'] },
          },
          { status: 400 },
        ),
      ),
    )

    await u.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong on the server')
  })
})
