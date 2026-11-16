import { formatPercent, kindLabel, percentDecimals, percentToFraction } from './pricing'

describe('percentToFraction', () => {
  it.each([
    ['25', 0.25],
    ['25,5', 0.255],
    ['25.50', 0.255],
    ['12,34', 0.1234],
    ['0', 0],
    ['100', 1],
    ['100,00', 1],
    ['  25 ', 0.25],
  ])('reads "%s" as the fraction %d', (text, fraction) => {
    expect(percentToFraction(text)).toBe(fraction)
  })

  it.each(['', 'abc', '-1', '100,01', '101', '25,555', '25,', ',5', '1e2', '25 %'])(
    'refuses "%s"',
    (text) => {
      expect(percentToFraction(text)).toBeNull()
    },
  )
})

describe('percentDecimals', () => {
  it('counts the digits after the separator', () => {
    expect(percentDecimals('25')).toBe(0)
    expect(percentDecimals('25,5')).toBe(1)
    expect(percentDecimals('25.555')).toBe(3)
  })
})

describe('formatPercent', () => {
  // Intl puts a no-break space between the number and the sign; compare with a plain one.
  const plain = (text: string) => text.replace(/\s/g, ' ')

  it('shows a fraction as the percentage people think in', () => {
    expect(plain(formatPercent(0.25))).toBe('25 %')
    expect(plain(formatPercent(0.255))).toBe('25,5 %')
    expect(plain(formatPercent(0.1234))).toBe('12,34 %')
    expect(plain(formatPercent(1))).toBe('100 %')
    expect(plain(formatPercent(0))).toBe('0 %')
  })
})

describe('kindLabel', () => {
  it('names each kind', () => {
    expect(kindLabel('ElectricityTax')).toBe('Electricity tax')
    expect(kindLabel('EnovaFee')).toBe('Enova fee')
    expect(kindLabel('Vat')).toBe('VAT')
  })
})
