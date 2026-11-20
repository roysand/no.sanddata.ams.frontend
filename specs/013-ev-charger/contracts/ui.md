# UI Contract: The EV Charger

The texts and where they go.

## Tab bar

- **Tabs**, in this order: Now · History · Heater (with a heater) · **Car** (with a charger) · Location / All
  locations.
- **Columns:** 3 to 5, one per tab shown.
- **Icon:** `CarIcon`. The label is "Car".

## Car tab (`/ev-charger`)

1. **Card "Charging"**:
   - The checkbox **"Count the car charger with the house"**.
     - Below it, in muted text: "In kWh only. Costs and the bill stay the house's own."
     - **Viewer:** the checkbox is disabled and reads "Only the owner can change this."
     - **Error:** the API's message, in destructive text.
   - **"Today":** "12,4 kWh", or "No charging yet".
   - **"This month":** "212,7 kWh", or "No charging yet". With `since`, a second line reads "since 18.11.2026".
   - When there are hours without a house reading: "3 hours of charging had no house reading and are not in the
     hour-by-hour chart."
   - Muted text: "A charge in progress shows here about 15 minutes after it ends."
2. **Card "Sessions, last 30 days"**: newest first, one row each.
   - **Left:** "Thu 20.11 · 17:02–21:40". A session that ends on a later day reads "20.11 23:10 – 21.11 02:30".
   - **Right:** "23,4 kWh", and under it "4 h 38 min".
   - An `estimated` badge when the session is estimated.
   - **Empty:** "No completed charging sessions in the last 30 days."
3. **Without a charger** (by URL or after switching location): "No car charger is connected at {name}. An
   administrator can connect one under Admin → Locations."

## Usage chart (Now and History, kWh, checkbox on)

- **Legend:** "Car charging", in the colour `var(--ev-charger)`.
- **Bars:** the car part is on top, above water heating and everything else.
- **Detail line:** "4,6 kWh · Car charging 3,2 kWh · Water heating 0,4 kWh · Everything else 1,0 kWh". Parts that
  are missing are left out.

## Bill (below the water heating note)

- **The car note:**
  - **Current month:** "Car charging so far this month: 212,7 kWh · counted with the house"
  - **Ended month:** "Car charging in October 2026: 180,2 kWh · not counted with the house"
  - **Charging started after the 1st:** "Car charging since 18.11.2026: …"
- **Not shown** without an `evCharger` part.

## CSV

- **Last two columns:** "Car charging (kWh)" (3 decimals) and "Car counted with the house" (Yes/No).
- Both are empty without a part.

## Admin dialog, section "Car charger"

- **Not connected:** "No car charger connected", and the button **Connect**.
- **Connected:**
  - "{chargerName} · {installationName}"
  - "connected 18.11.2026 · read up to 20.11.2026 19:15 · counted with the house / not counted"
  - The buttons **Replace** and **Remove**.
- **Connect dialog:**
  - **Title:** "Connect a car charger to {location}" (or "Replace the car charger at {location}").
  - **Body:** a radio list of "{name} · {installationName}".
  - **Footer:** Cancel and **Connect charger** (or **Replace charger**).
  - **Messages:**
    - A list error shows the API's message.
    - While the list loads, a skeleton.
    - With no chargers: "The server's Zaptec sign-in sees no chargers."
- **Remove dialog:**
  - **Text:** "Remove the car charger from {location}? Charging already read is kept, and the car is no longer
    counted with the house."
  - **Footer:** Cancel and **Remove charger**.
