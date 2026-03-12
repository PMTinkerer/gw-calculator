// ============================================================
// GW Cleaning Cost Calculator — app.js
// ============================================================

// --- Supply Items Data ---
const SUPPLY_ITEMS = [
    { name: 'Dish Soap',       costPerUnit: 3.99, unitsPerStay: 0.25, roomType: 'Kitchen' },
    { name: 'Garbage Bags',    costPerUnit: 0.23, unitsPerStay: 15,   roomType: 'Kitchen' },
    { name: 'Sponge',          costPerUnit: 1.04, unitsPerStay: 1,    roomType: 'Kitchen' },
    { name: 'Kitchen Wipes',   costPerUnit: 0.04, unitsPerStay: 15,   roomType: 'Kitchen' },
    { name: 'Dishwasher Pods', costPerUnit: 0.37, unitsPerStay: 8,    roomType: 'Kitchen' },
    { name: 'Laundry Pods',    costPerUnit: 0.26, unitsPerStay: 6,    roomType: 'Kitchen' },
    { name: 'Paper Towels',    costPerUnit: 2.00, unitsPerStay: 3,    roomType: 'Kitchen' },
    { name: 'Coffee Filters',  costPerUnit: 0.04, unitsPerStay: 12,   roomType: 'Kitchen' },
    { name: 'Coffee',          costPerUnit: 0.65, unitsPerStay: 10,   roomType: 'Kitchen' },
    { name: 'Olive Oil',       costPerUnit: 6.42, unitsPerStay: 0.25, roomType: 'Kitchen' },
    { name: 'Batteries',       costPerUnit: 2.00, unitsPerStay: 0.25, roomType: 'Kitchen' },
    { name: 'Shampoo',         costPerUnit: 3.00, unitsPerStay: 0.50, roomType: 'Full Bath' },
    { name: 'Conditioner',     costPerUnit: 3.04, unitsPerStay: 0.50, roomType: 'Full Bath' },
    { name: 'Lotion',          costPerUnit: 3.04, unitsPerStay: 0.50, roomType: 'Full Bath' },
    { name: 'Body Soap',       costPerUnit: 3.00, unitsPerStay: 0.50, roomType: 'Full Bath' },
    { name: 'Hand Soap',       costPerUnit: 4.50, unitsPerStay: 0.50, roomType: 'Both' },
    { name: 'Toilet Paper',    costPerUnit: 1.00, unitsPerStay: 4,    roomType: 'Both' },
];

// --- Channel Data ---
const CHANNELS = [
    { name: 'Airbnb',         ota: 15.5, merchant: 0,   advertising: 1.5 },
    { name: 'VRBO',           ota: 5,    merchant: 2.5, advertising: 1.5 },
    { name: 'Booking.com',    ota: 15,   merchant: 2.5, advertising: 1.5 },
    { name: 'Vacayhome',      ota: 10,   merchant: 2.5, advertising: 1.5 },
    { name: 'Google VR',      ota: 0,    merchant: 2.5, advertising: 1.5 },
    { name: 'Direct/Website', ota: 0,    merchant: 2.5, advertising: 1.5 },
    { name: 'Verbal',         ota: 0,    merchant: 0,   advertising: 1.5 },
];

// --- Password Hash (SHA-256 of 'gw2026') ---
const SETTINGS_HASH = 'd231022be418a8bbf6d1623be0e8779e77e2856365e1b4fd8c6be699155b88e3';

// --- State ---
const STATE = {
    // Property details
    propertyName: 'Sample Property',
    bedrooms: 3,
    fullBaths: 2,
    halfBaths: 1,
    kitchens: 1,
    cleaningCost: 250,
    drivingMinutes: 30,
    welcomeBasket: 20,
    linensCost: 50,

    // Cost assumptions (owner-facing)
    inspectorRate: 30,
    inspectionTime: 0, // will be set to suggested on init
    inspectionTimeOverridden: false,
    salesTax: 5.5,
    handlingFactor: 7.5,
    achRate: 2.5,

    // Internal settings
    actualInspectorRate: 25,
    royaltyRate: 9,
    bookingFeeRate: 19,
    nightlyRate: 300,

    // Calculated results
    results: {},

    // UI state
    wasOverCap: false,
};

// ============================================================
// Calculation Engine
// ============================================================

function computeSupplyCosts() {
    let kitchenCost = 0, fullBathCost = 0, halfBathCost = 0;
    for (const item of SUPPLY_ITEMS) {
        const cost = item.costPerUnit * item.unitsPerStay;
        if (item.roomType === 'Kitchen') kitchenCost += cost;
        else if (item.roomType === 'Full Bath') fullBathCost += cost;
        else if (item.roomType === 'Both') {
            fullBathCost += cost;
            halfBathCost += cost;
        }
    }
    return { kitchenCost, fullBathCost, halfBathCost };
}

function recalculate() {
    const s = STATE;
    const r = {};

    // Supply costs per room type
    const sc = computeSupplyCosts();
    r.kitchenCostPerStay = sc.kitchenCost;
    r.fullBathCostPerStay = sc.fullBathCost;
    r.halfBathCostPerStay = sc.halfBathCost;

    // Inspection times
    r.suggestedTime = (20 + s.bedrooms * 15 + s.fullBaths * 12 + s.halfBaths * 8 + s.kitchens * 25) / 60;
    r.actualTime = (s.bedrooms * 7 + s.fullBaths * 5 + s.halfBaths * 5 + s.kitchens * 20) / 60;

    // If not overridden, sync inspection time to suggested
    if (!s.inspectionTimeOverridden) {
        s.inspectionTime = r.suggestedTime;
        const el = document.getElementById('inspectionTime');
        if (el) el.value = r.suggestedTime.toFixed(2);
    }

    // Raw consumables
    r.rawConsumables = (sc.kitchenCost * s.kitchens) + (sc.fullBathCost * s.fullBaths) + (sc.halfBathCost * s.halfBaths);

    // Owner-facing line items
    const taxMult = 1 + s.salesTax / 100;
    const handlingMult = 1 + s.handlingFactor / 100;

    r.ownerCleaning = s.cleaningCost;
    r.ownerSupplies = r.rawConsumables * taxMult * handlingMult;
    r.ownerLinens = s.linensCost * taxMult * handlingMult;
    r.ownerInspection = s.inspectorRate * s.inspectionTime;
    r.ownerTravel = s.inspectorRate * (s.drivingMinutes / 60);
    r.ownerWelcome = s.welcomeBasket;
    r.ownerAch = (s.achRate / 100) * (r.ownerCleaning + r.ownerInspection + r.ownerTravel);
    r.turnoverTotal = r.ownerCleaning + r.ownerSupplies + r.ownerLinens + r.ownerInspection + r.ownerTravel + r.ownerWelcome + r.ownerAch;

    // Community Fee (gross-up)
    r.communityFee = r.turnoverTotal / (1 - s.bookingFeeRate / 100);
    r.bookingFees = r.communityFee - r.turnoverTotal;

    // True cost (internal)
    r.trueCleaning = s.cleaningCost;
    r.trueConsumables = r.rawConsumables;
    r.trueLinens = s.linensCost;
    r.trueInspection = s.actualInspectorRate * r.actualTime;
    r.trueDriving = s.actualInspectorRate * (s.drivingMinutes / 60);
    r.trueWelcome = s.welcomeBasket;
    r.trueAch = (s.achRate / 100) * (r.trueCleaning + r.trueInspection + r.trueDriving);
    r.trueCostTotal = r.trueCleaning + r.trueConsumables + r.trueLinens + r.trueInspection + r.trueDriving + r.trueWelcome + r.trueAch;

    // Cost variance
    r.varConsumables = r.ownerSupplies - r.rawConsumables;
    r.varLinens = r.ownerLinens - s.linensCost;
    r.varInspectorRate = (s.inspectorRate - s.actualInspectorRate) * r.actualTime;
    r.varInspectionEfficiency = s.inspectorRate * (s.inspectionTime - r.actualTime);
    r.varTravelRate = (s.inspectorRate - s.actualInspectorRate) * (s.drivingMinutes / 60);
    r.varAch = r.ownerAch - r.trueAch;
    r.varianceTotal = r.turnoverTotal - r.trueCostTotal;

    // Royalty & margin
    r.royalty = r.communityFee * (s.royaltyRate / 100);
    r.netMargin = r.varianceTotal - r.royalty;

    // Per-channel P&L
    r.channels = CHANNELS.map(ch => {
        const totalFee = ch.ota + ch.merchant + ch.advertising;
        const netRevenue = r.communityFee * (1 - totalFee / 100);
        const royalty = r.communityFee * (s.royaltyRate / 100);
        const variance = netRevenue - royalty - r.trueCostTotal;
        const variancePct = r.trueCostTotal !== 0 ? (variance / r.trueCostTotal) * 100 : 0;
        return { ...ch, totalFee, netRevenue, royalty, variance, variancePct };
    });

    // Airbnb cap check
    r.airbnbCap = 600 + 0.25 * s.nightlyRate;
    r.exceedsCap = r.communityFee > r.airbnbCap;
    r.minNightlyRate = r.communityFee > 600 ? (r.communityFee - 600) / 0.25 : 0;

    // Owner / Owner Guest Rate
    r.ownerGuestCleaning = s.cleaningCost;
    r.ownerGuestInspection = s.inspectorRate * r.actualTime;
    r.ownerGuestTravel = s.inspectorRate * (s.drivingMinutes / 60);
    r.ownerGuestWelcome = s.welcomeBasket;
    r.ownerGuestLinens = s.linensCost;
    r.ownerGuestAch = (s.achRate / 100) * (r.ownerGuestCleaning + r.ownerGuestInspection + r.ownerGuestTravel);
    r.ownerGuestTotal = r.ownerGuestCleaning + r.ownerGuestInspection + r.ownerGuestTravel + r.ownerGuestWelcome + r.ownerGuestLinens + r.ownerGuestAch;

    STATE.results = r;
}

// ============================================================
// DOM Rendering
// ============================================================

function fmt$(n) { return '$' + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function fmtPct(n) { return n.toFixed(1) + '%'; }

function setOutput(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

function renderResults() {
    const r = STATE.results;

    // Suggested time hint
    setOutput('suggestedTime', 'Suggested: ' + r.suggestedTime.toFixed(2) + ' hrs');

    // Inspection time breakdown
    const s = STATE;
    setOutput('breakBedCount', s.bedrooms);
    setOutput('breakFullBathCount', s.fullBaths);
    setOutput('breakHalfBathCount', s.halfBaths);
    setOutput('breakKitchenCount', s.kitchens);
    setOutput('breakBedTime', (s.bedrooms * 15) + ' min');
    setOutput('breakFullBathTime', (s.fullBaths * 12) + ' min');
    setOutput('breakHalfBathTime', (s.halfBaths * 8) + ' min');
    setOutput('breakKitchenTime', (s.kitchens * 25) + ' min');
    setOutput('breakTotalTime', (20 + s.bedrooms * 15 + s.fullBaths * 12 + s.halfBaths * 8 + s.kitchens * 25) + ' min');

    // Owner-facing breakdown
    setOutput('out-cleaning', fmt$(r.ownerCleaning));
    setOutput('out-supplies', fmt$(r.ownerSupplies));
    setOutput('out-linens', fmt$(r.ownerLinens));
    setOutput('out-inspection', fmt$(r.ownerInspection));
    setOutput('out-travel', fmt$(r.ownerTravel));
    setOutput('out-welcome', fmt$(r.ownerWelcome));
    setOutput('out-ach', fmt$(r.ownerAch));
    setOutput('out-total', fmt$(r.turnoverTotal));
    setOutput('out-bookingFees', fmt$(r.bookingFees));
    setOutput('out-communityFee', fmt$(r.communityFee));

    // Airbnb cap threshold — switch label and show popup
    const AIRBNB_CAP = 625;
    const isOverCap = r.communityFee > AIRBNB_CAP;
    const feeLabel = document.getElementById('feeLabel');
    const feeNote = document.getElementById('feeNote');
    if (feeLabel) {
        feeLabel.textContent = isOverCap ? 'COMMUNITY FEE' : 'CLEANING FEE';
    }
    if (feeNote) {
        feeNote.textContent = isOverCap
            ? 'Exceeds Airbnb cap. Enter in Guesty as Community Fee.'
            : 'Amount entered in Guesty as Cleaning Fee.';
    }
    if (isOverCap && !STATE.wasOverCap) {
        const modal = document.getElementById('capModal');
        const modalAmount = document.getElementById('modalFeeAmount');
        if (modal && modalAmount) {
            modalAmount.textContent = fmt$(r.communityFee);
            modal.classList.remove('hidden');
        }
    }
    STATE.wasOverCap = isOverCap;

    // Internal
    setOutput('out-actualInspectionTime', r.actualTime.toFixed(2));

    // True cost
    setOutput('out-trueCleaning', fmt$(r.trueCleaning));
    setOutput('out-trueConsumables', fmt$(r.trueConsumables));
    setOutput('out-trueLinens', fmt$(r.trueLinens));
    setOutput('out-trueInspection', fmt$(r.trueInspection));
    setOutput('out-trueDriving', fmt$(r.trueDriving));
    setOutput('out-trueWelcome', fmt$(r.trueWelcome));
    setOutput('out-trueAch', fmt$(r.trueAch));
    setOutput('out-trueCostTotal', fmt$(r.trueCostTotal));

    // Variance
    setOutput('out-varConsumables', fmt$(r.varConsumables));
    setOutput('out-varLinens', fmt$(r.varLinens));
    setOutput('out-varInspectorRate', fmt$(r.varInspectorRate));
    setOutput('out-varInspectionEfficiency', fmt$(r.varInspectionEfficiency));
    setOutput('out-varTravelRate', fmt$(r.varTravelRate));
    setOutput('out-varAch', fmt$(r.varAch));
    setOutput('out-varianceTotal', fmt$(r.varianceTotal));

    // Royalty & margin
    setOutput('out-royalty', fmt$(r.royalty));
    setOutput('out-netMargin', fmt$(r.netMargin));

    const statusEl = document.getElementById('marginStatus');
    if (statusEl) {
        if (r.netMargin >= 0) {
            statusEl.className = 'margin-status covered';
            statusEl.textContent = 'COVERED \u2014 operating margin exceeds royalty by ' + fmt$(r.netMargin);
        } else {
            const shortfall = Math.abs(r.netMargin);
            const minExtra = Math.ceil(shortfall / STATE.inspectorRate * 60);
            statusEl.className = 'margin-status short';
            statusEl.textContent = 'SHORT \u2014 increase inspection time by ' + minExtra + ' min';
        }
    }

    // Per-channel P&L
    renderChannelTable();

    // Airbnb cap check
    setOutput('out-airbnbCap', fmt$(r.airbnbCap));
    setOutput('out-capCommunityFee', fmt$(r.communityFee));
    setOutput('out-exceedsCap', r.exceedsCap ? 'YES' : 'NO');
    setOutput('out-minNightlyRate', fmt$(r.minNightlyRate));

    // Owner rate
    setOutput('out-ownerCleaning', fmt$(r.ownerGuestCleaning));
    setOutput('out-ownerInspection', fmt$(r.ownerGuestInspection));
    setOutput('out-ownerTravel', fmt$(r.ownerGuestTravel));
    setOutput('out-ownerWelcome', fmt$(r.ownerGuestWelcome));
    setOutput('out-ownerLinens', fmt$(r.ownerGuestLinens));
    setOutput('out-ownerAch', fmt$(r.ownerGuestAch));
    setOutput('out-ownerTotal', fmt$(r.ownerGuestTotal));
}

function renderChannelTable() {
    const tbody = document.getElementById('channelBody');
    if (!tbody) return;

    const r = STATE.results;
    tbody.innerHTML = '';

    r.channels.forEach((ch, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${ch.name}</td>
            <td><input type="number" step="0.1" value="${ch.ota}" data-channel="${i}" data-field="ota"></td>
            <td><input type="number" step="0.1" value="${ch.merchant}" data-channel="${i}" data-field="merchant"></td>
            <td><input type="number" step="0.1" value="${ch.advertising}" data-channel="${i}" data-field="advertising"></td>
            <td>${fmtPct(ch.totalFee)}</td>
            <td>${fmt$(ch.netRevenue)}</td>
            <td>${fmt$(ch.royalty)}</td>
            <td>${fmt$(ch.variance)}</td>
            <td>${fmtPct(ch.variancePct)}</td>
        `;
        tbody.appendChild(tr);
    });

    // Rebind channel input events
    tbody.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
            const idx = parseInt(e.target.dataset.channel);
            const field = e.target.dataset.field;
            CHANNELS[idx][field] = parseFloat(e.target.value) || 0;
            recalculate();
            renderResults();
        });
    });
}

function renderSupplyTable() {
    const tbody = document.getElementById('supplyBody');
    const tfoot = document.getElementById('supplyFoot');
    if (!tbody || !tfoot) return;

    tbody.innerHTML = '';
    SUPPLY_ITEMS.forEach(item => {
        const costPerStay = item.costPerUnit * item.unitsPerStay;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.name}</td>
            <td>${fmt$(item.costPerUnit)}</td>
            <td>${item.unitsPerStay}</td>
            <td>${fmt$(costPerStay)}</td>
            <td>${item.roomType}</td>
        `;
        tbody.appendChild(tr);
    });

    const sc = computeSupplyCosts();
    tfoot.innerHTML = `
        <tr><td>Kitchen Cost/Stay</td><td></td><td></td><td>${fmt$(sc.kitchenCost)}</td><td></td></tr>
        <tr><td>Full Bath Cost/Stay</td><td></td><td></td><td>${fmt$(sc.fullBathCost)}</td><td></td></tr>
        <tr><td>Half Bath Cost/Stay</td><td></td><td></td><td>${fmt$(sc.halfBathCost)}</td><td></td></tr>
    `;
}

// ============================================================
// Password Protection
// ============================================================

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function unlockSettings() {
    const input = document.getElementById('passwordInput');
    const hash = await hashPassword(input.value);

    if (hash === SETTINGS_HASH) {
        document.getElementById('passwordGate').classList.add('hidden');
        document.getElementById('settingsSection').classList.remove('hidden');
        document.getElementById('passwordError').classList.add('hidden');
        sessionStorage.setItem('gw_unlocked', '1');
        input.value = '';
        recalculate();
        renderResults();
        renderSupplyTable();
    } else {
        document.getElementById('passwordError').classList.remove('hidden');
    }
}

function lockSettings() {
    document.getElementById('settingsSection').classList.add('hidden');
    document.getElementById('passwordGate').classList.add('hidden');
    sessionStorage.removeItem('gw_unlocked');
}

function showPasswordGate() {
    const gate = document.getElementById('passwordGate');
    const settings = document.getElementById('settingsSection');

    if (!settings.classList.contains('hidden')) {
        // Already unlocked, toggle lock
        lockSettings();
        return;
    }

    if (sessionStorage.getItem('gw_unlocked') === '1') {
        // Already authenticated this session
        settings.classList.remove('hidden');
        gate.classList.add('hidden');
        renderSupplyTable();
        return;
    }

    gate.classList.toggle('hidden');
    if (!gate.classList.contains('hidden')) {
        document.getElementById('passwordInput').focus();
    }
}

// ============================================================
// Excel Export (ExcelJS)
// ============================================================

async function exportExcel() {
    const s = STATE;
    const r = s.results;
    const wb = new ExcelJS.Workbook();
    wb.creator = 'Grand Welcome';
    wb.created = new Date();

    // --- Styles ---
    const navyFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F3864' } };
    const lightGrayFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F7FA' } };
    const headerFont = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFFFFFFF' } };
    const sectionFont = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1F3864' } };
    const dataFont = { name: 'Arial', size: 11 };
    const inputFont = { name: 'Arial', size: 11, color: { argb: 'FF1A5276' } };
    const formulaFont = { name: 'Arial', size: 11, color: { argb: 'FF000000' } };
    const totalFont = { name: 'Arial', size: 11, bold: true };
    const currencyFmt = '$#,##0.00';
    const pctFmt = '0.0%';
    const thinBorder = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } },
    };
    const thickBottomBorder = {
        ...thinBorder,
        bottom: { style: 'medium', color: { argb: 'FF1F3864' } },
    };

    // Pre-compute Supply Rates row numbers without creating a sheet yet
    const kitchenItems = SUPPLY_ITEMS.filter(it => it.roomType === 'Kitchen');
    const fullBathItems = SUPPLY_ITEMS.filter(it => it.roomType === 'Full Bath');
    const bothItems = SUPPLY_ITEMS.filter(it => it.roomType === 'Both');

    // Supply Rates layout: row 1 header, row 2 col headers, row 3 "Kitchen" label,
    // rows 4..4+kitchenItems.length-1 kitchen data, next row kitchen total, skip 1,
    // "Full Bath" label, data rows, skip 1, "Both" label, data rows, skip 1, summaries
    const supKitchenStartRow = 4;
    const supKitchenEndRow = supKitchenStartRow + kitchenItems.length - 1;
    const supKitchenTotalRow = supKitchenEndRow + 1;
    const supFullBathLabelRow = supKitchenTotalRow + 2;
    const supFullBathStartRow = supFullBathLabelRow + 1;
    const supFullBathEndRow = supFullBathStartRow + fullBathItems.length - 1;
    const supBothLabelRow = supFullBathEndRow + 2;
    const supBothStartRow = supBothLabelRow + 1;
    const supBothEndRow = supBothStartRow + bothItems.length - 1;
    const supFullBathTotalRow = supBothEndRow + 2;
    const supHalfBathTotalRow = supFullBathTotalRow + 1;

    // ==============================
    // Tab 1: Turnover Cost (created first for correct tab order)
    // ==============================
    const wsTurnover = wb.addWorksheet('Turnover Cost');
    wsTurnover.columns = [{ width: 32 }, { width: 18 }];

    let row = 1;
    wsTurnover.mergeCells('A1:B1');
    const titleCell = wsTurnover.getCell('A1');
    titleCell.value = 'Turnover Cost Breakdown';
    titleCell.font = headerFont;
    titleCell.fill = navyFill;
    titleCell.alignment = { horizontal: 'center' };

    // Property details
    row = 3;
    wsTurnover.getCell(row, 1).value = 'Property Name';
    wsTurnover.getCell(row, 1).font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF666666' } };
    wsTurnover.getCell(row, 2).value = s.propertyName;
    wsTurnover.getCell(row, 2).font = inputFont;
    row++;
    wsTurnover.getCell(row, 1).value = 'Full Bathrooms';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.fullBaths;
    wsTurnover.getCell(row, 2).font = inputFont;
    const fullBathsRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'Half Bathrooms';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.halfBaths;
    wsTurnover.getCell(row, 2).font = inputFont;
    const halfBathsRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'Kitchens';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.kitchens;
    wsTurnover.getCell(row, 2).font = inputFont;
    const kitchensRow = row;
    row += 2;

    // Cost Assumptions
    wsTurnover.getCell(row, 1).value = 'Cost Assumptions';
    wsTurnover.getCell(row, 1).font = sectionFont;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).border = thickBottomBorder;
    row++;
    wsTurnover.getCell(row, 1).value = 'Inspector Rate ($/hr)';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.inspectorRate;
    wsTurnover.getCell(row, 2).font = inputFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    const rateRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'Inspection Time (hrs)';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = { formula: `(20+B${fullBathsRow}*12+B${halfBathsRow}*8+B${kitchensRow}*25)/60` };
    wsTurnover.getCell(row, 2).font = formulaFont;
    wsTurnover.getCell(row, 2).numFmt = '0.00';
    const timeRow = row;
    row++;

    // Inspection time breakdown
    const breakdownFont = { name: 'Arial', size: 9, color: { argb: 'FF888888' } };
    wsTurnover.getCell(row, 1).value = '   Base setup/walkthrough';
    wsTurnover.getCell(row, 1).font = breakdownFont;
    wsTurnover.getCell(row, 2).value = '20 min';
    wsTurnover.getCell(row, 2).font = breakdownFont;
    wsTurnover.getCell(row, 2).alignment = { horizontal: 'right' };
    row++;
    wsTurnover.getCell(row, 1).value = `   Full Baths (${s.fullBaths} × 12 min)`;
    wsTurnover.getCell(row, 1).font = breakdownFont;
    wsTurnover.getCell(row, 2).value = (s.fullBaths * 12) + ' min';
    wsTurnover.getCell(row, 2).font = breakdownFont;
    wsTurnover.getCell(row, 2).alignment = { horizontal: 'right' };
    row++;
    wsTurnover.getCell(row, 1).value = `   Half Baths (${s.halfBaths} × 8 min)`;
    wsTurnover.getCell(row, 1).font = breakdownFont;
    wsTurnover.getCell(row, 2).value = (s.halfBaths * 8) + ' min';
    wsTurnover.getCell(row, 2).font = breakdownFont;
    wsTurnover.getCell(row, 2).alignment = { horizontal: 'right' };
    row++;
    wsTurnover.getCell(row, 1).value = `   Kitchens (${s.kitchens} × 25 min)`;
    wsTurnover.getCell(row, 1).font = breakdownFont;
    wsTurnover.getCell(row, 2).value = (s.kitchens * 25) + ' min';
    wsTurnover.getCell(row, 2).font = breakdownFont;
    wsTurnover.getCell(row, 2).alignment = { horizontal: 'right' };
    row++;
    wsTurnover.getCell(row, 1).value = '   Total';
    wsTurnover.getCell(row, 1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF888888' } };
    const totalMin = 20 + s.fullBaths * 12 + s.halfBaths * 8 + s.kitchens * 25;
    wsTurnover.getCell(row, 2).value = totalMin + ' min (' + (totalMin / 60).toFixed(2) + ' hrs)';
    wsTurnover.getCell(row, 2).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF888888' } };
    wsTurnover.getCell(row, 2).alignment = { horizontal: 'right' };
    row++;

    wsTurnover.getCell(row, 1).value = 'Driving Time (minutes)';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.drivingMinutes;
    wsTurnover.getCell(row, 2).font = inputFont;
    const driveRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'Maine Sales Tax';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.salesTax / 100;
    wsTurnover.getCell(row, 2).font = inputFont;
    wsTurnover.getCell(row, 2).numFmt = pctFmt;
    const taxRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'Supply Handling & Waste Factor';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.handlingFactor / 100;
    wsTurnover.getCell(row, 2).font = inputFont;
    wsTurnover.getCell(row, 2).numFmt = pctFmt;
    const handlingRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'ACH Payment Rate';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.achRate / 100;
    wsTurnover.getCell(row, 2).font = inputFont;
    wsTurnover.getCell(row, 2).numFmt = pctFmt;
    const achRateRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'Booking Platform Fee Rate';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.bookingFeeRate / 100;
    wsTurnover.getCell(row, 2).font = inputFont;
    wsTurnover.getCell(row, 2).numFmt = pctFmt;
    const bookingFeeRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'Cleaning Vendor Cost';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.cleaningCost;
    wsTurnover.getCell(row, 2).font = inputFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    const cleaningCostRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'Linens Base Cost';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.linensCost;
    wsTurnover.getCell(row, 2).font = inputFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    const linensCostRow = row;
    row++;
    wsTurnover.getCell(row, 1).value = 'Welcome Basket Cost';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = s.welcomeBasket;
    wsTurnover.getCell(row, 2).font = inputFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    const welcomeCostRow = row;
    row += 2;

    // Raw supply cost reference
    wsTurnover.getCell(row, 1).value = 'Raw Supply Cost';
    wsTurnover.getCell(row, 1).font = { name: 'Arial', size: 10, color: { argb: 'FF999999' } };
    wsTurnover.getCell(row, 2).value = {
        formula: `'Supply Rates'!D${supKitchenTotalRow}*B${kitchensRow}+'Supply Rates'!D${supFullBathTotalRow}*B${fullBathsRow}+'Supply Rates'!D${supHalfBathTotalRow}*B${halfBathsRow}`
    };
    wsTurnover.getCell(row, 2).font = { name: 'Arial', size: 10, color: { argb: 'FF999999' } };
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    const rawSupplyRow = row;
    row += 2;

    // Line Item Breakdown header
    wsTurnover.getCell(row, 1).value = 'Line Item';
    wsTurnover.getCell(row, 2).value = 'Amount';
    wsTurnover.getCell(row, 1).font = { name: 'Arial', size: 10, bold: true };
    wsTurnover.getCell(row, 2).font = { name: 'Arial', size: 10, bold: true };
    wsTurnover.getCell(row, 2).alignment = { horizontal: 'right' };
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).border = thickBottomBorder;
    row++;

    // Professional Cleaning
    wsTurnover.getCell(row, 1).value = 'Professional Cleaning';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = { formula: `B${cleaningCostRow}` };
    wsTurnover.getCell(row, 2).font = formulaFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).border = thinBorder;
    const cleaningRow = row;
    row++;

    // Supplies & Restocking
    wsTurnover.getCell(row, 1).value = 'Supplies & Restocking';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = { formula: `B${rawSupplyRow}*(1+B${taxRow})*(1+B${handlingRow})` };
    wsTurnover.getCell(row, 2).font = formulaFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).border = thinBorder;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).fill = lightGrayFill;
    row++;

    // Linens & Replacement
    wsTurnover.getCell(row, 1).value = 'Linens & Replacement';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = { formula: `B${linensCostRow}*(1+B${taxRow})*(1+B${handlingRow})` };
    wsTurnover.getCell(row, 2).font = formulaFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).border = thinBorder;
    row++;

    // Quality Inspection
    wsTurnover.getCell(row, 1).value = 'Quality Inspection';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = { formula: `B${rateRow}*B${timeRow}` };
    wsTurnover.getCell(row, 2).font = formulaFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).border = thinBorder;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).fill = lightGrayFill;
    const inspectionLineRow = row;
    row++;

    // Travel / Mileage
    wsTurnover.getCell(row, 1).value = 'Travel / Mileage';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = { formula: `B${rateRow}*(B${driveRow}/60)` };
    wsTurnover.getCell(row, 2).font = formulaFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).border = thinBorder;
    const travelLineRow = row;
    row++;

    // Welcome Package
    wsTurnover.getCell(row, 1).value = 'Welcome Package';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = { formula: `B${welcomeCostRow}` };
    wsTurnover.getCell(row, 2).font = formulaFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).border = thinBorder;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).fill = lightGrayFill;
    row++;

    // ACH Processing Fee
    wsTurnover.getCell(row, 1).value = 'ACH Processing Fee';
    wsTurnover.getCell(row, 1).font = dataFont;
    wsTurnover.getCell(row, 2).value = { formula: `B${achRateRow}*(B${cleaningRow}+B${inspectionLineRow}+B${travelLineRow})` };
    wsTurnover.getCell(row, 2).font = formulaFont;
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).border = thinBorder;
    const achLineRow = row;
    row++;

    // TOTAL
    wsTurnover.getCell(row, 1).value = 'TURNOVER COST TOTAL';
    wsTurnover.getCell(row, 1).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1F3864' } };
    wsTurnover.getCell(row, 2).value = { formula: `SUM(B${cleaningRow}:B${achLineRow})` };
    wsTurnover.getCell(row, 2).font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF1F3864' } };
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    for (let c = 1; c <= 2; c++) {
        wsTurnover.getCell(row, c).border = {
            top: { style: 'medium', color: { argb: 'FF1F3864' } },
            bottom: { style: 'double', color: { argb: 'FF1F3864' } },
            left: thinBorder.left,
            right: thinBorder.right,
        };
    }
    const totalLineRow = row;
    row += 2;

    // Community Fee
    wsTurnover.getCell(row, 1).value = 'CLEANING FEE (COMMUNITY FEE)';
    wsTurnover.getCell(row, 1).font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    wsTurnover.getCell(row, 2).value = { formula: `B${totalLineRow}/(1-B${bookingFeeRow})` };
    wsTurnover.getCell(row, 2).font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
    wsTurnover.getCell(row, 2).numFmt = currencyFmt;
    wsTurnover.getCell(row, 2).alignment = { horizontal: 'right' };
    for (let c = 1; c <= 2; c++) wsTurnover.getCell(row, c).fill = navyFill;
    row++;
    wsTurnover.getCell(row, 1).value = 'Includes booking platform fees. Amount entered in Guesty as Community Fee.';
    wsTurnover.getCell(row, 1).font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FF888888' } };

    // ==============================
    // Tab 2: Supply Rates
    // ==============================
    const wsSupply = wb.addWorksheet('Supply Rates');
    wsSupply.columns = [{ width: 22 }, { width: 12 }, { width: 12 }, { width: 14 }, { width: 12 }];

    // Header
    wsSupply.mergeCells('A1:E1');
    const supHeaderCell = wsSupply.getCell('A1');
    supHeaderCell.value = 'Supply Rates';
    supHeaderCell.font = headerFont;
    supHeaderCell.fill = navyFill;
    supHeaderCell.alignment = { horizontal: 'center' };

    // Column headers
    row = 2;
    ['Item', 'Cost/Unit', 'Units/Stay', 'Cost/Stay', 'Room Type'].forEach((h, i) => {
        const cell = wsSupply.getCell(row, i + 1);
        cell.value = h;
        cell.font = { name: 'Arial', size: 10, bold: true };
        cell.border = thickBottomBorder;
        cell.alignment = { horizontal: i >= 1 && i <= 3 ? 'right' : 'left' };
    });

    // Helper to write supply items
    function writeSupplyItems(ws, items, startRow, label) {
        let r = startRow;
        ws.getCell(r, 1).value = label;
        ws.getCell(r, 1).font = sectionFont;
        r++;
        const dataStart = r;
        items.forEach((item, idx) => {
            ws.getCell(r, 1).value = item.name;
            ws.getCell(r, 1).font = dataFont;
            ws.getCell(r, 2).value = item.costPerUnit;
            ws.getCell(r, 2).font = inputFont;
            ws.getCell(r, 2).numFmt = currencyFmt;
            ws.getCell(r, 3).value = item.unitsPerStay;
            ws.getCell(r, 3).font = inputFont;
            ws.getCell(r, 4).value = { formula: `B${r}*C${r}` };
            ws.getCell(r, 4).font = formulaFont;
            ws.getCell(r, 4).numFmt = currencyFmt;
            ws.getCell(r, 5).value = item.roomType;
            ws.getCell(r, 5).font = dataFont;
            for (let c = 1; c <= 5; c++) ws.getCell(r, c).border = thinBorder;
            if (idx % 2 === 1) {
                for (let c = 1; c <= 5; c++) ws.getCell(r, c).fill = lightGrayFill;
            }
            r++;
        });
        return { dataStart, dataEnd: r - 1 };
    }

    // Kitchen
    const kitchen = writeSupplyItems(wsSupply, kitchenItems, 3, 'Kitchen');
    row = kitchen.dataEnd + 1;
    wsSupply.getCell(row, 1).value = 'Kitchen Cost/Stay';
    wsSupply.getCell(row, 1).font = totalFont;
    wsSupply.getCell(row, 4).value = { formula: `SUM(D${kitchen.dataStart}:D${kitchen.dataEnd})` };
    wsSupply.getCell(row, 4).font = totalFont;
    wsSupply.getCell(row, 4).numFmt = currencyFmt;
    for (let c = 1; c <= 5; c++) wsSupply.getCell(row, c).border = thickBottomBorder;

    // Full Bath
    const fullBath = writeSupplyItems(wsSupply, fullBathItems, row + 2, 'Full Bath');

    // Both
    const both = writeSupplyItems(wsSupply, bothItems, fullBath.dataEnd + 2, 'Both (Full & Half Bath)');

    // Full Bath subtotal (Full Bath + Both)
    row = both.dataEnd + 2;
    wsSupply.getCell(row, 1).value = 'Full Bath Cost/Stay';
    wsSupply.getCell(row, 1).font = totalFont;
    wsSupply.getCell(row, 4).value = { formula: `SUM(D${fullBath.dataStart}:D${fullBath.dataEnd})+SUM(D${both.dataStart}:D${both.dataEnd})` };
    wsSupply.getCell(row, 4).font = totalFont;
    wsSupply.getCell(row, 4).numFmt = currencyFmt;
    for (let c = 1; c <= 5; c++) wsSupply.getCell(row, c).border = thinBorder;
    row++;

    // Half Bath subtotal (Both items only)
    wsSupply.getCell(row, 1).value = 'Half Bath Cost/Stay';
    wsSupply.getCell(row, 1).font = totalFont;
    wsSupply.getCell(row, 4).value = { formula: `SUM(D${both.dataStart}:D${both.dataEnd})` };
    wsSupply.getCell(row, 4).font = totalFont;
    wsSupply.getCell(row, 4).numFmt = currencyFmt;
    for (let c = 1; c <= 5; c++) wsSupply.getCell(row, c).border = thinBorder;

    // Generate and download
    const buffer = await wb.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (s.propertyName || 'Property').replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '_') + '_Cleaning_Fee.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ============================================================
// Event Binding
// ============================================================

function init() {
    // Map input IDs to state keys
    const inputMap = {
        propertyName: { key: 'propertyName', type: 'text' },
        bedrooms: { key: 'bedrooms', type: 'int' },
        fullBaths: { key: 'fullBaths', type: 'int' },
        halfBaths: { key: 'halfBaths', type: 'int' },
        kitchens: { key: 'kitchens', type: 'int' },
        cleaningCost: { key: 'cleaningCost', type: 'float' },
        drivingMinutes: { key: 'drivingMinutes', type: 'int' },
        welcomeBasket: { key: 'welcomeBasket', type: 'float' },
        linensCost: { key: 'linensCost', type: 'float' },
        inspectorRate: { key: 'inspectorRate', type: 'float' },
        inspectionTime: { key: 'inspectionTime', type: 'float', override: true },
        salesTax: { key: 'salesTax', type: 'float' },
        handlingFactor: { key: 'handlingFactor', type: 'float' },
        achRate: { key: 'achRate', type: 'float' },
        actualInspectorRate: { key: 'actualInspectorRate', type: 'float' },
        royaltyRate: { key: 'royaltyRate', type: 'float' },
        bookingFeeRate: { key: 'bookingFeeRate', type: 'float' },
        nightlyRate: { key: 'nightlyRate', type: 'float' },
    };

    for (const [id, config] of Object.entries(inputMap)) {
        const el = document.getElementById(id);
        if (!el) continue;
        el.addEventListener('change', () => {
            if (config.type === 'text') {
                STATE[config.key] = el.value;
            } else if (config.type === 'int') {
                STATE[config.key] = parseInt(el.value) || 0;
            } else {
                STATE[config.key] = parseFloat(el.value) || 0;
            }

            if (config.override) {
                // User manually edited inspection time
                STATE.inspectionTimeOverridden = true;
            }

            // If property geometry changed, reset inspection time override
            if (['bedrooms', 'fullBaths', 'halfBaths', 'kitchens'].includes(id)) {
                STATE.inspectionTimeOverridden = false;
            }

            recalculate();
            renderResults();
        });
    }

    // Buttons
    document.getElementById('exportBtn').addEventListener('click', exportExcel);
    document.getElementById('settingsBtn').addEventListener('click', showPasswordGate);
    document.getElementById('unlockBtn').addEventListener('click', unlockSettings);
    document.getElementById('lockBtn').addEventListener('click', lockSettings);
    document.getElementById('capModalClose').addEventListener('click', () => {
        document.getElementById('capModal').classList.add('hidden');
    });

    // Enter key on password field
    document.getElementById('passwordInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') unlockSettings();
    });

    // Check session storage for unlock state
    if (sessionStorage.getItem('gw_unlocked') === '1') {
        document.getElementById('settingsSection').classList.remove('hidden');
        renderSupplyTable();
    }

    // Initial calculation
    recalculate();
    renderResults();
    renderSupplyTable();
}

document.addEventListener('DOMContentLoaded', init);
