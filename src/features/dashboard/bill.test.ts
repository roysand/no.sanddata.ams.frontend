import { plain } from '../../test/text'
import {
  basisText,
  formatQuantity,
  formatUnitPrice,
  formatVatRate,
  hasReadings,
  incompleteReasons,
  invoiceName,
  isUncertain,
  isVatExemptBill,
  lineName,
} from './bill'
import type { BillLine, BillProjection, MonthlyBill } from './types'

const line = (patch: Partial<BillLine>): BillLine => ({
  code: 'SpotEnergy',
  unit: 'kWh',
  quantity: 240.31,
  unitPrice: 1.5552,
  vatRate: 0.25,
  set: true,
  complete: true,
  soFar: 373.74,
  projected: 0,
  amount: 373.74,
  amountExclVat: 298.99,
  vat: 74.75,
  ...patch,
})

const projection = (patch: Partial<BillProjection>): BillProjection => ({
  fromUtc: '2026-11-18T11:00:00Z',
  hours: 300,
  kwh: 95.2,
  basedOnHours: 168,
  basedOnDays: 7,
  assumedSpotPricePerKwh: 0.9134,
  ...patch,
})

const bill = (strom: BillLine[], nettleie: BillLine[], patch: Partial<MonthlyBill> = {}) =>
  ({
    month: '2026-07',
    status: 'Final',
    pricingModel: 'NorgesPris',
    isComplete: true,
    hours: { inMonth: 744, passed: 744, withReadings: 744, priced: 744 },
    projection: null,
    capacity: { provisional: false, averageKw: 6, step: { lowerKw: 5, upperKw: 10 } },
    strom: {
      name: 'Strom',
      lines: strom,
      soFar: 0,
      projected: 0,
      amount: 0,
      amountExclVat: 0,
      vat: 0,
    },
    nettleie: {
      name: 'Nettleie',
      lines: nettleie,
      soFar: 0,
      projected: 0,
      amount: 0,
      amountExclVat: 0,
      vat: 0,
    },
    total: { soFar: 0, projected: 0, amount: 0, amountExclVat: 0, vat: 0 },
    ...patch,
  }) satisfies MonthlyBill

describe('lineName and invoiceName', () => {
  it('names every line in English, with the name on the invoice beside it', () => {
    expect(
      [
        'SupplierMonthlyFee',
        'SpotEnergy',
        'SupplierMarkup',
        'GridEnergyDay',
        'GridEnergyNight',
        'CapacityCharge',
        'ElectricityTax',
        'EnovaFee',
        'NorgesPrisCredit',
      ].map((code) => [lineName(code), invoiceName(code)]),
    ).toEqual([
      ['Monthly fee', 'Månedlig fastbeløp'],
      ['Energy at spot price', 'Din strømpris'],
      ['Markup', 'Påslag'],
      ['Grid energy, weekdays 06–22', 'Energiledd dag'],
      ['Grid energy, nights and weekends', 'Energiledd natt/helg'],
      ['Capacity charge', 'Fastledd'],
      ['Electricity tax', 'Elavgift'],
      ['Enova fee', 'Energifondet'],
      ['Norgespris credit', 'Norgespris'],
    ])
  })

  it('shows a line the app does not know by its code, rather than hiding it', () => {
    expect(lineName('SomethingNew')).toBe('SomethingNew')
    expect(invoiceName('SomethingNew')).toBeNull()
  })
})

describe('formatQuantity', () => {
  it('gives kWh with two decimals, or one month', () => {
    expect(formatQuantity(line({}))).toBe('240,31 kWh')
    expect(formatQuantity(line({ unit: 'Month', quantity: 1 }))).toBe('1 month')
  })
})

describe('formatUnitPrice', () => {
  it('gives øre per kWh with two decimals, as the invoice does', () => {
    expect(formatUnitPrice(line({}))).toBe('155,52 øre/kWh')
    expect(formatUnitPrice(line({ unitPrice: 0.039875 }))).toBe('3,99 øre/kWh')
  })

  it('keeps the minus of the Norgespris credit', () => {
    expect(plain(formatUnitPrice(line({ code: 'NorgesPrisCredit', unitPrice: -1.0552 })))).toBe(
      '-105,52 øre/kWh',
    )
  })

  it('gives kr per month for a monthly line', () => {
    expect(formatUnitPrice(line({ unit: 'Month', quantity: 1, unitPrice: 34 }))).toBe(
      '34,00 kr/month',
    )
    expect(plain(formatUnitPrice(line({ unit: 'Month', quantity: 1, unitPrice: 1420 })))).toBe(
      '1 420,00 kr/month',
    )
  })

  it('has no price for a line that is not set or has nothing to price', () => {
    expect(formatUnitPrice(line({ set: false, unitPrice: null }))).toBeNull()
    expect(formatUnitPrice(line({ quantity: 0, unitPrice: null }))).toBeNull()
  })
})

describe('formatVatRate', () => {
  it('gives a whole percentage', () => {
    expect(formatVatRate(0.25)).toBe('25 %')
    expect(formatVatRate(0)).toBe('0 %')
  })
})

describe('basisText and isUncertain', () => {
  it('says the estimate follows the last 7 days', () => {
    expect(basisText(projection({}))).toBe('Estimated from the last 7 days of use.')
    expect(isUncertain(projection({}))).toBe(false)
  })

  it('says how many days there are when fewer, and that the estimate is uncertain', () => {
    expect(basisText(projection({ basedOnDays: 2.4, basedOnHours: 58 }))).toBe(
      'Based on 2 days of use, so the estimate is uncertain.',
    )
    expect(basisText(projection({ basedOnDays: 1, basedOnHours: 24 }))).toBe(
      'Based on 1 day of use, so the estimate is uncertain.',
    )
    // A few hours still count as some use, not as none.
    expect(basisText(projection({ basedOnDays: 0.2, basedOnHours: 5 }))).toBe(
      'Based on 1 day of use, so the estimate is uncertain.',
    )
    expect(isUncertain(projection({ basedOnDays: 6.4, basedOnHours: 154 }))).toBe(true)
  })

  it('says there is nothing to estimate from without any use', () => {
    expect(basisText(projection({ basedOnDays: 0, basedOnHours: 0, kwh: 0 }))).toBe(
      'No use yet to estimate from, so the rest of the month only has the fixed amounts.',
    )
    expect(isUncertain(projection({ basedOnDays: 0, basedOnHours: 0 }))).toBe(true)
  })

  it('says nothing for a final bill', () => {
    expect(basisText(null)).toBeNull()
    expect(isUncertain(null)).toBe(false)
  })
})

describe('isVatExemptBill', () => {
  it('is false for a normal Norgespris bill, whose credit alone has 0 % VAT', () => {
    expect(
      isVatExemptBill(
        bill([line({})], [line({ code: 'NorgesPrisCredit', vatRate: 0, unitPrice: -1.0552 })]),
      ),
    ).toBe(false)
  })

  it('is true when every line that is set has 0 % VAT', () => {
    expect(
      isVatExemptBill(
        bill(
          [line({ vatRate: 0 }), line({ code: 'SupplierMonthlyFee', set: false, vatRate: 0.25 })],
          [line({ code: 'NorgesPrisCredit', vatRate: 0 })],
        ),
      ),
    ).toBe(true)
  })

  it('is false when there is only the credit, or nothing', () => {
    expect(isVatExemptBill(bill([], [line({ code: 'NorgesPrisCredit', vatRate: 0 })]))).toBe(false)
    expect(isVatExemptBill(bill([], []))).toBe(false)
  })
})

describe('hasReadings', () => {
  it('is false for a month without readings', () => {
    expect(hasReadings(bill([], []))).toBe(true)
    expect(
      hasReadings(
        bill([], [], { hours: { inMonth: 744, passed: 744, withReadings: 0, priced: 0 } }),
      ),
    ).toBe(false)
  })
})

describe('incompleteReasons', () => {
  const notSet = {
    set: false,
    unitPrice: null,
    soFar: null,
    projected: null,
    amount: null,
    amountExclVat: null,
    vat: null,
  }

  it('names a line that is not set', () => {
    expect(
      incompleteReasons(
        bill([line({ code: 'SupplierMonthlyFee', unit: 'Month', ...notSet })], [], {
          isComplete: false,
        }),
      ),
    ).toEqual(['Monthly fee not set'])
  })

  it('names a line that could not be priced for every hour', () => {
    expect(incompleteReasons(bill([line({ complete: false })], [], { isComplete: false }))).toEqual(
      ['Energy at spot price may be too low: some hours have no price'],
    )
  })

  it('says how many hours with readings could not be priced', () => {
    const hours = (priced: number) => ({ inMonth: 744, passed: 744, withReadings: 744, priced })
    expect(incompleteReasons(bill([], [], { isComplete: false, hours: hours(741) }))).toEqual([
      '3 hours with readings could not be priced',
    ])
    expect(incompleteReasons(bill([], [], { isComplete: false, hours: hours(743) }))).toEqual([
      '1 hour with readings could not be priced',
    ])
  })

  it('lists every reason together, in the order of the lines', () => {
    expect(
      incompleteReasons(
        bill(
          [
            line({ code: 'SupplierMonthlyFee', unit: 'Month', ...notSet }),
            line({ complete: false }),
          ],
          [line({ code: 'CapacityCharge', unit: 'Month', ...notSet })],
          {
            isComplete: false,
            hours: { inMonth: 744, passed: 744, withReadings: 744, priced: 700 },
          },
        ),
      ),
    ).toEqual([
      'Monthly fee not set',
      'Energy at spot price may be too low: some hours have no price',
      'Capacity charge not set',
      '44 hours with readings could not be priced',
    ])
  })

  it('is empty for a complete bill', () => {
    expect(incompleteReasons(bill([line({})], []))).toEqual([])
  })
})
