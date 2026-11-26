import { PICTURE_LABEL, type ChargerPicture } from './evCharger'

/** The cable from the charger's side to the car's right front; drawn from the charger, so the line runs that way. */
const CABLE =
  'M330 84 C 296 80, 318 150, 310 170 C 302 188, 276 182, 280 160 C 284 140, 282 132, 262 130'

/**
 * The car charger drawn: a car seen from the front, the charger post beside it and the cable between them (spec 017,
 * US3; agreed with Roy in picture-preview.html). While charging, a green line runs along the cable from the charger to
 * the car, over and over. The app's own drawing, after Roy's next car (a Volvo EX60), with no maker's emblem or name.
 */
export function EvChargerPicture({
  mode,
  className = 'mx-auto block h-auto w-full max-w-sm',
  cropped = false,
}: {
  mode: ChargerPicture
  /** Its size and place; centred up to 24 rem wide by default. */
  className?: string
  /** Without the margin around the car and the charger, for a small drawing. */
  cropped?: boolean
}) {
  const charging = mode === 'charging'
  return (
    <svg
      viewBox={cropped ? '48 36 324 158' : '0 0 380 200'}
      role="img"
      aria-label={PICTURE_LABEL[mode]}
      data-mode={mode}
      className={`${className} ${mode === 'faded' ? 'opacity-45' : ''}`}
    >
      {/*
        The car, after Roy's photo of his next car, a Volvo EX60, seen from the front: dark grey paint, black mirrors,
        a smooth front with no grille, slim light bars high at the corners with a short upright end, small stacked
        lights in the lower corners, a wide intake split into sections and a thin silver strip at the bottom. No
        maker's emblem or name.
      */}
      <g className={mode === 'noCar' ? 'opacity-25' : undefined}>
        {/* wheels */}
        <rect
          x="60"
          y="150"
          width="36"
          height="40"
          rx="8"
          className="fill-gray-900 dark:fill-black"
        />
        <rect
          x="224"
          y="150"
          width="36"
          height="40"
          rx="8"
          className="fill-gray-900 dark:fill-black"
        />
        {/* roof and pillars, windscreen, black mirrors */}
        <path
          d="M86 104 L104 50 Q108 40 120 40 L200 40 Q212 40 216 50 L234 104 Z"
          className="fill-zinc-700 dark:fill-zinc-600"
        />
        <path
          d="M97 99 L112 57 Q115 49 123 49 L197 49 Q205 49 208 57 L223 99 Z"
          className="fill-slate-900 dark:fill-slate-950"
        />
        <path
          d="M66 84 Q70 76 86 80 L88 94 Q72 96 66 90 Z"
          className="fill-zinc-900 dark:fill-black"
        />
        <path
          d="M254 84 Q250 76 234 80 L232 94 Q248 96 254 90 Z"
          className="fill-zinc-900 dark:fill-black"
        />
        {/* body: dark grey, with the bonnet's soft edge */}
        <path
          d="M52 152 Q50 116 76 102 L244 102 Q270 116 268 152 L268 166 Q268 174 260 174 L60 174 Q52 174 52 166 Z"
          className="fill-zinc-600 dark:fill-zinc-500"
        />
        <path
          d="M84 110 Q160 100 236 110"
          fill="none"
          strokeWidth="1.5"
          className="stroke-zinc-400 opacity-50"
        />
        {/* slim light bars high at the corners, each with a short upright end at the outside */}
        <path
          d="M60 113 L112 118 L111 124 L62 124 Q58 118 60 113 Z"
          className="fill-zinc-900 dark:fill-black"
        />
        <path
          d="M260 113 L208 118 L209 124 L258 124 Q262 118 260 113 Z"
          className="fill-zinc-900 dark:fill-black"
        />
        <path
          d="M70 120.5 H108 M66 115 V123"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-white"
        />
        <path
          d="M250 120.5 H212 M254 115 V123"
          fill="none"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-white"
        />
        {/* the thin light strip across the smooth front */}
        <path
          d="M100 140 H220"
          strokeWidth="2"
          strokeLinecap="round"
          className="stroke-zinc-300 opacity-80"
        />
        {/* small stacked lights in the lower corners */}
        <path
          d="M64 133 H72 M64 138 H72 M64 143 H72 M248 133 H256 M248 138 H256 M248 143 H256"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="stroke-white opacity-80"
        />
        {/* the wide intake, split into sections */}
        <path d="M84 146 L236 146 L228 162 L92 162 Z" className="fill-zinc-900 dark:fill-black" />
        <path
          d="M122 148 V160 M160 148 V160 M198 148 V160"
          strokeWidth="1.5"
          className="stroke-zinc-600"
        />
        {/* the thin silver strip at the bottom */}
        <path
          d="M90 168 H230"
          strokeWidth="2.5"
          strokeLinecap="round"
          className="stroke-zinc-300"
        />
      </g>

      {/* the charger post */}
      <rect
        x="330"
        y="40"
        width="36"
        height="150"
        rx="7"
        className="fill-gray-900 dark:fill-slate-950"
      />
      <rect
        x="330"
        y="40"
        width="36"
        height="14"
        rx="5"
        className="fill-gray-700 dark:fill-gray-600"
      />
      <rect x="330" y="56" width="36" height="3" className="fill-gray-200" />
      <path
        d="M351 92 L341 108 H348 L344 122 L356 104 H349 Z"
        data-testid="charger-bolt"
        className={charging ? 'fill-green-500 dark:fill-green-400' : 'fill-muted-foreground'}
      />

      {mode !== 'noCar' && (
        <g fill="none" strokeLinecap="round" strokeWidth="4">
          <path d={CABLE} className="stroke-gray-700 dark:stroke-gray-600" />
          {charging && (
            <path
              d={CABLE}
              pathLength={100}
              data-testid="cable-flow"
              className="cable-flow stroke-current text-green-500 dark:text-green-400"
            />
          )}
        </g>
      )}
    </svg>
  )
}
