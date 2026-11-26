# UI Contract: A High Demand Switch on the Heater Tab

## In the "Water heater" card, for Admins only

Below the status line ("Heating · … · set to …"):

- A switch labelled **"High Demand"**, on when the heater reports High Demand.
- Under it: "Heats the tank extra for 24 hours."
- While switching: the switch disabled, and "Switching…".
- Errors (in the destructive colour, under the switch):
  - Unavailable: "Couldn't reach the heater. It may or may not have switched; the state below is read again."
  - Not offered: "OSO no longer offers High Demand." (switch disabled)
  - Key: "The heater's OSO key must be reconnected under Admin → Locations."
  - Other: the API's message.

## For everyone

- The badge reads **"High Demand"** (was "Supercharge") while it is on.
- "**High Demand until** {today 19:40 / tomorrow 05:21 / 28.11. 05:21}".
