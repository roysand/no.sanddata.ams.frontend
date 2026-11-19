# Research: Connect and Show the OSO Water Heater

Phase 0 of [plan.md](plan.md). The Technical Context had no open questions; these are the design decisions behind it.

## R1. Where the code lives

- **Decision**: The Admin section in `features/admin`, the card in `features/dashboard`.
- **Rationale**: Each piece belongs to a page its slice already owns, and the API calls split the same way (admin
  endpoints vs. location endpoints). Spec 008 did the same. No cross-slice import is needed.
- **Alternatives**: A `features/waterHeater` slice exporting both through an `index.ts`. Cleaner if heater control and
  history arrive later; can be moved then. Not worth it for two components now.

## R2. Telling "no heater" from errors

- **Decision**: Decide by HTTP status. Admin GET: `getWaterHeaterSettings` returns `null` on 404 (the dialog is open on
  a location that exists, so 404 means not connected). State GET: the card renders nothing on 404, and shows
  `error.message` for any other `ApiError` (502/503 and others).
- **Rationale**: The API's error body carries the message in `errors.generalErrors` but no code (spec Assumptions);
  `apiClient` already joins `errors` into `ApiError.message` and sets `code: 'Unknown'`. Normalizing in `api.ts` is
  what Principle II asks.
- **Alternatives**: Matching on message text (brittle); asking the API for a code field (not needed for this version).

## R3. Polling the state

- **Decision**: `refetchInterval: 60_000` while there is data or a 5xx error; `false` after a 404 (a heater connected
  later is found on the next mount, window focus, or by the Admin's connect invalidating the key).
  `refetchIntervalInBackground` stays `false` (default), so a hidden tab does not poll. `retry: false` for this query:
  a 404 must not be retried, and a 503 after a 10 s timeout should not hold the card for another 10 s; the next minute
  retries anyway. `staleTime: 30_000` (the app default).
- **Rationale**: FR-008, SC-004 (≤ ~3 min behind OSO: API reading age + 1 min), edge case "tab in the background". Each
  request costs the API four OSO calls.
- **Alternatives**: Keep polling on 404 (wastes a request per minute on every location without a heater).

## R4. Keeping the key out of every store

- **Decision**: The key lives only in React Hook Form state inside the form component. The connect mutation is
  created with `gcTime: 0`, and `mutation.reset()` is called after success and when the form closes, so the mutation
  cache does not keep `variables` (which hold the key). The form is unmounted on close, which drops its state. No
  `console` logging of the input. The PUT body is the only place the key goes.
- **Rationale**: FR-005, Principle V. TanStack Query keeps a mutation's `variables` until it is garbage-collected
  (default 5 min); React Query Devtools would show them.
- **Alternatives**: Calling `connectWaterHeater` directly without `useMutation` (breaks Principle III's
  "components consume hooks").

## R5. Stopping the browser from saving the key

- **Decision**: `PasswordInput` with `autoComplete="off"` plus `data-1p-ignore` and `data-lpignore="true"`; the device id
  field gets `autoComplete="off"` too, so browsers do not treat the pair as a username and password.
- **Rationale**: FR-005 / acceptance scenario 8. Browsers ignore `autocomplete="off"` on password fields for their
  own manager in some cases; the data attributes cover the common password-manager extensions. This is best effort:
  the browser decides in the end.
- **Alternatives**: A plain text field with CSS masking (`-webkit-text-security`), non-standard; `new-password`
  invites a generated-password suggestion.

## R6. Form placement in the Admin dialog

- **Decision**: An inline form inside the Water heater section (toggled by Connect / Replace), with Cancel. Remove uses
  a separate confirmation `Dialog` rendered next to the main one, like `ConfirmDeactivateDialog`.
- **Rationale**: A dialog inside a dialog is awkward on a phone; the existing Access section is inline too.
- **Alternatives**: A separate connect dialog.

## R7. The reading's age

- **Decision**: Age = `ageSeconds` from the API + seconds since the response arrived (`dataUpdatedAt`), shown with
  `formatAge` ("updated just now" under 60 s, "updated 1 minute ago", "updated 5 minutes ago", "updated 2 hours ago").
  A `useNow(30_000)` hook re-renders the card every 30 s so the text moves between fetches. Stale is the API's
  `isStale` (> 900 s); between fetches the card also treats a computed age > 900 s as stale.
- **Rationale**: Using the server's age avoids the browser clock's skew; a negative value cannot happen because the
  API floors it at 0 (edge case "reading in the future").
- **Alternatives**: `Date.now() - readingTime` (depends on the phone's clock); `Intl.RelativeTimeFormat` (gives
  "1 minute ago" but not the "just now" wording; may be used inside `formatAge` for the plural forms).

## R8. Numbers and times

- **Decision**: nb-NO formatting like the rest of the dashboard: temperatures with one decimal (`70,1 °C`, new
  `formatCelsius`), power with the existing `formatKw` (one decimal) and only when heating, litres and counts as whole
  numbers. Special mode end via new `formatOsloDateTime` (Europe/Oslo, "20.11. kl. 19:40", or "today 19:40" /
  "tomorrow 19:40" when it falls on those Oslo days). The fill bar width = available / max, clamped to 0–100 %;
  without both values the litres line and the bar are left out.
- **Rationale**: FR-007, FR-010, constitution's "Oslo time through `format.ts`".
- **Alternatives**: A shared `Progress` primitive (not in `components/ui`; a styled `div` with `role="meter"` and
  `aria-valuenow` is enough).

## R9. Where the card sits

- **Decision**: After `RecentUsage`, before `SavingCard`.
- **Rationale**: It is live state, read at the same glance as "right now" usage; cost cards follow.
- **Alternatives**: Last on the page (easy to miss on a phone).
