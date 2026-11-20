# Contract: What Each Place Shows

Dates are shown as `dd.mm.yyyy` (nb-NO), and day counts come from the API's `daysLeft`.

## The reminder banner (every page, administrators only)

- **Where:** between the header and the page. It is a region labelled "Keys that expire soon", with a warning icon.
- **Lines:** one per key, at most 3. Each line is a link to the location.
- **With more than 3:** a fourth line, "and N more", links to Admin → Locations.
- **With no keys due, an error, or a user who isn't an administrator:** nothing is shown at all.

| Case         | Line                                                                                                   |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| 12 days left | The sensor key for Hytta expires in 12 days                                                            |
| 1 day        | The water heater key for Hjemme expires tomorrow                                                       |
| 0 days       | The sensor key for Hytta expires today                                                                 |
| −1           | **The water heater key for Hjemme expired yesterday.** Heater data can't be read until it is replaced. |
| −3           | **The sensor key for Hytta expired 3 days ago.** Readings are refused until it is replaced.            |

Expired lines use the destructive colours; lines still to come use a muted warning.

**The link:** `/admin/locations?edit={locationId}&key=sensor` or `&key=heater`. It opens that location's dialog,
scrolled to the key.

## Admin → Locations, the location dialog

### Sensor key (section `id="sensor-key"`)

| Element | Text                                                                                                                                 |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Heading | Sensor key                                                                                                                           |
| Line    | `…a1b2 · Active · expires 02.12.2026`, then the badge                                                                                |
| Badge   | "expires in 12 days", "expires tomorrow" or "expires today" (warning); "expired" (destructive); none when more than 30 days are left |
| Button  | Replace sensor key                                                                                                                   |

**Replace, step 1 (confirm):**

- **Title:** "Replace the sensor key for Hytta?"
- **Text:** "The current key stops working at once. Readings are refused until the reader's forwarder has the new key."
- **Buttons:** "Replace key" and "Cancel".

**Replace, step 2 (the new key):**

- **Title:** "New sensor key for Hytta".
- **Body:** `SensorKeyNotice`, with the key, **Copy key** and "This key is shown only once…". Under it: "Valid until
  20.11.2028."
- **Button:** "Done".

### Water heater (section `id="water-heater"`, existing)

When a heater is connected, it adds a line under the existing "connected …": `Key valid until 19.11.2027`, then the
badge, then a **Change date** button.

**Change date dialog:**

- **Title:** "Water heater key for Hjemme".
- **Field:** "Key valid until" (a date), pre-filled with the current date.
- **Buttons:** "Save date" and "Cancel".
- **Field errors:** "The key must be valid after today", "At most five years ahead", or the API's message.

### Connect or replace water heater dialog (existing)

- **New field after the subscription key:** "Key valid until" (a date), pre-filled with today + 1 year.
- **Hint:** "OSO keys are valid for one year. Check the date in the OSO portal."
- **Errors:** the same as in the Change date dialog.
