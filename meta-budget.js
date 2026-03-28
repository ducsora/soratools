// ============================================================
// SoraTools – Meta Ads Budget Manager (meta-budget.js)
// Connects to Meta Ads API: fetch campaigns, update budgets
// RBAC: leader + ceo only
// ============================================================
'use strict';

// ── RBAC Guard ───────────────────────────────────────────────
AuthGuard.requireRole('leader'); // Redirects if not leader/ceo

// ── Config ───────────────────────────────────────────────────
const CFG_KEY = 'sora_meta_cfg';

function loadCfg() {
  try { return JSON.parse(localStorage.getItem(CFG_KEY)) || {}; }
  catch { return {}; }
}
function saveCfg(cfg) {
  localStorage.setItem(CFG_KEY, JSON.stringify(cfg));
}

let cfg         = loadCfg();
let campaigns   = [];    // Normalized campaign list
let selectedIds = new Set();

// ── Theme ────────────────────────────────────────────────────
const themeToggle = document.getElementById('theme-toggle');
function initTheme() {
  if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');
  if (localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
  updateThemeIcon();
}
function updateThemeIcon() {
  const dark = document.body.getAttribute('data-theme') === 'dark';
  themeToggle.innerHTML = dark
    ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>'
    : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
}
themeToggle.addEventListener('click', () => {
  const dark = document.body.getAttribute('data-theme') === 'dark';
  dark ? document.body.removeAttribute('data-theme') : document.body.setAttribute('data-theme', 'dark');
  localStorage.setItem('theme', dark ? 'light' : 'dark');
  updateThemeIcon();
});

// ── Currency formatter ───────────────────────────────────────
function fmtMoney(val, currency) {
  const cur = currency || cfg.currency || 'VND';
  if (cur === 'VND') {
    if (val >= 1_000_000) return (val / 1_000_000).toFixed(1) + 'M ₫';
    if (val >= 1_000)     return (val / 1_000).toFixed(0) + 'K ₫';
    return val.toLocaleString('vi-VN') + ' ₫';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(val);
}
function parseBudgetAPI(rawVal) {
  // Meta API returns budget in cents for some currencies; for VND it's raw
  return parseFloat(rawVal) || 0;
}

// ── Status bar ────────────────────────────────────────────────
function setStatus(msg) {
  document.getElementById('mb-status-bar').textContent = msg;
}

// ── Connect Banner / Dashboard toggle ────────────────────────
function showState(state, errMsg = '') {
  document.getElementById('mb-connect-banner').style.display = 'none';
  document.getElementById('mb-dashboard').style.display      = 'none';
  document.getElementById('mb-loading').style.display        = 'none';
  document.getElementById('mb-error').style.display          = 'none';

  if (state === 'banner')    document.getElementById('mb-connect-banner').style.display = '';
  if (state === 'dashboard') document.getElementById('mb-dashboard').style.display      = '';
  if (state === 'loading')   document.getElementById('mb-loading').style.display        = '';
  if (state === 'error') {
    document.getElementById('mb-error').style.display    = '';
    document.getElementById('mb-error-msg').textContent  = errMsg;
  }
}

// ── Meta Ads API helper ──────────────────────────────────────
const BASE = () => `https://graph.facebook.com/${cfg.version || 'v22.0'}`;

async function apiGet(path, params = {}) {
  const url = new URL(`${BASE()}${path}`);
  url.searchParams.set('access_token', cfg.token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const res = await fetch(url.toString());
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || `HTTP ${res.status}`);
  return json;
}

async function apiPost(path, body = {}) {
  const url = new URL(`${BASE()}${path}`);
  url.searchParams.set('access_token', cfg.token);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || json.error) throw new Error(json.error?.message || `HTTP ${res.status}`);
  return json;
}

// ── Load campaigns + insights ─────────────────────────────────
async function loadCampaigns() {
  if (!cfg.token || !cfg.account) { showState('banner'); return; }

  showState('loading');
  setStatus('Đang tải danh sách campaigns…');
  addLog('info', 'Bắt đầu tải dữ liệu từ Meta Ads API…');

  try {
    const accountStr = cfg.account.trim();
    const accountIds = accountStr.split(',').map(a => a.trim()).filter(a => a.length > 0);

    let allCampList = [];
    let allInsightsMap = {};

    for (let acc of accountIds) {
      let accountId = acc;
      if (!accountId.startsWith('act_')) accountId = 'act_' + accountId;

      try {
        // Step 1: Get campaigns for this account
        const campData = await apiGet(`/${accountId}/campaigns`, {
          fields: 'id,name,status,daily_budget,lifetime_budget,budget_remaining,objective,created_time',
          limit: 100,
        });
        
        const campList = campData.data || [];
        allCampList.push(...campList.map(c => ({ ...c, _accountId: accountId })));

        // Step 2: Get insights (spend, ROAS, CPC, conversions) for today
        const insightsData = await apiGet(`/${accountId}/insights`, {
          level: 'campaign',
          fields: 'campaign_id,spend,cpc,purchase_roas,conversions,impressions,clicks',
          date_preset: 'today',
          limit: 100,
        });

        // Map insights by campaign_id
        (insightsData.data || []).forEach(ins => {
          allInsightsMap[ins.campaign_id] = ins;
        });

      } catch (accErr) {
        addLog('error', `Lỗi tải tài khoản ${accountId}: ${accErr.message}`);
      }
    }

    if (!allCampList.length) {
      showState('error', 'Không tìm thấy campaign nào, hoặc lỗi kết nối tài khoản.');
      return;
    }

    // Merge
    campaigns = allCampList.map(camp => {
      const ins = allInsightsMap[camp.id] || {};
      const roas = parseFloat(ins.purchase_roas?.[0]?.value) || null;
      return {
        id:            camp.id,
        name:          camp.name,
        status:        camp.status,
        daily_budget:  parseBudgetAPI(camp.daily_budget),
        lifetime_budget: parseBudgetAPI(camp.lifetime_budget),
        budget_remaining: parseBudgetAPI(camp.budget_remaining),
        objective:     camp.objective,
        created_time:  camp.created_time,
        // insights
        spend:         parseFloat(ins.spend) || 0,
        cpc:           parseFloat(ins.cpc)   || null,
        roas:          roas,
        conversions:   parseInt(ins.conversions?.[0]?.value) || 0,
        impressions:   parseInt(ins.impressions)   || 0,
        clicks:        parseInt(ins.clicks)         || 0,
        // local flag
        pendingBudget: null,
      };
    });

    renderKPIs();
    renderTable();
    showState('dashboard');
    enableCtrls(true);
    setStatus(`Đã tải ${campaigns.length} campaigns từ ${accountIds.length} tài khoản · Cập nhật lúc ${new Date().toLocaleTimeString('vi-VN')}`);
    addLog('success', `Tải thành công ${campaigns.length} campaigns từ ${accountIds.length} tài khoản!`);

  } catch (err) {
    showState('error', `❌ ${err.message}`);
    addLog('error', 'Lỗi tải dữ liệu: ' + err.message);
    setStatus('Lỗi kết nối API');
  }
}

function enableCtrls(on) {
  document.getElementById('mb-refresh-btn').disabled = !on;
  document.getElementById('mb-auto-btn').disabled    = !on;
}

// ── KPIs ─────────────────────────────────────────────────────
function renderKPIs() {
  const active   = campaigns.filter(c => c.status === 'ACTIVE');
  const totalSpend  = campaigns.reduce((s, c) => s + c.spend, 0);
  const totalBudget = campaigns.reduce((s, c) => s + (c.daily_budget || 0), 0);
  const roasVals    = campaigns.filter(c => c.roas !== null).map(c => c.roas);
  const avgRoas     = roasVals.length ? (roasVals.reduce((a, b) => a + b, 0) / roasVals.length) : null;

  document.getElementById('kpi-spend').textContent  = fmtMoney(totalSpend);
  document.getElementById('kpi-roas').textContent   = avgRoas !== null ? avgRoas.toFixed(2) + 'x' : '—';
  document.getElementById('kpi-active').textContent = active.length;
  document.getElementById('kpi-budget').textContent = fmtMoney(totalBudget);
}

// ── Table render ─────────────────────────────────────────────
function getFilteredCampaigns() {
  const q            = document.getElementById('mb-search').value.toLowerCase();
  const statusFilter = document.getElementById('mb-filter-status').value;
  const roasFilter   = document.getElementById('mb-filter-roas').value;
  const roasTarget   = parseFloat(document.getElementById('sr-roas-target').value) || 2.5;

  return campaigns.filter(c => {
    if (q && !c.name.toLowerCase().includes(q) && !c.id.includes(q)) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    if (roasFilter === 'good' && !(c.roas !== null && c.roas >= roasTarget)) return false;
    if (roasFilter === 'bad'  && !(c.roas === null || c.roas < roasTarget))  return false;
    return true;
  });
}

function renderTable() {
  const list = getFilteredCampaigns();
  const roasTarget = parseFloat(document.getElementById('sr-roas-target').value) || 2.5;
  const tbody = document.getElementById('mb-tbody');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-muted)">Không tìm thấy campaign nào.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(camp => {
    const isActive   = camp.status === 'ACTIVE';
    const statusHtml = isActive
      ? `<span class="status-badge status-active"><span class="status-dot"></span>Đang chạy</span>`
      : `<span class="status-badge status-paused"><span class="status-dot"></span>Tạm dừng</span>`;

    const roasClass  = camp.roas === null ? 'roas-na'
                     : camp.roas >= roasTarget ? 'roas-good' : 'roas-bad';
    const roasHtml   = camp.roas !== null
      ? `<span class="${roasClass}">${camp.roas.toFixed(2)}x</span>`
      : `<span class="roas-na">—</span>`;

    const budgetDisplay = camp.daily_budget
      ? fmtMoney(camp.daily_budget)
      : (camp.lifetime_budget ? `LT: ${fmtMoney(camp.lifetime_budget)}` : '—');

    const changeBadge = camp._lastChange
      ? `<span class="budget-change-badge ${camp._lastChange > 0 ? 'change-up' : 'change-down'}">${camp._lastChange > 0 ? '+' : ''}${camp._lastChange.toFixed(0)}%</span>`
      : '';

    const checked = selectedIds.has(camp.id) ? 'checked' : '';

    return `<tr class="${selectedIds.has(camp.id) ? 'row-selected' : ''}" data-id="${camp.id}">
      <td><input type="checkbox" class="row-chk" data-id="${camp.id}" ${checked}></td>
      <td>
        <span class="camp-name" title="${camp.name}">${camp.name}</span>
        <div class="camp-id">${camp.id} · Acc: ${camp._accountId || 'N/A'}</div>
      </td>
      <td>${statusHtml}</td>
      <td>${fmtMoney(camp.spend)}</td>
      <td>${roasHtml}</td>
      <td>${camp.cpc !== null ? fmtMoney(camp.cpc) : '—'}</td>
      <td>${camp.conversions || 0}</td>
      <td class="budget-cell">${budgetDisplay}${changeBadge}</td>
      <td>
        <div class="quick-adjust">
          <button class="qa-btn up"   onclick="quickAdjust('${camp.id}', 10)">+10%</button>
          <button class="qa-btn up"   onclick="quickAdjust('${camp.id}', 20)">+20%</button>
          <button class="qa-btn down" onclick="quickAdjust('${camp.id}',-20)">-20%</button>
          <button class="qa-btn down" onclick="quickAdjust('${camp.id}',-50)">-50%</button>
        </div>
      </td>
      <td>
        <div class="row-action">
          <button class="ra-btn edit" onclick="openEditBudget('${camp.id}')" title="Chỉnh sửa ngân sách"><i class="fa-solid fa-pen"></i></button>
          <button class="ra-btn" onclick="toggleStatus('${camp.id}')" title="${isActive ? 'Tạm dừng' : 'Bật lại'}">
            <i class="fa-solid ${isActive ? 'fa-pause' : 'fa-play'}"></i>
          </button>
        </div>
      </td>
    </tr>`;
  }).join('');

  // Bind checkboxes
  document.querySelectorAll('.row-chk').forEach(chk => {
    chk.addEventListener('change', () => {
      const id = chk.dataset.id;
      chk.checked ? selectedIds.add(id) : selectedIds.delete(id);
      updateBulkUI();
      // highlight row
      chk.closest('tr').classList.toggle('row-selected', chk.checked);
    });
  });

  // Sync select-all checkbox
  document.getElementById('mb-chk-all').checked =
    list.length > 0 && list.every(c => selectedIds.has(c.id));
}

// ── Selection ─────────────────────────────────────────────────
function updateBulkUI() {
  const cnt = selectedIds.size;
  const countEl  = document.getElementById('mb-selected-count');
  const bulkUp   = document.getElementById('mb-bulk-up');
  const bulkDown = document.getElementById('mb-bulk-down');
  countEl.style.display  = cnt ? 'inline-block' : 'none';
  bulkUp.style.display   = cnt ? 'inline-flex'  : 'none';
  bulkDown.style.display = cnt ? 'inline-flex'  : 'none';
  if (cnt) countEl.textContent = `${cnt} đã chọn`;
}

document.getElementById('mb-chk-all').addEventListener('change', function() {
  const list = getFilteredCampaigns();
  list.forEach(c => this.checked ? selectedIds.add(c.id) : selectedIds.delete(c.id));
  renderTable();
  updateBulkUI();
});

document.getElementById('mb-select-all-btn').addEventListener('click', () => {
  const list = getFilteredCampaigns();
  const allSel = list.every(c => selectedIds.has(c.id));
  list.forEach(c => allSel ? selectedIds.delete(c.id) : selectedIds.add(c.id));
  renderTable();
  updateBulkUI();
});

// ── Quick adjust ─────────────────────────────────────────────
window.quickAdjust = async function(campId, pct) {
  const camp = campaigns.find(c => c.id === campId);
  if (!camp || !camp.daily_budget) {
    addLog('warn', `${camp?.name}: Campaign không có daily_budget – không thể điều chỉnh.`);
    return;
  }
  const newBudget = Math.round(camp.daily_budget * (1 + pct / 100));
  await applyBudget(camp, newBudget, pct);
};

// ── Toggle status (pause/resume) ─────────────────────────────
window.toggleStatus = async function(campId) {
  const camp = campaigns.find(c => c.id === campId);
  if (!camp) return;
  const newStatus = camp.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
  if (!confirm(`${newStatus === 'PAUSED' ? 'Tạm dừng' : 'Bật lại'} campaign "${camp.name}"?`)) return;

  try {
    await apiPost(`/${campId}`, { status: newStatus });
    camp.status = newStatus;
    renderTable();
    addLog('success', `${newStatus === 'PAUSED' ? '⏸' : '▶️'} ${camp.name} → ${newStatus}`);
  } catch(err) {
    addLog('error', `Lỗi đổi trạng thái "${camp.name}": ${err.message}`);
    showToast('❌ ' + err.message, 'error');
  }
};

// ── Apply budget to API ───────────────────────────────────────
async function applyBudget(camp, newBudget, changePct = null) {
  const budget = getCap(newBudget);
  try {
    await apiPost(`/${camp.id}`, { daily_budget: String(budget) });
    const oldBudget = camp.daily_budget;
    camp.daily_budget  = budget;
    camp._lastChange   = changePct ?? ((budget - oldBudget) / oldBudget * 100);
    renderKPIs();
    renderTable();
    const arrow = camp._lastChange >= 0 ? '📈' : '📉';
    addLog('success', `${arrow} ${camp.name}: ${fmtMoney(oldBudget)} → ${fmtMoney(budget)} (${camp._lastChange > 0 ? '+' : ''}${camp._lastChange.toFixed(1)}%)`);
    showToast(`✅ Đã cập nhật ngân sách: ${fmtMoney(budget)}`, 'success');
  } catch(err) {
    addLog('error', `Lỗi cập nhật "${camp.name}": ${err.message}`);
    showToast('❌ ' + err.message, 'error');
  }
}

function getCap(budget) {
  const cap = parseFloat(document.getElementById('sr-budget-cap').value) || Infinity;
  return Math.min(Math.max(budget, 10000), cap);  // minimum 10K
}

// ── Auto optimize (Smart Rules) ───────────────────────────────
document.getElementById('mb-auto-btn').addEventListener('click', async () => {
  const roasTarget  = parseFloat(document.getElementById('sr-roas-target').value) || 2.5;
  const scaleUp     = parseFloat(document.getElementById('sr-scale-up').value)    || 20;
  const scaleDown   = parseFloat(document.getElementById('sr-scale-down').value)  || 20;

  const eligible = campaigns.filter(c => c.status === 'ACTIVE' && c.daily_budget && c.roas !== null);
  if (!eligible.length) {
    showToast('⚠️ Không có campaign nào đủ điều kiện (cần ACTIVE + có ROAS hôm nay)', 'warn');
    return;
  }

  const toScale = eligible.filter(c => c.roas >= roasTarget);
  const toCut   = eligible.filter(c => c.roas <  roasTarget);

  addLog('info', `🤖 Tự động tối ưu bắt đầu — ROAS target: ${roasTarget}x | Tăng: +${scaleUp}% | Giảm: -${scaleDown}%`);

  const preview = [
    ...toScale.map(c => `📈 ${c.name} (ROAS ${c.roas.toFixed(2)}x) → +${scaleUp}%`),
    ...toCut.map(c   => `📉 ${c.name} (ROAS ${c.roas.toFixed(2)}x) → -${scaleDown}%`),
  ].join('\n');

  if (!confirm(`Sẽ điều chỉnh ${eligible.length} campaigns:\n\n${preview}\n\nXác nhận?`)) return;

  for (const camp of toScale) {
    const newBudget = Math.round(camp.daily_budget * (1 + scaleUp / 100));
    await applyBudget(camp, newBudget, scaleUp);
  }
  for (const camp of toCut) {
    const newBudget = Math.round(camp.daily_budget * (1 - scaleDown / 100));
    await applyBudget(camp, newBudget, -scaleDown);
  }
  addLog('info', `✅ Hoàn tất tự động tối ưu — ${toScale.length} tăng, ${toCut.length} giảm`);
});

// ── Bulk adjust ───────────────────────────────────────────────
let bulkMode = 'up';
function openBulkModal(mode) {
  bulkMode = mode;
  const count = selectedIds.size;
  document.getElementById('bulk-campaign-count').textContent =
    `Sẽ ${mode === 'up' ? 'tăng' : 'giảm'} ngân sách cho ${count} campaign đã chọn.`;
  document.getElementById('bulk-slider').value = 0;
  document.getElementById('bulk-slider-val').textContent = '0%';
  document.getElementById('bulk-modal').classList.add('active');
}

document.getElementById('mb-bulk-up').addEventListener('click',   () => openBulkModal('up'));
document.getElementById('mb-bulk-down').addEventListener('click', () => openBulkModal('down'));

document.getElementById('bulk-slider').addEventListener('input', function() {
  document.getElementById('bulk-slider-val').textContent = (this.value > 0 ? '+' : '') + this.value + '%';
});

document.querySelectorAll('#bulk-modal .eb-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const pct = parseInt(btn.dataset.pct);
    document.getElementById('bulk-slider').value = pct;
    document.getElementById('bulk-slider-val').textContent = (pct > 0 ? '+' : '') + pct + '%';
  });
});

document.getElementById('confirm-bulk-btn').addEventListener('click', async () => {
  const pct = parseInt(document.getElementById('bulk-slider').value);
  if (pct === 0) { showToast('⚠️ Chọn % thay đổi trước.', 'warn'); return; }
  document.getElementById('bulk-modal').classList.remove('active');
  for (const id of selectedIds) {
    const camp = campaigns.find(c => c.id === id);
    if (!camp || !camp.daily_budget) continue;
    const newBudget = Math.round(camp.daily_budget * (1 + pct / 100));
    await applyBudget(camp, newBudget, pct);
  }
  selectedIds.clear();
  renderTable();
  updateBulkUI();
});

document.getElementById('close-bulk-modal').addEventListener('click', () => document.getElementById('bulk-modal').classList.remove('active'));
document.getElementById('cancel-bulk-btn').addEventListener('click', () => document.getElementById('bulk-modal').classList.remove('active'));

// ── Edit Budget Modal ─────────────────────────────────────────
let editingCamp = null;
const editModal = document.getElementById('edit-budget-modal');

window.openEditBudget = function(campId) {
  const camp = campaigns.find(c => c.id === campId);
  if (!camp) return;
  editingCamp = camp;

  const cur = cfg.currency || 'VND';
  document.getElementById('eb-currency-label').textContent = cur;
  document.getElementById('eb-new-budget').value = camp.daily_budget || 0;
  document.getElementById('eb-current-label').textContent = fmtMoney(camp.daily_budget || 0);
  document.getElementById('eb-slider').value = 0;
  document.getElementById('eb-slider-val').textContent = '0%';
  document.getElementById('eb-preview').style.display = 'none';

  // Campaign info
  const roasTxt = camp.roas !== null ? `ROAS: ${camp.roas.toFixed(2)}x` : 'Chưa có ROAS';
  document.getElementById('eb-campaign-info').innerHTML = `
    <div class="ci-name">${camp.name}</div>
    <div class="ci-meta">
      <span><i class="fa-solid fa-circle-play"></i> ${camp.status === 'ACTIVE' ? 'Đang chạy' : 'Tạm dừng'}</span>
      <span><i class="fa-solid fa-chart-line"></i> ${roasTxt}</span>
      <span><i class="fa-solid fa-money-bill-wave"></i> Chi tiêu: ${fmtMoney(camp.spend)}</span>
    </div>`;

  editModal.classList.add('active');
};

// Preset buttons in edit modal
document.querySelectorAll('#edit-budget-modal .eb-preset-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    if (!editingCamp) return;
    const pct    = parseInt(btn.dataset.pct);
    const newVal = Math.round((editingCamp.daily_budget || 0) * (1 + pct / 100));
    document.getElementById('eb-new-budget').value = newVal;
    document.getElementById('eb-slider').value     = pct;
    document.getElementById('eb-slider-val').textContent = (pct > 0 ? '+' : '') + pct + '%';
    updateEditPreview();
  });
});

// Slider in edit modal
document.getElementById('eb-slider').addEventListener('input', function() {
  if (!editingCamp) return;
  const pct    = parseInt(this.value);
  const newVal = Math.round((editingCamp.daily_budget || 0) * (1 + pct / 100));
  document.getElementById('eb-new-budget').value = newVal;
  document.getElementById('eb-slider-val').textContent = (pct > 0 ? '+' : '') + pct + '%';
  updateEditPreview();
});

document.getElementById('eb-new-budget').addEventListener('input', function() {
  updateEditPreview();
  if (!editingCamp || !editingCamp.daily_budget) return;
  const pct = ((this.value - editingCamp.daily_budget) / editingCamp.daily_budget) * 100;
  document.getElementById('eb-slider').value = Math.round(pct);
  document.getElementById('eb-slider-val').textContent = (pct > 0 ? '+' : '') + pct.toFixed(0) + '%';
});

function updateEditPreview() {
  if (!editingCamp) return;
  const newVal = parseFloat(document.getElementById('eb-new-budget').value) || 0;
  const diff   = newVal - (editingCamp.daily_budget || 0);
  const pct    = editingCamp.daily_budget ? ((diff / editingCamp.daily_budget) * 100).toFixed(1) : 0;
  const el     = document.getElementById('eb-preview');
  el.style.display = '';
  document.getElementById('eb-preview-text').textContent =
    `${fmtMoney(editingCamp.daily_budget || 0)} → ${fmtMoney(newVal)} (${diff >= 0 ? '+' : ''}${pct}%)`;
}

document.getElementById('confirm-edit-budget-btn').addEventListener('click', async () => {
  if (!editingCamp) return;
  const newBudget = parseFloat(document.getElementById('eb-new-budget').value);
  if (!newBudget || newBudget < 0) { showToast('⚠️ Ngân sách không hợp lệ.', 'warn'); return; }
  editModal.classList.remove('active');
  await applyBudget(editingCamp, newBudget);
});

document.getElementById('close-edit-budget').addEventListener('click', () => editModal.classList.remove('active'));
document.getElementById('cancel-edit-budget-btn').addEventListener('click', () => editModal.classList.remove('active'));
editModal.addEventListener('click', e => { if (e.target === editModal) editModal.classList.remove('active'); });
document.getElementById('bulk-modal').addEventListener('click', e => { if (e.target === document.getElementById('bulk-modal')) document.getElementById('bulk-modal').classList.remove('active'); });

// ── Config Modal ──────────────────────────────────────────────
const configModal = document.getElementById('config-modal');
function openConfig() {
  document.getElementById('cfg-token').value   = cfg.token   || '';
  document.getElementById('cfg-account').value = cfg.account || '';
  document.getElementById('cfg-version').value = cfg.version || 'v22.0';
  document.getElementById('cfg-currency').value= cfg.currency|| 'VND';
  document.getElementById('cfg-test-result').style.display = 'none';
  configModal.classList.add('active');
}

document.getElementById('mb-settings-btn').addEventListener('click', openConfig);
document.getElementById('mb-open-config-btn').addEventListener('click', openConfig);
document.getElementById('close-config-btn').addEventListener('click', () => configModal.classList.remove('active'));
document.getElementById('cancel-config-btn').addEventListener('click', () => configModal.classList.remove('active'));
configModal.addEventListener('click', e => { if (e.target === configModal) configModal.classList.remove('active'); });

// Test connection
document.getElementById('test-conn-btn').addEventListener('click', async () => {
  const token   = document.getElementById('cfg-token').value.trim();
  let accountStr= document.getElementById('cfg-account').value.trim();
  const version = document.getElementById('cfg-version').value;
  const resultEl = document.getElementById('cfg-test-result');
  resultEl.style.display = 'none';

  if (!token || !accountStr) { showToast('⚠️ Nhập token và account ID trước.', 'warn'); return; }
  
  const accountIds = accountStr.split(',').map(a => a.trim()).filter(a => a.length > 0);

  const btn = document.getElementById('test-conn-btn');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra…';
  btn.disabled  = true;

  try {
    let successHtml = [];
    for (let acc of accountIds) {
      if (!acc.startsWith('act_')) acc = 'act_' + acc;
      const url = `https://graph.facebook.com/${version}/${acc}?fields=name,currency,account_status&access_token=${token}`;
      const res  = await fetch(url);
      const json = await res.json();
      if (json.error) throw new Error(`[${acc}]: ` + json.error.message);
      
      successHtml.push(`<div>✅ <strong>${acc}</strong>: ${json.name} (${json.currency}) - ${json.account_status === 1 ? 'Hoạt động' : 'Tạm dừng'}</div>`);
    }

    resultEl.style.display = '';
    resultEl.style.background = 'rgba(34,197,94,.1)';
    resultEl.style.border     = '1px solid rgba(34,197,94,.25)';
    resultEl.style.color      = '#86efac';
    resultEl.style.padding    = '.75rem 1rem';
    resultEl.style.borderRadius = '10px';
    resultEl.innerHTML = `<strong>Đã kết nối ${successHtml.length} tài khoản thành công!</strong><div style="margin-top:.5rem;font-size:.8rem;color:var(--text-muted)">${successHtml.join('')}</div>`;
  } catch(err) {
    resultEl.style.display = '';
    resultEl.style.background = 'rgba(239,68,68,.1)';
    resultEl.style.border     = '1px solid rgba(239,68,68,.25)';
    resultEl.style.color      = '#fca5a5';
    resultEl.style.padding    = '.75rem 1rem';
    resultEl.style.borderRadius = '10px';
    resultEl.innerHTML = `❌ Lỗi kết nối: ${err.message}`;
  } finally {
    btn.innerHTML = '<i class="fa-solid fa-plug"></i> Kiểm tra kết nối';
    btn.disabled  = false;
  }
});

document.getElementById('save-config-btn').addEventListener('click', () => {
  cfg.token    = document.getElementById('cfg-token').value.trim();
  // Giữ nguyên chuỗi nhập (có thể chứa nhiều account cách nhau bằng phẩy)
  cfg.account  = document.getElementById('cfg-account').value.trim();
  cfg.version  = document.getElementById('cfg-version').value;
  cfg.currency = document.getElementById('cfg-currency').value;
  saveCfg(cfg);
  configModal.classList.remove('active');
  loadCampaigns();
});

// ── Refresh / Filter / Search ─────────────────────────────────
document.getElementById('mb-refresh-btn').addEventListener('click', loadCampaigns);
document.getElementById('mb-search').addEventListener('input', renderTable);
document.getElementById('mb-filter-status').addEventListener('change', renderTable);
document.getElementById('mb-filter-roas').addEventListener('change', renderTable);
document.getElementById('sr-roas-target').addEventListener('input', renderTable);

// ── Execution log ─────────────────────────────────────────────
function addLog(type, msg) {
  const log = document.getElementById('exec-log');
  // Remove empty hint
  log.querySelector('.log-empty')?.remove();

  const entry = document.createElement('div');
  entry.className = `log-entry log-${type}`;
  entry.innerHTML = `
    <div class="log-dot"></div>
    <div class="log-content">
      <div class="log-msg">${msg}</div>
      <div class="log-time">${new Date().toLocaleTimeString('vi-VN', { hour:'2-digit', minute:'2-digit', second:'2-digit' })}</div>
    </div>`;
  log.prepend(entry);
  // Keep max 50 entries
  while (log.children.length > 50) log.lastChild.remove();
}

document.getElementById('clear-log-btn').addEventListener('click', () => {
  document.getElementById('exec-log').innerHTML = '<div class="log-empty">Chưa có thao tác nào được thực hiện.</div>';
});

// ── Toggle password visibility ────────────────────────────────
window.toggleVis = function(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  const show  = input.type === 'password';
  input.type  = show ? 'text' : 'password';
  btn.innerHTML = show ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
};

// ── Toast ─────────────────────────────────────────────────────
function showToast(msg, type = 'success') {
  let toast = document.getElementById('mb-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'mb-toast';
    toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;padding:.8rem 1.2rem;border-radius:10px;font-size:.88rem;font-weight:600;z-index:9999;opacity:0;transform:translateY(10px);transition:all .3s;font-family:inherit;max-width:340px;box-shadow:0 8px 24px rgba(0,0,0,.25)';
    document.body.appendChild(toast);
  }
  const colors = {
    success: { bg:'rgba(34,197,94,.15)', border:'rgba(34,197,94,.3)', color:'#86efac' },
    error:   { bg:'rgba(239,68,68,.15)', border:'rgba(239,68,68,.3)', color:'#fca5a5' },
    warn:    { bg:'rgba(245,158,11,.15)',border:'rgba(245,158,11,.3)', color:'#fcd34d' },
  };
  const c = colors[type] || colors.success;
  toast.style.background  = c.bg;
  toast.style.border      = `1px solid ${c.border}`;
  toast.style.color       = c.color;
  toast.textContent       = msg;
  toast.style.opacity     = '1';
  toast.style.transform   = 'translateY(0)';
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; }, 3500);
}

// ── Demo mode (when no API key, load mock data) ───────────────
function loadDemoData() {
  addLog('info', '⚠️ Chạy chế độ Demo – dữ liệu giả lập (không kết nối Meta API)');
  campaigns = [
    { id:'1234567890', name:'[DEMO] SP Gia Dụng - Broad',   status:'ACTIVE', daily_budget:500000,  spend:312500, cpc:2800,  roas:3.2,  conversions:18, impressions:15423, clicks:112,  _lastChange:null },
    { id:'2345678901', name:'[DEMO] SP Làm Đẹp - Retarget', status:'ACTIVE', daily_budget:800000,  spend:750000, cpc:3500,  roas:1.8,  conversions:22, impressions:22000, clicks:214,  _lastChange:null },
    { id:'3456789012', name:'[DEMO] SP Thú Cưng - LAL',     status:'PAUSED', daily_budget:300000,  spend:0,      cpc:null,  roas:null, conversions:0,  impressions:0,     clicks:0,    _lastChange:null },
    { id:'4567890123', name:'[DEMO] SP Điện Tử - Interest',  status:'ACTIVE', daily_budget:1200000, spend:980000, cpc:4200,  roas:4.7,  conversions:47, impressions:48000, clicks:233,  _lastChange:null },
    { id:'5678901234', name:'[DEMO] Thời Trang - TOF',       status:'ACTIVE', daily_budget:600000,  spend:420000, cpc:1900,  roas:2.1,  conversions:28, impressions:35000, clicks:221,  _lastChange:null },
    { id:'6789012345', name:'[DEMO] Sức Khỏe - Video Ads',   status:'ACTIVE', daily_budget:450000,  spend:110000, cpc:5100,  roas:0.8,  conversions:5,  impressions:8200,  clicks:22,   _lastChange:null },
  ];
  renderKPIs();
  renderTable();
  showState('dashboard');
  enableCtrls(true);
  setStatus(`Demo mode · ${campaigns.length} campaigns giả lập`);
}

// ── Init ──────────────────────────────────────────────────────
initTheme();
if (window.SoraUI) SoraUI.initSidebar();

if (cfg.token && cfg.account) {
  loadCampaigns();
} else {
  // Check if user wants demo
  showState('banner');
  // Add demo button to banner
  setTimeout(() => {
    const banner = document.getElementById('mb-connect-banner');
    if (banner && banner.style.display !== 'none') {
      const demoBtn = document.createElement('button');
      demoBtn.className = 'btn-ghost-sm';
      demoBtn.style.marginTop = '.75rem';
      demoBtn.innerHTML = '<i class="fa-solid fa-flask"></i> Xem Demo (không cần API)';
      demoBtn.onclick = loadDemoData;
      banner.querySelector('.mb-connect-inner').appendChild(demoBtn);
    }
  }, 100);
}
