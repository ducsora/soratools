// ============================
// SoraTools – Báo cáo Ads v2
// Robust Google Sheets Parser
// ============================

// ---- DOM refs ----
const connectBanner   = document.getElementById('connect-banner');
const dashboard       = document.getElementById('dashboard');
const loadingState    = document.getElementById('loading-state');
const errorState      = document.getElementById('error-state');
const errorMsg        = document.getElementById('error-msg');
const configModal     = document.getElementById('config-modal');
const reportDateLabel = document.getElementById('report-date-label');
const refreshBtn      = document.getElementById('refresh-btn');
const themeToggle     = document.getElementById('theme-toggle');

const kpiRevenue   = document.getElementById('kpi-revenue');
const kpiAdsCost   = document.getElementById('kpi-ads-cost');
const kpiOrders    = document.getElementById('kpi-orders');
const kpiRatio     = document.getElementById('kpi-ratio');
const kpiRatioCard = document.getElementById('kpi-ratio-card');
const kpiCpc       = document.getElementById('kpi-cpc');

const tableBody   = document.getElementById('table-body');
const tableFooter = document.getElementById('table-footer');
const searchInput = document.getElementById('search-table');
const filterLoai  = document.getElementById('filter-loai');

const cfgSheetId   = document.getElementById('cfg-sheet-id');
const cfgApiKey    = document.getElementById('cfg-api-key');
const cfgSheetName = document.getElementById('cfg-sheet-name');
const cfgDataRow   = document.getElementById('cfg-data-row');

const cols = {
    maHang:  document.getElementById('col-ma-hang'),
    start:   document.getElementById('col-start'),
    end:     document.getElementById('col-end'),
    revenue: document.getElementById('col-revenue'),
    costPct: document.getElementById('col-cost-pct'),
    orders:  document.getElementById('col-orders'),
    cpc:     document.getElementById('col-cpc'),
    ads:     document.getElementById('col-ads'),
    adsPct:  document.getElementById('col-ads-pct'),
    loai:    document.getElementById('col-loai'),
};

let barChartInstance = null;
let pieChartInstance = null;
let rawData    = [];
let summaryRow = [];
let config     = loadConfig();

// ---- Theme ----
function initTheme() {
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');
    if (localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
    updateThemeIcon();
}
function updateThemeIcon() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    themeToggle.innerHTML = isDark
        ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>'
        : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
}
themeToggle.addEventListener('click', () => {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    isDark ? document.body.removeAttribute('data-theme') : document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', isDark ? 'light' : 'dark');
    updateThemeIcon();
    if (rawData.length) renderCharts(rawData);
});

// ---- Config ----
function loadConfig() {
    const s = localStorage.getItem('sora_ads_config');
    return s ? JSON.parse(s) : null;
}

function saveConfig() {
    const raw = cfgSheetId.value.trim();
    const cfg = {
        sheetId:   extractSheetId(raw),
        apiKey:    cfgApiKey.value.trim(),
        sheetName: cfgSheetName.value.trim() || 'Sheet1',
        dataRow:   parseInt(cfgDataRow.value) || 3,
        cols: {
            maHang:  (cols.maHang.value.trim()  || 'A').toUpperCase(),
            start:   (cols.start.value.trim()   || 'B').toUpperCase(),
            end:     (cols.end.value.trim()     || 'C').toUpperCase(),
            revenue: (cols.revenue.value.trim() || 'D').toUpperCase(),
            costPct: (cols.costPct.value.trim() || 'F').toUpperCase(),
            orders:  (cols.orders.value.trim()  || 'G').toUpperCase(),
            cpc:     (cols.cpc.value.trim()     || 'H').toUpperCase(),
            ads:     (cols.ads.value.trim()     || 'I').toUpperCase(),
            adsPct:  (cols.adsPct.value.trim()  || 'J').toUpperCase(),
            loai:    (cols.loai.value.trim()     || 'K').toUpperCase(),
        }
    };
    localStorage.setItem('sora_ads_config', JSON.stringify(cfg));
    return cfg;
}

function extractSheetId(input) {
    const m = input.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return m ? m[1] : input;
}

function populateConfigModal(cfg) {
    if (!cfg) return;
    cfgSheetId.value   = cfg.sheetId   || '';
    cfgApiKey.value    = cfg.apiKey    || '';
    cfgSheetName.value = cfg.sheetName || 'Sheet1';
    cfgDataRow.value   = cfg.dataRow   || 3;
    if (cfg.cols) Object.keys(cols).forEach(k => { if (cfg.cols[k]) cols[k].value = cfg.cols[k]; });
}

function openConfig() {
    populateConfigModal(config);
    document.getElementById('preview-panel').style.display = 'none';
    configModal.classList.add('active');
}

document.getElementById('settings-btn').addEventListener('click', openConfig);
document.getElementById('open-config-banner').addEventListener('click', openConfig);
document.getElementById('close-config').addEventListener('click', () => configModal.classList.remove('active'));
document.getElementById('close-config-btn').addEventListener('click', () => configModal.classList.remove('active'));
configModal.addEventListener('click', e => { if (e.target === configModal) configModal.classList.remove('active'); });

document.getElementById('save-config-btn').addEventListener('click', async () => {
    config = saveConfig();
    configModal.classList.remove('active');
    await loadData();
});

// ---- Preview Raw Data ----
document.getElementById('preview-btn').addEventListener('click', async () => {
    const sheetId   = extractSheetId(cfgSheetId.value.trim());
    const apiKey    = cfgApiKey.value.trim();
    const sheetName = cfgSheetName.value.trim() || 'Sheet1';
    if (!sheetId || !apiKey) { alert('Vui lòng nhập Sheet ID và API Key trước!'); return; }

    const panel = document.getElementById('preview-panel');
    const wrap  = document.getElementById('preview-table-wrap');
    wrap.innerHTML = '<p style="padding:0.5rem;color:var(--text-muted)">Đang tải...</p>';
    panel.style.display = '';

    try {
        const range = encodeURIComponent(`${sheetName}!A1:Z10`);
        const url   = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
        const res   = await fetch(url);
        const json  = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Lỗi API');
        renderPreview(json.values || []);
    } catch(e) {
        wrap.innerHTML = `<p style="color:#ef4444;padding:0.5rem">❌ ${e.message}</p>`;
    }
});

function renderPreview(rows) {
    const wrap = document.getElementById('preview-table-wrap');
    if (!rows.length) { wrap.innerHTML = '<p>Không có dữ liệu.</p>'; return; }
    const maxCols = Math.max(...rows.map(r => r.length));
    const letters = Array.from({length: maxCols}, (_, i) => String.fromCharCode(65 + i));

    let html = '<table class="preview-table"><thead><tr><th>Hàng</th>';
    letters.forEach(l => html += `<th class="col-letter">${l}</th>`);
    html += '</tr></thead><tbody>';
    rows.forEach((row, ri) => {
        html += `<tr><td class="row-num">${ri + 1}</td>`;
        letters.forEach((_, ci) => {
            const val  = (row[ci] || '').toString();
            const isNum = val && !isNaN(val.replace(/[₫₱,. ]/g, '')) && val.replace(/[₫₱,. ]/g,'') !== '';
            const isPct = val.includes('%');
            html += `<td class="preview-cell${isNum?' is-num':''}${isPct?' is-pct':''}" title="Cột ${letters[ci]}, Hàng ${ri+1}">${val || '<span style="opacity:0.3">—</span>'}</td>`;
        });
        html += '</tr>';
    });
    html += '</tbody></table>';
    wrap.innerHTML = html;
}

// ---- Helpers ----
function colToIndex(letter) {
    letter = letter.toUpperCase();
    let idx = 0;
    for (let i = 0; i < letter.length; i++) idx = idx * 26 + (letter.charCodeAt(i) - 64);
    return idx - 1;
}

function getCellStr(row, col) {
    return ((row[colToIndex(col)] || '') + '').trim();
}

function parseMoney(str) {
    if (!str) return 0;
    // Remove all non-numeric except dot/dash, handle thousand separators
    const clean = str.replace(/[^\d.\-]/g, '').replace(/\.(?=.*\.)/g, '');
    return parseFloat(clean) || 0;
}

function parsePct(str) {
    if (!str) return null;
    // Handles "18.54%", "18,54%", raw number like "0.1854"
    const s = str.toString().replace(',', '.');
    const n = parseFloat(s.replace(/[^0-9.\-]/g, ''));
    if (isNaN(n)) return null;
    // If it's a decimal fraction like 0.18 (not percent), convert
    if (!str.includes('%') && n < 1 && n > 0) return n * 100;
    return n;
}

// Is this a valid data row? Skip empties, timestamps, and header keywords
function isProductCode(val) {
    if (!val) return false;
    const s = val.toString().trim();
    if (s.length < 2) return false;
    // Skip if looks like a date/timestamp
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return false;
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s)) return false;
    // Skip obvious header row labels (exact matches)
    const headerExact = ['mã hàng', 'product', 'item', 'name', 'ngày bắt đầu', 'ngày kết thúc', 'doanh số', 'ads dataslayer'];
    if (headerExact.some(h => s.toLowerCase() === h)) return false;
    // Must contain at least one letter (not pure numbers)
    if (/^[\d.,\s₫₱%]+$/.test(s)) return false;
    return true;
}

// ---- Load Data ----
async function loadData() {
    if (!config || !config.sheetId || !config.apiKey) { openConfig(); return; }

    showState('loading');
    refreshBtn.disabled = true;

    // Fetch enough rows - A1:M1000
    const range = encodeURIComponent(`${config.sheetName}!A1:M1000`);
    const url   = `https://sheets.googleapis.com/v4/spreadsheets/${config.sheetId}/values/${range}?key=${config.apiKey}`;

    try {
        const res  = await fetch(url);
        const json = await res.json();

        if (!res.ok) {
            const msg = json.error?.message || 'Lỗi không xác định';
            if (msg.toLowerCase().includes('parse') || msg.toLowerCase().includes('range')) {
                throw new Error(`❌ Không tìm thấy tab "${config.sheetName}". Hãy kiểm tra lại tên Sheet (Tab) ở cuối Google Sheet.`);
            }
            throw new Error(msg);
        }

        const allRows = json.values || [];
        if (!allRows.length) throw new Error('Sheet không có dữ liệu.');

        const summaryRowFetched = allRows[0] || [];
        summaryRow = summaryRowFetched; // store globally

        // Find actual data rows: start from config.dataRow (1-indexed)
        const dataRows = allRows.slice(config.dataRow - 1);

        // Parse only rows with valid product codes in column A
        rawData = dataRows
            .filter(row => isProductCode(getCellStr(row, config.cols.maHang)))
            .map(row => ({
                maHang:  getCellStr(row, config.cols.maHang),
                start:   getCellStr(row, config.cols.start),
                end:     getCellStr(row, config.cols.end),
                revenue: parseMoney(getCellStr(row, config.cols.revenue)),
                costPct: parsePct(getCellStr(row, config.cols.costPct)),
                orders:  parseInt(getCellStr(row, config.cols.orders).replace(/\D/g,'')) || 0,
                cpc:     parseMoney(getCellStr(row, config.cols.cpc)),
                ads:     parseMoney(getCellStr(row, config.cols.ads)),
                adsPct:  parsePct(getCellStr(row, config.cols.adsPct)),
                loai:    getCellStr(row, config.cols.loai),
            }));

        if (!rawData.length) throw new Error(`Không tìm thấy dữ liệu hợp lệ. Thử điều chỉnh "Hàng bắt đầu dữ liệu" hoặc kiểm tra mapping cột.`);

        // Date: try to get from summary row col C, or from data
        const dateCell = getCellStr(summaryRow, config.cols.end) || getCellStr(summaryRow, config.cols.start);
        const dateOk   = dateCell && /\d/.test(dateCell) && !dateCell.includes('ngày') && dateCell.length < 30;
        reportDateLabel.textContent = `📅 Báo cáo ngày: ${dateOk ? dateCell : new Date().toLocaleDateString('vi-VN')}`;

        renderKPIs(summaryRow, rawData);
        renderCharts(rawData);
        renderTable(rawData);
        showState('dashboard');
        refreshBtn.disabled = false;

    } catch (err) {
        console.error(err);
        errorMsg.textContent = err.message;
        showState('error');
    }
}

// ---- KPIs: compute from DATA rows, use summary row as fallback ----
function renderKPIs(summaryRow, data) {
    const c = config.cols;

    // Compute from data rows (most reliable)
    const computedRevenue = data.reduce((s, r) => s + r.revenue, 0);
    const computedAds     = data.reduce((s, r) => s + r.ads, 0);
    const computedOrders  = data.reduce((s, r) => s + r.orders, 0);
    const computedCpc     = data.filter(r => r.cpc > 0).reduce((s, r) => s + r.cpc, 0)
                          / (data.filter(r => r.cpc > 0).length || 1);

    // Try summary row for verified totals (row 1)
    const sumRevenue = parseMoney(getCellStr(summaryRow, c.revenue));
    const sumAds     = parseMoney(getCellStr(summaryRow, c.ads));
    const sumOrders  = parseInt((getCellStr(summaryRow, c.orders) || '').replace(/\D/g,'')) || 0;
    const sumCpc     = parseMoney(getCellStr(summaryRow, c.cpc));
    const sumRatio   = parsePct(getCellStr(summaryRow, c.adsPct));

    // Pick the larger / more credible value
    const totalRevenue = Math.max(sumRevenue, computedRevenue);
    const totalAds     = Math.max(sumAds, computedAds);
    const totalOrders  = Math.max(sumOrders, computedOrders);
    const avgCpc       = sumCpc || computedCpc;
    const ratio        = sumRatio ?? (totalRevenue ? totalAds / totalRevenue * 100 : 0);

    kpiRevenue.textContent  = fmtVND(totalRevenue);
    kpiAdsCost.textContent  = fmtVND(totalAds);
    kpiOrders.textContent   = totalOrders.toLocaleString('vi-VN');
    kpiRatio.textContent    = ratio ? ratio.toFixed(2) + '%' : '—';
    kpiCpc.textContent      = avgCpc ? fmtVND(avgCpc) : '—';

    kpiRatioCard.classList.remove('good');
    if (ratio > 0 && ratio <= 20) kpiRatioCard.classList.add('good');
}

// ---- Charts ----
function renderCharts(data) {
    const isDark    = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#111';
    const gridColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)';

    // Only show products with revenue > 0, sorted desc, top 15
    const active = [...data]
        .filter(r => r.revenue > 0 || r.ads > 0)
        .sort((a,b) => b.revenue - a.revenue)
        .slice(0, 15);

    const labels   = active.map(r => r.maHang);
    const revenues = active.map(r => r.revenue);
    const adsCosts = active.map(r => r.ads);

    if (barChartInstance) barChartInstance.destroy();
    barChartInstance = new Chart(document.getElementById('barChart').getContext('2d'), {
        type: 'bar',
        data: {
            labels,
            datasets: [
                { label: 'Doanh số (VND)', data: revenues, backgroundColor: 'rgba(250,204,21,0.75)', borderColor: '#facc15', borderWidth: 1, borderRadius: 4 },
                { label: 'Ads Dataslayer', data: adsCosts,  backgroundColor: 'rgba(239,68,68,0.6)',   borderColor: '#ef4444', borderWidth: 1, borderRadius: 4 }
            ]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { labels: { color: textColor, font: { family: 'Outfit' } } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${fmtVND(ctx.raw)}` } }
            },
            scales: {
                x: { ticks: { color: textColor, maxRotation: 45, font: { size: 11 } }, grid: { color: gridColor } },
                y: { ticks: { color: textColor, callback: fmtVNDShort }, grid: { color: gridColor } }
            }
        }
    });

    const pieData = active.filter(r => r.revenue > 0);
    if (pieChartInstance) pieChartInstance.destroy();
    pieChartInstance = new Chart(document.getElementById('pieChart').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: pieData.map(r => r.maHang),
            datasets: [{
                data: pieData.map(r => r.revenue),
                backgroundColor: ['#facc15','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#06b6d4','#84cc16','#f97316','#64748b','#a855f7','#14b8a6','#fb923c','#e11d48','#6366f1'],
                borderWidth: 2,
                borderColor: isDark ? '#121212' : '#fff'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right', labels: { color: textColor, font: { family: 'Outfit', size: 11 }, boxWidth: 14, padding: 10 } },
                tooltip: { callbacks: { label: ctx => ` ${ctx.label}: ${fmtVND(ctx.raw)}` } }
            }
        }
    });
}

// ---- Table ----
let currentData = [];

function renderTable(data) { currentData = data; applyTableFilter(); }

// ---- Date Helpers ----
function parseSheetDate(str) {
    if (!str) return null;
    str = str.toString().trim();
    let m;
    if ((m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)))
        return new Date(+m[3], +m[2]-1, +m[1]);
    if ((m = str.match(/^(\d{4})-(\d{2})-(\d{2})/)))
        return new Date(+m[1], +m[2]-1, +m[3]);
    return null;
}
function toInputDate(d) { return d.toISOString().split('T')[0]; }

// Quick date buttons
document.querySelectorAll('.quick-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const now  = new Date();
        const from = document.getElementById('filter-date-from');
        const to   = document.getElementById('filter-date-to');
        const r    = btn.dataset.range;
        if (r === 'today') {
            from.value = toInputDate(now); to.value = toInputDate(now);
        } else if (r === 'this-month') {
            from.value = toInputDate(new Date(now.getFullYear(), now.getMonth(), 1));
            to.value   = toInputDate(now);
        } else if (r === 'last-7') {
            const d = new Date(now); d.setDate(d.getDate()-6);
            from.value = toInputDate(d); to.value = toInputDate(now);
        } else if (r === 'last-30') {
            const d = new Date(now); d.setDate(d.getDate()-29);
            from.value = toInputDate(d); to.value = toInputDate(now);
        }
        document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyTableFilter();
    });
});

document.getElementById('reset-date-btn').addEventListener('click', () => {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value   = '';
    document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
    applyTableFilter();
});

function applyTableFilter() {
    const q        = searchInput.value.toLowerCase();
    const loai     = filterLoai.value;
    const hieuQua  = document.getElementById('filter-hieu-qua').value;
    const doanhSo  = document.getElementById('filter-doanh-so').value;
    const sortBy   = document.getElementById('sort-by').value;

    let filtered = currentData.filter(r => {
        // Text search
        if (q && !r.maHang.toLowerCase().includes(q)) return false;
        // Loai filter
        if (loai && r.loai !== loai) return false;
        // Doanh so filter
        if (doanhSo === 'has'     && r.revenue <= 0)   return false;
        if (doanhSo === 'none'    && r.revenue > 0)    return false;
        if (doanhSo === 'has-ads' && r.ads <= 0)       return false;
        // Hieu qua filter
        if (hieuQua) {
            const pct = r.adsPct;
            if (hieuQua === 'good' && !(pct !== null && pct <= 20))   return false;
            if (hieuQua === 'warn' && !(pct !== null && pct > 20 && pct <= 35)) return false;
            if (hieuQua === 'bad'  && !(pct !== null && pct > 35))    return false;
            if (hieuQua === 'na'   && pct !== null)                   return false;
        }
        // Date range filter
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo   = document.getElementById('filter-date-to').value;
        if (dateFrom || dateTo) {
            const rowDate = parseSheetDate(r.start) || parseSheetDate(r.end);
            if (rowDate) {
                if (dateFrom && rowDate < new Date(dateFrom)) return false;
                if (dateTo   && rowDate > new Date(dateTo + 'T23:59:59')) return false;
            }
        }
        return true;
    });

    // Sort
    if (sortBy) {
        filtered = [...filtered].sort((a, b) => {
            switch(sortBy) {
                case 'revenue-desc': return b.revenue - a.revenue;
                case 'revenue-asc':  return a.revenue - b.revenue;
                case 'orders-desc':  return b.orders  - a.orders;
                case 'ads-desc':     return b.ads     - a.ads;
                case 'pct-desc':     return (b.adsPct ?? -1) - (a.adsPct ?? -1);
                case 'pct-asc':      return (a.adsPct ?? 999) - (b.adsPct ?? 999);
                case 'name-asc':     return a.maHang.localeCompare(b.maHang);
                default: return 0;
            }
        });
    }

    drawTable(filtered, filtered);
}

function drawTable(data, filteredForKpi) {
    // Re-render KPIs and charts with filtered data if any filter is active
    const hasFilter = data.length !== currentData.length;
    if (hasFilter) {
        renderKPIs([], filteredForKpi); // no summary row override when filtered
        renderCharts(filteredForKpi);
    } else {
        renderKPIs(summaryRow, filteredForKpi);
        renderCharts(filteredForKpi);
    }
    tableBody.innerHTML = data.map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${r.maHang}</strong></td>
            <td>${r.start || '—'}</td>
            <td>${r.end   || '—'}</td>
            <td class="num ${r.revenue > 0 ? 'revenue' : 'zero'}">${r.revenue > 0 ? fmtVND(r.revenue) : '0 ₫'}</td>
            ${fmtPctCell(r.costPct)}
            <td class="num">${r.orders || 0}</td>
            <td class="num ${r.cpc > 0 ? '' : 'zero'}">${r.cpc > 0 ? fmtVND(r.cpc) : '—'}</td>
            <td class="num ${r.ads > 0 ? 'cost' : 'zero'}">${r.ads > 0 ? fmtVND(r.ads) : '0 ₫'}</td>
            ${fmtPctCell(r.adsPct)}
            <td>${loaiBadge(r.loai)}</td>
            <td>${effBadge(r.adsPct, r.revenue)}</td>
        </tr>
    `).join('');
    tableFooter.innerHTML = data.length < currentData.length
        ? `<span style="color:var(--primary-color);font-weight:600">🔍 Lọc: ${data.length} / ${currentData.length} sản phẩm</span>`
        : `Hiển thị ${data.length} sản phẩm`;
}

function fmtPctCell(val) {
    if (val === null || val === undefined) return `<td class="pct-na">—</td>`;
    const cls = val === 0 ? 'pct-good' : val <= 20 ? 'pct-good' : val <= 35 ? 'pct-warn' : 'pct-bad';
    return `<td class="${cls}">${val.toFixed(2)}%</td>`;
}

function effBadge(adsPct, revenue) {
    if (revenue === 0 && adsPct === null) return `<span class="eff-badge na">—</span>`;
    if (adsPct === null || adsPct === undefined) return `<span class="eff-badge na">Chưa có</span>`;
    if (adsPct === 0) return `<span class="eff-badge good">✅ Tốt</span>`;
    if (adsPct <= 20) return `<span class="eff-badge good">✅ Tốt</span>`;
    if (adsPct <= 35) return `<span class="eff-badge warn">⚠️ Trung bình</span>`;
    return `<span class="eff-badge bad">🔴 Cao</span>`;
}

function loaiBadge(loai) {
    if (!loai) return '<span class="loai-badge">—</span>';
    const cls = loai.toLowerCase().includes('air') ? 'air' : 'sup';
    return `<span class="loai-badge ${cls}">${loai}</span>`;
}

// ---- Export CSV ----
document.getElementById('export-csv-btn').addEventListener('click', () => {
    const headers = ['#','Mã Hàng','Ngày BĐ','Ngày KT','Doanh số','% Chi phí','Số Đơn','Chi phí/Contact','Ads Dataslayer','% Ads','Loại Hàng'];
    const rows = currentData.map((r, i) => [i+1, r.maHang, r.start, r.end, r.revenue, r.costPct ?? '', r.orders, r.cpc, r.ads, r.adsPct ?? '', r.loai]);
    const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = `ads_report_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
});

searchInput.addEventListener('input', applyTableFilter);
filterLoai.addEventListener('change', applyTableFilter);
document.getElementById('filter-hieu-qua').addEventListener('change', applyTableFilter);
document.getElementById('filter-doanh-so').addEventListener('change', applyTableFilter);
document.getElementById('sort-by').addEventListener('change', applyTableFilter);
document.getElementById('filter-date-from').addEventListener('change', applyTableFilter);
document.getElementById('filter-date-to').addEventListener('change', applyTableFilter);
document.getElementById('reset-filters-btn').addEventListener('click', () => {
    searchInput.value = '';
    filterLoai.value = '';
    document.getElementById('filter-hieu-qua').value = '';
    document.getElementById('filter-doanh-so').value = '';
    document.getElementById('sort-by').value = '';
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value   = '';
    document.querySelectorAll('.quick-btn').forEach(b => b.classList.remove('active'));
    applyTableFilter();
});
refreshBtn.addEventListener('click', loadData);

// ---- State ----
function showState(state) {
    connectBanner.style.display  = 'none';
    dashboard.style.display      = 'none';
    loadingState.style.display   = 'none';
    errorState.style.display     = 'none';
    if (state === 'connect')    connectBanner.style.display  = '';
    else if (state === 'loading') loadingState.style.display = '';
    else if (state === 'error')   errorState.style.display   = '';
    else if (state === 'dashboard') dashboard.style.display  = '';
}

// ---- Formatters ----
function fmtVND(val) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
}
function fmtVNDShort(val) {
    if (val >= 1_000_000) return (val/1_000_000).toFixed(1)+'M';
    if (val >= 1_000)     return (val/1_000).toFixed(0)+'K';
    return val;
}

// ---- Init ----
function init() {
    initTheme();
    config = loadConfig();
    if (config && config.sheetId && config.apiKey) loadData();
    else showState('connect');
}

init();
