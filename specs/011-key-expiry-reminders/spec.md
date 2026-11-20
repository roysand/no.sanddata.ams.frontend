# Feature Specification: Remind Administrators Before Keys Expire

**Feature Branch**: `011-key-expiry-reminders`

**Created**: 2026-11-20

**Status**: Built 2026-11-20 (manual check T028 against the deployed API still open)

**Input**: Backend feature `no.sanddata.ams.api` → `specs/015-key-expiry-reminders/` (PR #43, merged 2026-11-20). Its
contract is in `contracts/endpoints.md`:

- the heater settings and the connect request gain `keyExpiresOn`
- `PUT /api/admin/locations/{id}/water-heater/key-expiry` changes only that date
- `GET /api/admin/key-reminders` lists the keys due within 30 days
- the existing `POST /api/admin/locations/{id}/api-key/rotate` replaces a sensor key.

User description: "The api key to the heater api is valid for one year. It would be nice to get reminded about the key
will soon expire. The same with the location and sensor key rotation."

Choices made with Roy on 2026-11-20:

- An administrator enters the OSO key's expiry date. The form offers one year from today.
- Reminders start 30 days before a key expires.
- They are shown as a banner for administrators, plus the expiry details in Admin → Locations.
- A "Replace sensor key" button is included.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - An administrator is reminded when a key expires soon (Priority: P1)

An administrator opens the app. When a sensor key or a water heater key expires within 30 days, or has already expired,
a banner at the top of the page says so: for example "The sensor key for Hytta expires in 12 days" or "The water heater
key for Hjemme expired 3 days ago". Each line leads to that location in Admin → Locations, where the key can be
replaced. The banner stays until the key is replaced or its date is moved; there is nothing to dismiss.

**Why this priority**: This is the reminder Roy asked for. Without it, an expired key is only noticed when readings or
heater data stop.

**Independent Test**: Against an API where Hytta's sensor key expires in 12 days:

- As an administrator, open the app: the banner names Hytta, the sensor key and "12 days".
- Follow the link: Admin → Locations opens with Hytta.
- As a user who isn't an administrator, open the app: no banner, and no request for the list.

**Acceptance Scenarios**:

1. **Given** an administrator and one key due within 30 days, **When** any page is shown, **Then** a banner at the top
   names the location, the kind of key and how long is left: "expires in 12 days", "expires tomorrow" or "expires
   today".
2. **Given** a key that has already expired, **When** the banner is shown, **Then** it says "expired 3 days ago" (or
   "expired yesterday"), is marked as more urgent than one that hasn't expired yet, and says what stops: readings for a
   sensor key, heater data for a water heater key.
3. **Given** several keys are due, **When** the banner is shown, **Then** each is listed, soonest first, as the list from
   the API orders them.
4. **Given** a line in the banner, **When** it is chosen, **Then** Admin → Locations opens with that location's dialog,
   at the key it is about.
5. **Given** no key is due, **When** any page is shown, **Then** there is no banner.
6. **Given** a user who isn't an administrator, **When** any page is shown, **Then** there is no banner, and the list
   isn't asked for.
7. **Given** the list can't be loaded, **When** the page is shown, **Then** there is no banner and no error; the rest of
   the page works as before.

---

### User Story 2 - The water heater key's expiry date is entered and can be changed (Priority: P1)

When an administrator connects or replaces a water heater, the dialog asks until when the OSO key is valid, with one
year from today already filled in. Afterwards the heater section of the location shows that date. It can be changed
without entering the key again.

**Why this priority**: The API only knows the heater key's date if someone enters it. Without the field, every new key
silently gets "one year from today", which is wrong if the key was already some months old.

**Independent Test**:

- Connect Hjemme's heater with the date 19 November 2027: the heater section says "Key valid until 19.11.2027".
- Change the date to 1 December 2027 without the key: the section shows the new date, and the heater still reads.

**Acceptance Scenarios**:

1. **Given** the connect or replace dialog, **When** it opens, **Then** it has a "Key valid until" date, filled in with
   one year from today, which can be changed.
2. **Given** a date that isn't after today, or is more than five years ahead, **When** the dialog is saved, **Then** the
   problem is shown at the date field and nothing is sent. If the API still refuses it, its message is shown at the date
   field.
3. **Given** a connected heater, **When** its section is shown, **Then** it gives the date the key is valid until, and
   marks it when the key expires within 30 days or has expired.
4. **Given** a connected heater, **When** an administrator chooses to change the date, **Then** a small dialog asks only
   for the new date. Saving it changes the date and nothing else.

---

### User Story 3 - The sensor key's expiry is shown and the key can be replaced (Priority: P1)

In a location's dialog in Admin → Locations, the sensor key shows when it expires, marked when that is within 30 days
or has passed. A "Replace sensor key" button issues a new key, valid for two more years, and shows it once with the
same copy button and warning as when a location is created.

**Why this priority**: A reminder is only useful when it can be acted on. The API can already replace a key, but the
app has no button, so today it takes an API call.

**Independent Test**: For a test location:

- Open its dialog: the sensor key line shows its expiry date.
- Choose Replace sensor key and confirm: the new key is shown once with Copy key, and the expiry moves two years ahead.
- Close the dialog and reopen it: the key isn't shown again, and the hint is the new one.

**Acceptance Scenarios**:

1. **Given** a location's dialog, **When** it is shown, **Then** the sensor key line gives its status and its expiry
   date. It is marked "expires in N days" within 30 days and "expired" after.
2. **Given** the Replace sensor key button, **When** it is chosen, **Then** the administrator must confirm first. The
   confirmation warns that the old key stops working at once, and that the reader's forwarder needs the new key before
   readings arrive again.
3. **Given** the replacement succeeds, **When** the new key is shown, **Then**:
   - it appears once, with a copy button and the warning that it can't be shown again
   - it is not kept anywhere in the app after the dialog closes
   - the location's facts (hint, expiry) and the reminder banner are refreshed.
4. **Given** the replacement fails, **When** the error comes back, **Then** it is shown in the dialog, and the old key
   still works.

---

### Edge Cases

- **Inactive location:** its keys are not in the reminder list (the API leaves them out), so no banner. The dialog still
  shows its key's expiry.
- **Deactivated sensor key:** it is left out of the list. The dialog shows it as deactivated, not as expiring.
- **"Today" and "tomorrow":** the days follow the API's Oslo days. The app doesn't count them itself, so the banner and
  the API agree.
- **Phone width:** the banner must not push the page content far down. With more than three keys due, it shows three
  and "and N more", linking to Admin → Locations.
- **Older API without these fields:** the heater date field is still sent and ignored, and no expiry is shown. The
  banner's request fails quietly (User Story 1, scenario 7).
- **Two administrators:** each sees the banner. Replacing a key in one browser removes it for the other on its next
  refresh.
- **The new key in the replace confirmation:** it is never logged, stored or put in a URL, the same as at creation.

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: For an administrator, the app MUST read the list of keys due within 30 days. It MUST show a banner at the
  top of every page while the list has entries, and no banner otherwise.
- **FR-002**: Each banner entry MUST name the location and the kind of key, and say how long is left, or how long ago
  it expired, in words. An expired entry MUST be shown as more urgent and say what has stopped.
- **FR-003**: Each banner entry MUST lead to that location's dialog in Admin → Locations.
- **FR-004**: Users who aren't administrators MUST NOT see the banner, and MUST NOT ask for the list.
- **FR-005**: If the list can't be loaded, the app MUST show no banner and no error, and the page MUST work as before.
- **FR-006**: The water heater connect and replace dialog MUST have a "Key valid until" date, filled in with one year
  from today. It MUST refuse a date that isn't after today, or is more than five years ahead, before sending, with the
  same rule as the API.
- **FR-007**: The heater section MUST show the date the OSO key is valid until, marked when it is due within 30 days or
  past. It MUST offer to change only the date.
- **FR-008**: The location dialog MUST show the sensor key's expiry date next to its status, marked when it is due
  within 30 days or past.
- **FR-009**: The location dialog MUST offer "Replace sensor key". It MUST confirm first, warning that the old key stops
  at once. It MUST show the new key once with a copy button and the same warning as at creation, and MUST NOT keep it
  after the dialog closes.
- **FR-010**: After the date is changed, a heater is connected or replaced, or a sensor key is replaced, the location's
  facts and the reminder list MUST be refreshed, so the banner follows at once.
- **FR-011**: Keys MUST never be logged, stored or put in a URL; only the one-time display of a new sensor key may
  show it.

### Key Entities

- **Key reminder**: from the API. It has the location (id and name), the kind (sensor key or water heater key), the last
  valid day, the days left and whether it has expired.
- **Water heater key expiry**: the last day the OSO key is valid, part of the heater's settings.
- **Sensor key facts**: the hint, the status and the expiry instant, already part of the Admin location list.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: An administrator sees a key that expires within 30 days on the first page they open, without going to
  the Admin pages.
- **SC-002**: From the banner, an administrator reaches the place to replace the key in one tap, and replaces a sensor
  key in under a minute, with its new key copied.
- **SC-003**: Users who aren't administrators make no extra request and see nothing new.
- **SC-004**: The banner, the heater date and the key line read well at 375 px width, in light and dark mode.
- **SC-005**: No key appears in the browser's storage, a URL or a log after it has been shown.

## Assumptions

- **API dependency:** API spec 015 is deployed before this, and the rotate endpoint exists as documented. Without them,
  the app degrades as described in the edge cases.
- **Fixed rules:** the 30-day window and the five-year limit are fixed, as in the API.
- **How often the list is read:** once when the app opens, and again after the changes in FR-010, and at a slow
  interval (for example every hour) while the app stays open. Keys don't change often.
- **Out of scope:** owners are not reminded, and nothing is sent by e-mail or push (the "Warnings" backlog idea). A
  reminder can't be dismissed.
- **The dialog's place:** Admin → Locations is the only place keys are managed, so the banner links there, opening the
  location's existing dialog.
