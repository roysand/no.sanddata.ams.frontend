# Data Model: Location and Meter Onboarding

Client-side types, mirroring the API. Field names are camelCase as the API returns them.

## LocationInput (form values)

| Field | Type | Rules |
|---|---|---|
| name | string | required, max 100 |
| address | string | required, max 100 |
| serialNumber | string | required, max 100; unique on the server (409 if used) |
| zone | `'NO1'..'NO5'` | required, one of five values |
| hasNorgesPriceAgreement | boolean | default false |
| isActive | boolean | default true |

## CreatedLocation (response, shown once)

| Field | Type | Notes |
|---|---|---|
| location | `AdminLocation` | id, name, address, serialNumber, zone, isActive, hasNorgesPriceAgreement, meters |
| apiKey | string | the sensor key; MUST NOT be stored or logged (FR-006) |

## MeterInput (form values)

| Field | Type | Rules |
|---|---|---|
| locationId | string (uuid) | must be one of the user's locations |
| deviceId | string | required, max 100; unique per location (409 if registered) |
| comment | string \| undefined | optional, max 200 |

## Meter (response)

`id, locationId, deviceId, meterId?, meterType?, comment?, isActive`

## Existing types reused

- `LocationSummary` (`id, name, address, zone, meters[]`): moved from `dashboard/types.ts` into the
  `locations` slice and re-exported.
- `AdminUser` (`locations: string[]`, `locationIds: string[]`) in `admin/types.ts`.

## State transitions

```text
Wizard:  [no location] --create location--> [location, no meter] --register meter--> [done]
         [location, no meter] is also the resume state when the user returns to /setup

Admin:   create location (admin endpoint) --> link to user --> (success)
                                   \--> link fails --> "created, not linked" with Retry link
```
