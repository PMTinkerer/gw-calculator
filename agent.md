# GW Cleaning Calculator — Project Summary & Change Log

## Overview
Internal turnover cost calculator for **Grand Welcome of Southern Coastal Maine** (Knowles Holdings, LLC). Calculates per-stay cleaning/turnover costs and the Community Fee (gross-up) for Guesty. Built as a static vanilla HTML/CSS/JS app hosted on GitHub Pages.

**Live URL:** https://pmtinkerer.github.io/gw-calculator/
**Repo:** https://github.com/PMTinkerer/gw-calculator

---

## Current Feature Set

### Public-Facing (no password)
- **Property Details** — inputs for property name, bedrooms, full baths, half baths, kitchens, cleaning vendor cost, driving time, welcome basket, linens cost
- **Cost Assumptions** — inspector rate, inspection time (auto-calculated with override), sales tax, handling factor, ACH rate, booking fee rate
- **Inspection Time Breakdown** — per-room-type time allocation (base 20 min + bedrooms × 15 + full baths × 12 + half baths × 8 + kitchens × 25)
- **Turnover Cost Breakdown** — itemized table: cleaning, supplies, linens, inspection, travel, welcome, ACH, total
- **Community Fee / Cleaning Fee** — gross-up calculation with Airbnb cap threshold detection ($625)
- **Excel Export** — owner-facing spreadsheet with live formulas, two tabs (Turnover Cost + Supply Rates), inspection breakdown, no internal margin data
- **Supply Items Table** — read-only reference table showing per-item costs, units/stay, cost/stay, and room type
- **Airbnb Cap Popup** — dismissible modal that appears when the Community Fee crosses above $625, explaining the need to enter it as "Community Fee" in Guesty

### Password-Protected (internal)
- True cost analysis with actual inspector rates
- Cost variance breakdown (published vs actual)
- Royalty & net operating margin check
- Per-channel P&L table (Airbnb, VRBO, Booking.com, etc.)
- Airbnb cap check with minimum nightly rate calculation
- Owner/Guest cleaning rate calculation

---

## Change Log

### Session 1 — Initial Build & Deployment (March 2026)

**Infrastructure:**
- Created project files: `index.html`, `app.js`, `styles.css`, `CLAUDE.md`, `.gitignore`, `README.md`
- Initialized git repo, created GitHub repo under PMTinkerer account
- Deployed to GitHub Pages

**Features Built:**
1. Full calculator engine with all business rules (gross-up formula, margin analysis, per-channel P&L)
2. Password-protected internal settings section (SHA-256 hash, session storage persistence)
3. Excel export with ExcelJS — two-tab workbook with live formulas, professional styling
4. Supply Items reference table

**Layout Changes:**
- Moved Supply Items section from password-protected area to the public section (below Export button, above Settings)
- Settings button moved below Supply Items

**Inspection Time Breakdown:**
- Added per-room-type time breakdown to both web tool and Excel export
- Web shows: base setup (20 min), bedrooms, full baths, half baths, kitchens with counts and times
- Excel shows same breakdown in Cost Assumptions area with formula-driven inspection time

**Airbnb Cap Threshold ($625):**
- Auto-switches bottom row label from "CLEANING FEE" to "COMMUNITY FEE" when fee exceeds $625
- Shows dismissible popup modal explaining why and how to enter in Guesty
- Edge-triggered: popup only fires on transition from under to over cap, not on every recalculation
- Excel export always says "CLEANING FEE" regardless of threshold (avoids owner confusion)

**Input Behavior:**
- Changed all input fields from `input` event to `change` event
- Fields now only update calculations on blur, tab, or enter — not on every keystroke
- Prevents popup from firing mid-typing

**Excel Export Refinements:**
- Removed Bedrooms row from property details (no bedroom-specific supply costs)
- Replaced hardcoded inspection time with formula: `(20+B{fullBaths}*12+B{halfBaths}*8+B{kitchens}*25)/60`
- Removed bedrooms from Excel inspection time breakdown
- Updated total minutes calculation to exclude bedrooms

### Session 2 — Documentation & Pages Fix (March 2026)

**Documentation:**
- Created `agent.md` (this file) with full project summary and change log
- Updated `CLAUDE.md` with current tech stack (ExcelJS), complete file listing, key implementation details section, and accurate common tasks
- Set up Claude Code memory system with user profile, feedback rules, and project references

**GitHub Pages Fix:**
- Pages was returning 404 because it was configured with `build_type: "workflow"` (requires GitHub Actions) but no workflow existed
- Fixed by deleting the Pages config and recreating it with `build_type: "legacy"` (deploys directly from main branch)
- Pushed documentation commit to trigger fresh build

**Status at end of session:**
- All features working and deployed
- 3 commits on main: initial build, README URL update, documentation update
- `.claude/` directory exists locally but is not committed (gitignored)

---

## Architecture Notes

- **No build step** — edit files directly, push to deploy
- **ExcelJS** loaded from CDN for Excel generation (replaced earlier SheetJS/xlsx approach)
- **Password:** SHA-256 hash stored in `app.js`
- **Margin levers:** inflated inspection times (published vs actual) and documented internally
- **Event model:** `change` events on all inputs, `input` events only on channel table (internal)
