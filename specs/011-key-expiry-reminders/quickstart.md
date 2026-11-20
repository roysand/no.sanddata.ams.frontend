# Quickstart: Check the Key Expiry Reminders

## Prerequisites

- Node 22+ and `npm install`.
- For the manual checks: the API with spec 015 deployed, reached through the Vite `/api` proxy. You need an
  administrator account and a user account that isn't an administrator.

## 1. Automated checks

```sh
npm run build && npm run lint && npm test
```

Expected: everything passes. The new tests cover:

- **`keyReminders.test.ts`:**
  - the line texts for 12, 1, 0, −1 and −3 days, for both kinds
  - the badge rule at 31, 30, 0 and −1 days
  - `daysUntil` for a sensor key that expires at Oslo midnight
- **`schema.test.ts`:** `keyExpiresOn` today (refused), tomorrow (accepted), exactly 5 years (accepted), 5 years + 1 day
  (refused), and `2027-02-30` (refused).
- **`KeyReminderBanner.test.tsx`:**
  - lines and links for an administrator
  - nothing, and no request, for another user
  - nothing on a 404
  - "and N more" with 4 keys
  - expired lines are urgent
- **`WaterHeaterSection.test.tsx`:**
  - the connect dialog sends `keyExpiresOn`, with the default one year ahead
  - the date line and badge
  - Change date sends only the date
  - the API's out-of-range error is shown at the field
- **`SensorKeySection.test.tsx`:**
  - the expiry line and badge
  - Replace confirms first
  - the new key is shown once with Copy key
  - after Done, the key is gone from the page and the list is refetched
  - an error keeps the dialog on step 1
- **`AdminLocationsPage.test.tsx`:** `?edit=…&key=sensor` opens the dialog, and closing it clears the URL.

## 2. In the browser (manual)

1. **Banner:** sign in as an administrator. With nothing due within 30 days, there is no banner. That's expected:
   Hjemme's heater key is valid until 19.11.2027.
2. **Change date:**
   1. In Admin → Locations, open Hjemme, then Water heater, then **Change date**.
   2. Set it to 10 days from today and save.
   3. The section shows the date with "expires in 10 days". The banner appears: "The water heater key for Hjemme
      expires in 10 days".
3. **Follow the link:** choose the banner line. Admin → Locations opens Hjemme's dialog at the water heater section.
   Close it: the URL is plain `/admin/locations` again.
4. **Set the date back:** change it back to **19.11.2027**. The banner disappears.
5. **Other users:** sign in as a user who isn't an administrator. There is no banner, and the Network tab shows no
   `key-reminders` request.
6. **Replace a sensor key, on a test location only (not Hjemme or the cabin):**
   1. Choose Replace sensor key and confirm.
   2. The new key is shown once. Copy it.
   3. Choose Done, then reopen the dialog: the hint is new, the expiry is two years ahead, and the key isn't shown.
   4. In DevTools → Application, `localStorage` has no key.
7. **Phone and dark mode:** at 375 px, in light and dark mode, the banner, the date field and the key section read well.
