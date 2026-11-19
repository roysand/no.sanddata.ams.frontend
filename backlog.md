# Backlog

Ideas and deferred work that is not yet specified.

## Sensor key rotation

Rotate or replace a lost sensor (API) key used by the MQTTForwarder app. Deferred from `specs/001-location-meter-onboarding` (see "out of scope" in its spec.md). Open points: who may rotate (admin only, or owner), how the new key is shown once, and how the old key is invalidated.

## OSO water heater

Connect Roy's OSO water heater through the OSO inCharge API (Swagger: https://api.osoenergy.no/water-heater-api-swagger/index.html): show its temperature and hot water left, heat in the
cheapest hours, and pause it to stay below the next capacity step. The API key must live in the backend, so the full
note is in the API repo: `no.sanddata.ams.api/specs/_backlog/oso-water-heater.md`.
