# UI Contract: Hot Water Used, on the Heater Tab

## The card (region "Hot water used", title "Hot water used")

On the Heater tab, between the live heater card and "Energy" (the water heating energy card).

1. Switch "Period": Day · Week · Month · Year (starts at Day; a change starts at the current period).
2. Arrows "Previous {period}" / "Next {period}" around the title. Next is off at the current period; Previous is off
   at the period holding 24 Nov 2026.
3. Total: **"Total V40 used 125 L"**, with "so far" after it for the current period.
4. The bar chart, in the water heater's colour; partly recorded bars paler, with the legend "Paler: partly recorded,
   likely too low" only when one is shown.
5. Note: "Litres of water at 40 °C (V40), worked out from the tank's hot water. Small draws, such as a hand wash, are
   counted, so the total can be higher than the OSO app's."

## Titles

| Period | Now (offset 0) | Before                                             |
| ------ | -------------- | -------------------------------------------------- |
| day    | Today          | Yesterday · Wed 18 Nov · Wed 18 Nov 2025           |
| week   | This week      | Week 47 · 16–22 Nov · Week 1 · 29 Dec – 4 Jan 2026 |
| month  | November       | October · December 2025                            |
| year   | 2026           | 2025                                               |

## Tooltip

`{span}`, then `{n} L`, then, for a partly recorded part, `Recorded {p} % of the time`.
Spans: "07:00–08:00", "Mon 23 Nov", "November".

## Empty and failed

- Total null for the current day: "No hot water recorded yet today."
- Total null otherwise: "No hot water recorded for {title, inline}. The record starts on 24 Nov 2026."
- Error (not 401): "The hot water used can't be shown right now." in the card; the rest of the tab is shown.
- Loading: a skeleton under the header.

## Screen readers

The chart is a `figure` named "Hot water used, {title}: {total} L in total" (and ", most at {span}" when there is a
largest bar).
