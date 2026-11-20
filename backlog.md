# Backlog

Ideas and deferred work that is not yet specified.

## Sensor key rotation

Rotate or replace a lost sensor (API) key used by the MQTTForwarder app. Deferred from `specs/001-location-meter-onboarding` (see "out of scope" in its spec.md). Open points: who may rotate (admin only, or owner), how the new key is shown once, and how the old key is invalidated.

## OSO water heater

Reading the heater is built in the API (`no.sanddata.ams.api` spec 011, deployed 2026-11-19) and in the frontend
(`specs/009-oso-water-heater/`, built 2026-11-19: an Admin section to connect, replace and remove it, and a dashboard
card with its live state). Still open for later: heating in the cheapest hours and pausing it to stay below the next
capacity step (control from the API, a later API spec). The heater's kWh and cost per hour, day and month are built:
API spec 012 (PR #39) and frontend `specs/010-water-heater-split/` (built 2026-11-20), shown in the usage chart, the
bills, the Heater tab and the CSV export.

## Warnings

Warn the household when it matters: close to the next capacity step during the month, very expensive hours tomorrow
once the prices are published, and unusually high usage compared with the same time on other days. To reach the
phone when the app is closed this needs web push, so the app must first become installable (a PWA: manifest and
service worker, which it does not have today) and the backend must send the notifications. A first version could show
the warnings inside the app only.

## Usage against outdoor temperature

Show how usage follows the outdoor temperature (most of a Norwegian home's use is heating): kWh per day against the
day's average temperature, and how much more a cold day costs. Needs weather data per location, for example from the
Norwegian Meteorological Institute's free API (Frost for observations, Locationforecast for forecasts), fetched and
stored by the backend. The location needs coordinates, which it does not have today (only an address).

## Own production (nice to have)

Solar panels or other own production: what is produced, used at home and sold to the grid, and what that is worth.
Needs a meter that reports export (AMS meters measure both directions; the app reads only import today).

## Monthly budget (nice to have)

A budget or target for the month in kr or kWh, with progress against it. The expected bill for the month (spec 008)
already gives the projection to compare with.

## Comparison with similar homes (poor fit)

How the home's usage compares with similar homes. Needs usage data from many households, which this app does not
have; kept here only so the idea is not lost.
