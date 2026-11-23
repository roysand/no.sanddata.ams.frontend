import type { BillAmounts, BillLine, BillPart, MonthlyBill } from '../features/dashboard/types'

type LineFigures = Pick<BillLine, 'code' | 'unit' | 'quantity' | 'unitPrice' | 'vatRate'> & {
  amount: number
  amountExclVat: number
}

const finalLine = (f: LineFigures): BillLine => ({
  ...f,
  set: true,
  complete: true,
  soFar: f.amount,
  projected: 0,
  vat: round(f.amount - f.amountExclVat),
})

const round = (value: number) => Math.round(value * 100) / 100

/** The sums of the lines that are set, as the API makes them. */
function part(name: BillPart['name'], lines: BillLine[]): BillPart {
  const sum = (pick: (l: BillLine) => number | null) =>
    round(lines.filter((l) => l.set).reduce((acc, l) => acc + (pick(l) ?? 0), 0))
  return {
    name,
    lines,
    soFar: sum((l) => l.soFar),
    projected: sum((l) => l.projected),
    amount: sum((l) => l.amount),
    amountExclVat: sum((l) => l.amountExclVat),
    vat: sum((l) => l.vat),
  }
}

function total(strom: BillPart, nettleie: BillPart): BillAmounts {
  const add = (key: keyof BillAmounts) => round(strom[key] + nettleie[key])
  return {
    soFar: add('soFar'),
    projected: add('projected'),
    amount: add('amount'),
    amountExclVat: add('amountExclVat'),
    vat: add('vat'),
  }
}

function withParts(
  bill: Omit<MonthlyBill, 'strom' | 'nettleie' | 'total'>,
  s: BillLine[],
  n: BillLine[],
) {
  const strom = part('Strom', s)
  const nettleie = part('Nettleie', n)
  return { ...bill, strom, nettleie, total: total(strom, nettleie) } satisfies MonthlyBill
}

/**
 * Roy's July 2026 invoice for the Norgespris holiday home (Fjordkraft with the grid part from Elvia), the reference
 * in the spec: Strøm 417,33, Nettleie 256,22, total 673,55 kr (488,12 excluding VAT + 185,43 VAT).
 */
export const july2026Bill: MonthlyBill = withParts(
  {
    month: '2026-07',
    waterHeater: null,
    totalKwh: null,
    evCharger: null,
    status: 'Final',
    pricingModel: 'NorgesPris',
    isComplete: true,
    hours: { inMonth: 744, passed: 744, withReadings: 744, priced: 744 },
    projection: null,
    capacity: { provisional: false, averageKw: 6.1, step: { lowerKw: 5, upperKw: 10 } },
  },
  (
    [
      {
        code: 'SupplierMonthlyFee',
        unit: 'Month',
        quantity: 1,
        unitPrice: 34,
        vatRate: 0.25,
        amount: 34,
        amountExclVat: 27.2,
      },
      {
        code: 'SpotEnergy',
        unit: 'kWh',
        quantity: 240.31,
        unitPrice: 1.5552,
        vatRate: 0.25,
        amount: 373.74,
        amountExclVat: 298.99,
      },
      {
        code: 'SupplierMarkup',
        unit: 'kWh',
        quantity: 240.31,
        unitPrice: 0.0399,
        vatRate: 0.25,
        amount: 9.59,
        amountExclVat: 7.67,
      },
    ] satisfies LineFigures[]
  ).map(finalLine),
  (
    [
      {
        code: 'GridEnergyDay',
        unit: 'kWh',
        quantity: 95.58,
        unitPrice: 0.362375,
        vatRate: 0.25,
        amount: 34.64,
        amountExclVat: 27.71,
      },
      {
        code: 'GridEnergyNight',
        unit: 'kWh',
        quantity: 144.73,
        unitPrice: 0.212375,
        vatRate: 0.25,
        amount: 30.74,
        amountExclVat: 24.59,
      },
      {
        code: 'CapacityCharge',
        unit: 'Month',
        quantity: 1,
        unitPrice: 420,
        vatRate: 0.25,
        amount: 420,
        amountExclVat: 336,
      },
      {
        code: 'ElectricityTax',
        unit: 'kWh',
        quantity: 240.31,
        unitPrice: 0.089125,
        vatRate: 0.25,
        amount: 21.41,
        amountExclVat: 17.13,
      },
      {
        code: 'EnovaFee',
        unit: 'kWh',
        quantity: 240.31,
        unitPrice: 0.0125,
        vatRate: 0.25,
        amount: 3.01,
        amountExclVat: 2.41,
      },
      {
        code: 'NorgesPrisCredit',
        unit: 'kWh',
        quantity: 240.31,
        unitPrice: -1.0552,
        vatRate: 0,
        amount: -253.58,
        amountExclVat: -253.58,
      },
    ] satisfies LineFigures[]
  ).map(finalLine),
)

/** Splits a final line into so far and projected: the fixed monthly lines are all known, kWh lines `shareSoFar`. */
function asEstimate(line: BillLine, shareSoFar: number): BillLine {
  if (line.unit === 'Month' || line.amount === null) return line
  const soFar = round(line.amount * shareSoFar)
  return { ...line, soFar, projected: round(line.amount - soFar) }
}

/** The current month (November 2026) as an estimate: 60 % of the energy so far, projected from 7 days. */
export function november2026Estimate(): MonthlyBill {
  const split = (lines: BillLine[]) => lines.map((l) => asEstimate(l, 0.6))
  return withParts(
    {
      ...july2026Bill,
      month: '2026-11',
      status: 'Estimate',
      hours: { inMonth: 720, passed: 420, withReadings: 420, priced: 420 },
      projection: {
        fromUtc: '2026-11-18T11:00:00Z',
        hours: 300,
        kwh: 96.12,
        basedOnHours: 168,
        basedOnDays: 7,
        assumedSpotPricePerKwh: 0.9134,
      },
      capacity: { provisional: true, averageKw: 6.1, step: { lowerKw: 5, upperKw: 10 } },
    },
    split(july2026Bill.strom.lines),
    split(july2026Bill.nettleie.lines),
  )
}

/** The same bill with one line changed (for example `{ set: false }` with null amounts), and the sums redone. */
export function withLine(bill: MonthlyBill, code: string, patch: Partial<BillLine>): MonthlyBill {
  const change = (lines: BillLine[]) => lines.map((l) => (l.code === code ? { ...l, ...patch } : l))
  return withParts(bill, change(bill.strom.lines), change(bill.nettleie.lines))
}

/** The patch for a line whose setting is missing. */
export const NOT_SET: Partial<BillLine> = {
  set: false,
  unitPrice: null,
  soFar: null,
  projected: null,
  amount: null,
  amountExclVat: null,
  vat: null,
}

/** A spot location's bill: no Norgespris credit. */
export function spotBill(bill: MonthlyBill = july2026Bill): MonthlyBill {
  return withParts(
    { ...bill, pricingModel: 'Spot' },
    bill.strom.lines,
    bill.nettleie.lines.filter((l) => l.code !== 'NorgesPrisCredit'),
  )
}

/** A month before the first reading: the API still answers, with no hours. */
export function emptyBill(month: string, status: MonthlyBill['status'] = 'Final'): MonthlyBill {
  const zero = (l: BillLine): BillLine =>
    l.unit === 'Month'
      ? l
      : {
          ...l,
          quantity: 0,
          unitPrice: null,
          soFar: 0,
          projected: 0,
          amount: 0,
          amountExclVat: 0,
          vat: 0,
        }
  return withParts(
    {
      ...july2026Bill,
      month,
      status,
      hours: { inMonth: 720, passed: 720, withReadings: 0, priced: 0 },
      projection: null,
      capacity: { provisional: false, averageKw: null, step: null },
    },
    july2026Bill.strom.lines.map(zero),
    july2026Bill.nettleie.lines
      .filter((l) => l.unit === 'kWh' || l.code !== 'CapacityCharge')
      .map(zero),
  )
}

/** The same bill with a water heater part (API spec 012); amounts and lines are not changed by it. */
export function withWaterHeater(
  bill: MonthlyBill,
  part: Partial<NonNullable<MonthlyBill['waterHeater']>> = {},
): MonthlyBill {
  return {
    ...bill,
    waterHeater: {
      kwh: 104.6,
      cost: 94.12,
      sampledMinutes: 15180,
      capped: false,
      firstHourUtc: '2026-07-18T18:00:00Z',
      lastHourUtc: '2026-07-31T21:00:00Z',
      estimate: false,
      ...part,
    },
  }
}

/** The same bill with a car charger part (API spec 016); amounts and lines are not changed by it. */
export function withEvCharger(
  bill: MonthlyBill,
  part: Partial<NonNullable<MonthlyBill['evCharger']>> = {},
): MonthlyBill {
  return {
    ...bill,
    evCharger: {
      kwh: 212.7,
      estimated: false,
      included: true,
      hoursWithoutMeterReading: 0,
      firstHour: '2026-07-01T06:00:00Z',
      lastHour: '2026-07-31T21:00:00Z',
      cost: null,
      pricedAt: null,
      ...part,
    },
  }
}
