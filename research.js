// ============================
// SoraTools – Product Research
// Powered by Gemini AI
// ============================

// ---- DOM ----
const themeToggle = document.getElementById('theme-toggle');
const runBtn      = document.getElementById('run-research-btn');
const promptTA    = document.getElementById('research-prompt');
const resultIdle  = document.getElementById('result-idle');
const resultLoad  = document.getElementById('result-loading');
const resultCont  = document.getElementById('result-content');
const resultBody  = document.getElementById('result-body');
const resultMeta  = document.getElementById('result-meta');
const settingsModal = document.getElementById('settings-modal');
const historyModal  = document.getElementById('history-modal');

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
function loadGeminiCfg() {
    return {
        key:   localStorage.getItem('chat_gemini_key')   || localStorage.getItem('research_gemini_key') || '',
        model: localStorage.getItem('research_gemini_model') || 'gemini-2.0-flash',
    };
}

// Settings modal
document.getElementById('settings-btn').addEventListener('click', () => {
    const cfg = loadGeminiCfg();
    document.getElementById('gemini-key-input').value   = cfg.key;
    document.getElementById('gemini-model-input').value = cfg.model;
    settingsModal.classList.add('active');
});
document.getElementById('close-settings').addEventListener('click', () => settingsModal.classList.remove('active'));
document.getElementById('close-settings-btn').addEventListener('click', () => settingsModal.classList.remove('active'));
settingsModal.addEventListener('click', e => { if (e.target === settingsModal) settingsModal.classList.remove('active'); });
document.getElementById('save-settings-btn').addEventListener('click', () => {
    localStorage.setItem('research_gemini_key',   document.getElementById('gemini-key-input').value.trim());
    localStorage.setItem('research_gemini_model', document.getElementById('gemini-model-input').value);
    settingsModal.classList.remove('active');
});

// ---- History ----
function loadHistory() {
    const s = localStorage.getItem('research_history');
    return s ? JSON.parse(s) : [];
}
function saveToHistory(entry) {
    const h = loadHistory();
    h.unshift(entry);
    if (h.length > 20) h.pop();
    localStorage.setItem('research_history', JSON.stringify(h));
}

document.getElementById('history-btn').addEventListener('click', () => {
    renderHistory();
    historyModal.classList.add('active');
});
document.getElementById('close-history').addEventListener('click', () => historyModal.classList.remove('active'));
historyModal.addEventListener('click', e => { if (e.target === historyModal) historyModal.classList.remove('active'); });

function renderHistory() {
    const h    = loadHistory();
    const list = document.getElementById('history-list');
    if (!h.length) { list.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:2rem">Chưa có lịch sử nào.</p>'; return; }
    list.innerHTML = h.map((item, i) => `
        <div class="history-item" onclick="loadHistoryItem(${i})">
            <div class="history-item-title">${escHtml(item.prompt.slice(0, 80))}${item.prompt.length > 80 ? '...' : ''}</div>
            <div class="history-item-meta">
                <span>🕐 ${item.date}</span>
                <span>🌏 ${item.market}</span>
                <span>📦 ${item.model}</span>
            </div>
        </div>
    `).join('');
}

window.loadHistoryItem = function(idx) {
    const h = loadHistory();
    const item = h[idx];
    if (!item) return;
    promptTA.value = item.prompt;
    showResult(item.response, item.prompt, item.market, item.model, item.date);
    historyModal.classList.remove('active');
};

// ---- Preset Templates ----
const PRESETS = {
    trending: (market, cat, tf) =>
        `Bạn là chuyên gia phân tích thị trường thương mại điện tử Đông Nam Á.\n\nDựa trên xu hướng tìm kiếm và tiêu dùng trong ${tf} tại ${market}, hãy liệt kê TOP 5 sản phẩm ${cat} đang có MỨC TĂNG TRƯỞNG CAO NHẤT.\n\nVới mỗi sản phẩm, hãy cung cấp:\n1. Tên sản phẩm & lý do trending\n2. Mức độ cạnh tranh (Thấp/Trung bình/Cao)\n3. Khoảng giá bán lẻ thị trường\n4. Đánh giá tiềm năng (⭐⭐⭐⭐⭐)\n5. Gợi ý angle quảng cáo Facebook/TikTok\n\nTrình bày rõ ràng, có số liệu cụ thể, dùng emoji để dễ đọc.`,

    niche: (market, cat, tf) =>
        `Bạn là chuyên gia nghiên cứu ngách sản phẩm cho thị trường ${market}.\n\nHãy phân tích 3 ngách sản phẩm ${cat} ít cạnh tranh nhưng đang có tín hiệu tăng trưởng mạnh trong ${tf}.\n\nVới mỗi ngách, trình bày:\n🎯 Mô tả ngách & đối tượng khách hàng mục tiêu\n📊 Tín hiệu thị trường (search trend, social buzz)\n🏆 Lợi thế cạnh tranh nếu gia nhập sớm\n💰 Ước tính biên lợi nhuận (gross margin)\n⚠️ Rủi ro cần lưu ý\n\nCụ thể, thực tế, phù hợp với đặc thù người tiêu dùng ${market}.`,

    competitor: (market, cat, tf) =>
        `Hãy phân tích phong cách quảng cáo và chiến lược bán hàng của các seller hàng đầu trong ngành ${cat} tại ${market}.\n\nPhân tích dựa trên dữ liệu ${tf} bao gồm:\n\n1. **Các loại creative đang có CTR cao**: Unboxing, Before/After, Testimonial, So sánh...\n2. **Hook phổ biến** trong 3 giây đầu của video TikTok/Facebook\n3. **Pain point** khách hàng hay chia sẻ trong comment\n4. **Giá và combo** đang được dùng nhiều nhất\n5. **Điểm yếu** của đối thủ mà ta có thể khai thác\n\nKết thúc bằng 3 gợi ý hành động cụ thể cho người mới vào ngách này.`,

    winner: (market, cat, tf) =>
        `Với vai trò là dropshipper/importer đang tìm kiếm "winning product" cho thị trường ${market}, hãy đề xuất 5 sản phẩm ${cat} có tiềm năng trở thành WINNER trong ${tf}.\n\nMỗi sản phẩm phải thỏa mãn:\n✅ Wow factor (nhìn là muốn mua)\n✅ Khó tìm ở cửa hàng truyền thống\n✅ Biên lợi nhuận > 40%\n✅ Phù hợp quảng cáo Facebook/TikTok\n✅ Ít vấn đề logistics\n\nCho từng sản phẩm:\n- Mô tả & lý do chọn\n- Nguồn hàng gợi ý (AliExpress, 1688, Alibaba)\n- Giá nhập / Giá bán lẻ đề xuất\n- Script quảng cáo mẫu 15 giây\n- Score Winning Product: /100`,

    seasonal: (market, cat, tf) =>
        `Dựa vào lịch văn hóa, lễ hội và mùa vụ của ${market}, hãy dự báo:\n\n📅 Các sản phẩm ${cat} sẽ BÙNG NỔ trong 60 ngày tới\n\nBao gồm:\n1. Danh sách sự kiện/lễ hội sắp tới ảnh hưởng đến mua sắm\n2. TOP sản phẩm được tìm kiếm nhiều theo mùa\n3. Khung thời gian cụ thể để bắt đầu quảng cáo (warm-up → launch → scale)\n4. Gợi ý ngân sách và chiến lược cho từng giai đoạn\n\nĐây là thị trường ${market}, chú ý các đặc điểm văn hóa và tôn giáo địa phương.`,

    ads: (market, cat, tf) =>
        `Tạo 5 ý tưởng creative quảng cáo Facebook/TikTok cho sản phẩm ${cat} tại ${market}.\n\nMỗi ý tưởng bao gồm:\n🎬 **Concept**: (Loại creative: UGC, animation, demo...)\n🪝 **Hook** (3 giây đầu thu hút)\n📝 **Script** ngắn (15-30 giây)\n🎯 **Target audience** cụ thể\n💡 **CTA** kêu gọi hành động\n📊 **Dự đoán CTR** (thấp/trung bình/cao)\n\nĐặc điểm người dùng ${market}: thích video thực tế, cần thấy sản phẩm hoạt động, quan tâm giá trị.\nViết theo phong cách người bản địa, không quá formal.`
};

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const preset = btn.dataset.preset;
        const market = document.getElementById('opt-market').value;
        const cat    = document.getElementById('opt-category').options[document.getElementById('opt-category').selectedIndex].text;
        const tf     = document.getElementById('opt-timeframe').value;

        promptTA.value = PRESETS[preset]?.(market, cat, tf) || '';
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        promptTA.focus();
    });
});

// Update preset when options change
['opt-market','opt-category','opt-timeframe'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
        const active = document.querySelector('.preset-btn.active');
        if (active) active.click();
    });
});

// ---- Run Research ----
runBtn.addEventListener('click', runResearch);

async function runResearch() {
    const prompt = promptTA.value.trim();
    if (!prompt) { promptTA.focus(); return; }

    const cfg = loadGeminiCfg();
    if (!cfg.key) {
        document.getElementById('settings-btn').click();
        alert('Vui lòng nhập Gemini API Key trước!');
        return;
    }

    showState('loading');
    runBtn.disabled = true;

    // Build system context
    const market = document.getElementById('opt-market').value;
    const catEl  = document.getElementById('opt-category');
    const cat    = catEl.options[catEl.selectedIndex].text;
    const tf     = document.getElementById('opt-timeframe').value;

    const systemPrompt = `Bạn là chuyên gia phân tích thị trường thương mại điện tử, chuyên về ${market}. 
Ngày hiện tại: ${new Date().toLocaleDateString('vi-VN', {day:'2-digit', month:'2-digit', year:'numeric'})}.
Luôn trả lời bằng tiếng Việt, sử dụng emoji, định dạng rõ ràng với heading và bullet points.
Trả lời thực tế, cụ thể, có thể áp dụng ngay.`;

    const fullPrompt = `${systemPrompt}\n\n---\n\n${prompt}`;

    try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${cfg.model}:generateContent?key=${cfg.key}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: fullPrompt }] }],
                generationConfig: { temperature: 0.8, maxOutputTokens: 4096 }
            })
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error?.message || 'Lỗi Gemini API');

        const text = json.candidates?.[0]?.content?.parts?.[0]?.text || 'Không có phản hồi.';
        const date = new Date().toLocaleString('vi-VN');

        saveToHistory({ prompt, response: text, market, model: cfg.model, date });
        showResult(text, prompt, market, cfg.model, date);

    } catch(e) {
        showState('error', e.message);
    } finally {
        runBtn.disabled = false;
    }
}

// ---- Display ----
function showState(state, msg = '') {
    resultIdle.style.display  = 'none';
    resultLoad.style.display  = 'none';
    resultCont.style.display  = 'none';
    if (state === 'idle')    resultIdle.style.display = '';
    if (state === 'loading') resultLoad.style.display = '';
    if (state === 'result')  resultCont.style.display = '';
    if (state === 'error') {
        resultCont.style.display = '';
        resultBody.innerHTML = `<div class="error-box"><strong>❌ Lỗi</strong>${escHtml(msg)}</div>`;
        resultMeta.innerHTML = '';
    }
}

function showResult(text, prompt, market, model, date) {
    resultMeta.innerHTML = `<strong>${market}</strong> · ${model} · ${date}`;
    resultBody.innerHTML = markdownToHtml(text);
    showState('result');
}

// ---- Markdown renderer ----
function markdownToHtml(md) {
    return md
        .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
        // Headers
        .replace(/^### (.+)$/gm, '<h3>$1</h3>')
        .replace(/^## (.+)$/gm, '<h2>$1</h2>')
        .replace(/^# (.+)$/gm, '<h2>$1</h2>')
        // Bold + italic
        .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        // Blockquote
        .replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')
        // Code  
        .replace(/`(.+?)`/g, '<code>$1</code>')
        // Unordered lists
        .replace(/^\s*[-•*] (.+)$/gm, '<li>$1</li>')
        // Ordered lists
        .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
        // Wrap consecutive li
        .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
        // Horizontal rule
        .replace(/^---$/gm, '<hr style="border-color:var(--border-color);margin:1.5rem 0">')
        // Paragraphs
        .replace(/\n{2,}/g, '</p><p>')
        .replace(/^(?!<[a-z])(.+)$/gm, (m) => m.startsWith('<') ? m : m)
        // Wrap in p
        .replace(/^(.)/gm, (m, c, i, s) => {
            return m;
        });
}

// Simpler, more reliable markdown
function markdownToHtml(md) {
    const lines = md.split('\n');
    let html = '';
    let inList = false;

    lines.forEach(line => {
        const raw = line;
        // Apply inline formatting
        line = line
            .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>');

        if (/^### /.test(raw)) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h3>${line.slice(4)}</h3>`;
        } else if (/^## /.test(raw) || /^# /.test(raw)) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<h2>${line.replace(/^#{1,2} /, '')}</h2>`;
        } else if (/^---$/.test(raw)) {
            if (inList) { html += '</ul>'; inList = false; }
            html += '<hr style="border-color:var(--border-color);margin:1.5rem 0">';
        } else if (/^[>\s]*&gt; /.test(raw) || /^> /.test(raw)) {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<blockquote>${line.replace(/^[>\s]*(&gt;|>) ?/, '')}</blockquote>`;
        } else if (/^\s*[-•*] /.test(raw) || /^\d+\. /.test(raw)) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += `<li>${line.replace(/^\s*[-•*\d.] ?/, '')}</li>`;
        } else if (raw.trim() === '') {
            if (inList) { html += '</ul>'; inList = false; }
            html += '<br>';
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            html += `<p>${line}</p>`;
        }
    });
    if (inList) html += '</ul>';
    return html;
}

function escHtml(s) {
    return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ---- Action buttons ----
document.getElementById('copy-result-btn').addEventListener('click', () => {
    navigator.clipboard.writeText(resultBody.innerText);
    const btn = document.getElementById('copy-result-btn');
    btn.innerHTML = '<i class="fa-solid fa-check"></i> Đã copy!';
    setTimeout(() => btn.innerHTML = '<i class="fa-solid fa-copy"></i> Copy', 2000);
});

document.getElementById('save-result-btn').addEventListener('click', () => {
    const text = resultBody.innerText;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `product_research_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
});

// ---- Init ----
initTheme();
