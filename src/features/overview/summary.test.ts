import { rankLocations, summarizeLocation, totalsOf, type LocationFigures } from './summary'

const slots = [
  { key: 'h0', label: '00' },
  { key: 'h1', label: '01' },
  { key: 'h2', label: '02' },
]

function figures(overrides: Partial<LocationFigures> = {}): LocationFigures {
  return {
    id: 'l1',
    name: 'Home',
    usesNorgesPris: false,
    powerKw: 3,
    periodRows: [
      { key: 'a', kwh: 10, nok: 12 },
      { key: 'b', kwh: 5, nok: 6 },
    ],
    previousRows: [{ key: 'x', kwh: 20, nok: 30 }],
    dayRows: [{ key: 'h1', kwh: 2, nok: 2 }],
    daySlots: slots,
    failed: false,
    ...overrides,
  }
}

describe('summarizeLocation', () => {
  it('totals energy and cost for the period and fills the trend by slot', () => {
    const summary = summarizeLocation(figures())

    expect(summary.kwh).toBe(15)
    expect(summary.cost).toBe(18)
    expect(summary.previousCost).toBe(30)
    expect(summary.trend).toEqual([0, 2, 0])
    expect(summary.incomplete).toBe(false)
  })

  it('marks the cost incomplete when an hour has no price', () => {
    const summary = summarizeLocation(
      figures({
        periodRows: [
          { key: 'a', kwh: 10, nok: 12 },
          { key: 'b', kwh: 5, nok: null },
        ],
      }),
    )

    expect(summary.cost).toBe(12)
    expect(summary.incomplete).toBe(true)
  })

  it('has no cost when nothing is priced', () => {
    const summary = summarizeLocation(figures({ periodRows: [{ key: 'a', kwh: 10, nok: null }] }))

    expect(summary.cost).toBeNull()
    expect(summary.kwh).toBe(10)
  })

  it('is incomplete when a request failed', () => {
    expect(summarizeLocation(figures({ failed: true })).incomplete).toBe(true)
  })
})

describe('rankLocations and totalsOf', () => {
  const home = summarizeLocation(figures())
  const cabin = summarizeLocation(
    figures({
      id: 'l2',
      name: 'Cabin',
      powerKw: 1,
      periodRows: [{ key: 'a', kwh: 5, nok: 40 }],
      previousRows: [{ key: 'x', kwh: 5, nok: 20 }],
    }),
  )
  const flat = summarizeLocation(
    figures({
      id: 'l3',
      name: 'Flat',
      powerKw: null,
      periodRows: [{ key: 'a', kwh: 5, nok: null }],
    }),
  )

  it('orders by cost with the highest first and unpriced last', () => {
    expect(rankLocations([flat, home, cabin]).map((s) => s.name)).toEqual(['Cabin', 'Home', 'Flat'])
  })

  it('gives each location its share of the combined energy', () => {
    const ranked = rankLocations([home, cabin])

    expect(ranked.find((s) => s.name === 'Home')?.sharePercent).toBe(75)
    expect(ranked.find((s) => s.name === 'Cabin')?.sharePercent).toBe(25)
  })

  it('has totals that equal the sum of the locations', () => {
    const totals = totalsOf([home, cabin])

    expect(totals.powerKw).toBe(4)
    expect(totals.kwh).toBe(20)
    expect(totals.cost).toBe(58)
    expect(totals.deltaPercent).toBeCloseTo(16, 0) // 58 against 30 + 20
    expect(totals.incomplete).toBe(false)
  })

  it('marks the total incomplete when one location has no price', () => {
    const totals = totalsOf([home, flat])

    expect(totals.cost).toBe(18)
    expect(totals.incomplete).toBe(true)
  })

  it('has no change when there is no previous cost', () => {
    expect(totalsOf([flat]).deltaPercent).toBeNull()
  })
})
