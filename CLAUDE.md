# GW Cleaning Cost Calculator

## What This Is
Internal cleaning fee calculator for Grand Welcome of Southern Coastal Maine (Knowles Holdings, LLC). Static web app hosted on GitHub Pages. Used by the property management team to calculate per-stay turnover costs and Community Fee amounts for Guesty.

## Tech Stack
- Vanilla HTML/CSS/JavaScript (no framework)
- ExcelJS loaded from CDN for Excel export (live formulas, multi-tab workbooks)
- Hosted on GitHub Pages (static, no server)
- No build step, no dependencies to install

## Project Structure
- `index.html` — The entire application (single-page app)
- `app.js` — All application logic: calculations, rendering, password protection, Excel export
- `styles.css` — All styling
- `CLAUDE.md` — This file. Project context for Claude Code.
- `agent.md` — Project summary and change log
- `README.md` — Public-facing repo description (deliberately vague)
- `.gitignore` — Standard web project ignores

## Business Context
Grand Welcome manages ~50 short-term rental properties across southern coastal Maine (York, Ogunquit, Wells, Kennebunk, Saco, Scarborough). The cleaning fee charged to guests is actually a bundled cost covering cleaning vendor payment, consumables, linens, inspection, travel, welcome basket, and ACH processing fees. This calculator computes those costs, applies markup factors, grosses up for OTA booking fees, and verifies that margin covers the 9% franchise royalty.

The app has three user-facing purposes:
1. Quick calculator for onboarding new properties — input bed/bath counts and vendor costs, get the Community Fee number for Guesty
2. Owner-facing Excel export — defensible, auditable cost breakdown with real Excel formulas, zero evidence of margin mechanics
3. Password-protected internal settings — actual cost assumptions, margin analysis, per-channel P&L, royalty coverage check

## Key Business Rules
- Community Fee = Turnover Cost Total / (1 - 0.19). This is division (gross-up), not multiplication.
- 19% booking fee rate is worst-case (Booking.com). Applied uniformly across all channels per Guesty limitation.
- 9% franchise royalty is calculated on the full Community Fee (the Guesty amount), not net revenue.
- Owner-facing line items include: sales tax (5.5%) and handling factor (7.5%) applied to consumables and linens.
- ACH fee (2.5%) applies to cleaning + inspection + travel disbursements only (contractor payments, not inventory procurement).
- Published inspection times are inflated vs actual pace. This is the primary margin lever.
- Inspector shown rate ($30/hr) vs actual rate ($25/hr) is the secondary margin lever.

## Sensitive Information
- The password-protected settings section exists to hide margin mechanics from non-management team members.
- The Excel export must NEVER contain: actual inspector rates, margin/variance analysis, royalty calculations, per-channel P&L, or internal cost assumptions.
- Source URLs for supplies are internal procurement details — excluded from export.
- The password protection is cosmetic (client-side hash check). The real security is that homeowners only ever see the exported Excel file, never the web tool.

## Key Implementation Details
- **Input events**: All property/cost inputs use `change` event (blur/tab/enter), not `input` (keystroke). This prevents premature recalculation and popup triggers.
- **Airbnb cap threshold**: $625. When Community Fee exceeds this, the label auto-switches to "COMMUNITY FEE" and a popup explains entering it in Guesty. Edge-triggered (fires only on transition, not every recalc). Excel export always says "CLEANING FEE" regardless.
- **Inspection time formula**: `(20 + bedrooms×15 + fullBaths×12 + halfBaths×8 + kitchens×25) / 60` hours. Web tool includes bedrooms; Excel export excludes bedrooms from the formula and breakdown.
- **Excel export**: Two tabs (Turnover Cost, Supply Rates). Uses ExcelJS with live formulas — not hardcoded values. Never includes margin mechanics, actual rates, or "Community Fee" label.
- **Supply Items table**: Visible to all users (not password-gated). Located between Export button and Settings button.

## Common Tasks
- **Updating supply prices**: Edit the `SUPPLY_ITEMS` array in `app.js`. Each item has costPerUnit, unitsPerStay, and roomType.
- **Adding a new supply item**: Add to `SUPPLY_ITEMS` with the correct roomType ("Kitchen", "Full Bath", or "Both"). Summary costs recalculate automatically.
- **Changing fee rates per channel**: Edit the `CHANNELS` array in `app.js`.
- **Changing the settings password**: Update the `SETTINGS_HASH` constant in `app.js`. See password manager for current password.

## Validation Baseline (sample property: 3 bed, 2 full bath, 1 half bath, 1 kitchen, $250 cleaning, 30 min drive, $20 basket, $50 linens)
- Turnover Cost Total: ~$474.96
- Community Fee: ~$586.37
- Total True Cost: ~$419.50
- Net Operating Margin: ~$2.68 (positive)
- Owner Clean Rate: ~$370.33
