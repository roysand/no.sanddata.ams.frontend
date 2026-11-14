import { createNorgesPrisRateSchema } from './schema'

const TODAY = '2026-11-13'
const schema = createNorgesPrisRateSchema(TODAY)

const valid = { validFrom: '2027-01-01', ratePerKwh: '0,50', taxPerKwh: '0', confirmPast: false }

function messagesFor(values: typeof valid) {
  const result = schema.safeParse(values)
  return result.success ? [] : result.error.issues.map((issue) => issue.message)
}

describe('createNorgesPrisRateSchema', () => {
  it('accepts a future rate with a comma amount and no confirmation', () => {
    expect(schema.safeParse(valid).success).toBe(true)
  })

  it('accepts the boundary amounts', () => {
    expect(schema.safeParse({ ...valid, ratePerKwh: '0', taxPerKwh: '100' }).success).toBe(true)
    expect(schema.safeParse({ ...valid, ratePerKwh: '0.4567' }).success).toBe(true)
  })

  it('needs a start date', () => {
    expect(messagesFor({ ...valid, validFrom: '' })).toContain('Pick a start date')
  })

  it('needs both amounts', () => {
    expect(messagesFor({ ...valid, ratePerKwh: '' })).toContain('Rate is required')
    expect(messagesFor({ ...valid, taxPerKwh: ' ' })).toContain('Tax is required')
  })

  it('rejects a negative amount with its own message', () => {
    expect(messagesFor({ ...valid, ratePerKwh: '-0,1' })).toContain('Rate cannot be negative')
  })

  it('rejects text that is not a number', () => {
    expect(messagesFor({ ...valid, taxPerKwh: 'abc' })).toContain(
      'Tax must be a number, for example 0,50',
    )
  })

  it('rejects an amount above 100', () => {
    expect(messagesFor({ ...valid, ratePerKwh: '100,01' })).toContain('Rate can be at most 100')
  })

  it('rejects more than four decimals', () => {
    expect(messagesFor({ ...valid, ratePerKwh: '0,12345' })).toContain(
      'Rate can have at most 4 decimals',
    )
  })

  it.each(['2026-11-13', '2026-11-12', '2020-01-01'])(
    'needs a confirmation for the past or today (%s)',
    (validFrom) => {
      expect(messagesFor({ ...valid, validFrom })).toContain(
        'Confirm that costs shown for past hours will be recalculated',
      )
      expect(schema.safeParse({ ...valid, validFrom, confirmPast: true }).success).toBe(true)
    },
  )

  it('needs no confirmation for tomorrow or later', () => {
    expect(schema.safeParse({ ...valid, validFrom: '2026-11-14' }).success).toBe(true)
  })
})
