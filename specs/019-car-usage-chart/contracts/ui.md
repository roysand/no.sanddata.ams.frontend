# UI Contract: A Usage Chart for the Car, on the Car Tab

## The Car tab, top to bottom

1. "Charger now" (spec 017)
2. "Charging": the setting, Today, This month, and the note: "A finished charge shows here and in the chart below
   about 15 minutes after it ends. The charger's state right now is at the top."
3. **"Car usage"** (new, in place of "Sessions, last 30 days")

## "Car usage"

As "Usage" on Now (switch "Period" Day/Week/Month/Year, arrows, "{title} so far" and the total, "▲/▼ n% vs …",
legend, "Touch the chart to see values."), except:

- Title **"Car usage"**; no "Unit" switch (kWh only).
- The current period in the car's colour (`--ev-charger`); the previous period as on Now.
- **Day has no comparison** (Roy, 2026-11-25: the car isn't charged every day): no yesterday line, no "% vs
  yesterday", no "Yesterday" in the legend or the details. Week, month and year compare with the period before.
- Details line: "**{slot}** · **{kWh}**", with " · {previous inline} {kWh}" for a week, month or year (no water
  heating or car split).
- Chart group name: "Car charging, {current title}. Use the arrow keys to move between points." for a day, and "Car
  charging, {current title} compared with {previous title}. …" otherwise.
- Stepping back stops only where the meter has no readings, not at days without charging.
- No charging in the current period: "**No charging yet**" / "The car's charging shows here about 15 minutes after a
  charge ends."
- No charging in an earlier period: "**No charging in {title}**".
- Loading: as Now ("Loading car usage").
