// ============================
// SoraTools – Ads Template Generator
// ============================

const themeToggle = document.getElementById('theme-toggle');
const generateBtn = document.getElementById('generate-btn');
const atIdle      = document.getElementById('at-idle');
const atLoading   = document.getElementById('at-loading');
const atOutput    = document.getElementById('at-output');
const scriptsContainer = document.getElementById('scripts-container');

let selectedPlatform = 'tiktok';
let selectedHook     = 'problem-solution';
let savedScripts     = JSON.parse(localStorage.getItem('sora_ads_scripts') || '[]');

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
});

// ---- Config ----
function loadCfg() {
    return {
        key:   localStorage.getItem('chat_gemini_key') || localStorage.getItem('research_gemini_key') || '',
        model: localStorage.getItem('at_gemini_model') || 'gemini-2.0-flash',
    };
}
document.getElementById('at-settings-btn').addEventListener('click', () => {
    const c = loadCfg();
    document.getElementById('at-key-input').value   = c.key;
    document.getElementById('at-model-input').value = c.model;
    document.getElementById('at-settings-modal').classList.add('active');
});
document.getElementById('close-at-settings').addEventListener('click',     () => document.getElementById('at-settings-modal').classList.remove('active'));
document.getElementById('close-at-settings-btn').addEventListener('click', () => document.getElementById('at-settings-modal').classList.remove('active'));
document.getElementById('at-settings-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('at-settings-modal')) document.getElementById('at-settings-modal').classList.remove('active');
});
document.getElementById('save-at-settings-btn').addEventListener('click', () => {
    localStorage.setItem('chat_gemini_key',  document.getElementById('at-key-input').value.trim());
    localStorage.setItem('at_gemini_model',  document.getElementById('at-model-input').value);
    document.getElementById('at-settings-modal').classList.remove('active');
});

// ---- Platform & Hook selectors ----
document.querySelectorAll('.plat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedPlatform = btn.dataset.p;
        document.querySelectorAll('.plat-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});
document.querySelectorAll('.hook-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedHook = btn.dataset.h;
        document.querySelectorAll('.hook-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

// ---- Quick examples ----
document.querySelectorAll('.ex-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.getElementById('at-product').value  = btn.dataset.product || '';
        document.getElementById('at-usp').value      = btn.dataset.usp     || '';
        document.getElementById('at-audience').value = btn.dataset.aud     || '';
    });
});

// ---- Prompt builder ----
const HOOK_LABELS = {
    'problem-solution': 'Vấn đề → Giải pháp',
    'before-after':     'Before / After',
    'testimonial':      'Testimonial',
    'curiosity':        'Gây tò mò',
    'urgency':          'Urgency / Scarcity',
    'story':            'Kể chuyện',
};
const HOOK_INSTRUCTIONS = {
    'problem-solution': 'Bắt đầu bằng một vấn đề mà người xem đang gặp phải, sau đó giới thiệu sản phẩm như là giải pháp hoàn hảo.',
    'before-after':     'Mô tả trạng thái trước khi dùng sản phẩm (tệ/khó chịu), sau đó chuyển sang trạng thái sau (tốt hơn rõ rệt).',
    'testimonial':      'Viết từ góc nhìn của khách hàng thật sự, kể trải nghiệm cá nhân, cảm xúc thật, tránh nghe như quảng cáo.',
    'curiosity':        'Bắt đầu bằng một câu hỏi lạ hoặc statement gây tò mò, khiến người xem phải xem tiếp.',
    'urgency':          'Tạo cảm giác "sợ bỏ lỡ" (FOMO): sắp hết hàng, ưu đãi giới hạn, giá sắp tăng.',
    'story':            'Kể một câu chuyện ngắn liên quan đến sản phẩm, có nhân vật, có xung đột, có giải quyết.',
};

function buildPrompt() {
    const product   = document.getElementById('at-product').value.trim();
    const usp       = document.getElementById('at-usp').value.trim();
    const audience  = document.getElementById('at-audience').value.trim();
    const count     = document.getElementById('at-count').value;
    const market    = document.getElementById('at-market').value;
    const lang      = document.getElementById('at-lang').value;
    const platLabel = selectedPlatform === 'both' ? 'TikTok và Facebook' : selectedPlatform === 'tiktok' ? 'TikTok' : 'Facebook';
    const hookLabel = HOOK_LABELS[selectedHook];
    const hookInstr = HOOK_INSTRUCTIONS[selectedHook];

    return `Bạn là chuyên gia viết script quảng cáo cho thị trường ${market}.

THÔNG TIN SẢN PHẨM:
- Sản phẩm: ${product}
- Điểm bán (USP): ${usp || 'Hãy tự suy luận từ tên sản phẩm'}
- Đối tượng: ${audience || 'Khách hàng đại chúng'}

NHIỆM VỤ:
Viết ${count} script video quảng cáo cho nền tảng ${platLabel}, sử dụng format "${hookLabel}".

HƯỚNG DẪN FORMAT "${hookLabel.toUpperCase()}":
${hookInstr}

YÊU CẦU KỸ THUẬT:
- Ngôn ngữ: ${lang}
- Mỗi script cần có timestamp (0:00, 0:03, 0:10, 0:20, v.v.)
- Hook cực mạnh trong 3 giây đầu (quyết định người xem có scroll tiếp không)
- Độ dài: 15-30 giây cho TikTok, 30-60 giây cho Facebook
- Kết thúc bằng CTA rõ ràng (Link bio, Comment, DM, v.v.)
- Viết tự nhiên như người thật nói, không cứng ngắc
- Đánh số thứ tự từng script: ## Script 1, ## Script 2, ...

Đặc điểm người dùng ${market}: thực tế, cần thấy bằng chứng, nhạy cảm về giá.

Viết tất cả ${count} scripts ngay bây giờ:`;
}

// ---- Generate ----
generateBtn.addEventListener('click', generateScripts);

async function generateScripts() {
    const product = document.getElementById('at-product').value.trim();
    if (!product) {
        document.getElementById('at-product').focus();
        document.getElementById('at-product').style.borderColor = '#ef4444';
        setTimeout(() => document.getElementById('at-product').style.borderColor = '', 2000);
        return;
    }

    const cfg = loadCfg();
    if (!cfg.key) {
        document.getElementById('at-settings-btn').click();
        setTimeout(() => alert('Vui lòng nhập Gemini API Key!'), 300);
        return;
    }

    showState('loading');
    generateBtn.disabled = true;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.key}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: buildPrompt() }] }],
                generationConfig: { temperature: 0.9, maxOutputTokens: 6000 }
            })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Lỗi Gemini API');

        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || '';
        if (!text) throw new Error('Không có nội dung trả về.');

        renderScripts(text, product);

    } catch(e) {
        showState('error', e.message);
    } finally {
        generateBtn.disabled = false;
    }
}

// ---- Parse & render scripts ----
function renderScripts(text, product) {
    // Split by ## Script N pattern
    const parts = text.split(/(?=##\s*Script\s*\d+)/i).filter(p => p.trim());
    const market   = document.getElementById('at-market').value;
    const lang     = document.getElementById('at-lang').value;
    const platLabel = selectedPlatform === 'both' ? 'TikTok & Facebook' : selectedPlatform === 'tiktok' ? 'TikTok' : 'Facebook';
    const hookLabel = HOOK_LABELS[selectedHook];

    document.getElementById('output-meta').innerHTML =
        `<strong>${escHtml(product)}</strong> · ${platLabel} · ${hookLabel} · ${new Date().toLocaleTimeString('vi-VN')}`;

    if (parts.length <= 1) {
        // AI returned undivided text — show as one block
        scriptsContainer.innerHTML = renderSingleScript(text, 1, platLabel, hookLabel);
    } else {
        scriptsContainer.innerHTML = parts.map((part, i) => renderSingleScript(part, i + 1, platLabel, hookLabel)).join('');
    }

    showState('output');
    updateSavedCount();
}

function renderSingleScript(text, num, platform, hook) {
    const id = `script-${Date.now()}-${num}`;
    // Highlight timestamps like 0:00
    const formatted = escHtml(text).replace(/\b(\d+:\d+)\b/g, '<span class="ts">$1</span>');
    return `
    <div class="script-card" id="${id}">
        <div class="script-card-header">
            <div class="script-num">
                <i class="fa-solid fa-clapperboard"></i> Script ${num}
            </div>
            <div class="script-badges">
                <span class="badge badge-plat">${platform}</span>
                <span class="badge badge-hook">${hook}</span>
            </div>
            <div class="script-card-actions">
                <button class="sc-btn" onclick="copyScript('${id}')" title="Copy"><i class="fa-solid fa-copy"></i></button>
                <button class="sc-btn" onclick="saveScript('${id}', ${num})" title="Lưu" id="save-btn-${id}"><i class="fa-solid fa-bookmark"></i></button>
            </div>
        </div>
        <div class="script-body" id="body-${id}">${formatted}</div>
    </div>`;
}

function escHtml(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

// ---- Script actions ----
window.copyScript = function(id) {
    const body = document.getElementById('body-' + id);
    if (!body) return;
    navigator.clipboard.writeText(body.innerText);
    const btn = body.closest('.script-card').querySelector('.sc-btn');
    const orig = btn.innerHTML;
    btn.innerHTML = '<i class="fa-solid fa-check"></i>';
    setTimeout(() => btn.innerHTML = orig, 1500);
};

window.saveScript = function(id, num) {
    const body = document.getElementById('body-' + id);
    const product = document.getElementById('at-product').value.trim();
    if (!body) return;
    const entry = {
        id: Date.now(),
        product,
        platform: selectedPlatform,
        hook: HOOK_LABELS[selectedHook],
        num,
        content: body.innerText,
        date: new Date().toLocaleString('vi-VN'),
    };
    savedScripts.unshift(entry);
    if (savedScripts.length > 50) savedScripts.pop();
    localStorage.setItem('sora_ads_scripts', JSON.stringify(savedScripts));
    updateSavedCount();
    const btn = document.getElementById('save-btn-' + id);
    if (btn) btn.classList.add('saved');
};

function updateSavedCount() {
    document.getElementById('saved-count').textContent = savedScripts.length;
}

// ---- Export all ----
document.getElementById('copy-all-btn').addEventListener('click', () => {
    const all = [...document.querySelectorAll('.script-body')].map(b => b.innerText).join('\n\n---\n\n');
    navigator.clipboard.writeText(all);
    const btn = document.getElementById('copy-all-btn');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã copy!';
    setTimeout(() => btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy tất cả', 2000);
});

document.getElementById('export-all-btn').addEventListener('click', () => {
    const product = document.getElementById('at-product').value.trim();
    const all = [...document.querySelectorAll('.script-body')].map((b, i) => `=== Script ${i+1} ===\n${b.innerText}`).join('\n\n');
    const blob = new Blob([all], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `ads_scripts_${product.slice(0, 20).replace(/\s/g,'_')}_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
});

// ---- Saved modal ----
document.getElementById('saved-btn').addEventListener('click', () => {
    renderSavedList();
    document.getElementById('saved-modal').classList.add('active');
});
document.getElementById('close-saved').addEventListener('click', () => document.getElementById('saved-modal').classList.remove('active'));
document.getElementById('saved-modal').addEventListener('click', e => { if (e.target === document.getElementById('saved-modal')) document.getElementById('saved-modal').classList.remove('active'); });

function renderSavedList() {
    const list = document.getElementById('saved-list');
    if (!savedScripts.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">Chưa có script nào được lưu.</p>'; return; }
    list.innerHTML = savedScripts.map((s, i) => `
        <div class="saved-item">
            <div class="saved-item-header">
                <div class="saved-item-title">${escHtml(s.product)} — Script ${s.num}</div>
                <button class="del-saved" onclick="deleteSaved(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>
            <div class="saved-item-meta">
                <span>📅 ${s.date}</span>
                <span>📱 ${s.platform}</span>
                <span>🪝 ${s.hook}</span>
            </div>
            <div class="saved-item-preview">${escHtml(s.content)}</div>
        </div>
    `).join('');
}

window.deleteSaved = function(i) {
    savedScripts.splice(i, 1);
    localStorage.setItem('sora_ads_scripts', JSON.stringify(savedScripts));
    updateSavedCount();
    renderSavedList();
};

// ---- State ----
function showState(state, msg = '') {
    atIdle.style.display    = 'none';
    atLoading.style.display = 'none';
    atOutput.style.display  = 'none';
    if (state === 'idle')    atIdle.style.display    = '';
    if (state === 'loading') atLoading.style.display = '';
    if (state === 'output')  atOutput.style.display  = '';
    if (state === 'error') {
        atOutput.style.display = '';
        scriptsContainer.innerHTML = `<div style="margin:1.5rem;background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.25);border-radius:10px;padding:1rem;color:#ef4444"><strong>❌ Lỗi</strong><br>${escHtml(msg)}</div>`;
        document.getElementById('output-meta').innerHTML = '';
    }
}

// ---- Init ----
initTheme();
updateSavedCount();
