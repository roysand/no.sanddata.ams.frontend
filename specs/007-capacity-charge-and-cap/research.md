# Research: Show the Capacity Charge, the Norgespris Monthly Limit and the Exemptions

No open technical questions remained after reading the API contract (PR #24, #25) and the existing slices. The
decisions below record the choices made.

## 1. Where the per-hour limit marker goes

- **Decision**: On the right-now card (Norgespris locations), in the "What is in the price" dialog, and as a note on
  the last-hours card.
- **Rationale**: The UI has no per-hour cost list; the last-hours card is a three-hour summary built from the hourly
  cost rows, so a note is the only place to say it.
- **Alternatives considered**: A new hourly cost list. Rejected: out of scope (spec 006 also left per-hour parts out).

## 2. How the step table is entered

- **Decision**: Rows of "upper kW" and "amount"; lower kW derived from the previous row; the last row is always open.
- **Rationale**: The API rejects any table that does not start at 0, has gaps or has an open step before the end.
  Deriving the lower bound removes three of the four error cases instead of reporting them.
- **Alternatives considered**: Free lower/upper columns with validation (more typing, more errors); pasting the grid
  company's table as text (fragile across formats).

## 3. Amounts including VAT

- **Decision**: A checkbox in the dialog converts amounts typed including VAT by dividing by 1,25, rounded to 4
  decimals, and shows the result before saving.
- **Rationale**: Grid companies publish the amounts including VAT; the API stores them excluding VAT. Typing the
  published numbers avoids a manual calculation per row.
- **Alternatives considered**: Read the VAT rate from the national rates (more coupling for a one-off entry aid); no
  conversion (error-prone).

## 4. Detecting a VAT-exempt location on the dashboard

- **Decision**: `vat === 0` on the capacity response, and the `vat` part of the price parts as sent.
- **Rationale**: The flags are admin data and not on any user endpoint; the numbers already reflect the exemption.
- **Alternatives considered**: Exposing the flags on a user endpoint (backend change, not needed for the text).

## 5. Month navigation for the capacity card

- **Decision**: Previous/next buttons, bounded by the current Oslo month, month always sent explicitly.
- **Rationale**: Comparing with past bills is the main reason to look back; a picker is more UI than needed.
- **Alternatives considered**: Current month only (cannot check against bills); a month picker (more code, little gain).

## 6. Older API

- **Decision**: `cap` optional in types; flags default to `false` in `admin/api.ts`; the capacity card shows the
  server's error message.
- **Rationale**: Same approach as `parts` in spec 006; the frontend may be deployed before the API.
