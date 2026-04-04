# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is
Internal cleaning fee calculator for Grand Welcome of Southern Coastal Maine (Knowles Holdings, LLC). Static web app hosted on GitHub Pages. Used by the property management team to calculate per-stay turnover costs and Community Fee amounts for Guesty.

## Tech Stack
- Vanilla HTML/CSS/JavaScript (no framework, no build step)
- ExcelJS loaded from CDN (`index.html:366`) for Excel export (live formulas, multi-tab workbooks)
- Hosted on GitHub Pages (static, no server) — legacy build type, deploys from main branch
- No dependencies to install

## Development
- Open `index.html` in a browser to run locally — no server needed
- Edit files directly, push to main to deploy
- ExcelJS CDN is pinned to 4.4.0

## Project Structure
- `index.html` — Single-page app with all HTML structure
- `app.js` — All application logic (~950 lines, organized in sections below)
- `styles.css` — All styling
- `agent.md` — Project summary and change log

## app.js Architecture
The file has five distinct sections, in order:
1. **Data constants** (lines 1-40) — `SUPPLY_ITEMS` array, `CHANNELS` array, `SETTINGS_HASH`, `STATE` object
2. **Calculation engine** (lines ~75-180) — `computeSupplyCosts()`, `recalculate()`. All business logic lives here.
3. **DOM rendering** (lines ~185-370) — `renderResults()`, `renderChannelTable()`, `renderSupplyTable()`. Reads from `STATE.results` and updates the page.
4. **Password protection** (lines ~370-430) — SHA-256 hash check, session storage persistence
5. **Excel export** (lines ~430-870) — `exportExcel()`. Builds two-tab ExcelJS workbook with formulas. This is the largest section.
6. **Event binding** (lines ~870-end) — `init()` maps input IDs to STATE keys, binds buttons

## Business Context
The cleaning fee charged to guests bundles: cleaning vendor payment, consumables, linens, inspection, travel, welcome basket, and ACH fees. The calculator computes those costs, applies markup factors, grosses up for OTA booking fees, and verifies margin covers the 9% franchise royalty.

Three user-facing purposes:
1. Quick calculator for onboarding — input property details, get the Community Fee for Guesty
2. Owner-facing Excel export — auditable cost breakdown with live formulas, no margin data
3. Password-protected internal settings — true costs, margin analysis, per-channel P&L

## Key Business Rules
- Community Fee = Turnover Cost Total / (1 - 0.19). Division (gross-up), not multiplication.
- 19% booking fee rate is worst-case (Booking.com). Applied uniformly per Guesty limitation.
- 9% franchise royalty is on the full Community Fee, not net revenue.
- Sales tax (5.5%) and handling factor (7.5%) apply to consumables and linens.
- ACH fee (2.5%) applies to cleaning + inspection + travel only (contractor disbursements).
- Published inspection times are inflated vs actual pace — primary margin lever.
- Inspector shown rate ($30/hr) vs actual rate ($25/hr) — secondary margin lever.

## Sensitive Information
- The Excel export must NEVER contain: actual inspector rates, margin/variance analysis, royalty calculations, per-channel P&L, or internal cost assumptions.
- Source URLs for supplies are internal — excluded from export.
- Password protection is cosmetic (client-side). Real security is that homeowners only see the Excel file.

## Key Implementation Details
- **Input events**: All property/cost inputs use `change` event (blur/tab/enter), not `input` (keystroke). Prevents premature recalculation and popup triggers.
- **Airbnb cap threshold**: $625. When Community Fee exceeds this, the label auto-switches to "COMMUNITY FEE" and a popup explains entering it in Guesty. Edge-triggered (fires only on transition, not every recalc). Excel export always says "CLEANING FEE" regardless.
- **Inspection time formula**: `(20 + bedrooms×15 + fullBaths×12 + halfBaths×8 + kitchens×25) / 60` hours. Web tool and Excel export use the same multipliers. Excel export is fully formula-driven (individual room minutes → SUM total → total/60 hrs → downstream costs).
- **Excel export**: Two tabs (Turnover Cost, Supply Rates). Uses ExcelJS with live formulas — not hardcoded values. Never includes margin mechanics or actual rates.
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
