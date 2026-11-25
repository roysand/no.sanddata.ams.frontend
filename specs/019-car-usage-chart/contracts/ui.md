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
- Details line: "**{slot}** · **{kWh}** · {previous inline} {kWh}" (no water heating or car split).
- Chart group name: "Car charging, {current title} compared with {previous title}. Use the arrow keys to move between
  points."
- No charging in the current period: "**No charging yet**" / "The car's charging shows here about 15 minutes after a
  charge ends."
- No charging in an earlier period: "**No charging in {title}**".
- Loading: as Now ("Loading car usage").
