import { amountOf, decimalsOf, formatAmount, formatRateDate, parseAmount } from './norgesPris'

describe('formatRateDate', () => {
  it('shows a start date as dd.mm.yyyy', () => {
    expect(formatRateDate('2027-01-01')).toBe('01.01.2027')
    expect(formatRateDate('2026-11-20')).toBe('20.11.2026')
  })
})

describe('formatAmount', () => {
  // The space before "kr/kWh" is a regular one; Intl uses a no-break space inside numbers only.
  const plain = (text: string) => text.replace(/\s/g, ' ')

  it('shows two decimals for a round rate', () => {
    expect(plain(formatAmount(0.4))).toBe('0,40 kr/kWh')
    expect(plain(formatAmount(0))).toBe('0,00 kr/kWh')
  })

  it('keeps up to four decimals, the precision the API stores', () => {
    expect(plain(formatAmount(0.4567))).toBe('0,4567 kr/kWh')
    expect(plain(formatAmount(0.405))).toBe('0,405 kr/kWh')
  })
})

describe('parseAmount', () => {
  it('reads a comma or a dot as the decimal separator', () => {
    expect(parseAmount('0,5')).toBe(0.5)
    expect(parseAmount('0.5')).toBe(0.5)
    expect(parseAmount('2')).toBe(2)
  })

  it('ignores surrounding spaces', () => {
    expect(parseAmount('  0,45 ')).toBe(0.45)
  })

  it.each(['', 'abc', '-1', '0,5,5', '1e3', '0,', ',5'])('rejects "%s"', (text) => {
    expect(parseAmount(text)).toBeNull()
  })
})

describe('decimalsOf', () => {
  it('counts the digits after the separator', () => {
    expect(decimalsOf('0,12345')).toBe(5)
    expect(decimalsOf('0.1234')).toBe(4)
    expect(decimalsOf('12')).toBe(0)
  })
})

describe('amountOf', () => {
  it('turns validated text into a number', () => {
    expect(amountOf(' 0,50 ')).toBe(0.5)
  })
})
