import {
  createGridTariffRateSchema,
  createPriceRateSchema,
  gridTariffSchema,
  locationPricingSchema,
  NO_TARIFF,
} from './schema'

const TODAY = '2026-11-16'

function messages(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? [] : (result.error?.issues.map((issue) => issue.message) ?? [])
}

describe('locationPricingSchema', () => {
  const flags = { electricityTaxExempt: false, vatExempt: false, isHolidayHome: false }
  const valid = { gridTariffId: 'tariff-1', supplierMarkupPerKwh: '0,02', ...flags }

  it('accepts a tariff and a markup, or None and zero', () => {
    expect(locationPricingSchema.safeParse(valid).success).toBe(true)
    expect(
      locationPricingSchema.safeParse({
        gridTariffId: NO_TARIFF,
        supplierMarkupPerKwh: '0',
        ...flags,
        isHolidayHome: true,
      }).success,
    ).toBe(true)
  })

  it('needs a markup, and a number from 0 to 100 with at most four decimals', () => {
    const check = (text: string) =>
      messages(locationPricingSchema.safeParse({ ...valid, supplierMarkupPerKwh: text }))

    expect(check('')).toContain('Markup is required')
    expect(check('-0,01')).toContain('Markup cannot be negative')
    expect(check('abc')).toContain('Markup must be a number, for example 0,50')
    expect(check('100,01')).toContain('Markup can be at most 100')
    expect(check('0,02501')).toContain('Markup can have at most 4 decimals')
    expect(check('100')).toEqual([])
  })

  it('needs a choice for the tariff', () => {
    expect(messages(locationPricingSchema.safeParse({ ...valid, gridTariffId: '' }))).toContain(
      'Choose a tariff or None',
    )
  })
})

describe('gridTariffSchema', () => {
  it('needs a name of at most 100 characters', () => {
    expect(gridTariffSchema.safeParse({ name: 'Elvia, household' }).success).toBe(true)
    expect(gridTariffSchema.safeParse({ name: 'a'.repeat(100) }).success).toBe(true)
    expect(messages(gridTariffSchema.safeParse({ name: '   ' }))).toContain('A name is required')
    expect(messages(gridTariffSchema.safeParse({ name: 'a'.repeat(101) }))).toContain(
      'The name can be at most 100 characters',
    )
  })
})

describe('createGridTariffRateSchema', () => {
  const schema = createGridTariffRateSchema(TODAY)
  const valid = {
    validFrom: '2027-01-01',
    dayRatePerKwh: '0,30',
    nightRatePerKwh: '0,20',
    confirmPast: false,
  }

  it('accepts a future rate with comma amounts and no confirmation', () => {
    expect(schema.safeParse(valid).success).toBe(true)
    expect(
      schema.safeParse({ ...valid, dayRatePerKwh: '0.3641', nightRatePerKwh: '0' }).success,
    ).toBe(true)
  })

  it('needs a start date and both rates', () => {
    expect(messages(schema.safeParse({ ...valid, validFrom: '' }))).toContain('Pick a start date')
    expect(messages(schema.safeParse({ ...valid, dayRatePerKwh: '' }))).toContain(
      'Day rate is required',
    )
    expect(messages(schema.safeParse({ ...valid, nightRatePerKwh: ' ' }))).toContain(
      'Night rate is required',
    )
  })

  it('checks each rate on its own', () => {
    expect(messages(schema.safeParse({ ...valid, dayRatePerKwh: '-1' }))).toContain(
      'Day rate cannot be negative',
    )
    expect(messages(schema.safeParse({ ...valid, nightRatePerKwh: '100,5' }))).toContain(
      'Night rate can be at most 100',
    )
    expect(messages(schema.safeParse({ ...valid, nightRatePerKwh: '0,20001' }))).toContain(
      'Night rate can have at most 4 decimals',
    )
  })

  it.each(['2026-11-16', '2026-11-15', '2020-01-01'])(
    'needs the confirmation for a start date of today or earlier (%s)',
    (validFrom) => {
      expect(messages(schema.safeParse({ ...valid, validFrom }))).toContain(
        'Confirm that costs shown for past hours will be recalculated',
      )
      expect(schema.safeParse({ ...valid, validFrom, confirmPast: true }).success).toBe(true)
    },
  )

  it('needs no confirmation from tomorrow', () => {
    expect(schema.safeParse({ ...valid, validFrom: '2026-11-17' }).success).toBe(true)
  })
})

describe('createPriceRateSchema', () => {
  const fee = createPriceRateSchema(TODAY, 'ElectricityTax')
  const vat = createPriceRateSchema(TODAY, 'Vat')
  const valid = { validFrom: '2027-01-01', value: '0,0713', confirmPast: false }

  it('accepts a fee in kr per kWh with a comma or a dot', () => {
    expect(fee.safeParse(valid).success).toBe(true)
    expect(fee.safeParse({ ...valid, value: '0.0713' }).success).toBe(true)
  })

  it('checks a fee like the API: from 0 to 100, at most four decimals', () => {
    expect(messages(fee.safeParse({ ...valid, value: '' }))).toContain('Value is required')
    expect(messages(fee.safeParse({ ...valid, value: '-1' }))).toContain('Value cannot be negative')
    expect(messages(fee.safeParse({ ...valid, value: '100,01' }))).toContain(
      'Value can be at most 100',
    )
    expect(messages(fee.safeParse({ ...valid, value: '0,07131' }))).toContain(
      'Value can have at most 4 decimals',
    )
  })

  it('takes VAT as a percentage from 0 to 100 with at most two decimals', () => {
    const check = (text: string) => messages(vat.safeParse({ ...valid, value: text }))

    expect(check('25')).toEqual([])
    expect(check('25,5')).toEqual([])
    expect(check('100')).toEqual([])
    expect(check('')).toContain('VAT is required')
    expect(check('-1')).toContain('VAT cannot be negative')
    expect(check('abc')).toContain('VAT must be a percentage from 0 to 100, for example 25')
    expect(check('101')).toContain('VAT must be a percentage from 0 to 100, for example 25')
    expect(check('25,555')).toContain('VAT can have at most 2 decimals')
  })

  it('needs the confirmation for the past or today, for every kind', () => {
    const cases = [
      { schema: fee, value: '0,0713' },
      { schema: vat, value: '25' },
    ]
    for (const { schema, value } of cases) {
      const values = { validFrom: TODAY, value, confirmPast: false }

      expect(messages(schema.safeParse(values))).toContain(
        'Confirm that costs shown for past hours will be recalculated',
      )
      expect(schema.safeParse({ ...values, confirmPast: true }).success).toBe(true)
    }
  })

  it('needs a start date', () => {
    expect(messages(fee.safeParse({ ...valid, validFrom: '' }))).toContain('Pick a start date')
  })
})
