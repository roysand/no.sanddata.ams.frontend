# Quickstart: check the feature

## Prerequisites

- An API with PR #24 and PR #25 (local `no.sanddata.ams.api` on `feature/008-capacity-charge` or later, or a
  deployment of it).
- An Admin account and a location with readings for October 2026 (the holiday home on Elvia is the reference).

## Automated checks

```bash
npm run build
npm run lint
npm test
```

All pass. The new tests cover the capacity card states, the limit notes, the step dialog and its schema, the flags and
the cap kinds (see `tasks.md`).

## Manual run

```bash
npm run dev   # with the Vite /api proxy pointed at the API
```

1. **Capacity steps (Story 4)**: Admin → Grid tariffs → Elvia → Add capacity steps. Start date 2026-07-01, tick
   "Amounts include VAT", enter Elvia's published steps (0–2 kW 150 kr, 2–5 kW 250 kr, 5–10 kW 420 kr, ...). The
   converted column shows 120, 200, 336. Confirm the past date and save; the table is listed as In effect.
2. **Flags (Story 5)**: Admin → Location pricing → the holiday home → tick Holiday home; save and reload; the badge
   shows.
3. **Capacity card (Story 1)**: Dashboard → the holiday home → capacity card → previous until October 2026: step
   5–10 kW, 420 kr, peaks 14.10 6,2 kW, 03.10 5,1 kW, 27.10 4,9 kW, "4,6 kW below the next step", not provisional. This
   matches the October 2026 Elvia bill (SC-001). The current month shows "Provisional".
4. **Wording (Story 2)**: the right-now card, the price dialog and the saving card: no "grid fixed fee", no "limit is
   not taken into account".
5. **Monthly limit (Story 3)**: only visible near the limit. Check it with the tests, or on a scratch database by adding
   a holiday-home limit low enough to be reached this month.

Expected outcomes are the acceptance scenarios in [spec.md](spec.md); the calls are in
[contracts/api-usage.md](contracts/api-usage.md).
