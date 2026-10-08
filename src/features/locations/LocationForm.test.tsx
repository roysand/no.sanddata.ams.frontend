import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LocationForm } from './LocationForm'

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Cabin')
  await user.type(screen.getByLabelText('Address'), 'Hyttevegen 1')
  await user.type(screen.getByLabelText('Serial number'), 'SN-1')
  await user.click(screen.getByRole('combobox', { name: 'Price zone' }))
  await user.click(await screen.findByRole('option', { name: 'NO3' }))
}

describe('LocationForm', () => {
  it('shows field errors and does not submit when required fields are empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LocationForm onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: 'Add location' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(screen.getByText('Address is required')).toBeInTheDocument()
    expect(screen.getByText('Serial number is required')).toBeInTheDocument()
    expect(screen.getByText('Choose a price zone (NO1–NO5)')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed values with defaults for the optional flags', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<LocationForm onSubmit={onSubmit} />)

    await fillValid(user)
    await user.click(screen.getByRole('button', { name: 'Add location' }))

    expect(onSubmit).toHaveBeenCalledOnce()
    expect(onSubmit.mock.calls[0][0]).toEqual({
      name: 'Cabin',
      address: 'Hyttevegen 1',
      serialNumber: 'SN-1',
      zone: 'NO3',
      hasNorgesPriceAgreement: false,
      isActive: true,
    })
  })

  it('keeps what was typed and shows the server error', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<LocationForm onSubmit={vi.fn()} />)
    await fillValid(user)

    rerender(<LocationForm onSubmit={vi.fn()} serverError="Another location already uses this serial number" />)

    expect(screen.getByRole('alert')).toHaveTextContent('already uses this serial number')
    expect(screen.getByLabelText('Serial number')).toHaveValue('SN-1')
    expect(screen.getByLabelText('Name')).toHaveValue('Cabin')
  })
})
