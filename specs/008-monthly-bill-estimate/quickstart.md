# Quickstart: Validate the Bill for the Month

## Prerequisites

- Node 22+, `npm install` done.
- For the manual checks: the API from `no.sanddata.ams.api` with spec 010 (local, or the deployed one through the
  Vite `/api` proxy with an empty `VITE_API_BASE_URL`), and a user linked to a location with readings. For step 4, an
  Admin user.

## 1. Automated checks

```sh
npm test && npm run lint && npm run build
```

Expected: all pass. The new tests cover:

- `dashboard/bill.test.ts`: names, quantity, unit price (øre/kWh and kr/month), VAT, basis text for 7, 2 and 0 days,
  incomplete reasons, VAT-exempt detection.
- `dashboard/ExpectedBillCard.test.tsx`: the November estimate from the spec's independent test; "Not set" fee; the
  Norgespris explanation only for Norgespris; loading and error.
- `dashboard/BillCard.test.tsx`: the July 2026 reference bill (spec, "Reference data for the tests") shows every line,
  the subtotals 417,33 / 256,22 and the total 673,55 kr; month stepping; previous disabled on a month without
  readings; next disabled on the current month.
- `admin/pricingSchema.test.ts` and `admin/LocationPricingPage.test.tsx`: fee field rules, empty field omitted from
  the PUT, `Validation.InvalidMonthlyFee` under the field, "Not set" in the list.

## 2. Dashboard card (manual)

`npm run dev`, sign in, open the Now tab. The "Expected bill" card shows the month's total marked "Estimate", the
amount so far and the rest of the month, what the estimate is based on and the provisional capacity step. Open Strøm
and Nettleie; their subtotals add up to the total (to the øre).

## 3. History bill (manual)

Open History. The Bill section shows last month as final. Step back until the previous button is disabled (a month
without readings). Step forward to the current month: it shows the same figures as the dashboard card. For the
holiday home, July 2026 should match the invoice once the production check in the API's
`specs/_backlog/july-2026-bill-check.md` is done.

## 4. Admin monthly fee (manual)

As Admin, open Location pricing. Locations without a fee show "Not set" and "Incomplete". Edit one, enter `27,20`,
save: the list shows the fee, and the location is complete if it has a grid tariff. Its bill now has a monthly fee
line of 34,00 kr (27,20 kr if VAT-exempt). Enter `10001`: the dialog refuses before sending.
