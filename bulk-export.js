/**
 * SoraTools – Bulk Ad Builder (bulk-export.js)
 * Handles: tab navigation, row CRUD, inline editing, CSV import, XLSX export
 */

/* ===================================================
   STATE
=================================================== */
let rows = [];       // Each row = one Ad Set + Ad pair
let rowCounter = 0;  // For generating unique IDs

// Default templates
const TEMPLATES = [
  {
    name: 'A/B Test – 3 Interest Groups',
    meta: '3 Ad Sets, cùng 1 Campaign. Target theo 3 nhóm sở thích khác nhau.',
    rows: [
      { adsetName:'AS01 – Online Shopping', country:'PH', ageMin:'18', ageMax:'45', gender:'All', interest:'Online shopping, E-commerce', placement:'All', budget:'10', adName:'Ad_01_Video', creative:'', headline:'Deal Tốt – Mua Ngay!', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
      { adsetName:'AS02 – Beauty Lovers',   country:'PH', ageMin:'18', ageMax:'40', gender:'Female', interest:'Skin care, Beauty makeup', placement:'All', budget:'10', adName:'Ad_02_Video', creative:'', headline:'Làm Sạch Sâu Trong 60s', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
      { adsetName:'AS03 – Home & Living',   country:'PH', ageMin:'22', ageMax:'50', gender:'All', interest:'Home improvement, DIY crafts', placement:'All', budget:'10', adName:'Ad_03_Video', creative:'', headline:'Thiết Bị Gia Dụng Thông Minh', text:'', cta:'LEARN_MORE', url:'', status:'PAUSED' },
    ]
  },
  {
    name: 'Multi-Country – 4 Markets',
    meta: '4 Ad Sets nhắm vào 4 quốc gia khác nhau.',
    rows: [
      { adsetName:'AS_PH – Philippines', country:'PH', ageMin:'18', ageMax:'45', gender:'All', interest:'', placement:'All', budget:'10', adName:'Ad_PH', creative:'', headline:'', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
      { adsetName:'AS_VN – Vietnam',     country:'VN', ageMin:'18', ageMax:'45', gender:'All', interest:'', placement:'All', budget:'10', adName:'Ad_VN', creative:'', headline:'', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
      { adsetName:'AS_ID – Indonesia',   country:'ID', ageMin:'18', ageMax:'45', gender:'All', interest:'', placement:'All', budget:'10', adName:'Ad_ID', creative:'', headline:'', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
      { adsetName:'AS_MY – Malaysia',    country:'MY', ageMin:'18', ageMax:'45', gender:'All', interest:'', placement:'All', budget:'10', adName:'Ad_MY', creative:'', headline:'', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
    ]
  },
  {
    name: 'Creative Test – 5 Videos',
    meta: '5 Ad cùng 1 Ad Set, mỗi Ad dùng 1 video creative khác nhau.',
    rows: [
      { adsetName:'AS_Creative_Test', country:'PH', ageMin:'18', ageMax:'45', gender:'All', interest:'Online shopping', placement:'All', budget:'10', adName:'Ad_Video_01', creative:'VIDEO_ID_01', headline:'Hook Angle 1', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
      { adsetName:'AS_Creative_Test', country:'PH', ageMin:'18', ageMax:'45', gender:'All', interest:'Online shopping', placement:'All', budget:'10', adName:'Ad_Video_02', creative:'VIDEO_ID_02', headline:'Hook Angle 2', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
      { adsetName:'AS_Creative_Test', country:'PH', ageMin:'18', ageMax:'45', gender:'All', interest:'Online shopping', placement:'All', budget:'10', adName:'Ad_Video_03', creative:'VIDEO_ID_03', headline:'Hook Angle 3', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
      { adsetName:'AS_Creative_Test', country:'PH', ageMin:'18', ageMax:'45', gender:'All', interest:'Online shopping', placement:'All', budget:'10', adName:'Ad_Video_04', creative:'VIDEO_ID_04', headline:'Hook Angle 4', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
      { adsetName:'AS_Creative_Test', country:'PH', ageMin:'18', ageMax:'45', gender:'All', interest:'Online shopping', placement:'All', budget:'10', adName:'Ad_Video_05', creative:'VIDEO_ID_05', headline:'Hook Angle 5', text:'', cta:'SHOP_NOW', url:'', status:'PAUSED' },
    ]
  }
];

/* ===================================================
   INIT
=================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initTheme();
  initButtons();
  initTemplates();
  setDefaultStartDate();
  renderTable();
});

function setDefaultStartDate() {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const local = d.toISOString().slice(0, 16);
  const el = document.getElementById('cfg-start-date');
  if (el) el.value = local;
}

/* ===================================================
   TABS
=================================================== */
function initTabs() {
  document.querySelectorAll('.be-tab').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
  });
}

function switchTab(name) {
  document.querySelectorAll('.be-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  document.querySelectorAll('.be-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${name}`));
  if (name === 'preview') buildPreview();
}

/* ===================================================
   THEME
=================================================== */
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  applyTheme(localStorage.getItem('theme') || 'dark');
  toggle.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    localStorage.setItem('theme', next);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  toggle.innerHTML = theme === 'dark'
    ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>'
    : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
}

/* ===================================================
   BUTTONS
=================================================== */
function initButtons() {
  // Config → Table
  document.getElementById('btn-go-to-table').addEventListener('click', () => switchTab('table'));
  // Table nav
  document.getElementById('btn-back-to-config').addEventListener('click', () => switchTab('config'));
  document.getElementById('btn-go-to-preview').addEventListener('click', () => switchTab('preview'));
  // Header
  document.getElementById('btn-export-xlsx').addEventListener('click', exportXLSX);
  document.getElementById('btn-howto').addEventListener('click', () => document.getElementById('howto-modal').classList.add('active'));
  document.getElementById('close-howto').addEventListener('click', () => document.getElementById('howto-modal').classList.remove('active'));
  document.getElementById('close-howto-btn').addEventListener('click', () => document.getElementById('howto-modal').classList.remove('active'));
  // Table toolbar
  document.getElementById('btn-add-row').addEventListener('click', addRow);
  document.getElementById('btn-clone-row').addEventListener('click', cloneSelected);
  document.getElementById('btn-delete-selected').addEventListener('click', deleteSelected);
  document.getElementById('btn-clear-all').addEventListener('click', clearAll);
  document.getElementById('btn-import-csv').addEventListener('click', () => document.getElementById('csv-file-input').click());
  document.getElementById('csv-file-input').addEventListener('change', importCSV);
  document.getElementById('select-all-rows').addEventListener('change', toggleSelectAll);
  // Preview
  document.getElementById('btn-final-export').addEventListener('click', exportXLSX);
  document.getElementById('btn-copy-preview').addEventListener('click', copyCSV);
  // Templates
  document.getElementById('btn-load-template').addEventListener('click', () => document.getElementById('template-modal').classList.add('active'));
  document.getElementById('close-template').addEventListener('click', () => document.getElementById('template-modal').classList.remove('active'));
  document.getElementById('close-template-btn').addEventListener('click', () => document.getElementById('template-modal').classList.remove('active'));
  // Modal overlay close
  document.querySelectorAll('.modal').forEach(m => {
    m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); });
  });
}

/* ===================================================
   TEMPLATES
=================================================== */
function initTemplates() {
  const container = document.getElementById('template-list-items');
  if (!container) return;
  container.innerHTML = TEMPLATES.map((t, i) => `
    <div class="template-item" onclick="loadTemplate(${i})">
      <div>
        <div class="template-name">${t.name}</div>
        <div class="template-meta">${t.meta}</div>
      </div>
      <button class="btn-ghost-sm" onclick="event.stopPropagation();loadTemplate(${i})">
        <i class="fa-solid fa-download"></i> Dùng
      </button>
    </div>
  `).join('');
}

function loadTemplate(idx) {
  const t = TEMPLATES[idx];
  if (!t) return;
  rows = t.rows.map(r => ({ id: ++rowCounter, selected: false, ...r }));
  renderTable();
  document.getElementById('template-modal').classList.remove('active');
  switchTab('table');
  showToast(`Đã load template: ${t.name}`);
}

/* ===================================================
   ROW MANAGEMENT
=================================================== */
function emptyRow() {
  const cfg = getConfig();
  return {
    id: ++rowCounter,
    selected: false,
    adsetName: '',
    country: 'PH',
    ageMin: '18',
    ageMax: '45',
    gender: 'All',
    interest: '',
    placement: 'All',
    budget: cfg.budget || '10',
    adName: '',
    creative: '',
    headline: '',
    text: cfg.primaryText || '',
    cta: cfg.cta || 'SHOP_NOW',
    url: cfg.landingUrl || '',
    status: 'PAUSED',
  };
}

function addRow() {
  rows.push(emptyRow());
  renderTable();
  // Scroll to last row
  const tbody = document.getElementById('bulk-tbody');
  if (tbody && tbody.lastElementChild) {
    tbody.lastElementChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function cloneSelected() {
  const selected = rows.filter(r => r.selected);
  if (selected.length === 0) { showToast('Chưa chọn hàng nào để nhân bản!', 'warn'); return; }
  selected.forEach(r => {
    const clone = { ...r, id: ++rowCounter, selected: false, adsetName: r.adsetName + ' (copy)', adName: r.adName + '_copy' };
    rows.push(clone);
  });
  renderTable();
  showToast(`Đã nhân bản ${selected.length} hàng`);
}

function deleteSelected() {
  const before = rows.length;
  rows = rows.filter(r => !r.selected);
  renderTable();
  const deleted = before - rows.length;
  if (deleted === 0) showToast('Chưa chọn hàng nào!', 'warn');
  else showToast(`Đã xóa ${deleted} hàng`);
}

function deleteRow(id) {
  rows = rows.filter(r => r.id !== id);
  renderTable();
}

function clearAll() {
  if (rows.length === 0) return;
  if (!confirm(`Xóa tất cả ${rows.length} hàng?`)) return;
  rows = [];
  renderTable();
  showToast('Đã xóa tất cả hàng');
}

function toggleSelectAll() {
  const checked = document.getElementById('select-all-rows').checked;
  rows.forEach(r => r.selected = checked);
  renderTable();
}

/* ===================================================
   RENDER TABLE
=================================================== */
function renderTable() {
  const tbody = document.getElementById('bulk-tbody');
  const empty = document.getElementById('table-empty');
  const wrapper = document.querySelector('.table-wrapper');

  updateRowCount();

  if (rows.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    if (wrapper) wrapper.style.display = 'none';
    return;
  }

  empty.classList.add('hidden');
  if (wrapper) wrapper.style.display = '';

  tbody.innerHTML = rows.map((row, idx) => buildRow(row, idx)).join('');

  // Attach inline edit listeners
  tbody.querySelectorAll('.cell-input').forEach(input => {
    input.addEventListener('input', e => {
      const id = +e.target.closest('tr').dataset.id;
      const field = e.target.dataset.field;
      updateRowField(id, field, e.target.value);
    });
  });
  tbody.querySelectorAll('.cell-select').forEach(sel => {
    sel.addEventListener('change', e => {
      const id = +e.target.closest('tr').dataset.id;
      const field = e.target.dataset.field;
      updateRowField(id, field, e.target.value);
    });
  });
  tbody.querySelectorAll('.row-check').forEach(cb => {
    cb.addEventListener('change', e => {
      const id = +e.target.closest('tr').dataset.id;
      const row = rows.find(r => r.id === id);
      if (row) row.selected = e.target.checked;
      updateSelectAll();
    });
  });
}

function buildRow(row, idx) {
  const ctaOptions = ['SHOP_NOW','LEARN_MORE','ORDER_NOW','GET_OFFER','BUY_NOW','SIGN_UP','CONTACT_US']
    .map(v => `<option value="${v}" ${row.cta === v ? 'selected' : ''}>${v}</option>`).join('');
  const placementOptions = ['All','Facebook Only','Facebook + IG','Reels Only']
    .map(v => `<option value="${v}" ${row.placement === v ? 'selected' : ''}>${v}</option>`).join('');
  const statusOptions = ['PAUSED','ACTIVE']
    .map(v => `<option value="${v}" ${row.status === v ? 'selected' : ''}>${v}</option>`).join('');
  const genderOptions = ['All','Male','Female']
    .map(v => `<option value="${v}" ${row.gender === v ? 'selected' : ''}>${v}</option>`).join('');
  const countryOptions = ['PH','VN','ID','TH','MY','SG','US','GB','AU']
    .map(v => `<option value="${v}" ${row.country === v ? 'selected' : ''}>${v}</option>`).join('');

  return `
    <tr data-id="${row.id}" class="${row.selected ? 'selected' : ''}">
      <td class="col-check"><input type="checkbox" class="row-check" ${row.selected ? 'checked' : ''}></td>
      <td class="row-num-cell">${idx + 1}</td>
      <td><input class="cell-input" data-field="adsetName" value="${esc(row.adsetName)}" placeholder="Tên Ad Set" style="min-width:180px"></td>
      <td><select class="cell-select" data-field="country">${countryOptions}</select></td>
      <td>
        <div style="display:flex;align-items:center;gap:3px">
          <input class="cell-input" data-field="ageMin" type="number" value="${row.ageMin}" style="width:44px;min-width:44px;text-align:center" min="18" max="65">
          <span style="color:var(--text-muted);font-size:.75rem">–</span>
          <input class="cell-input" data-field="ageMax" type="number" value="${row.ageMax}" style="width:44px;min-width:44px;text-align:center" min="18" max="65">
        </div>
      </td>
      <td><select class="cell-select" data-field="gender">${genderOptions}</select></td>
      <td><input class="cell-input" data-field="interest" value="${esc(row.interest)}" placeholder="Sở thích…" style="min-width:140px"></td>
      <td><select class="cell-select" data-field="placement">${placementOptions}</select></td>
      <td><input class="cell-input" data-field="budget" type="number" value="${row.budget}" style="min-width:70px" min="1" step="0.5"></td>
      <td><input class="cell-input" data-field="adName" value="${esc(row.adName)}" placeholder="Tên Ad" style="min-width:140px"></td>
      <td><input class="cell-input" data-field="creative" value="${esc(row.creative)}" placeholder="Video ID / Hash" style="min-width:130px"></td>
      <td><input class="cell-input" data-field="headline" value="${esc(row.headline)}" placeholder="Headline" style="min-width:140px"></td>
      <td><input class="cell-input" data-field="text" value="${esc(row.text)}" placeholder="Primary Text" style="min-width:160px"></td>
      <td><select class="cell-select" data-field="cta">${ctaOptions}</select></td>
      <td><input class="cell-input" data-field="url" value="${esc(row.url)}" placeholder="https://…" type="url" style="min-width:160px"></td>
      <td><select class="cell-select" data-field="status">${statusOptions}</select></td>
      <td style="text-align:center;white-space:nowrap">
        <button class="btn-row-clone" onclick="cloneRowById(${row.id})" title="Nhân bản"><i class="fa-solid fa-copy"></i></button>
        <button class="btn-row-delete" onclick="deleteRow(${row.id})" title="Xóa"><i class="fa-solid fa-trash"></i></button>
      </td>
    </tr>
  `;
}

function esc(str) {
  return String(str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function updateRowField(id, field, value) {
  const row = rows.find(r => r.id === id);
  if (row) row[field] = value;
}

function cloneRowById(id) {
  const row = rows.find(r => r.id === id);
  if (!row) return;
  const clone = { ...row, id: ++rowCounter, selected: false, adsetName: row.adsetName + ' (copy)', adName: row.adName + '_copy' };
  const idx = rows.findIndex(r => r.id === id);
  rows.splice(idx + 1, 0, clone);
  renderTable();
}

function updateSelectAll() {
  const all = rows.length > 0 && rows.every(r => r.selected);
  document.getElementById('select-all-rows').checked = all;
}

function updateRowCount() {
  const n = rows.length;
  document.getElementById('row-count-badge').textContent = `${n} hàng`;
  document.getElementById('table-row-info').textContent = `${n} hàng`;
}

/* ===================================================
   CONFIG READER
=================================================== */
function getConfig() {
  return {
    campaignName: document.getElementById('cfg-campaign-name')?.value?.trim() || 'Campaign_Bulk',
    objective: document.getElementById('cfg-objective')?.value || 'OUTCOME_SALES',
    campaignStatus: document.getElementById('cfg-campaign-status')?.value || 'PAUSED',
    campaignId: document.getElementById('cfg-campaign-id')?.value?.trim() || '',
    accountId: 'act_' + (document.getElementById('cfg-account-id')?.value?.trim() || ''),
    pixelId: document.getElementById('cfg-pixel-id')?.value?.trim() || '',
    pageId: document.getElementById('cfg-page-id')?.value?.trim() || '',
    budget: document.getElementById('cfg-budget')?.value || '10',
    optEvent: document.getElementById('cfg-opt-event')?.value || 'PURCHASE',
    bidStrategy: document.getElementById('cfg-bid-strategy')?.value || 'LOWEST_COST_WITHOUT_CAP',
    startDate: document.getElementById('cfg-start-date')?.value || '',
    landingUrl: document.getElementById('cfg-landing-url')?.value?.trim() || '',
    cta: document.getElementById('cfg-cta')?.value || 'SHOP_NOW',
    format: document.getElementById('cfg-format')?.value || 'VIDEO',
    primaryText: document.getElementById('cfg-primary-text')?.value?.trim() || '',
    adsetNameTpl: document.getElementById('cfg-adset-name-tpl')?.value || '{adsetName}',
    adNameTpl: document.getElementById('cfg-ad-name-tpl')?.value || '{adName}',
  };
}

/* ===================================================
   PREVIEW BUILD
=================================================== */
function buildPreview() {
  const cfg = getConfig();

  // Stats
  document.getElementById('stat-campaigns').textContent = '1 Campaign';
  document.getElementById('stat-adsets').textContent = `${rows.length} Ad Sets`;
  document.getElementById('stat-ads').textContent = `${rows.length} Ads`;
  const totalBudget = rows.reduce((s, r) => s + (parseFloat(r.budget) || 0), 0);
  document.getElementById('stat-budget').textContent = `$${totalBudget.toFixed(2)}/ngày`;

  // Summary card (campaign)
  const summaryEl = document.getElementById('preview-summary');
  summaryEl.innerHTML = `
    <div class="preview-card">
      <div class="preview-card-title"><i class="fa-solid fa-flag"></i> Campaign</div>
      <div class="preview-card-row"><span class="preview-card-key">Tên</span><span class="preview-card-val">${cfg.campaignName || '—'}</span></div>
      <div class="preview-card-row"><span class="preview-card-key">Mục tiêu</span><span class="preview-card-val">${cfg.objective}</span></div>
      <div class="preview-card-row"><span class="preview-card-key">Trạng thái</span><span class="preview-card-val">${cfg.campaignStatus}</span></div>
      <div class="preview-card-row"><span class="preview-card-key">Account ID</span><span class="preview-card-val">${cfg.accountId}</span></div>
    </div>
    <div class="preview-card">
      <div class="preview-card-title"><i class="fa-solid fa-layer-group"></i> Ad Set Defaults</div>
      <div class="preview-card-row"><span class="preview-card-key">Pixel</span><span class="preview-card-val">${cfg.pixelId || '—'}</span></div>
      <div class="preview-card-row"><span class="preview-card-key">Tối ưu sự kiện</span><span class="preview-card-val">${cfg.optEvent}</span></div>
      <div class="preview-card-row"><span class="preview-card-key">Giá thầu</span><span class="preview-card-val">${cfg.bidStrategy}</span></div>
      <div class="preview-card-row"><span class="preview-card-key">Ngày bắt đầu</span><span class="preview-card-val">${cfg.startDate || '—'}</span></div>
    </div>
    <div class="preview-card">
      <div class="preview-card-title"><i class="fa-solid fa-photo-film"></i> Creative Defaults</div>
      <div class="preview-card-row"><span class="preview-card-key">Landing URL</span><span class="preview-card-val">${cfg.landingUrl || '—'}</span></div>
      <div class="preview-card-row"><span class="preview-card-key">Format</span><span class="preview-card-val">${cfg.format}</span></div>
      <div class="preview-card-row"><span class="preview-card-key">CTA</span><span class="preview-card-val">${cfg.cta}</span></div>
      <div class="preview-card-row"><span class="preview-card-key">Tổng budget</span><span class="preview-card-val">$${totalBudget.toFixed(2)}/ngày</span></div>
    </div>
  `;

  // Preview table
  const headers = ['Campaign Name','Campaign ID','Campaign Objective','Campaign Status',
    'Ad Set Name','Ad Set Status','Daily Budget','Start Time',
    'Countries','Age Min','Age Max','Gender','Interests','Placements',
    'Optimization Goal','Bid Strategy','Pixel ID','Conversion Event',
    'Ad Name','Ad Status','Creative Type','Creative ID/Hash','Headline','Primary Text','CTA','Landing URL'];

  const previewTheadRow = document.getElementById('preview-thead-row');
  previewTheadRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('');

  const previewTbody = document.getElementById('preview-tbody');
  if (rows.length === 0) {
    previewTbody.innerHTML = `<tr><td colspan="${headers.length}" style="text-align:center;padding:2rem;color:var(--text-muted)">Chưa có hàng nào trong bảng. Quay lại Tab 2 để thêm Ad Sets.</td></tr>`;
    return;
  }

  previewTbody.innerHTML = rows.map(r => {
    const cells = [
      cfg.campaignName, cfg.campaignId || '(tạo mới)', cfg.objective, cfg.campaignStatus,
      r.adsetName || '—', r.status, `$${r.budget}`, cfg.startDate,
      r.country, r.ageMin, r.ageMax, r.gender, r.interest, r.placement,
      cfg.optEvent, cfg.bidStrategy, cfg.pixelId, cfg.optEvent,
      r.adName || '—', r.status, cfg.format, r.creative || '—', r.headline, r.text || cfg.primaryText, r.cta, r.url || cfg.landingUrl,
    ];
    return `<tr>${cells.map(c => `<td title="${esc(c)}">${c ? esc(String(c)) : '<span style="color:var(--text-muted)">—</span>'}</td>`).join('')}</tr>`;
  }).join('');
}

/* ===================================================
   EXPORT XLSX
=================================================== */
function exportXLSX() {
  if (typeof XLSX === 'undefined') {
    showToast('Đang tải thư viện Excel, thử lại sau 2 giây…', 'warn');
    return;
  }
  if (rows.length === 0) {
    showToast('Chưa có dữ liệu! Thêm ít nhất 1 hàng.', 'warn');
    return;
  }

  const cfg = getConfig();
  const headers = [
    'Campaign Name', 'Campaign ID', 'Campaign Objective', 'Campaign Status', 'Ad Account ID',
    'Ad Set Name', 'Ad Set ID', 'Ad Set Status', 'Daily Budget (USD)', 'Start Time',
    'Countries', 'Age Min', 'Age Max', 'Gender',
    'Interests', 'Placements',
    'Optimization Goal', 'Bid Strategy', 'Pixel ID', 'Conversion Event',
    'Ad Name', 'Ad ID', 'Ad Status',
    'Creative Type', 'Creative ID / Hash',
    'Headline', 'Primary Text', 'CTA', 'Landing URL',
    'Page ID'
  ];

  const dataRows = rows.map(r => [
    cfg.campaignName,
    cfg.campaignId || '',
    cfg.objective,
    cfg.campaignStatus,
    cfg.accountId,

    r.adsetName,
    '', // Ad Set ID (blank = create new)
    r.status,
    parseFloat(r.budget) || 10,
    cfg.startDate,

    r.country,
    parseInt(r.ageMin) || 18,
    parseInt(r.ageMax) || 45,
    r.gender,

    r.interest,
    r.placement,

    cfg.optEvent,
    cfg.bidStrategy,
    cfg.pixelId,
    cfg.optEvent,

    r.adName,
    '', // Ad ID (blank = create new)
    r.status,

    cfg.format,
    r.creative,

    r.headline,
    r.text || cfg.primaryText,
    r.cta,
    r.url || cfg.landingUrl,
    cfg.pageId,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

  // Column widths
  ws['!cols'] = headers.map((h, i) => {
    const maxLen = Math.max(h.length, ...dataRows.map(r => String(r[i] || '').length));
    return { wch: Math.min(Math.max(maxLen + 2, 14), 50) };
  });

  // Header style (yellow bg like SoraTools brand)
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C });
    if (!ws[addr]) continue;
    ws[addr].s = {
      fill: { fgColor: { rgb: 'FACC15' } },
      font: { bold: true, color: { rgb: '000000' } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: { bottom: { style: 'medium', color: { rgb: '000000' } } }
    };
  }

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Bulk Ads');

  // Metadata sheet
  const metaData = [
    ['SoraTools – Bulk Ad Builder Export'],
    ['Ngày xuất:', new Date().toLocaleString('vi-VN')],
    ['Campaign:', cfg.campaignName],
    ['Account ID:', cfg.accountId],
    ['Tổng Ad Sets:', rows.length],
    [''],
    ['Hướng dẫn import:'],
    ['1. Vào Ads Manager → thanh công cụ → Nhập/Xuất → Import Ads'],
    ['2. Chọn file .xlsx này → Nhấn Import'],
    ['3. Hệ thống sẽ hiển thị bản nháp (màu xanh) → Kiểm tra → Review & Publish'],
    [''],
    ['Lưu ý: Cột "Ad Set ID" và "Ad ID" để trống = tạo mới hoàn toàn.'],
    ['Điền Campaign ID nếu muốn thêm Ad Sets vào campaign đã có.'],
  ];
  const wsMeta = XLSX.utils.aoa_to_sheet(metaData);
  wsMeta['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, wsMeta, 'Hướng dẫn');

  const date = new Date().toISOString().slice(0, 10);
  const fileName = `BulkAds_${cfg.campaignName.replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 30)}_${date}.xlsx`;
  XLSX.writeFile(wb, fileName);
  showToast(`✅ Đã xuất: ${fileName}`);
}

/* ===================================================
   COPY CSV
=================================================== */
function copyCSV() {
  const cfg = getConfig();
  const headers = ['Campaign Name','Ad Set Name','Country','Age Min','Age Max','Gender','Interest','Placement','Budget','Ad Name','Creative','Headline','Primary Text','CTA','Landing URL','Status'];
  const lines = [headers.join('\t'), ...rows.map(r =>
    [cfg.campaignName, r.adsetName, r.country, r.ageMin, r.ageMax, r.gender, r.interest, r.placement, r.budget, r.adName, r.creative, r.headline, r.text || cfg.primaryText, r.cta, r.url || cfg.landingUrl, r.status].join('\t')
  )].join('\n');

  navigator.clipboard.writeText(lines).then(() => showToast('Đã copy CSV vào clipboard!')).catch(() => {
    showToast('Không thể copy, thử xuất Excel', 'warn');
  });
}

/* ===================================================
   CSV IMPORT
=================================================== */
function importCSV(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const text = ev.target.result;
    const lines = text.split('\n').filter(l => l.trim());
    if (lines.length < 2) { showToast('File CSV trống hoặc không hợp lệ', 'warn'); return; }
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[^a-z]/g,''));
    const newRows = lines.slice(1).map(line => {
      const cells = parseCSVLine(line);
      const r = emptyRow();
      headers.forEach((h, i) => {
        const v = (cells[i] || '').trim();
        if (h.includes('adset') || h.includes('name')) r.adsetName = v;
        else if (h === 'country') r.country = v;
        else if (h.includes('agemin') || h === 'agemin') r.ageMin = v;
        else if (h.includes('agemax') || h === 'agemax') r.ageMax = v;
        else if (h === 'gender') r.gender = v;
        else if (h.includes('interest')) r.interest = v;
        else if (h.includes('placement')) r.placement = v;
        else if (h.includes('budget')) r.budget = v;
        else if (h.includes('adname') || h === 'adname') r.adName = v;
        else if (h.includes('creative') || h.includes('hash')) r.creative = v;
        else if (h.includes('headline')) r.headline = v;
        else if (h.includes('text') || h.includes('primary')) r.text = v;
        else if (h === 'cta') r.cta = v;
        else if (h.includes('url') || h.includes('landing')) r.url = v;
        else if (h.includes('status')) r.status = v.toUpperCase() || 'PAUSED';
      });
      return r;
    });
    rows = [...rows, ...newRows];
    renderTable();
    showToast(`Đã import ${newRows.length} hàng từ CSV`);
    e.target.value = '';
  };
  reader.readAsText(file);
}

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(cur); cur = ''; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

/* ===================================================
   TOAST
=================================================== */
function showToast(msg, type = 'success') {
  const old = document.getElementById('sora-toast');
  if (old) old.remove();

  const toast = document.createElement('div');
  toast.id = 'sora-toast';
  const color = type === 'warn' ? '#f97316' : type === 'error' ? '#ef4444' : '#22c55e';
  toast.style.cssText = `
    position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999;
    background:var(--card-bg); color:var(--text-main);
    border:1.5px solid ${color}; border-radius:12px;
    padding:.85rem 1.25rem; font-size:.875rem; font-weight:600;
    box-shadow:0 8px 30px rgba(0,0,0,.35);
    display:flex; align-items:center; gap:.6rem;
    animation: slideUp .25s ease-out;
    max-width: 380px;
  `;
  const icon = type === 'warn' ? '⚠️' : type === 'error' ? '❌' : '✅';
  toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
