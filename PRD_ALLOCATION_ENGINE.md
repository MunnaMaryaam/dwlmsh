# Dynamic Inventory Redistribution Engine — PRD Implementation

## Scope
Universal jewelry inventory only. The item key is runtime-resolved from uploaded data and is not restricted to a carat, solitaire, nosepin, earring, ring, locket, or any other fixed product.

## Runtime Inputs per item and branch
- `SoldQty` / `C`: 3-month historical sold quantity.
- `CurrentStock` / `D`: current physical branch stock.
- `SalesAvg`: `C / 3` monthly run-rate.
- `SalesContribution`: branch 3M sales divided by total 3M retail sales for the same item.
- `TotalCompanyLiveStock` / `ER5`: all branch + warehouse stock for the item.

## Calculation passes
1. **Have vs Deserve:** `ContributionDeserve = ER5 × SalesContribution`.
2. **Safety:** when `C >= 10`, target safety baseline is `1.5 × C`, optionally extended by the selected growth multiplier.
3. **Localized cap:** when `C <= 8` and `D >= 23`, retain exactly `10 pcs`; the excess enters the pooling queue.
4. **Fair compression:** when aggregate target exceeds live enterprise stock, apply one proportional compression factor. A minimum 1–2 piece branch floor is preserved where total stock permits.
5. **Status:** `D > Deserve => ⚠️ Overstock`; `D < Deserve => 📉 Less Stock`; equal => `✓ Balanced`; central/warehouse => `🏢 Warehouse`.
6. **Transfer priority:** branch surplus is paired with branch deficit before distributable warehouse stock is used. Protected enterprise reserve is not forced into branches.

## Data binding
No branch code or product name is used as an allocation key. Branches and items are collected dynamically from parsed records at runtime.
