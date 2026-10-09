# Quickstart: validating Location and Meter Onboarding

## Prerequisites

- `npm install`; `.env.development` has an empty `VITE_API_BASE_URL` and the Vite `/api` proxy points at
  the API (or a local API).
- An admin account and a normal user without locations (for example `roy@sanddata.no`).

## Automated

```bash
npm test
npm run build
npm run lint
```

Expected: all pass. Tests cover the schemas, the forms, the wizard (including resume) and the admin
dialogs, using MSW for `/api/admin/locations`, `/api/users/{id}/locations/{id}`, `/api/meters`.

## Manual: admin on behalf of a user (works with today's API)

1. Sign in as admin, open `/admin/users`.
2. On the row for the user without locations choose **Add location**; submit valid values.
3. Expect: the sensor key is shown once with a copy button and warning; closing the dialog hides it for good; the
   user's locations column now lists the location.
4. Choose **Add meter** for that user, pick the location, enter a device id.
5. Expect: confirmation; repeating the same device id shows the "already registered" message.
6. Repeat step 2 with a serial number already used: expect a specific message and the form keeps its values.
7. Sign in as the user: the dashboard location picker offers the new location.

## Manual: user sets up their own location (needs backend endpoint)

1. Sign in as a user with no locations: expect redirect to `/setup`.
2. Complete location, then meter. Expect the same key behaviour as above.
3. Leave after step 1, return to `/setup`: expect to resume at the meter step.
4. Visit `/admin/users` as this user: expect to be sent back to the dashboard.

See [data-model.md](./data-model.md) and [contracts/](./contracts/) for the shapes involved.
