// ============================
// SoraTools – Ads Campaign Creator
// ============================

// ---- Theme ----
const themeToggle = document.getElementById('theme-toggle');
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
});

// ---- Step Navigation ----
let currentStep = 1;
const TOTAL_STEPS = 5;

const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');

function goToStep(n) {
    document.querySelectorAll('.step-panel').forEach(p => p.classList.remove('active'));
    document.getElementById(`step-${n}`).classList.add('active');

    document.querySelectorAll('.step-item').forEach((el, i) => {
        el.classList.remove('active', 'done');
        if (i + 1 < n)  el.classList.add('done');
        if (i + 1 === n) el.classList.add('active');
    });
    document.querySelectorAll('.step-line').forEach((el, i) => {
        el.classList.toggle('done', i < n - 1);
    });

    prevBtn.style.display = n > 1 ? '' : 'none';
    nextBtn.innerHTML = n < TOTAL_STEPS
        ? 'Tiếp theo <i class="fa-solid fa-arrow-right"></i>'
        : '<i class="fa-solid fa-check"></i> Hoàn tất';

    currentStep = n;
    if (n === TOTAL_STEPS) buildReview();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

prevBtn.addEventListener('click', () => { if (currentStep > 1) goToStep(currentStep - 1); });
nextBtn.addEventListener('click', () => {
    if (!validateStep(currentStep)) return;
    if (currentStep < TOTAL_STEPS) goToStep(currentStep + 1);
    else saveCampaign('draft');
});

document.querySelectorAll('.step-item').forEach(el => {
    el.addEventListener('click', () => {
        const n = parseInt(el.dataset.step);
        if (n < currentStep || validateStep(currentStep)) goToStep(n);
    });
});

// ---- Validation ----
function validateStep(step) {
    const required = {
        1: ['campaign-name', 'campaign-objective', 'daily-budget', 'start-date'],
        2: ['ad-account-id', 'pixel-id', 'page-id'],
        3: [],
        4: ['landing-url'],
        5: [],
    };
    let ok = true;
    (required[step] || []).forEach(id => {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) {
            el && (el.style.borderColor = '#ef4444');
            setTimeout(() => el && (el.style.borderColor = ''), 2000);
            ok = false;
        }
    });
    if (!ok) showToast('Vui lòng điền đầy đủ thông tin bắt buộc!', 'error');
    return ok;
}

// ---- Collect form data ----
function collectData() {
    const platforms  = [...document.querySelectorAll('input[name="platform"]:checked')].map(i => i.value);
    const placements = [...document.querySelectorAll('input[name="placement"]:checked')].map(i => i.value);
    const countries  = [...document.getElementById('target-country').selectedOptions].map(o => o.value);
    const gender     = document.querySelector('input[name="gender"]:checked')?.value || 'all';

    return {
        // Step 1
        campaignName:   document.getElementById('campaign-name').value.trim(),
        objective:      document.getElementById('campaign-objective').value,
        platforms,
        dailyBudget:    document.getElementById('daily-budget').value,
        bidStrategy:    document.getElementById('bid-strategy').value,
        startDate:      document.getElementById('start-date').value,
        endDate:        document.getElementById('end-date').value,
        // Step 2
        adAccountId:    document.getElementById('ad-account-id').value.trim(),
        pixelId:        document.getElementById('pixel-id').value.trim(),
        pageId:         document.getElementById('page-id').value.trim(),
        optEvent:       document.getElementById('optimization-event').value,
        // Step 3
        countries, gender,
        ageMin:         document.getElementById('age-min').value,
        ageMax:         document.getElementById('age-max').value,
        language:       document.getElementById('target-language').value,
        interests:      document.getElementById('interests').value.trim(),
        audiences:      document.getElementById('custom-audiences').value.trim(),
        placements,
        // Step 4
        landingUrl:     document.getElementById('landing-url').value.trim(),
        videoUrl:       document.getElementById('video-url').value.trim(),
        videoFbId:      document.getElementById('video-fb-id').value.trim(),
        headline:       document.getElementById('ad-headline').value.trim(),
        body:           document.getElementById('ad-body').value.trim(),
        cta:            document.getElementById('ad-cta').value,
        variants:       document.getElementById('ad-variants').value,
        notes:          document.getElementById('ad-notes').value.trim(),
        // Meta
        createdAt:      new Date().toLocaleString('vi-VN'),
    };
}

// ---- Review ----
function buildReview() {
    const d = collectData();
    const platformMap = { facebook:'Facebook', instagram:'Instagram', messenger:'Messenger' };
    const objMap = {
        OUTCOME_SALES:'Sales', OUTCOME_LEADS:'Lead Gen', OUTCOME_TRAFFIC:'Traffic',
        OUTCOME_AWARENESS:'Awareness', OUTCOME_ENGAGEMENT:'Engagement', OUTCOME_VIDEO_VIEWS:'Video Views'
    };

    const checks = [
        { label:'Tên chiến dịch', ok: !!d.campaignName },
        { label:'Mục tiêu', ok: !!d.objective },
        { label:'Ngân sách', ok: !!d.dailyBudget },
        { label:'Ngày bắt đầu', ok: !!d.startDate },
        { label:'Ad Account ID', ok: !!d.adAccountId },
        { label:'Pixel ID', ok: !!d.pixelId },
        { label:'Page ID', ok: !!d.pageId },
        { label:'Landing Page URL', ok: !!d.landingUrl },
        { label:'Video (file hoặc URL)', ok: !!d.videoUrl || !!d.videoFbId || videoFileReady },
        { label:'Nội dung quảng cáo', ok: !!d.headline || !!d.body },
    ];

    const html = `
    <div class="review-section">
        <div class="review-section-title">📋 Checklist</div>
        <div class="checklist">
            ${checks.map(c => `
                <div class="check-row">
                    <i class="fa-solid ${c.ok ? 'fa-circle-check ok' : 'fa-circle-xmark missing'}"></i>
                    <span>${c.label}</span>
                </div>`).join('')}
        </div>
    </div>

    <div class="review-section">
        <div class="review-section-title">🏳 Chiến dịch</div>
        <div class="review-grid">
            <div class="review-item"><div class="review-item-label">Tên</div><div class="review-item-value highlight">${esc(d.campaignName) || '—'}</div></div>
            <div class="review-item"><div class="review-item-label">Mục tiêu</div><div class="review-item-value">${objMap[d.objective] || d.objective || '—'}</div></div>
            <div class="review-item"><div class="review-item-label">Ngân sách</div><div class="review-item-value">$${d.dailyBudget}/ngày</div></div>
            <div class="review-item"><div class="review-item-label">Bid Strategy</div><div class="review-item-value">${d.bidStrategy}</div></div>
            <div class="review-item"><div class="review-item-label">Bắt đầu</div><div class="review-item-value">${d.startDate || '—'}</div></div>
            <div class="review-item"><div class="review-item-label">Kết thúc</div><div class="review-item-value">${d.endDate || 'Không giới hạn'}</div></div>
            <div class="review-item"><div class="review-item-label">Nền tảng</div><div class="review-item-value">${d.platforms.map(p => platformMap[p]).join(', ') || '—'}</div></div>
        </div>
    </div>

    <div class="review-section">
        <div class="review-section-title">🔑 Tài khoản</div>
        <div class="review-grid">
            <div class="review-item"><div class="review-item-label">Ad Account</div><div class="review-item-value">act_${esc(d.adAccountId) || '—'}</div></div>
            <div class="review-item"><div class="review-item-label">Pixel ID</div><div class="review-item-value">${esc(d.pixelId) || '—'}</div></div>
            <div class="review-item"><div class="review-item-label">Page ID</div><div class="review-item-value">${esc(d.pageId) || '—'}</div></div>
            <div class="review-item"><div class="review-item-label">Optimization Event</div><div class="review-item-value">${d.optEvent}</div></div>
        </div>
    </div>

    <div class="review-section">
        <div class="review-section-title">🎯 Target</div>
        <div class="review-grid">
            <div class="review-item"><div class="review-item-label">Quốc gia</div><div class="review-item-value">${d.countries.join(', ') || '—'}</div></div>
            <div class="review-item"><div class="review-item-label">Độ tuổi</div><div class="review-item-value">${d.ageMin} – ${d.ageMax}</div></div>
            <div class="review-item"><div class="review-item-label">Giới tính</div><div class="review-item-value">${d.gender === 'all' ? 'Tất cả' : d.gender === 'male' ? 'Nam' : 'Nữ'}</div></div>
            <div class="review-item"><div class="review-item-label">Ngôn ngữ</div><div class="review-item-value">${d.language || 'Tất cả'}</div></div>
            <div class="review-item span-2"><div class="review-item-label">Placements</div><div class="review-item-value">${d.placements.join(', ') || '—'}</div></div>
            ${d.interests ? `<div class="review-item span-2"><div class="review-item-label">Sở thích</div><div class="review-item-value" style="white-space:pre-wrap">${esc(d.interests)}</div></div>` : ''}
        </div>
    </div>

    <div class="review-section">
        <div class="review-section-title">🎬 Creative</div>
        <div class="review-grid">
            <div class="review-item span-2"><div class="review-item-label">Landing Page</div><div class="review-item-value link">${esc(d.landingUrl) || '—'}</div></div>
            ${d.videoFbId  ? `<div class="review-item"><div class="review-item-label">Video FB ID</div><div class="review-item-value">${esc(d.videoFbId)}</div></div>` : ''}
            ${d.videoUrl   ? `<div class="review-item"><div class="review-item-label">Video URL</div><div class="review-item-value link">${esc(d.videoUrl)}</div></div>` : ''}
            ${videoFileReady ? `<div class="review-item"><div class="review-item-label">Video file</div><div class="review-item-value" style="color:#10b981">✅ Đã chọn</div></div>` : ''}
            <div class="review-item"><div class="review-item-label">Headline</div><div class="review-item-value">${esc(d.headline) || '—'}</div></div>
            <div class="review-item"><div class="review-item-label">CTA</div><div class="review-item-value">${d.cta}</div></div>
            <div class="review-item"><div class="review-item-label">Variants</div><div class="review-item-value">${d.variants} Ads</div></div>
        </div>
    </div>`;

    document.getElementById('review-content').innerHTML = html;
}

// ---- Video upload ----
let videoFileReady = false;
const videoFile  = document.getElementById('video-file');
const videoPrev  = document.getElementById('video-preview');
const prevWrap   = document.getElementById('video-preview-wrap');
const dropZone   = document.getElementById('video-drop-zone');
const videoInfo  = document.getElementById('video-info');

videoFile.addEventListener('change', e => handleVideoFile(e.target.files[0]));
document.getElementById('remove-video-btn').addEventListener('click', () => {
    videoFile.value = '';
    videoPrev.src = '';
    prevWrap.style.display = 'none';
    dropZone.style.display = '';
    videoFileReady = false;
});

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave',e => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer?.files[0];
    if (f && f.type.startsWith('video/')) handleVideoFile(f);
});

function handleVideoFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    videoPrev.src = url;
    prevWrap.style.display = '';
    dropZone.style.display = 'none';
    videoFileReady = true;
    const mb = (file.size / 1024 / 1024).toFixed(1);
    videoInfo.textContent = `${file.name} · ${mb} MB · ${file.type}`;
}

// ---- Character counter ----
function charCounter(inputId, countId) {
    const el  = document.getElementById(inputId);
    const cnt = document.getElementById(countId);
    if (!el || !cnt) return;
    el.addEventListener('input', () => cnt.textContent = el.value.length);
}
charCounter('ad-headline', 'headline-count');
charCounter('ad-body',     'body-count');

// ---- Profiles (Ad Account presets) ----
let profiles = JSON.parse(localStorage.getItem('sora_ad_profiles') || '[]');

function saveProfiles() { localStorage.setItem('sora_ad_profiles', JSON.stringify(profiles)); }

document.getElementById('save-profile-btn').addEventListener('click', () => {
    const name = document.getElementById('profile-name').value.trim();
    if (!name) { showToast('Nhập tên hồ sơ trước!', 'error'); return; }
    const entry = {
        id: Date.now(),
        name,
        adAccountId: document.getElementById('ad-account-id').value.trim(),
        pixelId:     document.getElementById('pixel-id').value.trim(),
        pageId:      document.getElementById('page-id').value.trim(),
        optEvent:    document.getElementById('optimization-event').value,
    };
    const existing = profiles.findIndex(p => p.name === name);
    if (existing >= 0) profiles[existing] = entry; else profiles.unshift(entry);
    saveProfiles();
    showToast(`✅ Đã lưu hồ sơ "${name}"`);
});

document.getElementById('quick-profile-btn').addEventListener('click', openProfiles);
document.getElementById('manage-profiles-btn').addEventListener('click', openProfiles);

function openProfiles() {
    renderProfiles();
    document.getElementById('profiles-modal').classList.add('active');
}

function renderProfiles() {
    const list = document.getElementById('profiles-list');
    if (!profiles.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">Chưa có hồ sơ nào. Điền thông tin tài khoản ở Bước 2 và lưu.</p>'; return; }
    list.innerHTML = profiles.map((p, i) => `
        <div class="campaign-card">
            <div class="campaign-card-title">${esc(p.name)}</div>
            <div class="campaign-card-meta">
                <span>act_${esc(p.adAccountId)}</span>
                <span>Pixel: ${esc(p.pixelId)}</span>
                <span>Page: ${esc(p.pageId)}</span>
            </div>
            <div class="campaign-card-actions">
                <button class="btn-ghost-sm" onclick="loadProfile(${i})"><i class="fa-solid fa-download"></i> Dùng hồ sơ này</button>
                <button class="btn-ghost-sm" style="color:#ef4444" onclick="deleteProfile(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`).join('');
}

window.loadProfile = function(i) {
    const p = profiles[i];
    if (!p) return;
    document.getElementById('ad-account-id').value       = p.adAccountId;
    document.getElementById('pixel-id').value            = p.pixelId;
    document.getElementById('page-id').value             = p.pageId;
    document.getElementById('optimization-event').value  = p.optEvent;
    document.getElementById('profile-name').value        = p.name;
    document.getElementById('profiles-modal').classList.remove('active');
    showToast(`✅ Đã tải hồ sơ "${p.name}"`);
};

window.deleteProfile = function(i) {
    if (!confirm('Xóa hồ sơ này?')) return;
    profiles.splice(i, 1);
    saveProfiles();
    renderProfiles();
};

['close-profiles','close-profiles-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => document.getElementById('profiles-modal').classList.remove('active'));
});
document.getElementById('profiles-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('profiles-modal')) document.getElementById('profiles-modal').classList.remove('active');
});

// ---- Save / Load Campaigns ----
let campaigns = JSON.parse(localStorage.getItem('sora_campaigns') || '[]');
function saveCampaignStore() { localStorage.setItem('sora_campaigns', JSON.stringify(campaigns)); }

function saveCampaign(type = 'draft') {
    const data = collectData();
    data.type = type;
    data.id   = Date.now();
    const existing = campaigns.findIndex(c => c.campaignName === data.campaignName && c.type === type);
    if (existing >= 0) campaigns[existing] = data; else campaigns.unshift(data);
    if (campaigns.length > 30) campaigns.pop();
    saveCampaignStore();
    showToast(type === 'template' ? '✅ Đã lưu là Template!' : '✅ Đã lưu nháp!');
}

document.getElementById('save-draft-btn').addEventListener('click', () => saveCampaign('draft'));
document.getElementById('save-template-btn').addEventListener('click', () => saveCampaign('template'));

// History
document.getElementById('history-btn').addEventListener('click', () => {
    renderHistory(); document.getElementById('history-modal').classList.add('active');
});
['close-history','close-history-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => document.getElementById('history-modal').classList.remove('active'));
});
document.getElementById('history-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('history-modal')) document.getElementById('history-modal').classList.remove('active');
});

function renderHistory() {
    const list = document.getElementById('history-list');
    if (!campaigns.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">Chưa có chiến dịch nào.</p>'; return; }
    list.innerHTML = campaigns.map((c, i) => `
        <div class="campaign-card">
            <div class="campaign-card-title">${esc(c.campaignName)} <span style="color:${c.type==='template'?'#f59e0b':'#64748b'};font-size:.73rem;font-weight:600">[${c.type}]</span></div>
            <div class="campaign-card-meta">
                <span>📅 ${c.createdAt}</span>
                <span>💰 $${c.dailyBudget}/ngày</span>
                <span>🌏 ${(c.countries||[]).join(', ')}</span>
            </div>
            <div class="campaign-card-actions">
                <button class="btn-ghost-sm" onclick="loadCampaign(${i})"><i class="fa-solid fa-rotate-left"></i> Load</button>
                <button class="btn-ghost-sm" style="color:#ef4444" onclick="deleteCampaign(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`).join('');
}

window.loadCampaign = function(i) {
    const d = campaigns[i];
    if (!d) return;
    fillForm(d);
    document.getElementById('history-modal').classList.remove('active');
    goToStep(1);
    showToast(`✅ Đã load chiến dịch "${d.campaignName}"`);
};

window.deleteCampaign = function(i) {
    if (!confirm('Xóa chiến dịch này?')) return;
    campaigns.splice(i, 1);
    saveCampaignStore();
    renderHistory();
};

// Load Template
document.getElementById('load-template-btn').addEventListener('click', () => {
    const templates = campaigns.filter(c => c.type === 'template');
    const list = document.getElementById('template-list');
    if (!templates.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">Chưa có template nào. Tạo chiến dịch rồi lưu là Template.</p>'; }
    else list.innerHTML = templates.map((c, i) => {
        const idx = campaigns.indexOf(c);
        return `<div class="campaign-card">
            <div class="campaign-card-title">⭐ ${esc(c.campaignName)}</div>
            <div class="campaign-card-meta"><span>📅 ${c.createdAt}</span></div>
            <div class="campaign-card-actions">
                <button class="btn-ghost-sm" onclick="loadCampaign(${idx});document.getElementById('template-modal').classList.remove('active')"><i class="fa-solid fa-rotate-left"></i> Dùng template</button>
            </div>
        </div>`;
    }).join('');
    document.getElementById('template-modal').classList.add('active');
});
['close-template','close-template-btn'].forEach(id => {
    document.getElementById(id).addEventListener('click', () => document.getElementById('template-modal').classList.remove('active'));
});
document.getElementById('template-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('template-modal')) document.getElementById('template-modal').classList.remove('active');
});

// ---- Fill form from saved data ----
function fillForm(d) {
    const set = (id, val) => { const el = document.getElementById(id); if (el && val !== undefined) el.value = val; };
    set('campaign-name',       d.campaignName);
    set('campaign-objective',  d.objective);
    set('daily-budget',        d.dailyBudget);
    set('bid-strategy',        d.bidStrategy);
    set('start-date',          d.startDate);
    set('end-date',            d.endDate);
    set('ad-account-id',       d.adAccountId);
    set('pixel-id',            d.pixelId);
    set('page-id',             d.pageId);
    set('optimization-event',  d.optEvent);
    set('age-min',             d.ageMin);
    set('age-max',             d.ageMax);
    set('target-language',     d.language);
    set('interests',           d.interests);
    set('custom-audiences',    d.audiences);
    set('landing-url',         d.landingUrl);
    set('video-url',           d.videoUrl);
    set('video-fb-id',         d.videoFbId);
    set('ad-headline',         d.headline);
    set('ad-body',             d.body);
    set('ad-cta',              d.cta);
    set('ad-variants',         d.variants);
    set('ad-notes',            d.notes);
    // Checkboxes
    document.querySelectorAll('input[name="platform"]').forEach(cb => { cb.checked = (d.platforms||[]).includes(cb.value); });
    document.querySelectorAll('input[name="placement"]').forEach(cb => { cb.checked = (d.placements||[]).includes(cb.value); });
    // Gender
    const g = document.querySelector(`input[name="gender"][value="${d.gender||'all'}"]`);
    if (g) g.checked = true;
    // Country
    const sel = document.getElementById('target-country');
    [...sel.options].forEach(o => { o.selected = (d.countries||[]).includes(o.value); });
}

// ---- Export Brief ----
document.getElementById('export-brief-btn').addEventListener('click', () => {
    const d = collectData();
    const txt = `
========================================
  CAMPAIGN BRIEF – SoraTools
  ${d.createdAt}
========================================

📋 CHIẾN DỊCH
  Tên: ${d.campaignName}
  Mục tiêu: ${d.objective}
  Nền tảng: ${d.platforms.join(', ')}
  Ngân sách: $${d.dailyBudget}/ngày
  Bid Strategy: ${d.bidStrategy}
  Bắt đầu: ${d.startDate}
  Kết thúc: ${d.endDate || 'Không giới hạn'}

🔑 TÀI KHOẢN
  Ad Account: act_${d.adAccountId}
  Pixel ID: ${d.pixelId}
  Page ID: ${d.pageId}
  Opt Event: ${d.optEvent}

🎯 TARGET
  Quốc gia: ${d.countries.join(', ')}
  Độ tuổi: ${d.ageMin} – ${d.ageMax}
  Giới tính: ${d.gender}
  Ngôn ngữ: ${d.language || 'Tất cả'}
  Placements: ${d.placements.join(', ')}
  Sở thích:
${(d.interests || '').split('\n').map(l => `    - ${l}`).join('\n')}
  Custom Audiences:
${(d.audiences || '').split('\n').map(l => `    - ${l}`).join('\n')}

🎬 CREATIVE
  Landing Page: ${d.landingUrl}
  Video FB ID: ${d.videoFbId || '—'}
  Video URL: ${d.videoUrl || '—'}
  Headline: ${d.headline}
  CTA: ${d.cta}
  Variants: ${d.variants} Ads
  Primary Text:
    ${d.body}

📝 GHI CHÚ
${d.notes || '—'}

========================================
`.trim();
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `Campaign_Brief_${d.campaignName.slice(0,30).replace(/\s/g,'_')}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
});

// ---- Toast notification ----
function showToast(msg, type = 'success') {
    let toast = document.getElementById('toast-notif');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast-notif';
        toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;padding:.75rem 1.25rem;border-radius:10px;font-size:.88rem;font-weight:600;z-index:9999;transition:all .3s;opacity:0;transform:translateY(10px);max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,.3);font-family:UTM Avo,Outfit,sans-serif;';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.background = type === 'error' ? '#ef4444' : '#10b981';
    toast.style.color = '#fff';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(10px)'; }, 3000);
}

// ---- Helpers ----
function esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ---- Default start date = now ----
function setDefaultDates() {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    now.setHours(now.getHours() + 1);
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    document.getElementById('start-date').value = local;
}

// ---- Init ----
initTheme();
setDefaultDates();
goToStep(1);
