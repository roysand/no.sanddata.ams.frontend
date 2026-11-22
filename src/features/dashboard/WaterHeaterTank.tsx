import { useId } from 'react'

/** Where the body of the tank starts and ends, and how round its ends are, in viewBox units. */
const CX = 50
const RX = 36
const RY = 10
const TOP = 22
const BOTTOM = 148

/** The heights of the top, middle and bottom sensors on the tank. */
const SENSOR_Y = { top: 44, mid: 86, low: 128 } as const

/** Colder water is drawn paler, hotter water deeper orange, in the water heater's hue. */
const COLD_CELSIUS = 20
const HOT_CELSIUS = 70

function waterColour(celsius: number): string {
  const t = Math.min(Math.max((celsius - COLD_CELSIUS) / (HOT_CELSIUS - COLD_CELSIUS), 0), 1)
  const lightness = 0.93 - t * 0.25
  const chroma = 0.05 + t * 0.12
  return `oklch(${lightness.toFixed(3)} ${chroma.toFixed(3)} 45)`
}

type TankTemperatures = { top: number | null; mid: number | null; low: number | null }

/**
 * The water heater drawn as a tank, coloured by its temperatures from top to bottom, with a marker at each sensor and
 * the share of hot water left inside, between the middle and bottom sensors. The tank glows while the heater is heating.
 */
export function WaterHeaterTank({
  temperatures,
  percent,
  isHeating,
}: {
  temperatures: TankTemperatures
  percent: number | null
  isHeating: boolean
}) {
  const id = useId()
  const gradientId = `${id}-water`
  const glowId = `${id}-glow`

  const sensors = (['top', 'mid', 'low'] as const)
    .filter((key) => temperatures[key] !== null)
    .map((key) => ({ key, y: SENSOR_Y[key], celsius: temperatures[key]! }))

  const stops =
    sensors.length > 0
      ? sensors.map((s) => ({
          offset: (s.y - TOP) / (BOTTOM - TOP),
          colour: waterColour(s.celsius),
        }))
      : [{ offset: 0, colour: 'var(--muted)' }]

  // The side walls and the front half of both ends; the top end is drawn over it.
  const body = `M${CX - RX} ${TOP} L${CX - RX} ${BOTTOM} A${RX} ${RY} 0 0 0 ${CX + RX} ${BOTTOM} L${CX + RX} ${TOP} Z`

  return (
    <svg
      viewBox="0 0 140 170"
      className="h-44 w-auto shrink-0 overflow-visible"
      aria-hidden="true"
      data-heating={isHeating}
    >
      <defs>
        <linearGradient
          id={gradientId}
          gradientUnits="userSpaceOnUse"
          x1="0"
          y1={TOP}
          x2="0"
          y2={BOTTOM}
        >
          {stops.map((stop) => (
            <stop key={stop.offset} offset={stop.offset} stopColor={stop.colour} />
          ))}
        </linearGradient>
        <filter id={glowId} x="-100%" y="-100%" width="300%" height="300%">
          <feGaussianBlur stdDeviation="10" />
        </filter>
      </defs>

      {isHeating && (
        <path
          d={`${body} M${CX - RX} ${TOP} A${RX} ${RY} 0 0 1 ${CX + RX} ${TOP}`}
          className="heater-glow"
          fill="oklch(0.7 0.2 45)"
          stroke="oklch(0.7 0.2 45)"
          strokeWidth={10}
          strokeLinejoin="round"
          filter={`url(#${glowId})`}
        />
      )}

      <path d={body} fill={`url(#${gradientId})`} />
      <ellipse
        cx={CX}
        cy={TOP}
        rx={RX}
        ry={RY}
        fill={sensors.length > 0 ? waterColour(sensors[0].celsius) : 'var(--muted)'}
      />
      {/* The top end is lit from above: a paler lid with a light rim, as in the OSO app. */}
      <ellipse
        cx={CX}
        cy={TOP}
        rx={RX}
        ry={RY}
        fill="white"
        fillOpacity={0.3}
        stroke="white"
        strokeOpacity={0.9}
        strokeWidth={1.5}
      />

      {/* A dotted ring around the tank at each sensor, running out to its temperature. */}
      {sensors.map((s) => (
        <g key={s.key}>
          {/* The front half of the tank's ring at this height, curved like the ends of the tank. */}
          <path
            d={`M${CX - RX} ${s.y} A${RX} ${RY} 0 0 0 ${CX + RX} ${s.y}`}
            fill="none"
            stroke="#1c1917"
            strokeOpacity={0.55}
            strokeWidth={1.5}
            strokeDasharray="2 4"
            strokeLinecap="round"
          />
          <line
            x1={CX + RX}
            y1={s.y}
            x2={CX + RX + 10}
            y2={s.y}
            className="stroke-foreground"
            strokeWidth={1.5}
            strokeDasharray="2 4"
            strokeLinecap="round"
          />
          <text
            x={CX + RX + 14}
            y={s.y}
            dominantBaseline="middle"
            fontSize="15"
            className="fill-foreground"
          >
            {Math.round(s.celsius)}°
          </text>
        </g>
      ))}

      {percent !== null && (
        <text
          x={CX}
          y={(SENSOR_Y.mid + RY + SENSOR_Y.low) / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="20"
          fontWeight="700"
          fill="#1c1917"
        >
          {Math.round(percent)}%
        </text>
      )}
    </svg>
  )
}
