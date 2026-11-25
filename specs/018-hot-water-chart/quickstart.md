# Quickstart: Hot Water Used, on the Heater Tab

## Automated

```bash
npm test && npm run lint && npm run build
```

Covers [contracts/ui.md](contracts/ui.md): the titles and dates per period, the rows (gaps, 0 L, partly recorded,
23/25-hour days), the switch and the arrows, the empty and failed states.

## By hand (Hjemme, against production)

1. **Today** (US1, SC-001): open the Heater tab. The card shows today's hours up to now, the shower hours as tall bars,
   and "Total V40 used … L so far". Compare the shower hours with the OSO app's bars.
2. **Tap a bar** (FR-006): the hour, the litres and, if partly recorded, the share.
3. **Week, Month, Year** (US2): each switch shows the current period with its total; the back arrow steps one period
   and stops at the period holding 24 Nov 2026; the forward arrow is off at now (SC-002: last week's total in 3 taps).
4. **Before the record** (US2-6): from Year, step back to 2025: the "No hot water recorded" text, not an empty chart.
5. **Phone and dark mode** (SC-004): at 375 px in both modes, the card fits and a month's bars can each be tapped.
