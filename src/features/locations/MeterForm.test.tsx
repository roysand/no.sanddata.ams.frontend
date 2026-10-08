import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MeterForm } from './MeterForm'

const locations = [
  { id: 'l1', name: 'Cabin' },
  { id: 'l2', name: 'House' },
]

describe('MeterForm', () => {
  it('requires a location and a device id', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<MeterForm locations={locations} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Add meter' }))

    expect(await screen.findByText('Location is required')).toBeInTheDocument()
    expect(screen.getByText('Device id is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('preselects the only location and submits the device id', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<MeterForm locations={[locations[0]]} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Device id'), '58:CF:79:9C:93:AE')
    await user.click(screen.getByRole('button', { name: 'Add meter' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      locationId: 'l1',
      deviceId: '58:CF:79:9C:93:AE',
    })
  })

  it('keeps what was typed and shows the server error', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<MeterForm locations={[locations[0]]} onSubmit={vi.fn()} />)
    await user.type(screen.getByLabelText('Device id'), 'AA:BB')

    rerender(
      <MeterForm locations={[locations[0]]} onSubmit={vi.fn()} serverError="Already registered" />,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Already registered')
    expect(screen.getByLabelText('Device id')).toHaveValue('AA:BB')
  })
})
