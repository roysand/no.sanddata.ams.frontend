# Data Model: Location Editing and Sharing

Client-side types, mirroring the API. Field names are camelCase as the API returns them. New or
changed fields are marked.

## LocationRole

`'Owner' | 'Viewer'`. A location has one owner (target state; see research item 2 for legacy data) and
any number of viewers.

## LocationSummary (response of `GET /api/locations`) - extended

| Field | Type | Notes |
|---|---|---|
| id | string (uuid) | |
| name | string | editable by owner |
| address | string | editable by owner |
| zone | string | read-only for owners |
| serialNumber | string | **new**, read-only for owners |
| hasNorgesPriceAgreement | boolean | **new**, read-only for owners |
| isActive | boolean | **new**; owners also receive inactive locations |
| role | LocationRole | **new** |
| meters | MeterSummary[] | |

Client rule: `canEdit(location) = location.role === 'Owner'`. This is UX only; the API enforces it.

## OwnerLocationInput (form values, owner edit)

| Field | Type | Rules |
|---|---|---|
| name | string | required, max 100 (same as `CreateLocationValidator`) |
| address | string | required, max 100 |
| isActive | boolean | turning it off requires confirmation |

Sent as `PUT /api/locations/{id}`. System fields are not part of this input.

## MeterCommentInput

| Field | Type | Rules |
|---|---|---|
| comment | string | optional, max 200 |

## AdminLocation (response of `GET /api/admin/locations`) - extended

Existing: `id, name, address, serialNumber, zone, isActive, hasNorgesPriceAgreement, apiKey (hint,
status, expiry), meters`.

| Field | Type | Notes |
|---|---|---|
| users | LocationUser[] | **new** |

### LocationUser

| Field | Type |
|---|---|
| userId | string (uuid) |
| email | string |
| firstName | string |
| lastName | string |
| role | LocationRole |

Derived on the client: owner = the user with role `Owner`; viewer count = users with role `Viewer`.

## AdminUser (response of `GET /api/users`) - extended

Existing: `id, firstName, lastName, email, isActive, roles, locations (names), locationIds`.

| Field | Type | Notes |
|---|---|---|
| locationAccess | `{ locationId, name, role }[]` | **new**; `locations` and `locationIds` stay for compatibility and are removed from the UI once this ships |

## AdminLocationInput (form values, admin edit)

Same fields as the 001 `LocationInput` (name, address, serialNumber, zone, hasNorgesPriceAgreement,
isActive), sent as `PUT /api/admin/locations/{id}`.

## State transitions

```text
Link:    (none) --admin adds as owner--> Owner        (default of PUT /api/users/{id}/locations/{locationId})
         (none) --admin adds as viewer--> Viewer
         Viewer <--admin changes role--> Owner         (a location keeps at least one Owner; 409 otherwise)
         any    --admin removes--> (none)              (refused for the last Owner: 409 Location.LastOwner)

Active:  active --owner/admin turns off (after confirmation)--> inactive
         inactive --owner/admin turns on--> active
         inactive: stops accepting sensor readings; hidden from viewers and from the dashboard picker;
                   still visible to its owners on My locations
```
