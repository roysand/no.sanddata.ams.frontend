# Quickstart: Validate the Water Heater

## Prerequisites

- Node 22+, `npm install` done.
- For the manual checks: the API with spec 011 (deployed 2026-11-19), reached through the Vite `/api` proxy with an
  empty `VITE_API_BASE_URL`; an Admin user; the OSO subscription key and device id for the heater at Hjemme.

## 1. Automated checks

```sh
npm test && npm run lint && npm run build
```

Expected: all pass. The new tests cover:

- `admin/schema.test.ts`: empty fields, a key with a space, a non-hex device id, 201 characters, a valid pair.
- `admin/WaterHeaterSection.test.tsx`: "No water heater connected" on 404; connect shows "Checking with OSO…" and a
  disabled button, then "Connected" with the hint and date; a 400 Rejected keeps the values and shows the message;
  Replace opens an empty form; Remove asks, says the power history is kept, and ends at "No water heater connected".
- `dashboard/format.test.ts`: `formatAge` (0 s, 59 s, 94 s, 5 min, 2 h), `formatOsloDateTime` (today, tomorrow, later,
  around DST), `formatCelsius`.
- `dashboard/WaterHeaterCard.test.tsx`: the spec's independent test (333 of 360 l, 3 showers, 1 bath, 70,1 °C,
  Not heating, "updated 1 minute ago"); null temperatures left out; Heating with kW; Supercharge with end time;
  stale and offline notes; 404 renders nothing; 503 shows the message.

## 2. Admin (manual, SC-001, SC-002)

`npm run dev`, sign in as Admin, open Admin → Locations → Hjemme. The Water heater section says "No water heater
connected".

1. Connect with a wrong device id (valid hex): "Checking with OSO…", then OSO's rejection under the form, values kept.
2. Fix it and save: "Connected", the shortened id and today's date; the key field is gone and is not offered by the
   browser's password manager on the next Connect.
3. Replace: the form is empty.
4. (Optional) Remove and connect again; the dashboard card disappears and comes back.

## 3. Dashboard (manual, SC-003, SC-004)

Open the Now tab for Hjemme. The Water heater card shows the same litres, showers and top temperature as the OSO app,
"updated … ago" moving on by itself, and refreshing about once a minute (Network tab: one request per minute; none
while the tab is hidden). Switch to a location without a heater: no card, no repeated requests. Check at phone width
(375 px) that the card does not overflow.
