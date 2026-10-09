import { ApiError } from '../../lib/apiClient'
import { toFormServerError } from './serverErrors'

const fields = ['name', 'serialNumber'] as const

describe('toFormServerError', () => {
  it('maps field errors case-insensitively and leaves no general message', () => {
    const error = new ApiError(400, 'Validation', 'Name is required', {
      Name: ['Name is required'],
    })

    expect(toFormServerError(error, fields, 'fallback')).toEqual({
      fields: { name: 'Name is required' },
      message: null,
    })
  })

  it('keeps messages for unknown fields as the general message', () => {
    const error = new ApiError(400, 'Validation', 'x', {
      serialNumber: ['Too long'],
      generalErrors: ['Something else'],
    })

    expect(toFormServerError(error, fields, 'fallback')).toEqual({
      fields: { serialNumber: 'Too long' },
      message: 'Something else',
    })
  })

  it('uses the API message when there are no field errors', () => {
    const error = new ApiError(409, 'Location.SerialNumberExists', 'Serial number is used')

    expect(toFormServerError(error, fields, 'fallback')).toEqual({
      fields: {},
      message: 'Serial number is used',
    })
  })

  it('uses the fallback for non-API errors', () => {
    expect(toFormServerError(new Error('boom'), fields, 'fallback').message).toBe('fallback')
  })
})
