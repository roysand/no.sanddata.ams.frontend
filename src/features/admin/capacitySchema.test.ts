import {
  amountExclVat,
  createCapacityStepsSchema,
  lowerBounds,
  toCapacityStepTableInput,
  type CapacityStepsFormValues,
} from './schema'

const schema = createCapacityStepsSchema('2026-11-17')

const form = (rows: [string, string][], overrides: Partial<CapacityStepsFormValues> = {}) => ({
  validFrom: '2026-12-01',
  confirmPast: false,
  amountsIncludeVat: false,
  rows: rows.map(([upperKw, amount]) => ({ upperKw, amount })),
  ...overrides,
})

const messages = (values: ReturnType<typeof form>) => {
  const result = schema.safeParse(values)
  return result.success ? [] : result.error.issues.map((i) => i.message)
}

describe('createCapacityStepsSchema', () => {
  it('accepts an increasing table with an open last step', () => {
    expect(
      messages(
        form([
          ['2', '120'],
          ['5', '200'],
          ['', '336'],
        ]),
      ),
    ).toEqual([])
  })

  it('refuses an upper limit at or below where the step starts', () => {
    expect(
      messages(
        form([
          ['5', '120'],
          ['5', '200'],
          ['', '336'],
        ]),
      ),
    ).toContain('Must be above where the step starts')
    expect(
      messages(
        form([
          ['0', '120'],
          ['', '200'],
        ]),
      ),
    ).toContain('Must be above where the step starts')
  })

  it('needs an upper limit on every step but the last', () => {
    expect(
      messages(
        form([
          ['', '120'],
          ['', '200'],
        ]),
      ),
    ).toContain('Up to (kW) is required')
  })

  it('refuses more than 50 steps, 5 decimals and values above 99 999', () => {
    const many = Array.from({ length: 51 }, (_, i): [string, string] => [String(i + 1), '1'])
    expect(messages(form(many))).toContain('A table can have at most 50 steps')
    expect(
      messages(
        form([
          ['2,12345', '1'],
          ['', '1'],
        ]),
      ),
    ).toContain('Can have at most 4 decimals')
    expect(
      messages(
        form([
          ['100000', '1'],
          ['', '1'],
        ]),
      ),
    ).toContain('Can be at most 99999')
  })

  it('needs the confirmation for a start date of today or earlier', () => {
    expect(
      messages(
        form(
          [
            ['2', '1'],
            ['', '1'],
          ],
          { validFrom: '2026-11-17' },
        ),
      ),
    ).toContain('Confirm that costs shown for past hours will be recalculated')
  })
})

describe('the request', () => {
  it('divides amounts including VAT by 1,25 and rounds to 4 decimals', () => {
    expect(amountExclVat('150', true)).toBe(120)
    expect(amountExclVat('420', true)).toBe(336)
    expect(amountExclVat('100', true)).toBe(80)
    expect(amountExclVat('0,01', true)).toBe(0.008)
    expect(amountExclVat('336', false)).toBe(336)
  })

  it('derives the lower bounds and leaves the last step open', () => {
    expect(lowerBounds([{ upperKw: '2' }, { upperKw: '5,5' }, { upperKw: '' }])).toEqual([
      0, 2, 5.5,
    ])

    const input = toCapacityStepTableInput(
      form(
        [
          ['2', '150'],
          ['', '250'],
        ],
        { amountsIncludeVat: true, confirmPast: true },
      ),
      false,
    )
    expect(input).toEqual({
      validFrom: '2026-12-01',
      confirmPastDate: false,
      steps: [
        { lowerKw: 0, upperKw: 2, monthlyAmount: 120 },
        { lowerKw: 2, upperKw: null, monthlyAmount: 200 },
      ],
    })
  })
})
