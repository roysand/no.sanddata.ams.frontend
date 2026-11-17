import { SAVING_PERIOD_LABELS, formatKrPerKwh, formatSaving } from './format'

// Intl puts no-break spaces in numbers; compare with plain ones.
const plain = (text: string) => text.replace(/\s/g, ' ')

describe('formatKrPerKwh', () => {
  it('shows two decimals for a round price', () => {
    expect(plain(formatKrPerKwh(0.4))).toBe('0,40 kr/kWh')
    expect(plain(formatKrPerKwh(0))).toBe('0,00 kr/kWh')
  })

  it('keeps up to four decimals, which the parts of a price need', () => {
    expect(plain(formatKrPerKwh(0.0813))).toBe('0,0813 kr/kWh')
    expect(plain(formatKrPerKwh(1.501625))).toBe('1,5016 kr/kWh')
  })
})

describe('formatSaving', () => {
  it('calls a positive figure Saved', () => {
    expect(formatSaving(12.3)).toEqual({ label: 'Saved', amount: '12,30' })
  })

  it('calls a negative figure an Extra cost, without a minus sign', () => {
    expect(formatSaving(-4.5)).toEqual({ label: 'Extra cost', amount: '4,50' })
  })

  it('calls a figure that rounds to nothing No difference', () => {
    expect(formatSaving(0)).toEqual({ label: 'No difference', amount: '0,00' })
    expect(formatSaving(0.004)).toEqual({ label: 'No difference', amount: '0,00' })
    expect(formatSaving(-0.004)).toEqual({ label: 'No difference', amount: '0,00' })
  })

  it('uses the Norwegian thousands separator for large figures', () => {
    expect(plain(formatSaving(1234.5).amount)).toBe('1 234,50')
    expect(plain(formatSaving(-41660.06).amount)).toBe('41 660,06')
  })

  it('rounds to whole øre', () => {
    expect(formatSaving(41.660059747).amount).toBe('41,66')
    expect(formatSaving(0.005).label).toBe('Saved')
  })
})

describe('SAVING_PERIOD_LABELS', () => {
  it('names the four periods', () => {
    expect(SAVING_PERIOD_LABELS).toEqual({
      Today: 'Today',
      Last7Days: 'Last 7 days',
      MonthToDate: 'This month',
      YearToDate: 'This year',
    })
  })
})
