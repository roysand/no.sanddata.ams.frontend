# UI Contract: The Norgespris Lines in the Warning Banner

The banner is spec 012's, above the key reminders on every page. Its region is labelled "Warnings". Every line is a
link to `/` that first selects the line's location.

## Order

1. The selected location's capacity line, then its usage line (spec 012, unchanged).
2. The limit lines: the selected location first, then the others in name order.
3. The expensive-hours lines, in the same location order.

## Limit lines (one per location at most)

| Kind        | Urgent | Text                                                                                                                               |
| ----------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| over        | yes    | **Cabin is over its Norgespris limit: 1 084 of 1 000 kWh.** The kWh above it are priced at spot price until 1 December.            |
| approaching | no     | Cabin: 912 of 1 000 kWh this month. At this pace the limit is reached in about 2 days.                                             |
| approaching | no     | … At this pace the limit is reached tomorrow. / … reached today.                                                                   |
| approaching | no     | Cabin: 912 of 1 000 kWh this month, expected to end at 980 kWh.                                                                    |
| approaching | no     | Cabin: 912 of 1 000 kWh this month. (no projection)                                                                                |
| projected   | no     | Cabin is expected to use 1 240 kWh this month, above the Norgespris limit of 1 000 kWh. The kWh above it are priced at spot price. |

- kWh are whole numbers with `nb-NO` grouping ("1 084 kWh").
- "until 1 December" is the Oslo date of `resetsAt`.
- The over line keeps spec 012's urgent style (`data-urgent`).

## Expensive-hours lines

| Ranges | Text                                                                                         |
| ------ | -------------------------------------------------------------------------------------------- |
| 1      | Cabin, tomorrow: spot price is high 17–20, up to 2,60 kr/kWh.                                |
| 2–3    | Cabin, tomorrow: spot price is high 07–09 and 17–20, up to 2,60 kr/kWh.                      |
| > 3    | Cabin, tomorrow: spot price is high 06–07, 08–09, 11–12 and 4 more hours, up to 2,60 kr/kWh. |

- Hours are two-digit Oslo clock hours; a range ending at midnight reads "22–24".
- The price uses the app's kr formatting with two decimals.
- Not urgent.

## Fit (SC-005)

Each line fits on at most two lines at 375 px with the longest location name in use (spec 012's rule).
