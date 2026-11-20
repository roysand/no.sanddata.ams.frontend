# Quickstart: The EV Charger in the App

How to check that spec 013 works.

## Prerequisites

- The API with its spec 016 deployed, and a Zaptec sign-in in the server's `.env`.
- An Admin user, an owner and a viewer of Hjemme.
- `npm install`, then `npm run dev` with the `/api` proxy (empty `VITE_API_BASE_URL`).

## Automated

```sh
npm test         # evCharger.test.ts, series.test.ts, EvChargerPage, EvChargerSection, BillView, exportCsv, TabBar
npm run build
npm run lint
```

## Manual

1. **Connect (US1).** As Admin, go to Admin → Locations → Hjemme → Car charger → Connect, pick "Garasje", and choose
   **Connect charger**.
   - The section shows the charger, the installation and "connected today".
   - Remove the login from the server's `.env` and open Connect again: the dialog shows "The Zaptec sign-in is not set
     up on the server".
2. **Car tab (US2).** As owner, a Car tab appears for Hjemme, and there is none for a location without a charger.
   - The sessions match the Zaptec app's history: same start, same end, kWh ± 0,01.
   - Today ≤ This month.
3. **Checkbox (US3).** Tick "Count the car charger with the house".
   - Within 5 s, History → day of a charging day (kWh) shows a car part and "Car charging" in the legend.
   - Switch to kr: the chart is unchanged.
   - Untick it: the charts are as before.
   - As a viewer, the checkbox is disabled with "Only the owner can change this".
4. **Bill and CSV (US4).** The bill has the car note, and every amount is the same with the checkbox on and off.
   - Export a week as CSV: the last two columns hold the car's kWh and Yes/No.
5. **Five tabs at 375 px.** Use a location with both a heater and a charger, in the phone view: all tabs fit, and
   none scrolls sideways.
6. **Remove.** Admin → Remove → confirm.
   - The Car tab disappears.
   - The checkbox is off if a charger is connected again.
