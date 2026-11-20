# Quickstart: Check the Warnings

## Prerequisites

- Node 22+ and `npm install`.
- For the manual checks:
  - the deployed API, through the Vite `/api` proxy
  - Hjemme, which has a grid tariff with capacity steps and four weeks of readings
  - a way to raise use for an hour, for example a 2 kW panel heater.

## 1. Automated checks

```sh
npm run build && npm run lint && npm test
```

Expected: everything passes. The new tests cover:

- **`warnings.test.ts`, capacity:**
  - with today in the top three and today not in it: `T* = 3L − o1 − o2`
  - with fewer than three days
  - no warning at 10 minutes or before, in the top step, or without steps
  - no warning for an hour below today's peak so far
  - the limit rounded down, and the "has lifted" case
- **`warnings.test.ts`, usage:**
  - 2× and +1 kW, both needed
  - 2 of 4 weeks gives no warning
  - a reading older than 6 minutes gives no warning
  - fewer than 5 readings gives no warning
- **`usual.test.ts`:** the median of 4 values (even count), and of 3, for the matching Oslo hour and weekday only, and
  the repeated hour when the clocks go back.
- **`WarningBanner.test.tsx`:**
  - capacity before usage, with the texts from [contracts/ui.md](contracts/ui.md)
  - links to `/`
  - nothing when nothing is due, and nothing on a 500 from any input
  - the selected location only
  - the warnings before the key reminders in `AppLayout`
  - no new requests on Now, compared with before.

## 2. In the browser (manual)

1. **A quiet hour:** select Hjemme. There is no warning banner.
2. **Unusual usage:** switch on a 2 kW heater at an otherwise quiet hour. Within about 2 minutes, the usage line shows
   the power now and the usual power. Switch it off, and it goes within a few minutes, as the 15-minute window
   empties.
3. **Capacity step:** check the capacity card's step and the kW to the next step.
   - If the month's peaks are close to the next step, run several heavy loads for one hour (oven, washer, heater).
   - After 10 minutes, the capacity line names the next step and a limit.
   - Lowering the use makes it go within a minute.

   Only do this if one extra peak would be cheap; it may really lift the step.

4. **Norgespris limit:** compare with the expected bill's Norgespris lines on Now.
   - For a Norgespris location whose bill projects more kWh than its Norgespris credit covers (the cabin in a cold
     month), the Norgespris line gives the same two numbers.
   - For Hjemme within its 5 000 kWh, there is no Norgespris line.
5. **Locations:** switch to another location. Only its own warnings are shown.
6. **A viewer:** sign in as a viewer of Hjemme. The viewer sees the same warnings.
7. **Phone and dark mode:** at 375 px, in light and dark mode, the banner with three warnings, plus key reminders for an
   administrator, reads well, and the page starts right after it.
