# Feature Specification: Now and Today Dashboard

**Feature Branch**: `003-now-and-today-dashboard`

**Created**: 2026-11-13

**Status**: Draft

**Input**: User description: "Redesign the dashboard as a mobile-first "Now and today" experience with light and dark theme. (1) A "right now" header: large current power (kW) and cost so far this hour, a colour-coded price pill (cheap/normal/expensive relative to today's hours) and a trend against the same hour yesterday. (2) A 24-hour spot price timeline bar chart with the current hour highlighted and the cheapest 3-4 hours marked as best hours. (3) A single chart area with Day/Week/Month/Year tabs, a kWh/NOK toggle and previous-period comparison as a ghost line, replacing the separate stacked power/hourly/daily charts. Mobile is the primary target (bottom tab bar, large touch targets), with light and dark theme support and loading/empty states for missing price data. Uses existing API data plus one small read-only prices-per-day addition."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what electricity is costing me right now (Priority: P1)

A household member opens the app on their phone and immediately sees how much power the home is using this moment, how much the current hour has cost so far, and whether electricity is cheap, normal or expensive right now compared with the rest of today. A short trend note tells them if this hour is higher or lower than the same hour yesterday.

**Why this priority**: This is the question people open an energy app to answer. It delivers value on its own and replaces the current hour card as the first thing on the dashboard.

**Independent Test**: Open the dashboard for a location that has current-hour data. The header shows current power, cost so far this hour, a price pill and the trend, and none of the other new sections are needed to verify this.

**Acceptance Scenarios**:

1. **Given** a location with a current reading and price data, **When** the user opens the dashboard, **Then** the header shows current power in kW, cost so far this hour in NOK, and a price pill labelled cheap, normal or expensive.
2. **Given** today's hourly prices are known, **When** the current hour is among the lowest-priced third of today's hours, **Then** the pill reads "cheap"; **When** it is in the highest-priced third, **Then** it reads "expensive"; otherwise "normal".
3. **Given** the same hour yesterday has data, **When** the header renders, **Then** it shows the difference in cost versus that hour as an up or down trend with its value.
4. **Given** price or exchange-rate data is not yet available for this hour, **When** the header renders, **Then** power is still shown, cost and the pill show a clear "price not available yet" state, and the trend is hidden.

---

### User Story 2 - Find the cheapest hours today (Priority: P2)

The user wants to decide when to run the washing machine, charge the car or heat water. They look at a 24-hour bar chart of today's electricity price per hour. The current hour is highlighted and the three to four cheapest hours are marked as best hours.

**Why this priority**: It turns the dashboard from a report into something people act on. It depends on no other section.

**Independent Test**: Open the dashboard with a full day of prices. The chart shows 24 bars, the current hour is visibly distinct, and exactly the 3 to 4 lowest-priced hours carry a best-hour mark.

**Acceptance Scenarios**:

1. **Given** price data for today, **When** the timeline renders, **Then** each hour of the Oslo calendar day has a bar whose height reflects its price per kWh.
2. **Given** the current hour, **When** the timeline renders, **Then** that bar is visually highlighted and its price is readable without tapping.
3. **Given** the day's prices, **When** the timeline renders, **Then** the cheapest hours are marked as best hours, with hours that have already passed marked in a muted way.
4. **Given** the user taps a bar, **When** the tap registers, **Then** the hour, its price per kWh and its best-hour status are shown.
5. **Given** prices exist only for some hours, **When** the timeline renders, **Then** hours without a price show an empty placeholder and are not counted when choosing best hours.

---

### User Story 3 - Explore usage and cost over time in one chart (Priority: P2)

The user wants to see how consumption and cost develop over the day, week, month or year. One chart area has Day, Week, Month and Year tabs and a switch between energy used (kWh) and cost (NOK). The previous period is drawn as a faint ghost line behind the current one for comparison.

**Why this priority**: It replaces the three stacked charts (power, hourly cost, daily cost) with one place, reducing scrolling and clutter. It is valuable, but the user can still get today's key facts from stories 1 and 2.

**Independent Test**: Open the chart, switch each tab and the kWh/NOK toggle. Each combination shows the right series for the period, with the previous period as a ghost line when data exists.

**Acceptance Scenarios**:

1. **Given** the chart is open, **When** the user selects Day, Week, Month or Year, **Then** the chart shows that period at a suitable resolution (hours for a day, days for a week and month, months for a year).
2. **Given** a period is shown, **When** the user switches between kWh and NOK, **Then** the same period is shown in the chosen unit without a full page reload.
3. **Given** data exists for the previous period, **When** the chart renders, **Then** the previous period is drawn as a faint line aligned with the current one.
4. **Given** the user taps or drags across the chart, **When** a point is selected, **Then** the value for the current period and the previous period at that point are shown.
5. **Given** the location is enrolled on one pricing model, **When** the chart shows NOK, **Then** the cost for the enrolled model is shown and the cost under the other model is available as a comparison value.

---

### User Story 4 - Comfortable on a phone, in light or dark (Priority: P1)

The user mostly checks the app on a phone, often in the evening. The dashboard works one-handed with a bottom tab bar and large touch targets, and follows the device's light or dark setting, with a manual override.

**Why this priority**: Mobile is the primary target, and theme support is an explicit requirement for stories 1 to 3.

**Independent Test**: View the dashboard at phone width in light and dark. Everything is readable and operable, nothing scrolls sideways, and the theme can be switched manually.

**Acceptance Scenarios**:

1. **Given** a phone-width screen, **When** the dashboard opens, **Then** primary navigation is a bottom tab bar and all tappable controls are comfortably large.
2. **Given** the device is set to dark mode, **When** the dashboard opens, **Then** it renders in dark mode, and charts, pills and text stay legible.
3. **Given** the user chooses light or dark manually, **When** they return later, **Then** their choice is remembered on that device.
4. **Given** a wide screen, **When** the dashboard opens, **Then** the same content is shown in a layout that uses the extra width without becoming sparse.

---

### User Story 5 - See all my locations at a glance (Priority: P2)

A user with more than one location (for example a home and a cabin) wants one screen that compares them. The "All locations" page shows combined power right now, combined energy and cost for Today, Week or Month with the change against the previous period, and one card per location with power now, energy, cost, a small usage trend and its share of total use. Tapping a card opens that location's dashboard. A user with a single location sees no overview, only their location.

**Why this priority**: It saves users from switching between locations one by one. It only matters to users with several locations, so it follows the single-location experience.

**Independent Test**: Sign in with an account that has at least two active locations, open "All locations", and check that the totals equal the sum of the cards. Sign in with a one-location account and check that no overview or switcher is offered.

**Acceptance Scenarios**:

1. **Given** the user has two or more active locations, **When** they open "All locations", **Then** they see combined power now, combined energy and cost for the chosen period, and the change against the previous period.
2. **Given** the overview is shown, **When** it renders, **Then** each location appears as a card with its name, pricing model, power now, energy, cost, a small usage trend and its share of total use, ordered by cost with the highest first.
3. **Given** the user taps a location card, **When** the tap registers, **Then** that location's "Now" dashboard opens and is remembered as the selected location.
4. **Given** the user has more than one location, **When** they tap the location name at the top of any screen, **Then** they reach the overview and can switch location.
5. **Given** the user has only one active location, **When** the dashboard opens, **Then** the switcher indicator and the overview are not shown.
6. **Given** price data is missing for some or all locations, **When** the overview renders, **Then** energy still shows, cost shows a "price not available yet" state for the affected locations, and the combined cost is marked as incomplete.

---

### User Story 6 - Know who is signed in and reach admin pages (Priority: P2)

The header always shows who is signed in (initials, email and role). Tapping it opens an account panel with Sign out. Users who have additional pages, such as administrators, also get a menu button that opens a panel with Dashboard, My locations and their administration pages. Users with no additional pages do not see a menu button.

**Why this priority**: It replaces the desktop-style header on phones and keeps admin access reachable. It does not change what users can do.

**Independent Test**: Sign in as a regular user and as an administrator. Both see the signed-in user at the top. Only the administrator sees the menu button, with the administration entries inside.

**Acceptance Scenarios**:

1. **Given** a signed-in user, **When** any screen is shown, **Then** the header shows the user's initials, email and role.
2. **Given** the user taps the user chip, **When** the account panel opens, **Then** it shows the email and a Sign out action, and signing out ends the session.
3. **Given** the user has administration access, **When** any screen is shown, **Then** a menu button is visible, and opening it lists Dashboard, My locations and the administration pages.
4. **Given** the user has no administration access, **When** any screen is shown, **Then** no menu button is shown and no administration entries are reachable from the interface.
5. **Given** a panel is open, **When** the user presses Escape, taps outside it or taps Close, **Then** the panel closes and focus returns to the control that opened it.

---

### Edge Cases

- Some of several locations have no readings or no prices: the overview still shows the others and marks the affected cards and any combined total as incomplete.
- The user's role changes while the app is open: the menu button and administration entries appear or disappear on the next refresh, and the server stays the authority for access.
- A location has no meter readings yet: show a friendly empty state pointing to what is missing, not blank charts.
- Price data arrives late or is missing for part of the day: affected sections show a "price not available yet" state while consumption (kWh) remains usable.
- All of today's hours cost the same: the pill reads "normal" and no misleading best-hour marks are shown.
- The user has several locations: switching location refreshes every section and keeps the chosen tab, unit and theme. A user with exactly one location sees no switcher and no overview.
- Daylight-saving days have 23 or 25 hours: the day timeline and day chart still show every real hour without gaps or duplicates.
- The year view for a new location has fewer than 12 months of data: only the available months are drawn, and there is no ghost line for missing previous-year data.
- Previous-period data does not exist: the ghost line is omitted and the chart does not show an error.
- The device is offline or the data request fails: the last shown values stay visible with a clear indication that they may be outdated, plus a way to retry.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The dashboard MUST open with a "right now" header showing current power (kW), cost so far this hour (NOK) and the pricing model it is based on.
- **FR-002**: The header MUST show a price pill labelled cheap, normal or expensive, determined by where the current hour's price falls among today's hourly prices (lowest third, middle third, highest third).
- **FR-003**: The header MUST show a trend of the current hour's cost compared with the same hour yesterday, hidden when yesterday has no data.
- **FR-004**: The dashboard MUST show a 24-hour price timeline for the current Oslo calendar day with one bar per hour, the current hour highlighted and the 3 to 4 cheapest hours marked as best hours.
- **FR-005**: Selecting a bar in the timeline MUST reveal that hour's price per kWh.
- **FR-006**: The dashboard MUST provide a single chart area with Day, Week, Month and Year tabs that replaces the separate power, hourly cost and daily cost charts.
- **FR-007**: The chart area MUST offer a switch between energy (kWh) and cost (NOK) that keeps the selected period.
- **FR-008**: The chart MUST draw the previous equivalent period as a ghost line when data exists, and let the user read current and previous values at a selected point.
- **FR-009**: Cost values MUST show the enrolled pricing model and make the comparison with the other model (Spot versus NorgesPris) available.
- **FR-010**: Primary navigation MUST be a bottom tab bar on phone-width screens, with touch targets large enough to use one-handed.
- **FR-011**: The dashboard MUST support light and dark themes, follow the device setting by default, allow a manual choice and remember it on the device.
- **FR-012**: Every section MUST have a loading state, an empty state and a "price not available yet" state where price data can be missing, and MUST keep consumption visible when only price data is missing.
- **FR-013**: All time-based grouping and labelling MUST use the Europe/Oslo calendar day, including daylight-saving transitions.
- **FR-014**: The selected location, chart tab, unit and theme MUST persist across sessions on the same device.
- **FR-015**: The feature MUST use only data the existing API already provides (current hour cost, hourly cost, daily cost, consumption and the Spot versus NorgesPris actual and comparison values), plus one small read-only addition: the hourly prices of a full day for a location, including hours without readings and hours still to come. The "All locations" page gathers its figures by reading each location in turn.
- **FR-016**: The dashboard MUST keep refreshing live values on a regular interval, and MUST not require a manual reload to stay current.
- **FR-017**: The interface MUST be usable with keyboard and screen readers, with text and chart colours meeting accessible contrast in both themes, and with colour never the only way to tell cheap, normal and expensive apart.
- **FR-018**: Users with two or more active locations MUST have an "All locations" page showing combined power now, combined energy and cost for Today, Week or Month, and the change against the previous period.
- **FR-019**: The "All locations" page MUST show one card per active location with name, pricing model, power now, energy, cost, a small usage trend and share of total use, ordered by cost with the highest first, and opening a card MUST open that location's dashboard.
- **FR-020**: Users with only one active location MUST NOT be shown the location switcher or the overview.
- **FR-021**: The header MUST show the signed-in user (initials, email, role) on every screen, with an account panel offering Sign out.
- **FR-022**: Users who have administration access MUST see a menu button listing Dashboard, My locations and the administration pages; users without it MUST NOT see the button or the entries. The server remains the authority for access.
- **FR-023**: Side panels MUST close with Escape, an outside tap or a Close control, keep keyboard focus inside while open and return focus to the opener when closed.

### Key Entities

- **Current hour**: The running hour for a location: power now, consumption so far, cost so far, pricing model and comparison cost.
- **Hourly price point**: One hour of the Oslo day with its price per kWh, consumption and cost under the enrolled model and the comparison model.
- **Best hour**: One of the 3 to 4 lowest-priced hours of the current day, derived from the hourly price points.
- **Price level**: Cheap, normal or expensive, derived from where an hour's price falls in the day's price range.
- **Usage period**: A Day, Week, Month or Year window with a resolution, a unit (kWh or NOK) and an aligned previous period.
- **Theme preference**: The user's light, dark or follow-device choice, stored per device.
- **Location summary**: One location's power now, energy and cost for a period, its usage trend and its share of the combined total.
- **Signed-in user**: The email, initials and role shown in the header, deciding whether the menu button is offered.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: On a phone, a user can read their current power, cost so far this hour and whether electricity is cheap, expensive or normal without scrolling or tapping.
- **SC-002**: A user can identify the cheapest hours of today in under 5 seconds from opening the dashboard.
- **SC-003**: A user can switch between day, week, month and year views and between kWh and NOK in no more than 2 taps each.
- **SC-004**: The three separate charts are replaced by one chart area, reducing the number of chart sections on the dashboard from three to one.
- **SC-005**: Every section shows a meaningful loading, empty or missing-price state in under 1 second after a data request fails or returns nothing, with no blank or broken areas.
- **SC-006**: No content is clipped or requires sideways scrolling at screen widths from 360 px upward, in both light and dark themes.
- **SC-007**: Text and key chart elements meet WCAG AA contrast in both themes.
- **SC-008**: In a usability check with at least 5 household users, at least 4 can say whether now is a good time to run a heavy appliance after one look at the dashboard.
- **SC-009**: A user with several locations can compare today's cost across all of them on one screen, without opening any single location.
- **SC-010**: In a check with one regular and one administrator account, no regular user sees a menu button, and every administrator can reach every administration page from the menu in two taps.

## Assumptions

- Users are authenticated household members who already have at least one active location linked to their account, as today.
- The primary device is a phone; tablets and desktops receive an adapted layout of the same content.
- Price level thresholds use thirds of today's hourly prices, and the number of best hours is the 3 to 4 cheapest, with ties at the boundary included up to 4.
- Hours whose price has not been published yet (typically later in the day) are shown as empty placeholders and excluded from the best-hour ranking. Confirmed during planning: the existing API returns prices only for hours with readings, so a small read-only prices-per-day addition to the API is part of this feature.
- The Week, Month and Year periods are computed from the existing daily and hourly cost and consumption data. If the Year view needs monthly totals the API does not provide directly, they are aggregated on the client from daily data, and the planning phase will confirm whether the available date range covers a full year.
- The bottom tab bar contains Now (this dashboard), History and Locations (shown as "All locations" when the user has several), and existing admin pages are reached through the menu panel.
- The "All locations" page covers only locations the user can already see today. A new combined backend report is out of scope, and the page may take a little longer to load for users with many locations.
- Administration pages themselves are unchanged and only their entry point moves to the menu panel.
- The light and dark themes extend the look the app already has, so the new screens feel like part of the same product.
- Notifications, budgets and alerts are out of scope for this feature.
