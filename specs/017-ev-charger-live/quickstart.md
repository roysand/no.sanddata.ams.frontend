# Quickstart: The Car Charger's State Right Now

## Automated

```bash
npm test && npm run lint && npm run build
```

Covers every row of [contracts/ui.md](contracts/ui.md), the unknown-state normalising, and that no state request is
made for a location without a charger.

## By hand (Hjemme, against production)

1. **Charging** (SC-001, US1-1, US3-1): with the car charging, open the Car tab. The tile shows the drawing with the
   green line running from the charger to the car, "Charging", the kW and kWh as in the Zaptec app, "charging since"
   and "updated … ago". Open Now: "Car charging now: … · since …" in the "Right now" card.
2. **Ends** (SC-002, US2-2): unplug the car or let the charge finish. Within about 3 minutes the tile changes and the
   Now line is gone.
3. **No double counting** (SC-004): the Car tab's "Today" and the bill don't change while the charge runs.
4. **Reduced motion** (US3-5): turn on reduce motion in the OS; the cable is green and still.
5. **Phone and dark mode** (SC-005): at 375 px in light and dark mode the drawing fits and the texts wrap.
6. **Polling** (SC-003): with devtools' network tab open for 10 minutes, the state is asked for 4 times at most.
