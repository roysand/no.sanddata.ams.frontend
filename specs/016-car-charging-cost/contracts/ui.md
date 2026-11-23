# UI Contract: The Car Note on the Bill

Small muted text below the total and the water heating note, on the Now page's expected bill and the History bill
(spec 013). `{period}` is "so far this month", "in July 2026" or "since 18.07.2026", as today.

| Case                     | Text                                                                                              |
| ------------------------ | ------------------------------------------------------------------------------------------------- |
| Norgespris price         | Car charging {period}: 212,7 kWh · 106,35 kr at the Norgespris price · not counted with the house |
| House's price            | Car charging {period}: 212,7 kWh · 98,20 kr at the house's price · counted with the house         |
| Estimated kWh            | Car charging {period}: 212,7 kWh · about 106,35 kr at the Norgespris price · …                    |
| Not priced (`cost` null) | Car charging {period}: 212,7 kWh · not priced · not counted with the house                        |
| Unknown rule             | Car charging {period}: 212,7 kWh · 106,35 kr · not counted with the house                         |
| API without spec 019     | Car charging {period}: 212,7 kWh · not counted with the house                                     |

- Amounts in `formatNok` ("106,35 kr", "0,42 kr", "−3,10 kr").
