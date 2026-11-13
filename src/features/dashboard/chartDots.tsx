/**
 * A line or area needs two points to draw anything, so a value with no neighbour on either side
 * (for example the only month of the year with data) would be invisible. It gets a dot instead.
 */
export function isolatedDot(values: (number | null)[], color: string) {
  return function IsolatedDot({ cx, cy, index }: { cx?: number; cy?: number; index?: number }) {
    const i = index ?? -1
    const alone = values[i] != null && values[i - 1] == null && values[i + 1] == null
    if (!alone || cx === undefined || cy === undefined) return <g />
    return <circle cx={cx} cy={cy} r={4} fill={color} stroke="var(--card)" strokeWidth={2} />
  }
}
