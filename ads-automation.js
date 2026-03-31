/**
 * SoraTools – Ads Automation (ads-automation.js)
 * 4-step wizard: Upload Videos → Config & Content → Preview → Launch
 * Connects to Meta Marketing API v22.0
 */

/* ═══════════════════════════════════════════
   STATE
═══════════════════════════════════════════ */
const State = {
  step: 1,
  videos: [],         // {file, name, size, objURL, videoId (after upload), status}
  config: {},         // API credentials
  adAccounts: [],
  pages: [],
  pixels: [],
  formula: 'long-form',
  history: JSON.parse(localStorage.getItem('aa_history') || '[]'),
};

/* ═══════════════════════════════════════════
   CONTENT FORMULAS
═══════════════════════════════════════════ */
const FORMULAS = {
  'long-form': {
    label: 'Long-form FB (PH)',
    description: `Viết bằng tiếng Filipino/Tagalog, dạng long-form Facebook post:
1. 🎯 TÊN SẢN PHẨM + HEADLINE BẮT MẮT (gây tò mò, gây tâm lý)
2. 🔴 NỖI ĐAU KHÁCH HÀNG — vấn đề họ đang gặp / thứ họ thiếu
3. ⭐ CÔNG DỤNG & ĐẶC ĐIỂM NỔI BẬT của sản phẩm (bullet points)
4. 💬 SOCIAL PROOF — nhận xét khách hàng cũ / con số
5. 💥 CTA mạnh — thúc đẩy hành động ngay`,
    template: (desc) => `Hãy viết một Facebook Ad copy dài (long-form) bằng tiếng Filipino/Tagalog cho sản phẩm sau:

"${desc}"

Cấu trúc:
1. Headline gây tò mò (in hoa, emoji)
2. Vấn đề/nỗi đau khách hàng
3. Giải pháp từ sản phẩm (bullet points có emoji)
4. Social proof ngắn
5. CTA mạnh kèm link

Tone: thân thiện, tự nhiên như người thật viết, không quá salesy.`
  },
  'short-form': {
    label: 'Short-form',
    description: `Format ngắn gọn dưới 125 ký tự, phù hợp Mobile Feed và Reels.
Hook → Lợi ích → CTA. Không dài dòng, đánh thẳng vào pain point.`,
    template: (desc) => `Viết 3 phiên bản ad copy NGẮN (dưới 125 ký tự mỗi cái) cho sản phẩm:
"${desc}"
Format: Hook → Lợi ích → CTA. Viết bằng tiếng Anh.`
  },
  'review': {
    label: 'Review Style',
    description: `Dạng review từ khách hàng thật. Ngôi thứ nhất "I/Ang" viết về trải nghiệm.
Rất hiệu quả cho Newsfeed và Reels testimonial.`,
    template: (desc) => `Viết 1 đoạn review kiểu UGC/testimonial cho sản phẩm: "${desc}"
Viết như khách hàng thật đang chia sẻ, ngôi thứ nhất, có tên giả cuối, bằng tiếng English.`
  },
  'problem-solution': {
    label: 'Problem/Solution',
    description: `Nêu vấn đề → Khuấy động cảm xúc → Giới thiệu giải pháp → CTA.
Format phổ biến nhất cho quảng cáo chuyển đổi cao.`,
    template: (desc) => `Viết Problem/Solution ad copy cho sản phẩm: "${desc}"
Cấu trúc: Vấn đề → Cảm xúc → Giải pháp → CTA. Tiếng Anh, dưới 200 từ.`
  },
  'custom': {
    label: 'Custom',
    description: 'Nhập nội dung thủ công. AI sẽ không can thiệp vào Primary Text của bạn.',
    template: () => ''
  }
};

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  initTheme();
  initSubNav();
  initStepButtons();
  initVideoUpload();
  initFormulas();
  initAutoName();
  initContentGenerate();
  initApiModal();
  initHistory();
  updateFbStatus();
  setDefaultDate();
});

function setDefaultDate() {
  const d = new Date(); d.setHours(d.getHours()+1); d.setMinutes(0,0,0);
  const el = document.getElementById('f-start-date');
  if (el) el.value = d.toISOString().slice(0,16);
}

/* ═══════════════════════════════════════════
   THEME
═══════════════════════════════════════════ */
function initTheme() {
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  applyTheme(localStorage.getItem('theme') || 'dark');
  toggle.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    applyTheme(next); localStorage.setItem('theme', next);
  });
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const toggle = document.getElementById('theme-toggle');
  if (!toggle) return;
  toggle.innerHTML = t === 'dark'
    ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>'
    : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
}

/* ═══════════════════════════════════════════
   SUB NAV
═══════════════════════════════════════════ */
function initSubNav() {
  document.querySelectorAll('.aa-subnav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.aa-subnav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.aa-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('tab-' + btn.dataset.tab)?.classList.add('active');
      if (btn.dataset.tab === 'history') renderHistory();
    });
  });
}

/* ═══════════════════════════════════════════
   STEP NAVIGATION
═══════════════════════════════════════════ */
function initStepButtons() {
  document.getElementById('btn-step1-next')?.addEventListener('click', () => goStep(2));
  document.getElementById('btn-step2-back')?.addEventListener('click', () => goStep(1));
  document.getElementById('btn-step2-next')?.addEventListener('click', () => goStep(3));
  document.getElementById('btn-step3-back')?.addEventListener('click', () => goStep(2));
  document.getElementById('btn-step3-next')?.addEventListener('click', launchCampaign);
}

function goStep(n) {
  if (n === 2 && !validateStep1()) return;
  if (n === 3 && !validateStep2()) return;

  State.step = n;

  // Update panels
  document.querySelectorAll('.aa-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`panel-step-${n}`)?.classList.add('active');

  // Update step indicators
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step-indicator-${i}`);
    const conn = document.querySelectorAll('.aa-step-connector')[i - 1];
    if (!el) continue;
    el.classList.remove('active', 'done');
    if (i < n) { el.classList.add('done'); if (conn) conn.classList.add('done'); }
    else if (i === n) { el.classList.add('active'); if (conn) conn.classList.remove('done'); }
    else { if (conn) conn.classList.remove('done'); }
  }

  if (n === 3) buildPreview();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ═══════════════════════════════════════════
   VALIDATION
═══════════════════════════════════════════ */
function validateStep1() {
  if (State.videos.length === 0) { showToast('Vui lòng chọn ít nhất 1 video!', 'warn'); return false; }
  if (!document.getElementById('f-campaign-name').value.trim()) { showToast('Vui lòng nhập tên Campaign!', 'warn'); return false; }
  if (!document.getElementById('f-landing-url').value.trim()) { showToast('Vui lòng nhập Landing Page URL!', 'warn'); return false; }
  return true;
}

function validateStep2() {
  if (!document.getElementById('f-primary-text').value.trim()) { showToast('Vui lòng nhập Primary Text!', 'warn'); return false; }
  return true;
}

/* ═══════════════════════════════════════════
   VIDEO UPLOAD
═══════════════════════════════════════════ */
function initVideoUpload() {
  const dropzone = document.getElementById('video-dropzone');
  const fileInput = document.getElementById('video-file-input');

  dropzone.addEventListener('dragover', e => { e.preventDefault(); dropzone.classList.add('dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
  dropzone.addEventListener('drop', e => {
    e.preventDefault(); dropzone.classList.remove('dragover');
    addVideos([...e.dataTransfer.files].filter(f => f.type.startsWith('video/')));
  });
  dropzone.addEventListener('click', e => {
    if (e.target.closest('button') || e.target === fileInput) return;
    fileInput.click();
  });
  fileInput.addEventListener('change', e => { addVideos([...e.target.files]); e.target.value = ''; });
}

function addVideos(files) {
  files.forEach(file => {
    if (State.videos.find(v => v.name === file.name && v.size === file.size)) return;
    State.videos.push({ file, name: file.name, size: file.size, objURL: URL.createObjectURL(file), videoId: null, status: 'pending' });
  });
  renderVideoList();
}

function removeVideo(idx) {
  URL.revokeObjectURL(State.videos[idx]?.objURL);
  State.videos.splice(idx, 1);
  renderVideoList();
}

function renderVideoList() {
  const listEl = document.getElementById('video-preview-list');
  const inner = document.getElementById('dropzone-inner');

  if (State.videos.length === 0) {
    listEl.style.display = 'none';
    inner.style.display = 'flex';
    return;
  }
  inner.style.display = 'none';
  listEl.style.display = 'block';

  listEl.innerHTML = State.videos.map((v, i) => `
    <div class="video-preview-item">
      <div class="video-thumb">
        <video src="${v.objURL}" class="thumb-vid" preload="metadata"></video>
      </div>
      <div class="video-meta">
        <div class="video-filename">${v.name}</div>
        <div class="video-fileinfo">${formatBytes(v.size)} · ${v.status === 'done' ? 'Video ID: '+v.videoId : 'Chờ upload'}</div>
      </div>
      <span class="video-upload-status ${v.status}">${{pending:'⏳ Đang chờ', uploading:'⬆ Đang upload', done:'✅ Đã upload', error:'❌ Lỗi'}[v.status]}</span>
      <button class="btn-remove-video" onclick="removeVideo(${i})"><i class="fa-solid fa-times"></i></button>
    </div>
  `).join('') + `
  <div class="video-list-footer">
    <span class="video-count-badge"><i class="fa-solid fa-film"></i> ${State.videos.length} video → ${State.videos.length} Ad Set</span>
    <button class="btn-ghost-sm" onclick="document.getElementById('video-file-input').click()"><i class="fa-solid fa-plus"></i> Thêm video</button>
  </div>`;
}

/* ═══════════════════════════════════════════
   AUTO NAME
═══════════════════════════════════════════ */
function initAutoName() {
  document.getElementById('btn-auto-name')?.addEventListener('click', autoGenerateName);
  ['f-mkt','f-product','f-tag'].forEach(id => {
    document.getElementById(id)?.addEventListener('input', () => {});
  });
}

function autoGenerateName() {
  const mkt  = document.getElementById('f-mkt').value.trim();
  const prod = document.getElementById('f-product').value.trim();
  const tag  = document.getElementById('f-tag').value.trim();
  const now  = new Date();
  const month = `T${now.getMonth()+1}/${now.getFullYear()}`;

  let name = '';
  if (mkt) name += `[${mkt}] `;
  if (prod) name += prod;
  if (tag) name += ` – ${tag}`;
  if (!name) name = `Campaign_${month}`;
  document.getElementById('f-campaign-name').value = name.trim();
  showToast('Đã tự động đặt tên Campaign');
}

/* ═══════════════════════════════════════════
   CONTENT FORMULAS
═══════════════════════════════════════════ */
function initFormulas() {
  document.querySelectorAll('.formula-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.formula-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      State.formula = btn.dataset.formula;
      updateFormulaDescription();
    });
  });
  updateFormulaDescription();

  // Headline counter
  document.getElementById('f-headline')?.addEventListener('input', e => {
    document.getElementById('hl-count').textContent = e.target.value.length;
  });
  // Primary text counter
  document.getElementById('f-primary-text')?.addEventListener('input', e => {
    document.getElementById('copy-char-count').textContent = `${e.target.value.length} ký tự`;
  });
}

function updateFormulaDescription() {
  const descEl = document.getElementById('formula-description');
  if (descEl && FORMULAS[State.formula]) {
    descEl.innerHTML = FORMULAS[State.formula].description.replace(/\n/g, '<br>');
  }
}

function initContentGenerate() {
  document.getElementById('btn-generate-copy')?.addEventListener('click', generateCopy);
}

async function generateCopy() {
  if (State.formula === 'custom') { showToast('Chế độ Custom: bạn tự nhập nội dung', 'warn'); return; }
  const desc = document.getElementById('f-product-desc').value.trim();
  const landingUrl = document.getElementById('f-landing-url').value.trim();
  const combined = desc || landingUrl || 'Sản phẩm chất lượng cao';

  const btn = document.getElementById('btn-generate-copy');
  btn.innerHTML = '<div class="dot-pulse"><span></span><span></span><span></span></div>';
  btn.disabled = true;

  // Simulate AI generation (replace with actual AI API if available)
  const formula = FORMULAS[State.formula];
  const generated = getSampleCopy(State.formula, combined);

  await delay(1500);

  document.getElementById('f-primary-text').value = generated;
  document.getElementById('copy-char-count').textContent = `${generated.length} ký tự`;
  btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Generate AI';
  btn.disabled = false;
  showToast('Đã tạo nội dung quảng cáo!');
}

function getSampleCopy(formula, desc) {
  const copies = {
    'long-form': `✨ Nasubukan mo na ba ang ${desc}?

Kung nahihirapan ka sa pang-araw-araw na gawain at naghahanap ng mas magandang solusyon — nandito na ang sagot!

🔴 Ang problema natin:
• Masyadong mahal ang mga alternatives
• Hindi epektibo ang ibang produkto
• Walang maayos na serbisyo

💥 Ang solusyon:
✅ ${desc} — Gumagana sa UNANG gamit
✅ Madaling gamitin, kahit sino
✅ Ligtas at epektibo
✅ Subok na ng libu-libong customers

⭐ "Sobrang ganda! Di ko akalain na magtatrabaho talaga. 10/10 irerekomenda ko sa lahat!" – Maria, Cebu

🛒 MAG-ORDER NA! Limited stocks lang, baka maubusan ka pa!
👉 I-click ang link sa baba para sa SPECIAL PRICE ngayon!`,

    'short-form': `😱 Di ka maniniwala sa ${desc}!\n✅ Epektibo sa UNANG gamit\n⚡ Order na — Limited stocks!\n👇 Click para sa special price`,

    'review': `"Honestly, I didn't think it would work but I was wrong.\n\nI've been struggling with this for months and tried everything. Then my friend told me about ${desc}. After just one use, I could already feel the difference.\n\nNow I tell everyone about it. If you're on the fence – just try it. You won't regret it.\n\n– J. Santos, Manila ⭐⭐⭐⭐⭐"`,

    'problem-solution': `Still struggling with the same problem?\n\nMillions of people deal with this every day — feeling frustrated, wasting money on products that don't work.\n\nThat's why ${desc} was created.\n\n✅ Fast results\n✅ Easy to use\n✅ Proven by thousands\n\n👉 Try it today — risk free!`
  };
  return copies[formula] || `Khám phá ${desc} ngay hôm nay!\n✅ Chất lượng hàng đầu\n✅ Giao hàng nhanh\n✅ Giá tốt nhất thị trường\n\n👉 Đặt hàng ngay!`;
}

/* ═══════════════════════════════════════════
   BUILD PREVIEW
═══════════════════════════════════════════ */
function buildPreview() {
  const cfg = getFormData();

  // Summary cards
  const summaryEl = document.getElementById('preview-summary-grid');
  summaryEl.innerHTML = [
    { title: '🚀 Campaign', rows: [
      ['Tên', cfg.campaignName], ['Mục tiêu', cfg.objective], ['Bắt đầu', cfg.startDate || 'Ngay lập tức']
    ]},
    { title: '💰 Ngân sách', rows: [
      ['Budget/Ad Set', `$${cfg.budget}/ngày`], ['Tổng ngày 1', `$${(cfg.budget * State.videos.length).toFixed(2)}/ngày`],
      ['Chiến lược', cfg.bidStrategy.replace('LOWEST_COST_WITHOUT_CAP','Lowest Cost')], ['Tối ưu sự kiện', cfg.optEvent]
    ]},
    { title: '🎯 Targeting', rows: [
      ['Quốc gia', cfg.countries.join(', ')], ['Độ tuổi', `${cfg.ageMin}–${cfg.ageMax}`],
      ['Giới tính', cfg.gender], ['Sở thích', cfg.interests ? cfg.interests.split('\n').length + ' mục' : 'Broad']
    ]},
    { title: '📱 Ad Format', rows: [
      ['Số Ad Sets', State.videos.length], ['CTA', cfg.cta], ['Heading', cfg.headline || '(không có)'],
      ['Placements', cfg.placements.join(', ') || 'All']
    ]}
  ].map(card => `
    <div class="preview-card">
      <div class="preview-card-title">${card.title}</div>
      ${card.rows.map(([k,v]) => `<div class="preview-card-row"><span class="preview-card-key">${k}</span><span class="preview-card-val">${v || '—'}</span></div>`).join('')}
    </div>
  `).join('');

  // n placeholder
  document.querySelector('.section-block-title').innerHTML =
    `<i class="fa-solid fa-rectangle-ad"></i> Xem trước từng Ad (${State.videos.length} Ad Sets)`;

  // Ad preview cards
  const adsEl = document.getElementById('ad-preview-list');
  adsEl.innerHTML = State.videos.map((v, i) => `
    <div class="ad-preview-card">
      <div class="ad-preview-thumb">
        <div class="thumb-box">
          <video src="${v.objURL}" preload="metadata" muted></video>
        </div>
        <div style="font-size:.68rem;color:var(--text-muted);text-align:center;margin-top:.35rem">Ad Set ${i+1}</div>
      </div>
      <div class="ad-preview-info">
        <div class="ad-preview-adset">Ad Set ${i+1} · ${cfg.countries.join('/')} · ${cfg.ageMin}–${cfg.ageMax}</div>
        <div class="ad-preview-headline">${cfg.headline || cfg.campaignName}</div>
        <div class="ad-preview-body">${cfg.primaryText}</div>
        <div class="ad-preview-tags">
          <span class="ad-tag country">${cfg.countries.join(', ')}</span>
          <span class="ad-tag budget">$${cfg.budget}/ngày</span>
          <span class="ad-tag cta">${cfg.cta}</span>
          <span class="ad-tag format">VIDEO</span>
        </div>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════
   LAUNCH CAMPAIGN
═══════════════════════════════════════════ */
async function launchCampaign() {
  const cfg = State.config;
  if (!cfg.token) {
    showToast('Vui lòng cấu hình Access Token trước!', 'warn');
    document.getElementById('modal-api').classList.add('active');
    return;
  }

  const btn = document.getElementById('btn-step3-next');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';

  goStep(4);

  const formData = getFormData();

  try {
    // Step A: Upload Videos
    await runVideoUploads(cfg, formData);

    // Step B: Create Campaign
    showLaunchLog('📡 Đang tạo Campaign...', 'info');
    const campaignId = await createCampaign(cfg, formData);
    showLaunchLog(`✅ Campaign tạo thành công — ID: <code>${campaignId}</code>`, 'success');

    // Step C: Create Ad Sets + Ads per video
    let adSetIds = [], adIds = [];
    for (let i = 0; i < State.videos.length; i++) {
      const v = State.videos[i];
      showLaunchLog(`📂 [Video ${i+1}/${State.videos.length}] Đang tạo Ad Set...`, 'info');
      const adSetId = await createAdSet(cfg, formData, campaignId, i);
      adSetIds.push(adSetId);
      showLaunchLog(`✅ Ad Set tạo thành công — ID: <code>${adSetId}</code>`, 'success');

      showLaunchLog(`🎨 Đang tạo Creative + Ad...`, 'info');
      const adId = await createAd(cfg, formData, adSetId, v, i);
      adIds.push(adId);
      showLaunchLog(`✅ Ad tạo thành công — ID: <code>${adId}</code>`, 'success');
    }

    // Save to history
    saveHistory({ campaignName: formData.campaignName, campaignId, adSetCount: adSetIds.length, date: new Date().toISOString(), objective: formData.objective, countries: formData.countries });

    // Show success
    renderLaunchResult(true, { campaignId, adSetIds, adIds, formData });

  } catch(err) {
    showLaunchLog(`❌ Lỗi: ${err.message}`, 'error');
    renderLaunchResult(false, { error: err.message });
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-rocket"></i> Upload & Launch Campaign';
  }
}

/* ─── API Calls ──────────────────────────────────── */
async function runVideoUploads(cfg, formData) {
  const statusBox = document.getElementById('upload-status-box');
  const progressList = document.getElementById('upload-progress-list');
  statusBox.style.display = 'block';
  progressList.innerHTML = State.videos.map((v, i) => `
    <div class="upload-progress-item" id="vup-${i}">
      <span style="flex-shrink:0;font-weight:600;width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${v.name}">${v.name}</span>
      <div class="upload-progress-bar-wrap"><div class="upload-progress-bar" id="vbar-${i}" style="width:0%"></div></div>
      <span style="font-size:.75rem;width:80px;text-align:right" id="vstatus-${i}">⏳ Đang chờ</span>
    </div>
  `).join('');

  for (let i = 0; i < State.videos.length; i++) {
    const v = State.videos[i];
    document.getElementById(`vstatus-${i}`).textContent = '⬆ Uploading';
    try {
      // Simulate progress (real impl: chunked upload via Meta Graph API /advideos)
      for (let p = 0; p <= 100; p += 10) {
        document.getElementById(`vbar-${i}`).style.width = p + '%';
        await delay(120);
      }
      // In real mode: POST to https://graph-video.facebook.com/<api_ver>/act_<acct>/advideos
      // Here we set a mock video ID
      v.videoId = `SIM_VID_${Date.now()}_${i}`;
      v.status = 'done';
      document.getElementById(`vstatus-${i}`).textContent = '✅ Done';
      State.videos[i].status = 'done';
    } catch(e) {
      v.status = 'error';
      document.getElementById(`vstatus-${i}`).textContent = '❌ Error';
      throw new Error(`Upload video "${v.name}" thất bại: ${e.message}`);
    }
  }
}

async function createCampaign(cfg, formData) {
  const url = `https://graph.facebook.com/${cfg.apiVersion}/act_${formData.accountId}/campaigns`;
  const body = {
    name: formData.campaignName,
    objective: formData.objective,
    status: 'PAUSED',
    special_ad_categories: ['NONE'],
    access_token: cfg.token,
  };
  const res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.id;
}

async function createAdSet(cfg, formData, campaignId, idx) {
  const url = `https://graph.facebook.com/${cfg.apiVersion}/act_${formData.accountId}/adsets`;
  const targeting = {
    geo_locations: { countries: formData.countries },
    age_min: parseInt(formData.ageMin),
    age_max: parseInt(formData.ageMax),
  };
  if (formData.gender !== 'ALL') targeting.genders = [formData.gender === 'MALE' ? 1 : 2];

  const body = {
    name: `${formData.campaignName} – AS${String(idx+1).padStart(2,'0')} – Video_${idx+1}`,
    campaign_id: campaignId,
    daily_budget: Math.round(formData.budget * 100),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'OFFSITE_CONVERSIONS',
    bid_strategy: formData.bidStrategy,
    promoted_object: { pixel_id: formData.pixelId, custom_event_type: formData.optEvent },
    targeting,
    start_time: formData.startDate ? new Date(formData.startDate).toISOString() : undefined,
    status: 'PAUSED',
    access_token: cfg.token,
  };
  const res = await fetch(url, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(body) });
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.id;
}

async function createAd(cfg, formData, adSetId, video, idx) {
  const accountId = formData.accountId;
  const apiVersion = cfg.apiVersion;

  // 1. Create Ad Creative
  const creativeUrl = `https://graph.facebook.com/${apiVersion}/act_${accountId}/adcreatives`;
  const creativeBody = {
    name: `Creative_${formData.campaignName}_${idx+1}`,
    object_story_spec: {
      page_id: formData.pageId,
      video_data: {
        video_id: video.videoId,
        message: formData.primaryText,
        link_description: formData.headline,
        call_to_action: { type: formData.cta, value: { link: formData.landingUrl } },
      }
    },
    access_token: cfg.token,
  };
  const creativeRes = await fetch(creativeUrl, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(creativeBody) });
  const creativeJson = await creativeRes.json();
  if (creativeJson.error) throw new Error(creativeJson.error.message);
  const creativeId = creativeJson.id;

  // 2. Create Ad
  const adUrl = `https://graph.facebook.com/${apiVersion}/act_${accountId}/ads`;
  const adBody = {
    name: `Ad_${formData.campaignName}_Video_${idx+1}`,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: 'PAUSED',
    access_token: cfg.token,
  };
  const adRes = await fetch(adUrl, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(adBody) });
  const adJson = await adRes.json();
  if (adJson.error) throw new Error(adJson.error.message);
  return adJson.id;
}

/* ─── Launch log & result ─────────────────────── */
function showLaunchLog(msg, type) {
  const resultEl = document.getElementById('launch-result');
  if (!resultEl.querySelector('.launch-log-box')) {
    resultEl.innerHTML = `
      <div style="background:var(--card-bg);border:1px solid var(--border-color);border-radius:18px;padding:1.5rem;margin-bottom:1rem">
        <div style="font-weight:800;margin-bottom:1rem;font-size:1.1rem"><i class="fa-solid fa-rocket" style="color:#f97316"></i> Đang khởi chạy Campaign...</div>
        <div class="launch-log-box" style="background:var(--bg-color);border:1px solid var(--border-color);border-radius:12px;padding:1rem;min-height:140px;max-height:300px;overflow-y:auto;font-size:.82rem;font-family:monospace;line-height:1.8"></div>
      </div>`;
  }
  const log = resultEl.querySelector('.launch-log-box');
  const colors = { info: '#60a5fa', success: '#22c55e', error: '#ef4444' };
  log.innerHTML += `<div style="color:${colors[type]||'var(--text-main)'}">${msg}</div>`;
  log.scrollTop = log.scrollHeight;
}

function renderLaunchResult(success, data) {
  const resultEl = document.getElementById('launch-result');
  if (success) {
    resultEl.innerHTML += `
      <div class="launch-success">
        <div class="launch-success-icon">🎉</div>
        <h2 style="font-size:1.5rem;margin-bottom:.5rem">Campaign đã được tạo thành công!</h2>
        <p style="color:var(--text-muted);margin-bottom:1.5rem">${State.videos.length} Ad Sets đang ở trạng thái PAUSED – vào Ads Manager để review và kích hoạt</p>
        <div class="launch-ids">
          <div class="launch-id-row"><span class="launch-id-label">Campaign ID</span><span class="launch-id-val" onclick="copyText('${data.campaignId}')">${data.campaignId}</span></div>
          ${data.adSetIds.map((id,i) => `<div class="launch-id-row"><span class="launch-id-label">Ad Set ${i+1} ID</span><span class="launch-id-val" onclick="copyText('${id}')">${id}</span></div>`).join('')}
        </div>
        <div style="display:flex;gap:.75rem;justify-content:center;margin-top:1.5rem;flex-wrap:wrap">
          <a href="https://business.facebook.com/adsmanager/" target="_blank" class="btn-primary">
            <i class="fa-brands fa-facebook"></i> Mở Ads Manager
          </a>
          <button class="btn-ghost" onclick="resetWizard()"><i class="fa-solid fa-plus"></i> Tạo Campaign mới</button>
        </div>
      </div>`;
  } else {
    resultEl.innerHTML += `
      <div class="launch-error">
        <i class="fa-solid fa-triangle-exclamation" style="font-size:2.5rem;margin-bottom:1rem;display:block"></i>
        <strong>Đã xảy ra lỗi khi tạo Campaign:</strong>
        <p style="margin-top:.5rem;font-family:monospace;font-size:.85rem">${data.error}</p>
        <button class="btn-ghost" style="margin-top:1.25rem" onclick="goStep(3)"><i class="fa-solid fa-arrow-left"></i> Thử lại</button>
      </div>`;
  }
}

function resetWizard() {
  State.videos = [];
  State.step = 1;
  renderVideoList();
  goStep(1);
  document.getElementById('launch-result').innerHTML = '';
  document.getElementById('upload-status-box').style.display = 'none';
}

/* ═══════════════════════════════════════════
   FACEBOOK SDK OAUTH LOGIN
═══════════════════════════════════════════ */
const FB_PERMISSIONS = [
  'ads_management', 'ads_read', 'business_management',
  'pages_read_engagement', 'pages_show_list', 'public_profile'
];

function initApiModal() {
  document.getElementById('btn-api-settings')?.addEventListener('click', openLoginModal);
  document.getElementById('btn-fb-connect')?.addEventListener('click', openLoginModal);
  document.getElementById('btn-fb-logout')?.addEventListener('click', fbLogout);
  document.getElementById('close-modal-api')?.addEventListener('click', closeApiModal);
  document.getElementById('btn-cancel-api')?.addEventListener('click', closeApiModal);
  document.getElementById('btn-init-fb-sdk')?.addEventListener('click', initAndLogin);
  document.getElementById('btn-fb-confirm-login')?.addEventListener('click', closeApiModal);
  document.getElementById('btn-fb-switch-account')?.addEventListener('click', () => {
    if (window.FB) { window.FB.logout(() => doFbLogin()); }
    else initAndLogin();
  });
  document.getElementById('modal-api').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-api')) closeApiModal();
  });
}

function openLoginModal() {
  document.getElementById('modal-api').classList.add('active');
  // If already logged in via SDK, show the user info panel
  if (State.config.token && State.fbUser) {
    showLoggedInPanel();
  } else {
    document.getElementById('modal-step-appid').style.display = '';
    document.getElementById('modal-step-loggedin').style.display = 'none';
  }
}

function closeApiModal() {
  document.getElementById('modal-api').classList.remove('active');
}

function initAndLogin() {
  const appId = document.getElementById('cfg-app-id').value.trim();
  const apiVersion = document.getElementById('cfg-api-version').value;

  if (!appId) { showToast('Vui lòng nhập Facebook App ID!', 'warn'); return; }

  // Check if running on localhost
  if (window.location.protocol === 'file:') {
    showToast('⚠️ Cần chạy qua http://localhost:3000 — Nhấn đúp vào start-server.bat', 'warn');
    return;
  }

  // Load FB SDK dynamically
  const btn = document.getElementById('btn-init-fb-sdk');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang khởi động...';
  btn.disabled = true;

  if (window.FB) {
    // SDK already loaded, just re-init with new App ID
    window.FB.init({ appId, cookie: true, xfbml: false, version: apiVersion });
    doFbLogin();
    return;
  }

  // Load SDK script
  const script = document.createElement('script');
  script.src = 'https://connect.facebook.net/en_US/sdk.js';
  script.onload = () => {
    window.FB.init({ appId, cookie: true, xfbml: false, version: apiVersion });
    localStorage.setItem('aa_fb_app_id', appId);
    localStorage.setItem('aa_fb_api_version', apiVersion);
    doFbLogin();
  };
  script.onerror = () => {
    showToast('Không tải được Facebook SDK. Kiểm tra kết nối mạng.', 'error');
    btn.innerHTML = '<i class="fa-brands fa-facebook"></i> Xác nhận & Đăng nhập Facebook';
    btn.disabled = false;
  };
  document.head.appendChild(script);
}

function doFbLogin() {
  const btn = document.getElementById('btn-init-fb-sdk');

  window.FB.login(response => {
    btn.innerHTML = '<i class="fa-brands fa-facebook"></i> Xác nhận & Đăng nhập Facebook';
    btn.disabled = false;

    if (response.authResponse) {
      const { accessToken, userID } = response.authResponse;
      State.config.token = accessToken;
      State.config.userId = userID;
      State.config.apiVersion = localStorage.getItem('aa_fb_api_version') || 'v22.0';
      State.config.appId = localStorage.getItem('aa_fb_app_id') || '';
      localStorage.setItem('aa_config', JSON.stringify(State.config));

      // Load user info then show logged-in panel
      loadFbUserAndResources(accessToken, userID);
    } else {
      showToast('Đăng nhập bị hủy hoặc thất bại.', 'warn');
    }
  }, { scope: FB_PERMISSIONS.join(','), return_scopes: true });
}

async function loadFbUserAndResources(token, userId) {
  const apiV = State.config.apiVersion;

  showToast('⏳ Đang tải tài nguyên Facebook...');

  try {
    // 1. Get user profile
    const meRes = await graphFetch(`/${userId}?fields=id,name,email&access_token=${token}`);
    State.fbUser = meRes;
    document.getElementById('fb-logged-name').textContent = `Xin chào, ${meRes.name}!`;
    document.getElementById('fb-logged-info').textContent = `ID: ${meRes.id}${meRes.email ? ' · ' + meRes.email : ''}`;

    // 2. Get Ad Accounts
    const accRes = await graphFetch(`/me/adaccounts?fields=id,name,account_id,currency,account_status&limit=50&access_token=${token}`);
    State.adAccounts = accRes.data || [];
    const accSel = document.getElementById('f-ad-account');
    accSel.innerHTML = '<option value="">-- Chọn Ad Account --</option>' +
      State.adAccounts.map(a => `<option value="${a.account_id}">${a.name} (${a.id}) ${a.currency}</option>`).join('');

    // 3. Get Pages
    const pageRes = await graphFetch(`/me/accounts?fields=id,name,category&limit=50&access_token=${token}`);
    State.pages = pageRes.data || [];
    const pageSel = document.getElementById('f-page-select');
    pageSel.innerHTML = '<option value="">-- Chọn Page --</option>' +
      State.pages.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    // 4. Preview in modal
    const previewEl = document.getElementById('fb-accounts-preview');
    previewEl.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:.75rem">
        <div style="background:var(--bg-color);border:1px solid var(--border-color);border-radius:12px;padding:1rem">
          <div style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#1877f2;margin-bottom:.6rem">
            <i class="fa-solid fa-rectangle-ad"></i> Ad Accounts (${State.adAccounts.length})
          </div>
          ${State.adAccounts.slice(0,4).map(a => `
            <div style="font-size:.8rem;padding:.25rem 0;border-bottom:1px solid var(--border-color)">
              <span style="font-weight:600">${a.name}</span>
              <span style="color:var(--text-muted)">&nbsp;·&nbsp;${a.id}</span>
            </div>`).join('')}
          ${State.adAccounts.length > 4 ? `<div style="font-size:.75rem;color:var(--text-muted);margin-top:.5rem">+${State.adAccounts.length-4} tài khoản khác</div>` : ''}
        </div>
        <div style="background:var(--bg-color);border:1px solid var(--border-color);border-radius:12px;padding:1rem">
          <div style="font-size:.72rem;font-weight:800;text-transform:uppercase;letter-spacing:.5px;color:#1877f2;margin-bottom:.6rem">
            <i class="fa-brands fa-facebook"></i> Pages (${State.pages.length})
          </div>
          ${State.pages.slice(0,4).map(p => `
            <div style="font-size:.8rem;padding:.25rem 0;border-bottom:1px solid var(--border-color)">
              <span style="font-weight:600">${p.name}</span>
            </div>`).join('')}
          ${State.pages.length > 4 ? `<div style="font-size:.75rem;color:var(--text-muted);margin-top:.5rem">+${State.pages.length-4} page khác</div>` : ''}
        </div>
      </div>`;

    // 5. Load Pixels for first ad account
    if (State.adAccounts.length > 0) {
      loadPixelsForAccount(State.adAccounts[0].id, token);
    }

    // 6. Watch ad account change to reload pixels
    document.getElementById('f-ad-account').addEventListener('change', e => {
      if (e.target.value) loadPixelsForAccount(e.target.value, token);
    });

    showLoggedInPanel();
    updateFbStatus(true);
    showToast(`✅ Đã kết nối! ${State.adAccounts.length} Ad Account, ${State.pages.length} Page`);

  } catch(err) {
    showToast('Lỗi khi tải dữ liệu: ' + err.message, 'error');
  }
}

async function loadPixelsForAccount(accountId, token) {
  try {
    const pixelRes = await graphFetch(`/act_${accountId}/adspixels?fields=id,name&limit=20&access_token=${token}`);
    State.pixels = pixelRes.data || [];
    const pixelSel = document.getElementById('f-pixel');
    pixelSel.innerHTML = '<option value="">-- Chọn Pixel --</option>' +
      State.pixels.map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`).join('');
  } catch(e) {
    console.warn('Could not load pixels:', e.message);
  }
}

async function graphFetch(path) {
  const apiV = State.config.apiVersion || 'v22.0';
  const base = path.includes('?') ? path : path;
  const url = `https://graph.facebook.com/${apiV}${base}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json;
}

function showLoggedInPanel() {
  document.getElementById('modal-step-appid').style.display = 'none';
  document.getElementById('modal-step-loggedin').style.display = '';
}

function fbLogout() {
  if (window.FB) {
    window.FB.logout(() => {
      State.config = {};
      State.fbUser = null;
      localStorage.removeItem('aa_config');
      updateFbStatus(false);
      showToast('Đã đăng xuất Facebook');
    });
  } else {
    State.config = {};
    State.fbUser = null;
    localStorage.removeItem('aa_config');
    updateFbStatus(false);
  }
}

function loadConfig() {
  const saved = localStorage.getItem('aa_config');
  if (saved) {
    State.config = JSON.parse(saved);
    const appId = localStorage.getItem('aa_fb_app_id');
    if (appId) document.getElementById('cfg-app-id').value = appId;
    if (State.config.apiVersion) document.getElementById('cfg-api-version').value = State.config.apiVersion;

    if (State.config.token) {
      // Re-init FB SDK silently if app ID exists
      if (appId && window.location.protocol !== 'file:') {
        const script = document.createElement('script');
        script.src = 'https://connect.facebook.net/en_US/sdk.js';
        script.onload = () => {
          window.FB.init({ appId, cookie: true, xfbml: false, version: State.config.apiVersion || 'v22.0' });
          // Check login status
          window.FB.getLoginStatus(response => {
            if (response.status === 'connected') {
              State.config.token = response.authResponse.accessToken;
              loadFbUserAndResources(State.config.token, response.authResponse.userID);
            } else {
              updateFbStatus(false);
            }
          });
        };
        document.head.appendChild(script);
      }
      updateFbStatus(true);
    }
  }
}

function updateFbStatus(connected = false) {
  const dot = document.getElementById('fb-dot');
  const text = document.getElementById('fb-status-text');
  const connectBtn = document.getElementById('btn-fb-connect');
  const logoutBtn = document.getElementById('btn-fb-logout');

  if (connected) {
    dot?.classList.add('connected');
    const name = State.fbUser?.name || 'Facebook';
    if (text) text.textContent = `✓ ${name}`;
    if (connectBtn) connectBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = '';
  } else {
    dot?.classList.remove('connected');
    if (text) text.textContent = 'Chưa kết nối';
    if (connectBtn) { connectBtn.style.display = ''; connectBtn.innerHTML = '<i class="fa-brands fa-facebook"></i> Đăng nhập Facebook'; }
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}


/* ═══════════════════════════════════════════
   GET FORM DATA
═══════════════════════════════════════════ */
function getFormData() {
  const countries = [...document.getElementById('f-country').selectedOptions].map(o => o.value);
  const placements = [...document.querySelectorAll('input[name="placement"]:checked')].map(i => i.value);
  const gender = document.querySelector('input[name="gender"]:checked')?.value || 'ALL';
  const accountRaw = document.getElementById('f-ad-account').value.trim();

  return {
    campaignName: document.getElementById('f-campaign-name').value.trim(),
    objective: document.getElementById('f-objective').value,
    startDate: document.getElementById('f-start-date').value,
    landingUrl: document.getElementById('f-landing-url').value.trim(),
    pageId: document.getElementById('f-page-select').value,
    productDesc: document.getElementById('f-product-desc').value.trim(),
    accountId: accountRaw.replace('act_',''),
    pixelId: document.getElementById('f-pixel').value,
    optEvent: document.getElementById('f-opt-event').value,
    budget: parseFloat(document.getElementById('f-budget').value) || 10,
    bidStrategy: document.getElementById('f-bid-strategy').value,
    countries, gender,
    ageMin: document.getElementById('f-age-min').value,
    ageMax: document.getElementById('f-age-max').value,
    interests: document.getElementById('f-interests').value.trim(),
    placements,
    primaryText: document.getElementById('f-primary-text').value.trim(),
    headline: document.getElementById('f-headline').value.trim(),
    cta: document.getElementById('f-cta').value,
  };
}

/* ═══════════════════════════════════════════
   HISTORY
═══════════════════════════════════════════ */
function initHistory() {
  document.getElementById('btn-clear-history')?.addEventListener('click', () => {
    if (confirm('Xóa toàn bộ lịch sử?')) {
      State.history = [];
      localStorage.removeItem('aa_history');
      renderHistory();
      showToast('Đã xóa lịch sử');
    }
  });
}

function saveHistory(entry) {
  State.history.unshift(entry);
  if (State.history.length > 50) State.history.pop();
  localStorage.setItem('aa_history', JSON.stringify(State.history));
}

function renderHistory() {
  const container = document.getElementById('history-list-container');
  if (!container) return;
  if (State.history.length === 0) {
    container.innerHTML = `<div class="empty-state"><i class="fa-solid fa-clock-rotate-left" style="font-size:2rem;margin-bottom:.75rem;color:var(--text-muted)"></i><p>Chưa có lịch sử nào</p></div>`;
    return;
  }
  container.innerHTML = State.history.map((h, i) => `
    <div class="history-entry">
      <div class="history-entry-top">
        <div class="history-entry-name">${h.campaignName}</div>
        <div class="history-entry-time">${new Date(h.date).toLocaleString('vi-VN')}</div>
      </div>
      <div class="history-entry-tags">
        <span class="history-tag">🎯 ${h.objective?.replace('OUTCOME_','') || '—'}</span>
        <span class="history-tag">🌍 ${h.countries?.join(', ') || '—'}</span>
        <span class="history-tag">📂 ${h.adSetCount} Ad Sets</span>
        <span class="history-tag">🆔 ${h.campaignId}</span>
      </div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════ */
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024*1024)).toFixed(1) + ' MB';
  return (bytes / (1024*1024*1024)).toFixed(2) + ' GB';
}

function togglePasswordVis(inputId, btnId) {
  const inp = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (inp.type === 'password') {
    inp.type = 'text';
    btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
  } else {
    inp.type = 'password';
    btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
  }
}

function copyText(text) {
  navigator.clipboard.writeText(text).then(() => showToast('Đã copy: ' + text));
}

function showToast(msg, type = 'success') {
  const old = document.getElementById('aa-toast');
  if (old) old.remove();
  const toast = document.createElement('div');
  toast.id = 'aa-toast';
  const color = type === 'warn' ? '#f97316' : type === 'error' ? '#ef4444' : '#22c55e';
  toast.style.cssText = `
    position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
    background:var(--card-bg);color:var(--text-main);
    border:1.5px solid ${color};border-radius:12px;
    padding:.85rem 1.25rem;font-size:.875rem;font-weight:600;
    box-shadow:0 8px 30px rgba(0,0,0,.35);
    display:flex;align-items:center;gap:.6rem;
    animation:slideUp .25s ease-out;max-width:400px;
  `;
  const icon = type === 'warn' ? '⚠️' : type === 'error' ? '❌' : '✅';
  toast.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}
