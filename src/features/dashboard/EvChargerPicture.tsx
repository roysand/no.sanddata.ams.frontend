import { PICTURE_LABEL, type ChargerPicture } from './evCharger'

/** The cable from the charger's side to the car's right front; drawn from the charger, so the line runs that way. */
const CABLE =
  'M330 84 C 296 80, 318 150, 310 170 C 302 188, 276 182, 280 160 C 284 140, 282 132, 262 130'

/**
 * The car charger drawn: a car seen from the front, the charger post beside it and the cable between them (spec 017,
 * US3; agreed with Roy in picture-preview.html). While charging, a green line runs along the cable from the charger to
 * the car, over and over. The app's own drawing: no car maker's shape, logo or name.
 */
export function EvChargerPicture({ mode }: { mode: ChargerPicture }) {
  const charging = mode === 'charging'
  return (
    <svg
      viewBox="0 0 380 200"
      role="img"
      aria-label={PICTURE_LABEL[mode]}
      data-mode={mode}
      className={`mx-auto block h-auto w-full max-w-sm ${mode === 'faded' ? 'opacity-45' : ''}`}
    >
      <g className={mode === 'noCar' ? 'opacity-25' : undefined}>
        {/* wheels */}
        <rect
          x="62"
          y="148"
          width="34"
          height="40"
          rx="7"
          className="fill-gray-800 dark:fill-gray-950"
        />
        <rect
          x="224"
          y="148"
          width="34"
          height="40"
          rx="7"
          className="fill-gray-800 dark:fill-gray-950"
        />
        {/* roof, windscreen and mirrors */}
        <path
          d="M84 108 L104 54 Q108 44 120 44 L200 44 Q212 44 216 54 L236 108 Z"
          className="fill-slate-500 dark:fill-slate-600"
        />
        <path
          d="M95 102 L111 60 Q114 53 122 53 L198 53 Q206 53 209 60 L225 102 Z"
          className="fill-slate-800 dark:fill-slate-950"
        />
        <path
          d="M68 86 Q72 78 86 82 L88 96 Q74 98 68 92 Z"
          className="fill-slate-500 dark:fill-slate-600"
        />
        <path
          d="M252 86 Q248 78 234 82 L232 96 Q246 98 252 92 Z"
          className="fill-slate-500 dark:fill-slate-600"
        />
        {/* body */}
        <path
          d="M54 150 Q50 118 74 104 L246 104 Q270 118 266 150 L266 164 Q266 172 258 172 L62 172 Q54 172 54 164 Z"
          className="fill-slate-400 dark:fill-slate-500"
        />
        {/* headlights */}
        <path d="M66 120 Q90 118 114 126 L110 132 Q86 130 68 128 Z" className="fill-slate-50" />
        <path d="M254 120 Q230 118 206 126 L210 132 Q234 130 252 128 Z" className="fill-slate-50" />
        {/* grille and bumper */}
        <rect
          x="122"
          y="118"
          width="76"
          height="36"
          rx="12"
          strokeWidth="2"
          className="fill-slate-800 stroke-slate-200 dark:fill-slate-950"
        />
        <path
          d="M130 128 H190 M130 136 H190 M130 144 H190"
          strokeWidth="2"
          className="stroke-slate-500 dark:stroke-slate-600"
        />
        <path
          d="M78 162 H242"
          strokeWidth="3"
          strokeLinecap="round"
          className="stroke-slate-200 opacity-70"
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
