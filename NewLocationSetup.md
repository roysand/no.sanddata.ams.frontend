# Setting Up a New Location

How to add a new location, for example the cabin, so its readings, prices and bill show up in the app. It is written
from the app as it is on 2026-11-20.

You need about 15 minutes in the app, which you can do at home. Then you need the cabin's HAN reader on site.

## Before you start

Have these ready:

| What                                           | Where to find it                                                                                                                           |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Name** for the location, for example "Hytta" | Your choice. Pick one that differs from your other locations: the app allows duplicate names, and the location picker only shows the name. |
| **Address**                                    | The cabin's address.                                                                                                                       |
| **Serial number**                              | The location's serial number. It must be unique across all locations. The API refuses one that is already used.                            |
| **Price zone** (NO1–NO5)                       | On the electricity invoice, or on the grid company's website.                                                                              |
| **Norgespris agreement**, yes or no            | Whether the cabin is enrolled in Norgespris.                                                                                               |
| **Device id** of the HAN reader                | The reader's id, which the forwarder sends with every reading, for example the MAC address `58:CF:79:9C:93:AE`.                            |
| **Grid company and its tariff**                | On the grid invoice: energy prices for day and for night/weekend, and the capacity steps.                                                  |
| **Supplier markup and monthly fee**            | On the supplier invoice, excluding VAT.                                                                                                    |
| **Holiday home**, yes or no                    | Whether the cabin is registered as a holiday home. A holiday home gets the lower Norgespris monthly limit, 1 000 kWh instead of 5 000.     |

**Fixed once saved.** The serial number, price zone and Norgespris agreement can't be changed by an owner afterwards,
only by an administrator. Check them before you save.

## Step 1: Add the location

1. Open the menu, choose **My locations**, then **Add location**.
   - You can own at most 4 locations through self-service. At the limit, an administrator has to add the location.
   - As an administrator, you can also do it under **Admin → Locations**.
2. Fill in the name, address, serial number and price zone. Tick **Has a Norgespris agreement** if it applies. Leave
   **Active** on.
3. Save.

## Step 2: Save the sensor key

Right after saving, the app shows the location's **sensor key**.

- **Copy it now.** It is shown only once and can't be shown again.
- **Store it safely,** for example in your password manager, under the cabin's name.
- **It lasts 2 years** from when the location is created, then the API stops accepting it.
- **If you lose it or it expires,** an administrator has to replace it. The API has an Admin endpoint for that,
  `POST /api/admin/locations/{id}/api-key/rotate`, but there is no button for it in the app yet. Rotating the key in
  the app is in the backlog. The new key then has to be entered in the forwarder.

## Step 3: Register the HAN reader (meter)

1. In **My locations**, choose **Add meter** on the new location.
2. Enter the reader's **device id** exactly as the forwarder sends it, for example `58:CF:79:9C:93:AE`. A comment is
   optional, for example "HAN reader in the fuse box".
3. Save.

The API only accepts readings from a device id that is registered on the location the key belongs to. If the device
id here differs from what the forwarder sends, every reading is rejected as "No registered reader found for this device
id at this location".

## Step 4: Set the pricing (administrator)

Without this, the cabin's prices leave out the grid part, so they come out too low, and the bill is marked
**Incomplete**.

1. **Grid tariff.** If the cabin has a different grid company from home, check **Admin → Grid tariffs** for its
   tariff. If it isn't there, create it, with:
   - the energy price for weekdays 06–22, and for nights and weekends
   - the capacity steps
2. **Location pricing.** Open **Admin → Location pricing**, choose the cabin, then set:
   - **Grid tariff**: the cabin's
   - **Supplier markup** (kr/kWh excluding VAT)
   - **Supplier monthly fee** (kr per month excluding VAT)
   - **Holiday home**, if the cabin is registered as one
   - **Exempt from electricity tax** and **Exempt from VAT**, only if they really apply

## Step 5: At the cabin, start the reader and the forwarder

1. Connect the HAN reader to the meter's HAN port. The HAN port may first need to be opened by the grid company.
2. In the **MQTTForwarder** app, enter:
   - the API address, the same as for home
   - the cabin's **sensor key** from step 2. It is sent as the `X-API-Key` header, and it decides which location the
     readings belong to.
   - the device id from step 3, if the forwarder doesn't send the reader's own id automatically
3. Start it.

Don't reuse home's key at the cabin: readings sent with it are counted as home's.

## Step 6: Check that it works

Within a few minutes of the forwarder starting:

- **Location picker:** the header has one, now that you have two active locations, and the last bottom tab becomes
  **All locations**.
- **Now page for the cabin:** it shows the current power and today's use.
- **Expected bill for the cabin:** it isn't marked **Incomplete**. If it is, the note says what is missing, usually
  the grid tariff or the monthly fee from step 4.
- **All locations:** a card for each location.

If nothing arrives:

- check that the forwarder uses the **cabin's** key, not home's
- check that the device id in step 3 matches what the forwarder sends
- check that the location is **Active** (My locations): an inactive location's key is refused

## Good to know

- **No history before the reader starts.** The app has no readings from before the forwarder starts, so the first
  month's bill covers only the days with readings.
- **Leave the cabin active**, also when you're not there. The sensor key only works while the location is active, so
  readings sent while it is inactive are **rejected and lost**, not stored for later. An inactive location also
  disappears from the location picker, the dashboard and All locations; only its owners still see it under My
  locations.
- **Water heater.** An OSO water heater is connected per location (**Admin → Locations**, the location, **Water
  heater**). The cabin gets a Heater tab only once a heater is connected there.
- **Sharing.** To let someone else see the cabin, an administrator can add them as a viewer under **Admin →
  Locations**, the location, the access list.
