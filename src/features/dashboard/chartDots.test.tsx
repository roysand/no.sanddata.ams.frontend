import { render } from '@testing-library/react'
import { isolatedDot } from './chartDots'

function dotsFor(values: (number | null)[]) {
  const Dot = isolatedDot(values, 'red')
  const { container } = render(
    <svg>
      {values.map((_, i) => (
        <Dot key={i} cx={i * 10} cy={5} index={i} />
      ))}
    </svg>,
  )
  return container.querySelectorAll('circle')
}

describe('isolatedDot', () => {
  it('draws a dot for the only month with data', () => {
    expect(dotsFor([null, null, null, 4.2, null])).toHaveLength(1)
  })

  it('draws dots for separate single values', () => {
    expect(dotsFor([1, null, 2, null, 3])).toHaveLength(3)
  })

  it('draws no dots when the values form a line', () => {
    expect(dotsFor([1, 2, 3])).toHaveLength(0)
    expect(dotsFor([null, 1, 2, null])).toHaveLength(0)
  })

  it('draws nothing without data', () => {
    expect(dotsFor([null, null])).toHaveLength(0)
  })
})
