/**
 * SoraTools – Meta Campaign Creator
 * meta-campaign.js
 *
 * Implements the 4-step workflow:
 *   Step 1 → POST /{ad_account}/campaigns
 *   Step 2 → POST /{ad_account}/adsets
 *   Step 3 → POST /{ad_account}/adcreatives
 *   Step 4 → POST /{ad_account}/ads
 */

'use strict';

/* ─────────────────────────── Theme ─────────────────────────── */
function initTheme() {
  if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');
  if (localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
  updateThemeIcon();
}
function updateThemeIcon() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  const dark = document.body.getAttribute('data-theme') === 'dark';
  toggle.innerHTML = dark
    ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>'
    : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
}
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('theme-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      const dark = document.body.getAttribute('data-theme') === 'dark';
      dark ? document.body.removeAttribute('data-theme') : document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', dark ? 'light' : 'dark');
      updateThemeIcon();
    });
  }
});

/* ─────────────────────────── State ─────────────────────────── */
let CFG = {};          // loaded from localStorage
let currentStep = 1;  // 1–4
const HISTORY_KEY = 'mc_campaign_history';

// Upload State
let mediaType = 'image'; // 'image' | 'video'
let selectedFiles = []; // array of { file, hash, id, status }

/* ─────────────────────────── Init ──────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Theme: must run first to avoid flash of light mode
  initTheme();

  // Auth guard – redirect to login if not logged in
  if (window.AuthGuard) {
    AuthGuard.require();          // redirect → auth.html if no session
    SoraUI.initSidebar();         // populate user widget + filter nav by role
  }

  loadConfig();
  initUI();
  renderHistory();
});

/* ─────────────────────────── Config ────────────────────────── */
function loadConfig() {
  const raw = localStorage.getItem('mc_api_config');
  if (raw) {
    try { CFG = JSON.parse(raw); } catch(e) { CFG = {}; }
  }
}

function saveConfig() {
  localStorage.setItem('mc_api_config', JSON.stringify(CFG));
}

function hasConfig() {
  return !!(CFG.token && CFG.accountId && CFG.pageId);
}

/* ─────────────────────────── UI Init ───────────────────────── */
function initUI() {
  // Show banner or wizard
  if (hasConfig()) {
    showWizard();
  } else {
    document.getElementById('mc-connect-banner').style.display = 'flex';
    document.getElementById('mc-wizard').style.display = 'none';
  }

  // Fill config modal with saved values
  if (CFG.token)     document.getElementById('mc-cfg-token').value   = CFG.token;
  if (CFG.version)   document.getElementById('mc-cfg-version').value = CFG.version;
  if (CFG.accountId) document.getElementById('mc-cfg-account').value = CFG.accountId;
  if (CFG.pageId)    document.getElementById('mc-cfg-page').value    = CFG.pageId;
  if (CFG.pixelId)   document.getElementById('mc-cfg-pixel').value   = CFG.pixelId;
  if (CFG.currency)  document.getElementById('mc-cfg-currency').value = CFG.currency;

  // Populate pixel hint in step 2
  if (CFG.pixelId) {
    document.getElementById('as-pixel').value = CFG.pixelId;
    document.getElementById('as-pixel-hint').textContent = `✓ Tự động điền từ cấu hình: ${CFG.pixelId}`;
  }

  // Auto-generate campaign name
  autoName();

  // Wire events
  bindEvents();
  
  // Init Upload Handlers
  initUploadLogic();
}

function showWizard() {
  document.getElementById('mc-connect-banner').style.display = 'none';
  document.getElementById('mc-wizard').style.display = 'block';
}

/* ─────────────────────────── Events ────────────────────────── */
function bindEvents() {
  // Open config modal
  document.getElementById('mc-settings-btn').addEventListener('click', openConfig);
  document.getElementById('mc-open-config-btn')?.addEventListener('click', openConfig);
  document.getElementById('mc-close-config').addEventListener('click', closeConfig);
  document.getElementById('mc-cancel-config').addEventListener('click', closeConfig);
  document.getElementById('mc-save-config').addEventListener('click', onSaveConfig);
  document.getElementById('mc-test-btn').addEventListener('click', onTestConnection);

  // History modal
  document.getElementById('mc-history-btn').addEventListener('click', openHistory);
  document.getElementById('mc-close-history').addEventListener('click', closeHistory);
  document.getElementById('mc-close-history-btn').addEventListener('click', closeHistory);
  document.getElementById('mc-clear-history').addEventListener('click', clearHistory);

  // Success modal
  document.getElementById('mc-create-another').addEventListener('click', resetWizard);

  // Token visibility
  // (toggleTokenVis is global, called from HTML)

  // Step nav
  document.getElementById('btn-step1-next').addEventListener('click', () => goToStep(2));
  document.getElementById('btn-step2-back').addEventListener('click', () => goToStep(1));
  document.getElementById('btn-step2-next').addEventListener('click', () => goToStep(3));
  document.getElementById('btn-step3-back').addEventListener('click', () => goToStep(2));
  document.getElementById('btn-step3-next').addEventListener('click', () => goToStep(4));
  document.getElementById('btn-step4-back').addEventListener('click', () => goToStep(3));
  document.getElementById('btn-create').addEventListener('click', runCreateWorkflow);

  // Schedule select: show/hide custom time input
  document.getElementById('as-schedule').addEventListener('change', () => {
    const v = document.getElementById('as-schedule').value;
    document.getElementById('as-custom-time-wrap').style.display = v === 'CUSTOM' ? 'block' : 'none';
  });

  // Location select: show/hide excluded regions info
  document.getElementById('as-location').addEventListener('change', () => {
    const v = document.getElementById('as-location').value;
    document.getElementById('as-excluded-info').style.display = v === 'PH_EX' ? 'flex' : 'none';
  });

  // Optimization goal: show/hide pixel config
  document.getElementById('as-optgoal').addEventListener('change', () => {
    const v = document.getElementById('as-optgoal').value;
    document.getElementById('as-pixel-wrap').style.display = v === 'OFFSITE_CONVERSIONS' ? 'block' : 'none';
  });

  // Click outside modal to close
  document.getElementById('mc-config-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('mc-config-modal')) closeConfig();
  });
  document.getElementById('mc-history-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('mc-history-modal')) closeHistory();
  });
}

/* ─────────────────────────── Config Modal ──────────────────── */
function openConfig() {
  document.getElementById('mc-config-modal').classList.add('active');
}
function closeConfig() {
  document.getElementById('mc-config-modal').classList.remove('active');
  document.getElementById('mc-test-result').style.display = 'none';
}

function onSaveConfig() {
  const token     = document.getElementById('mc-cfg-token').value.trim();
  const accountId = document.getElementById('mc-cfg-account').value.trim();
  const pageId    = document.getElementById('mc-cfg-page').value.trim();
  const pixelId   = document.getElementById('mc-cfg-pixel').value.trim();
  const version   = document.getElementById('mc-cfg-version').value;
  const currency  = document.getElementById('mc-cfg-currency').value;

  if (!token || !accountId || !pageId) {
    showResult('mc-test-result', 'error', 'Vui lòng điền đầy đủ: Access Token, Ad Account ID và Page ID.');
    return;
  }
  if (!accountId.startsWith('act_')) {
    showResult('mc-test-result', 'error', 'Ad Account ID phải có dạng act_XXXXXXXXX');
    return;
  }

  CFG = { token, accountId, pageId, pixelId, version, currency };
  saveConfig();

  // Update pixel field in step 2
  if (pixelId) {
    document.getElementById('as-pixel').value = pixelId;
    document.getElementById('as-pixel-hint').textContent = `✓ Tự động điền từ cấu hình: ${pixelId}`;
  }

  closeConfig();
  showWizard();
  autoName();
}

async function onTestConnection() {
  const token     = document.getElementById('mc-cfg-token').value.trim();
  const accountId = document.getElementById('mc-cfg-account').value.trim();
  const version   = document.getElementById('mc-cfg-version').value || 'v22.0';

  if (!token || !accountId) {
    showResult('mc-test-result', 'error', 'Nhập Access Token và Ad Account ID trước.');
    return;
  }

  const btn = document.getElementById('mc-test-btn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...';

  try {
    const url = `https://graph.facebook.com/${version}/${accountId}?fields=id,name&access_token=${encodeURIComponent(token)}`;
    const res  = await fetch(url);
    const data = await res.json();

    if (data.error) {
      showResult('mc-test-result', 'error', `Lỗi: ${data.error.message}`);
    } else {
      showResult('mc-test-result', 'success', `✓ Kết nối thành công! Tài khoản: ${data.name || data.id}`);
    }
  } catch(e) {
    showResult('mc-test-result', 'error', `Không thể kết nối: ${e.message}`);
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-plug"></i> Kiểm tra kết nối';
}

/* ─────────────────────────── Step Navigation ───────────────── */
function goToStep(step) {
  // Validate before moving forward
  if (step > currentStep) {
    const err = validateStep(currentStep);
    if (err) { toast(err, 'error'); return; }
    // Mark previous steps as done
    document.querySelector(`.mc-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.mc-step[data-step="${currentStep}"]`).classList.add('done');

    // Mark connector lines done
    const lines = document.querySelectorAll('.step-line');
    if (currentStep - 1 < lines.length) {
      lines[currentStep - 1].classList.add('done');
    }
  } else {
    // Going back
    document.querySelector(`.mc-step[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`.mc-step[data-step="${currentStep}"]`).classList.remove('done');
    const lines = document.querySelectorAll('.step-line');
    if (step - 1 < lines.length) {
      lines[step - 1].classList.remove('done');
    }
  }

  // Hide all panels, show target
  document.querySelectorAll('.mc-panel').forEach(p => p.style.display = 'none');
  const panel = document.getElementById(`panel-${step}`);
  if (panel) panel.style.display = 'block';

  // Activate step indicator
  document.querySelector(`.mc-step[data-step="${step}"]`).classList.add('active');
  document.querySelector(`.mc-step[data-step="${step}"]`).classList.remove('done');

  currentStep = step;

  // If going to step 4, build review
  if (step === 4) buildReview();

  // Scroll top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function validateStep(step) {
  if (step === 1) {
    if (!document.getElementById('c-name').value.trim()) return 'Vui lòng nhập tên Campaign.';
  }
  if (step === 2) {
    const budget = parseFloat(document.getElementById('as-budget').value);
    if (!budget || budget < 1000) return 'Ngân sách ngày phải ≥ 1.000 VND.';
    const opt = document.getElementById('as-optgoal').value;
    if (opt === 'OFFSITE_CONVERSIONS' && !document.getElementById('as-pixel').value.trim()) {
      return 'Vui lòng nhập Pixel ID cho chiến dịch tối ưu chuyển đổi.';
    }
  }
  if (step === 3) {
    if (!document.getElementById('cr-name').value.trim()) return 'Vui lòng nhập tên Creative.';
    
    const manualInput = document.getElementById('cr-image-hash').value.trim();
    const uploadedCount = selectedFiles.filter(f => f.status === 'success').length;
    if (uploadedCount === 0 && !manualInput) {
      return 'Vui lòng upload thành công ít nhất 1 file hoặc nhập Image Hash / Video ID thủ công.';
    }
    
    if (!document.getElementById('cr-link').value.trim()) return 'Vui lòng nhập URL landing page.';
    
    if (mediaType === 'image' && !document.getElementById('cr-message').value.trim()) {
      return 'Vui lòng nhập nội dung chính (Primary Text).';
    }
  }
  return null;
}

/* ─────────────────────────── Review Builder ────────────────── */
function buildReview() {
  const schedule = document.getElementById('as-schedule').value;
  let scheduleText = 'Chạy ngay';
  if (schedule === 'TOMORROW') scheduleText = '00:00 ngày mai';
  if (schedule === 'CUSTOM') {
    const ct = document.getElementById('as-custom-time').value;
    scheduleText = ct ? new Date(ct).toLocaleString('vi-VN') : 'Tùy chọn (chưa đặt)';
  }

  const locMap = {
    PH_ALL: '🇵🇭 Philippines (Toàn quốc)',
    PH_EX:  '🇵🇭 Philippines (Trừ vùng sâu)',
    VN: '🇻🇳 Việt Nam', ID: '🇮🇩 Indonesia',
    TH: '🇹🇭 Thailand',  MY: '🇲🇾 Malaysia', US: '🇺🇸 Hoa Kỳ',
  };
  const placementMap = {
    ALL: 'FB + IG + Messenger + AN',
    FB_ONLY: 'Chỉ Facebook',
    FB_IG: 'Facebook + Instagram',
  };

  const currency = CFG.currency || 'VND';
  const budget   = parseInt(document.getElementById('as-budget').value || '0').toLocaleString('vi-VN');

  const uploadedCount = selectedFiles.filter(f => f.status === 'success').length;
  const manualInput = document.getElementById('cr-image-hash').value.trim();
  const mediaStr = uploadedCount > 0 ? `${uploadedCount} files` : manualInput || '—';

  const items = [
    {
      icon: 'fa-flag', color: '#f97316', title: 'Campaign',
      rows: [
        ['Tên', document.getElementById('c-name').value],
        ['Mục tiêu', document.getElementById('c-objective').value.replace('OUTCOME_', '')],
        ['Trạng thái', document.getElementById('c-status').value],
        ['Danh mục đặc biệt', document.getElementById('c-special').value],
      ]
    },
    {
      icon: 'fa-layer-group', color: '#60a5fa', title: 'Ad Set',
      rows: [
        ['Ngân sách ngày (Mỗi Ad Set)', `${budget} ${currency}`],
        ['Lịch chạy', scheduleText],
        ['Địa điểm', locMap[document.getElementById('as-location').value] || document.getElementById('as-location').value],
        ['Placement', placementMap[document.getElementById('as-placement').value]],
        ['Tối ưu', document.getElementById('as-optgoal').value],
        ['Giá thầu', document.getElementById('as-bid').value.replace('LOWEST_COST_', 'LC_')],
      ]
    },
    {
      icon: 'fa-image', color: '#a855f7', title: 'Creative',
      rows: [
        ['Số Ad Set sẽ tạo', uploadedCount > 0 ? uploadedCount : 1],
        ['Tên Prefix', document.getElementById('cr-name').value],
        ['Loại Media', mediaType === 'image' ? '🖼 Hình ảnh' : '🎞 Video'],
        ['Media', mediaStr],
        ['CTA', document.getElementById('cr-cta').value],
        ['URL', document.getElementById('cr-link').value || '—'],
        ['Headline', document.getElementById('cr-headline').value || '—'],
      ]
    },
    {
      icon: 'fa-gear', color: '#22c55e', title: 'Cấu hình API',
      rows: [
        ['Ad Account', CFG.accountId],
        ['Page ID', CFG.pageId],
        ['Pixel ID', CFG.pixelId || '—'],
        ['API Version', CFG.version || 'v22.0'],
      ]
    },
  ];

  const grid = document.getElementById('review-grid');
  grid.innerHTML = items.map(item => `
    <div class="review-card">
      <div class="review-card-header">
        <i class="fa-solid ${item.icon}" style="color:${item.color}"></i>
        ${item.title}
      </div>
      ${item.rows.map(([k, v]) => `
        <div class="review-row">
          <span class="review-key">${k}</span>
          <span class="review-val">${v}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

/* ─────────────────────────── Media Upload ───────────────────── */
window.switchMediaType = function(type) {
  mediaType = type;
  document.getElementById('tab-image').classList.toggle('active', type === 'image');
  document.getElementById('tab-video').classList.toggle('active', type === 'video');
  const input = document.getElementById('cr-media-file');
  input.accept = type === 'image' ? 'image/jpeg,image/png,image/gif,image/webp' : 'video/mp4,video/quicktime';
  document.getElementById('upload-drop-hint').textContent = type === 'image'
    ? 'Hỗ trợ: JPG, PNG, GIF, WEBP · Tối đa 30MB'
    : 'Hỗ trợ: MP4, MOV · Tối đa 1GB';
  resetUpload();
};

window.toggleManualHash = function() {
  const inputs = document.getElementById('manual-hash-inputs');
  const chevron = document.getElementById('manual-chevron');
  const isHidden = inputs.style.display === 'none';
  inputs.style.display = isHidden ? 'block' : 'none';
  chevron.classList.toggle('open', isHidden);
};

function resetUpload() {
  selectedFiles = [];
  document.getElementById('upload-dropzone').style.display = 'flex';
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-progress-box').style.display = 'none';
  document.getElementById('upload-success-box').style.display = 'none';
  document.getElementById('cr-media-file').value = '';
}

function handleFilesSelect(files) {
  if (!files || files.length === 0) return;
  for (let file of files) {
    if (mediaType === 'image' && !file.type.startsWith('image/')) continue;
    if (mediaType === 'video' && !file.type.startsWith('video/')) continue;
    selectedFiles.push({ file, hash: null, id: null, status: 'pending' });
  }

  if (selectedFiles.length === 0) {
    toast('Không có file hợp lệ theo loại Media', 'error');
    return;
  }
  
  // UI update
  document.getElementById('upload-dropzone').style.display = 'none';
  document.getElementById('upload-preview').style.display = 'block';
  document.getElementById('preview-count').textContent = selectedFiles.length + ' files';
  
  renderPreviews();
}

function renderPreviews() {
  const wrap = document.getElementById('preview-media-list');
  wrap.innerHTML = '';
  selectedFiles.forEach((item, index) => {
    const url = URL.createObjectURL(item.file);
    const box = document.createElement('div');
    box.style.cssText = 'position: relative; border-radius: 8px; overflow: hidden; border: 1px solid var(--border-color); background: #000; aspect-ratio: 1; display:flex; align-items:center; justify-content:center;';
    
    let overlay = '';
    if (item.status === 'uploading') overlay = '<div style="position:absolute; inset:0; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; color:#fff"><i class="fa-solid fa-spinner fa-spin"></i></div>';
    else if (item.status === 'success') overlay = '<div style="position:absolute; inset:0; background:rgba(34,197,94,0.4); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.5rem"><i class="fa-solid fa-circle-check"></i></div>';
    else if (item.status === 'error') overlay = '<div style="position:absolute; inset:0; background:rgba(239,68,68,0.6); display:flex; align-items:center; justify-content:center; color:#fff; font-size:1.5rem"><i class="fa-solid fa-circle-xmark"></i></div>';

    let mediaNode = '';
    if (mediaType === 'image') {
      mediaNode = `<img src="${url}" style="max-width:100%; max-height:100%; object-fit:contain;">`;
    } else {
      mediaNode = `<video src="${url}" style="max-width:100%; max-height:100%; object-fit:contain;"></video>`;
    }
    
    const removeBtn = `<button type="button" onclick="removeFile(${index})" style="position:absolute; top:4px; right:4px; background:rgba(0,0,0,0.7); color:#fff; border:none; border-radius:50%; width:24px; height:24px; cursor:pointer;" ${item.status !== 'pending' ? 'hidden' : ''}><i class="fa-solid fa-xmark"></i></button>`;

    box.innerHTML = mediaNode + overlay + removeBtn;
    wrap.appendChild(box);
  });
}

window.removeFile = function(index) {
  selectedFiles.splice(index, 1);
  if (selectedFiles.length === 0) {
    resetUpload();
  } else {
    document.getElementById('preview-count').textContent = selectedFiles.length + ' files';
    renderPreviews();
  }
}

function initUploadLogic() {
  const dropzone = document.querySelector('.media-upload-area');
  const fileInput = document.getElementById('cr-media-file');

  // Drag & Drop
  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', e => { e.preventDefault(); dropzone.classList.remove('dragover'); });
  dropzone.addEventListener('drop', e => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) handleFilesSelect(e.dataTransfer.files);
  });
  
  // Input change
  fileInput.addEventListener('change', e => {
    if (e.target.files && e.target.files.length > 0) handleFilesSelect(e.target.files);
  });

  document.getElementById('change-file-btn').addEventListener('click', () => { fileInput.click(); });
  document.getElementById('re-upload-btn').addEventListener('click', resetUpload);

  // Upload Action
  document.getElementById('upload-to-meta-btn').addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;
    if (!CFG.token || !CFG.accountId) { toast('Cần cấu hình API trước khi tải lên', 'error'); return; }

    let anyPending = false;
    for (let f of selectedFiles) if (f.status === 'pending') anyPending = true;
    if (!anyPending) return;

    for (let i = 0; i < selectedFiles.length; i++) {
      if (selectedFiles[i].status === 'success') continue;
      
      selectedFiles[i].status = 'uploading';
      renderPreviews();

      try {
        const endpoint = mediaType === 'image' ? `act_${CFG.accountId.replace('act_','')}/adimages` : `act_${CFG.accountId.replace('act_','')}/advideos`;
        
        const formData = new FormData();
        if (mediaType === 'image') {
          formData.append('filename', selectedFiles[i].file);
        } else {
          formData.append('source', selectedFiles[i].file);
          formData.append('title', selectedFiles[i].file.name);
        }
        
        const url = `https://graph.facebook.com/${CFG.version || 'v22.0'}/${endpoint}?access_token=${encodeURIComponent(CFG.token)}`;
        const res = await fetch(url, { method: 'POST', body: formData });
        const data = await res.json();
        
        if (data.error) throw new Error(data.error.message);

        if (mediaType === 'image') {
          const hashKey = Object.keys(data.images)[0];
          selectedFiles[i].hash = data.images[hashKey].hash;
        } else {
          selectedFiles[i].id = data.id;
        }
        selectedFiles[i].status = 'success';
        
      } catch(err) {
        selectedFiles[i].status = 'error';
        console.error(err);
      }
      renderPreviews();
    }
    
    const fails = selectedFiles.filter(f => f.status === 'error').length;
    if (fails === 0) {
      toast('Upload tài nguyên thành công toàn bộ!', 'success');
      document.getElementById('upload-preview').style.display = 'none';
      document.getElementById('upload-success-box').style.display = 'flex';
      document.getElementById('upload-success-id').textContent = `${selectedFiles.length} files`;
    } else {
      toast(`Upload hoàn tất: có ${fails} file lỗi.`, 'warning');
    }
  });
}

/* ─────────────────────────── API Helpers ───────────────────── */
async function callMetaAPI(endpoint, payload) {
  const version = CFG.version || 'v22.0';
  const url = `https://graph.facebook.com/${version}/${endpoint}?access_token=${encodeURIComponent(CFG.token)}`;

  // Build FormData
  const formData = new FormData();
  Object.entries(payload).forEach(([k, v]) => {
    formData.append(k, typeof v === 'object' ? JSON.stringify(v) : v);
  });

  const res  = await fetch(url, { method: 'POST', body: formData });
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || JSON.stringify(data.error));
  }
  return data;
}

/* ─────────────────────────── Get Start Time ────────────────── */
function getStartTime() {
  const opt = document.getElementById('as-schedule').value;
  if (opt === 'NOW') return null;
  if (opt === 'TOMORROW') {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.toISOString().replace('.000Z', '+0000');
  }
  if (opt === 'CUSTOM') {
    const ct = document.getElementById('as-custom-time').value;
    if (ct) return new Date(ct).toISOString().replace('.000Z', '+0000');
  }
  return null;
}

/* ─────────────────────────── Get Targeting ─────────────────── */
function getTargeting() {
  const loc = document.getElementById('as-location').value;
  const placement = document.getElementById('as-placement').value;

  const publisherPlatforms = placement === 'FB_ONLY'
    ? ['facebook']
    : placement === 'FB_IG'
      ? ['facebook', 'instagram']
      : ['facebook', 'instagram', 'messenger', 'audience_network'];

  const geoMap = {
    PH_ALL: { countries: ['PH'] },
    PH_EX:  { countries: ['PH'] },
    VN: { countries: ['VN'] },
    ID: { countries: ['ID'] },
    TH: { countries: ['TH'] },
    MY: { countries: ['MY'] },
    US: { countries: ['US'] },
  };

  const targeting = {
    geo_locations: geoMap[loc] || { countries: ['PH'] },
    publisher_platforms: publisherPlatforms,
  };

  if (loc === 'PH_EX') {
    targeting.excluded_geo_locations = {
      regions: [
        { key: '755', name: 'Batanes' },
        { key: '776', name: 'Lanao del Sur' },
        { key: '795', name: 'Sulu' },
        { key: '798', name: 'Tawi-Tawi' },
        { key: '778', name: 'Maguindanao' },
        { key: '787', name: 'North Cotabato' },
      ]
    };
  }

  return targeting;
}

/* ─────────────────────────── Main Workflow ─────────────────── */
async function runCreateWorkflow() {
  if (!hasConfig()) { toast('Vui lòng cấu hình API trước.', 'error'); return; }

  const adNameVal = document.getElementById('ad-name').value.trim();
  if (!adNameVal) { toast('Vui lòng nhập tên Ad.', 'error'); return; }

  const btn = document.getElementById('btn-create');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo...';

  const log = document.getElementById('mc-exec-log');
  log.innerHTML = '';

  let campaignId;
  let createdItems = [];

  try {
    /* ── Bước 1: Campaign ── */
    appendLog(log, 'info', '🚀 Bước 1: Đang tạo Campaign...');

    const campaignPayload = {
      name: document.getElementById('c-name').value.trim(),
      objective: document.getElementById('c-objective').value,
      status: document.getElementById('c-status').value,
      special_ad_categories: document.getElementById('c-special').value,
    };

    const campaignRes = await callMetaAPI(`${CFG.accountId}/campaigns`, campaignPayload);
    campaignId = campaignRes.id;
    appendLog(log, 'success', `✓ Campaign tạo thành công! ID: ${campaignId}`);

    // Determine Sources
    const manualInput = document.getElementById('cr-image-hash').value.trim();
    let sources = [];
    const successfulFiles = selectedFiles.filter(f => f.status === 'success');
    if (successfulFiles.length > 0) {
      sources = successfulFiles.map((f, idx) => ({
        hash: f.hash,
        videoId: f.id,
        suffix: `_Asset${idx+1}`
      }));
    } else if (manualInput) {
      sources.push({
        hash: mediaType === 'image' ? manualInput : null,
        videoId: mediaType === 'video' ? manualInput : null,
        suffix: ''
      });
    }

    if (sources.length === 0) throw new Error('Không có Media hợp lệ để tạo Ad Set');

    /* ── Loop for Ad Sets, Creatives, Ads ── */
    for (let i = 0; i < sources.length; i++) {
        const source = sources[i];
        appendLog(log, 'info', `\n--- ⚙️ Bắt đầu luồng cho Asset ${i+1}/${sources.length} ---`);

        // Ad Set
        const startTime = getStartTime();
        const targeting = getTargeting();
        const optGoal   = document.getElementById('as-optgoal').value;

        const adsetPayload = {
          name: `AdSet_${document.getElementById('c-name').value.trim()}${source.suffix}_${Date.now()}`,
          campaign_id: campaignId,
          daily_budget: document.getElementById('as-budget').value,
          bid_strategy: document.getElementById('as-bid').value,
          billing_event: 'IMPRESSIONS',
          optimization_goal: optGoal,
          targeting: targeting,
          status: 'PAUSED',
        };

        if (optGoal === 'OFFSITE_CONVERSIONS') {
          adsetPayload.promoted_object = {
            pixel_id: document.getElementById('as-pixel').value.trim(),
            custom_event_type: document.getElementById('as-event').value,
          };
        }

        if (startTime) adsetPayload.start_time = startTime;

        const adsetRes = await callMetaAPI(`${CFG.accountId}/adsets`, adsetPayload);
        const adsetId = adsetRes.id;
        appendLog(log, 'success', `✓ Ad Set tạo thành công! ID: ${adsetId}`);

        // Creative
        let objectStorySpec = { page_id: CFG.pageId };
        if (source.hash && !source.videoId) {
          objectStorySpec.link_data = {
            image_hash: source.hash,
            link: document.getElementById('cr-link').value.trim(),
            message: document.getElementById('cr-message').value.trim(),
            call_to_action: { type: document.getElementById('cr-cta').value },
          };
          const headline = document.getElementById('cr-headline').value.trim();
          const desc     = document.getElementById('cr-description').value.trim();
          if (headline) objectStorySpec.link_data.name = headline;
          if (desc)     objectStorySpec.link_data.description = desc;
        } else {
          objectStorySpec.video_data = {
            video_id: source.videoId,
            image_hash: source.hash || '', 
            call_to_action: {
              type: document.getElementById('cr-cta').value,
              value: { link: document.getElementById('cr-link').value.trim() }
            },
            message: document.getElementById('cr-message').value.trim(),
          };
          const headline = document.getElementById('cr-headline').value.trim();
          if (headline) objectStorySpec.video_data.title = headline;
        }

        const creativePayload = {
          name: `${document.getElementById('cr-name').value.trim()}${source.suffix}`,
          object_story_spec: objectStorySpec,
        };

        const creativeRes = await callMetaAPI(`${CFG.accountId}/adcreatives`, creativePayload);
        const creativeId = creativeRes.id;
        appendLog(log, 'success', `✓ Creative tạo thành công! ID: ${creativeId}`);

        // Ad
        const adPayload = {
          name: `${adNameVal}${source.suffix}`,
          adset_id: adsetId,
          creative: { creative_id: creativeId },
          status: 'PAUSED',
        };

        const adRes = await callMetaAPI(`${CFG.accountId}/ads`, adPayload);
        const adId = adRes.id;
        appendLog(log, 'success', `✓ Ad tạo thành công! ID: ${adId}`);

        createdItems.push({ adsetId, creativeId, adId });
    }

    appendLog(log, 'success', '\n🎉 Toàn bộ workflow hoàn tất!');

    /* ── Save to history ── */
    saveHistory({
      campaignName: document.getElementById('c-name').value.trim(),
      objective: document.getElementById('c-objective').value,
      location: document.getElementById('as-location').value,
      budget: document.getElementById('as-budget').value,
      currency: CFG.currency || 'VND',
      campaignId, 
      itemsCount: createdItems.length,
      createdAt: new Date().toISOString(),
    });

    /* ── Show success modal ── */
    showSuccess({ campaignId, createdItems });

  } catch(err) {
    appendLog(log, 'error', `✗ Lỗi: ${err.message}`);
    toast(`Tạo thất bại: ${err.message}`, 'error');
  }

  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Tạo Campaign ngay';
}

/* ─────────────────────────── Success ───────────────────────── */
function showSuccess({ campaignId, createdItems }) {
  document.getElementById('success-subtitle').textContent =
    `Tất cả đang ở trạng thái PAUSED. Đã tạo ${createdItems.length} Ad Set.`;

  let htmlStr = `
    <div class="success-id-row" style="margin-bottom:.5rem; border-bottom:1px dashed var(--border-color); padding-bottom:.5rem;">
      <span class="success-id-label">Campaign ID</span>
      <span class="success-id-val" onclick="copyToClipboard('${campaignId}')" title="Click để sao chép">${campaignId}</span>
    </div>
  `;

  createdItems.forEach((it, idx) => {
    htmlStr += `
      <div style="font-size:.8rem; color:var(--text-muted); margin-top:.5rem; font-weight:600;">Ad Set ${idx+1}</div>
      <div class="success-id-row">
        <span class="success-id-label">Ad Set ID</span>
        <span class="success-id-val" onclick="copyToClipboard('${it.adsetId}')">${it.adsetId}</span>
      </div>
      <div class="success-id-row">
        <span class="success-id-label">Ad ID</span>
        <span class="success-id-val" onclick="copyToClipboard('${it.adId}')">${it.adId}</span>
      </div>
    `;
  });

  document.getElementById('success-ids').innerHTML = htmlStr;

  document.getElementById('mc-success-modal').classList.add('active');
}

/* ─────────────────────────── History ───────────────────────── */
function saveHistory(entry) {
  const hist = getHistory();
  hist.unshift(entry);          // newest first
  if (hist.length > 30) hist.splice(30);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(hist));
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch(e) { return []; }
}

function renderHistory() {
  const items = getHistory();
  const el    = document.getElementById('history-list');
  if (!el) return;

  if (!items.length) {
    el.innerHTML = '<div class="history-empty"><i class="fa-solid fa-inbox" style="font-size:2rem;margin-bottom:.5rem;display:block"></i>Chưa có campaign nào được tạo.</div>';
    return;
  }

  const locLabel = { PH_ALL:'PH Toàn quốc', PH_EX:'PH Trừ vùng sâu', VN:'Việt Nam', ID:'Indonesia', TH:'Thailand', MY:'Malaysia', US:'US' };

  el.innerHTML = items.map(item => `
    <div class="history-item">
      <div class="history-item-header">
        <span class="history-name">${item.campaignName}</span>
        <span class="history-time">${new Date(item.createdAt).toLocaleString('vi-VN')}</span>
      </div>
      <div class="history-meta">
        <span class="history-tag">${(item.objective || '').replace('OUTCOME_','')}</span>
        <span class="history-tag">${locLabel[item.location] || item.location}</span>
        <span class="history-tag">${parseInt(item.budget || 0).toLocaleString('vi-VN')} ${item.currency}</span>
      </div>
      <div class="history-ids">
        <span>Campaign: <strong>${item.campaignId}</strong></span>
        <span>Ad Set: <strong>${item.adsetId}</strong></span>
        <span>Ad: <strong>${item.adId}</strong></span>
      </div>
    </div>
  `).join('');
}

function openHistory() {
  renderHistory();
  document.getElementById('mc-history-modal').classList.add('active');
}
function closeHistory() {
  document.getElementById('mc-history-modal').classList.remove('active');
}
function clearHistory() {
  if (!confirm('Xóa toàn bộ lịch sử?')) return;
  localStorage.removeItem(HISTORY_KEY);
  renderHistory();
}

/* ─────────────────────────── Reset Wizard ──────────────────── */
function resetWizard() {
  document.getElementById('mc-success-modal').classList.remove('active');
  currentStep = 1;

  // Reset stepper indicators
  document.querySelectorAll('.mc-step').forEach(el => {
    el.classList.remove('active', 'done');
  });
  document.querySelector('.mc-step[data-step="1"]').classList.add('active');
  document.querySelectorAll('.step-line').forEach(l => l.classList.remove('done'));

  // Reset panels
  document.querySelectorAll('.mc-panel').forEach(p => p.style.display = 'none');
  document.getElementById('panel-1').style.display = 'block';

  // Clear exec log
  document.getElementById('mc-exec-log').innerHTML =
    '<div class="log-empty">Nhấn "Tạo Campaign" để bắt đầu quy trình...</div>';

  // Auto-name
  autoName();
  
  // Clear media state
  resetUpload();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ─────────────────────────── Helpers ───────────────────────── */
function autoName() {
  const now = new Date();
  const dd  = String(now.getDate()).padStart(2, '0');
  const mm  = String(now.getMonth() + 1).padStart(2, '0');
  const HH  = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  document.getElementById('c-name').value = `Sales_Campaign_${dd}${mm}_${HH}${min}`;
}

function appendLog(container, type, message) {
  const empty = container.querySelector('.log-empty');
  if (empty) empty.remove();

  const el = document.createElement('div');
  el.className = `log-entry log-${type}`;
  el.innerHTML = `
    <div class="log-dot"></div>
    <div class="log-content">
      <div class="log-msg">${message}</div>
      <div class="log-time">${new Date().toLocaleTimeString('vi-VN')}</div>
    </div>
  `;
  container.appendChild(el);
  container.scrollTop = container.scrollHeight;
}

function showResult(elId, type, msg) {
  const el = document.getElementById(elId);
  el.style.display = 'block';
  el.style.background  = type === 'success' ? 'rgba(34,197,94,.1)'  : 'rgba(239,68,68,.1)';
  el.style.border      = `1px solid ${type === 'success' ? 'rgba(34,197,94,.3)' : 'rgba(239,68,68,.3)'}`;
  el.style.color       = type === 'success' ? '#22c55e' : '#ef4444';
  el.textContent       = msg;
}

function toast(msg, type = 'info') {
  const existing = document.getElementById('mc-toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.id = 'mc-toast';
  el.style.cssText = `
    position:fixed; bottom:1.5rem; right:1.5rem; z-index:9999;
    padding:.75rem 1.25rem; border-radius:12px; font-size:.88rem; font-weight:600;
    box-shadow:0 8px 32px rgba(0,0,0,.25); animation:slideUp .3s ease-out;
    background:${type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#60a5fa'};
    color:#fff; max-width:380px;
  `;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

function toggleTokenVis() {
  const inp = document.getElementById('mc-cfg-token');
  const eye = document.getElementById('mc-token-eye').querySelector('i');
  if (inp.type === 'password') {
    inp.type = 'text';
    eye.className = 'fa-solid fa-eye-slash';
  } else {
    inp.type = 'password';
    eye.className = 'fa-solid fa-eye';
  }
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => toast(`Đã sao chép: ${text}`, 'success'));
}
