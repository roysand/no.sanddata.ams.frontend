# Quickstart: What the Car Charging Costs, on the Bill

## Automated

```sh
npm test
npm run build
npm run lint
```

## Manual (API spec 019 deployed)

1. Hjemme, car not counted with the house: Now's expected bill and History's November bill show the car's kWh, the
   cost "at the Norgespris price" and "not counted with the house". The cost ≈ kWh × the Norgespris price incl. VAT on
   the Admin Norgespris page (SC-001).
2. The bill's total is the same as before (SC-002).
3. Tick "Count the car charger with the house" on the Car tab: the note says "at the house's price" and "counted with
   the house". Untick it again.
4. A past month on History shows its car cost the same way.
5. At 375 px in light and dark mode, the note takes at most two lines (SC-004).
