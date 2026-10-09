# Quickstart: validating Location Editing and Sharing

## Prerequisites

- `npm install`; `.env` has `API_PROXY_TARGET=https://localhost:7130` and the API runs locally with the
  role contract in [contracts/backend-required.md](./contracts/backend-required.md) applied (or run only the
  automated part, which uses MSW).
- A local database you can throw test data away from (rows cannot be deleted from the app).
- Three accounts: an administrator, an owner, and a second normal user who will become a viewer.

## Automated

```bash
npm test
npm run build
npm run lint
```

Expected: all pass. Tests cover the schemas, the owner edit form (system fields absent, inactive
confirmation), role-based visibility, the admin Locations page and access dialog, and the dashboard
picker hiding inactive locations, using MSW for the endpoints in the contracts.

## Manual: administrator

1. Sign in as admin, open **Locations**: every location is listed with owner, viewer count and status.
2. Open one, change the price zone, save: it is accepted. Change the serial number to one already used:
   a specific message appears and the form keeps its values.
3. In the same dialog add the second user as **viewer**, then remove them again.
4. Open **Users**: each user shows their locations with a role; a user without locations is still listed.
5. Try to remove the only owner of a location: refused with a clear message.

## Manual: owner

1. Sign in as the owner, open **My locations**, choose **Edit** on a location.
2. Change name and address and save: they update in the list and the dashboard picker without a reload.
3. Serial number, zone and Norgespris are shown read-only; no sensor key anywhere.
4. Untick **Active** and save: a warning appears; cancel keeps it active; confirm saves it.
5. The inactive location is still on My locations (marked inactive) and can be activated again without a
   warning; it is absent from the dashboard picker while inactive.
6. Edit a meter's comment and save.

## Manual: viewer

1. Sign in as the viewer after the admin added them: the location is in the dashboard picker with data,
   usage and cost.
2. On My locations the location has no Edit, Add meter or Add location actions for it; opening the edit
   route directly shows a not-allowed message.
3. After the admin removes the viewer, the location is gone after a refresh.

See [data-model.md](./data-model.md) and [contracts/](./contracts/) for the shapes involved.
