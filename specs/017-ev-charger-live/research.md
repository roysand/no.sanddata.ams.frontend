# Research: The Car Charger's State Right Now

## R1 – Reading the state

- **Decision**: `getEvChargerState(locationId)` → `api.get<RawEvChargerLiveState>('/api/locations/{id}/ev-charger/state')`.
  A `state` outside the known seven is returned as `unknown` (the API handover asks for this, in case new ones are
  added).
- **Rationale**: Principle II: API gaps are normalised in `api.ts`, so components switch on a closed union.
- **Alternatives**: handle unknown values in each component (repeated, easy to miss).

## R2 – One query, every 3 minutes, shared

- **Decision**: `useEvChargerState(locationId, enabled)`, key `['ev-charger', 'state', locationId]`, `enabled` only
  for a location with `hasEvCharger`, `retry: false`, `refetchInterval` 3 minutes, stopped on a 404 (as
  `useWaterHeaterState`). The Car tab and the Now page share the cache entry.
- **Rationale**: the API reads Zaptec at most every 3 minutes and holds a failure for 1 minute, so asking more often
  or retrying gains nothing (API handover, "How often to ask"). TanStack Query pauses the interval in a hidden tab.
- **Alternatives**: 1 minute as the water heater (no new values, three times the requests).

## R3 – Unavailable, not old figures

- **Decision**: when the latest request failed (502/503 or any other error but 404), the tile says "The charger's
  state is unavailable right now." and the picture is faded; the Now line is hidden, even if an older answer is in the
  cache. 404 renders nothing, as the water heater card.
- **Rationale**: spec Assumption: an old state must never look current. The water heater card does the same.

## R4 – Texts and times

- **Decision**: pure `liveView(state, now)` gives the tile's heading, its details in order, the picture's mode and its
  screen reader text; `chargingNowLine(state, now)` gives the Now line or null. Times use a new
  `formatOsloTimeOrDate(iso, now)`: "16:37" today, "23.11. 23:10" before (the `formatDay` form). The age uses
  `formatAge((now − readAt) / 1000)` with `useNow(30 s)`, as the water heater.
- **Details by state** (from the API contract's table): power only while charging; kWh when not null (0 is shown as
  "0,0 kWh"); "charging since" only while charging; "plugged in at" when set; "last reported" only when offline.
- **Rationale**: pure functions are tested at exact minutes (as `norgesPris.ts`).

## R5 – The picture

- **Decision**: `EvChargerPicture({ mode })`, an inline SVG drawn from `picture-preview.html` (viewBox 380 × 200):
  car from the front, charger post with a bolt, an S-shaped cable from the charger's side to the car's right front.
  Modes: `charging` (green line moving, green bolt), `plugged` (cable, still, grey bolt), `noCar` (car faded, no
  cable), `faded` (all faded, still). The moving line is a second copy of the cable path with `pathLength="100"`,
  `stroke-dasharray: 100 100`, and a `.cable-flow` keyframe on `stroke-dashoffset` from 100 to 0 in 1,5 s, linear,
  infinite. With `prefers-reduced-motion` the animation is off and the dash offset 0: a still green cable. Colours are
  Tailwind fill/stroke classes with `dark:` variants; the green is the app's `price-cheap` colour. `role="img"` with
  the view's screen reader text.
- **Rationale**: no image file or library needed; the water heater tank is drawn the same way, and `.heater-glow` is the
  precedent for one keyframe in `index.css`. `pathLength` makes the dash independent of the path's real length, so
  the cable's curve can change freely.
- **Alternatives**: an animated GIF/Lottie (a dependency, no dark mode); a photo (not ours, FR-012).

## R6 – The Now line

- **Decision**: `NowCard` gets `hasEvCharger` from `DashboardPage` and shows the line as its own paragraph right below the house's figures (power, cost this hour, spot price), above the
  price note, in the "Right now" card, in `text-sm`, with a small green plug icon from lucide. Not shown while the card
  loads, fails or has no readings.
- **Rationale**: spec Assumptions; the house figures stay untouched (US2-4).

## R7 – The hint

- **Decision**: "A charge in progress shows here about 15 minutes after it ends." becomes "Finished charges show here
  about 15 minutes after they end. The charger's state right now is at the top."
