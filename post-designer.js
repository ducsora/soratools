// ============================
// SoraTools – Post Designer
// Canvas-based image editor
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

// ---- Canvas Setup ----
const canvas  = document.getElementById('main-canvas');
const ctx     = canvas.getContext('2d');
const wrapper = document.getElementById('canvas-wrapper');
const dragLayer = document.getElementById('drag-layer');

let bgImage    = null;
let textLayers = [];
let activeIdx  = -1;
let zoom       = 1;
let history    = [];
let historyIdx = -1;

// Canvas size
let CW = 1080, CH = 1080;

function setCanvasSize(w, h) {
    CW = w; CH = h;
    canvas.width  = w;
    canvas.height = h;
    wrapper.style.width  = (w * zoom) + 'px';
    wrapper.style.height = (h * zoom) + 'px';
    redraw();
}

document.getElementById('canvas-size').addEventListener('change', e => {
    const [w, h] = e.target.value.split(',').map(Number);
    setCanvasSize(w, h);
});

// ---- Zoom ----
document.getElementById('zoom-in-btn').addEventListener('click', () => { zoom = Math.min(zoom + 0.1, 3); applyZoom(); });
document.getElementById('zoom-out-btn').addEventListener('click', () => { zoom = Math.max(zoom - 0.1, 0.2); applyZoom(); });
function applyZoom() {
    zoom = +zoom.toFixed(1);
    wrapper.style.width  = (CW * zoom) + 'px';
    wrapper.style.height = (CH * zoom) + 'px';
    canvas.style.width   = (CW * zoom) + 'px';
    canvas.style.height  = (CH * zoom) + 'px';
    document.getElementById('zoom-label').textContent = Math.round(zoom * 100) + '%';
    updateHandles();
}

// ---- Image Upload ----
const imgUpload = document.getElementById('img-upload');
const dropZone  = document.getElementById('img-drop-zone');

imgUpload.addEventListener('change', e => loadImageFile(e.target.files[0]));
dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('drag-over');
    const f = e.dataTransfer?.files[0];
    if (f && f.type.startsWith('image/')) loadImageFile(f);
});

function loadImageFile(file) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
        bgImage = img;
        redraw();
        pushHistory();
    };
    img.src = url;
}

// ---- Overlay ----
const overlayColor   = document.getElementById('overlay-color');
const overlayOpacity = document.getElementById('overlay-opacity');
const overlayVal     = document.getElementById('overlay-opacity-val');
const gradType       = document.getElementById('gradient-type');

overlayOpacity.addEventListener('input', () => { overlayVal.textContent = overlayOpacity.value + '%'; redraw(); });
overlayColor.addEventListener('input', redraw);
gradType.addEventListener('change', redraw);

// ---- Draw ----
function redraw() {
    ctx.clearRect(0, 0, CW, CH);

    // 1. Background image
    if (bgImage) {
        // Cover-fit
        const ratio = Math.max(CW / bgImage.width, CH / bgImage.height);
        const sw = bgImage.width * ratio, sh = bgImage.height * ratio;
        const sx = (CW - sw) / 2, sy = (CH - sh) / 2;
        ctx.drawImage(bgImage, sx, sy, sw, sh);
    } else {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, CW, CH);
    }

    // 2. Color overlay
    const opa = parseInt(overlayOpacity.value) / 100;
    if (opa > 0) {
        ctx.globalAlpha = opa;
        ctx.fillStyle   = overlayColor.value;
        ctx.fillRect(0, 0, CW, CH);
        ctx.globalAlpha = 1;
    }

    // 3. Gradient overlay
    drawGradient();

    // 4. Text layers
    textLayers.forEach((layer, i) => drawTextLayer(layer, i === activeIdx));

    // 5. Update drag handles
    updateHandles();
}

function drawGradient() {
    const type = gradType.value;
    if (type === 'none') return;

    let grad;
    const PRESETS = {
        bottom:  ['to bottom',   [0, 'transparent'], [CH * 0.4, 'transparent'], [CH, 'rgba(0,0,0,0.85)']],
        top:     ['to top',      [0, 'transparent'], [CH * 0.4, 'transparent'], [CH, 'rgba(0,0,0,0.85)']],
        left:    ['to left',     [0, 'transparent'], [CW * 0.4, 'transparent'], [CW, 'rgba(0,0,0,0.75)']],
        right:   ['to right',    [0, 'transparent'], [CW * 0.4, 'transparent'], [CW, 'rgba(0,0,0,0.75)']],
        golden:  ['to bottom',   [0, 'rgba(120,60,0,0.5)'], [CH * 0.5, 'rgba(200,100,0,0.2)'], [CH, 'rgba(0,0,0,0.7)']],
        blue:    ['to bottom',   [0, 'rgba(0,50,120,0.5)'], [CH * 0.5, 'rgba(0,30,80,0.2)'], [CH, 'rgba(0,0,0,0.7)']],
        purple:  ['to bottom',   [0, 'rgba(80,0,120,0.5)'], [CH * 0.5, 'rgba(50,0,80,0.2)'], [CH, 'rgba(0,0,0,0.7)']],
    };

    if (type === 'full') {
        // Top + bottom separately
        const g1 = ctx.createLinearGradient(0, 0, 0, CH * 0.5);
        g1.addColorStop(0, 'rgba(0,0,0,0.75)');
        g1.addColorStop(1, 'transparent');
        ctx.fillStyle = g1; ctx.fillRect(0, 0, CW, CH);
        const g2 = ctx.createLinearGradient(0, CH * 0.5, 0, CH);
        g2.addColorStop(0, 'transparent');
        g2.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = g2; ctx.fillRect(0, 0, CW, CH);
        return;
    }

    const preset = PRESETS[type];
    if (!preset) return;
    const [dir, ...stops] = preset;
    let g;
    if (dir === 'to bottom') g = ctx.createLinearGradient(0, 0, 0, CH);
    else if (dir === 'to top') g = ctx.createLinearGradient(0, CH, 0, 0);
    else if (dir === 'to left') g = ctx.createLinearGradient(CW, 0, 0, 0);
    else g = ctx.createLinearGradient(0, 0, CW, 0);

    stops.forEach(([pos, color]) => g.addColorStop(Math.min(1, pos / (dir.includes('bottom') || dir.includes('top') ? CH : CW)), color));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CW, CH);
}

function drawTextLayer(layer, isActive) {
    ctx.save();
    ctx.globalAlpha = (layer.opacity ?? 100) / 100;

    const lines = layer.text.split('\n');
    const fontSize = layer.size || 60;
    const fontFamily = layer.font || 'Oswald';
    const bold = layer.bold !== false ? 'bold ' : '';
    ctx.font = `${bold}${fontSize}px "${fontFamily}", sans-serif`;
    ctx.textAlign = layer.align || 'left';

    // Measure for bg
    const maxW = lines.reduce((m, l) => Math.max(m, ctx.measureText(l).width), 0);
    const lineH = fontSize * 1.2;
    const totalH = lines.length * lineH;

    // Background box
    const bgOpa = (layer.bgOpacity || 0) / 100;
    if (bgOpa > 0) {
        ctx.globalAlpha = bgOpa * ((layer.opacity ?? 100) / 100);
        ctx.fillStyle = layer.bgColor || '#facc15';
        const pad = fontSize * 0.2;
        let bx = layer.x;
        if (layer.align === 'center') bx -= maxW / 2 + pad;
        else if (layer.align === 'right') bx -= maxW + pad;
        else bx -= pad;
        ctx.fillRect(bx, layer.y - fontSize * 0.9, maxW + pad * 2, totalH + pad);
        ctx.globalAlpha = (layer.opacity ?? 100) / 100;
    }

    // Shadow
    if ((layer.shadow || 0) > 0) {
        ctx.shadowOffsetX = layer.shadow / 3;
        ctx.shadowOffsetY = layer.shadow / 3;
        ctx.shadowBlur    = layer.shadow;
        ctx.shadowColor   = 'rgba(0,0,0,0.9)';
    }

    // Draw each line
    lines.forEach((line, i) => {
        const y = layer.y + i * lineH;
        // Stroke
        if ((layer.stroke || 0) > 0) {
            ctx.lineWidth   = layer.stroke;
            ctx.strokeStyle = layer.strokeColor || '#000000';
            ctx.lineJoin    = 'round';
            ctx.strokeText(line, layer.x, y);
        }
        ctx.fillStyle = layer.color || '#ffffff';
        ctx.fillText(line, layer.x, y);
    });

    ctx.restore();
}

// ---- Text Layers ----
function addTextLayer(text = 'TIÊU ĐỀ HERE', opts = {}) {
    const layer = {
        id:          Date.now(),
        text,
        x:           CW / 2,
        y:           CH / 2,
        font:        opts.font   || 'Oswald',
        size:        opts.size   || 80,
        color:       opts.color  || '#ffffff',
        bold:        opts.bold   !== false,
        stroke:      opts.stroke || 2,
        strokeColor: opts.strokeColor || '#000000',
        shadow:      opts.shadow !== undefined ? opts.shadow : 8,
        opacity:     100,
        bgOpacity:   0,
        bgColor:     '#facc15',
        align:       'center',
    };
    textLayers.push(layer);
    selectLayer(textLayers.length - 1);
    renderLayersList();
    redraw();
    pushHistory();
}

document.getElementById('add-text-btn').addEventListener('click', () => addTextLayer());

function selectLayer(idx) {
    activeIdx = idx;
    const panel = document.getElementById('text-format-panel');
    if (idx < 0 || idx >= textLayers.length) {
        panel.style.display = 'none';
        renderLayersList();
        redraw();
        return;
    }
    panel.style.display = '';
    const layer = textLayers[idx];

    // Fill format panel
    document.getElementById('active-text-content').value       = layer.text;
    document.getElementById('active-font').value               = layer.font;
    document.getElementById('active-size').value               = layer.size;
    document.getElementById('active-size-val').textContent     = layer.size;
    document.getElementById('active-color').value              = layer.color;
    document.getElementById('active-bold').checked             = layer.bold !== false;
    document.getElementById('active-stroke').value             = layer.stroke || 0;
    document.getElementById('active-stroke-val').textContent   = layer.stroke || 0;
    document.getElementById('active-stroke-color').value       = layer.strokeColor || '#000000';
    document.getElementById('active-shadow').value             = layer.shadow || 0;
    document.getElementById('active-shadow-val').textContent   = layer.shadow || 0;
    document.getElementById('active-opacity').value            = layer.opacity ?? 100;
    document.getElementById('active-opacity-val').textContent  = (layer.opacity ?? 100) + '%';
    document.getElementById('active-bg-color').value           = layer.bgColor || '#facc15';
    document.getElementById('active-bg-opacity').value         = layer.bgOpacity || 0;
    document.getElementById('active-bg-opacity-val').textContent = (layer.bgOpacity || 0) + '%';

    document.querySelectorAll('.align-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.align === layer.align);
    });
    renderLayersList();
    redraw();
}

// Format panel events
function bindFormatControl(id, prop, isNum, postLabel) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('input', () => {
        if (activeIdx < 0) return;
        textLayers[activeIdx][prop] = isNum ? +el.value : el.value;
        if (postLabel) document.getElementById(postLabel).textContent = el.value + (postLabel.includes('opacity') ? '%' : '');
        redraw();
    });
    el.addEventListener('change', pushHistory);
}

bindFormatControl('active-text-content', 'text', false);
bindFormatControl('active-font', 'font', false);
bindFormatControl('active-size', 'size', true, 'active-size-val');
bindFormatControl('active-color', 'color', false);
bindFormatControl('active-stroke', 'stroke', true, 'active-stroke-val');
bindFormatControl('active-stroke-color', 'strokeColor', false);
bindFormatControl('active-shadow', 'shadow', true, 'active-shadow-val');
bindFormatControl('active-bg-color', 'bgColor', false);
bindFormatControl('active-bg-opacity', 'bgOpacity', true, 'active-bg-opacity-val');

document.getElementById('active-bold').addEventListener('change', e => {
    if (activeIdx < 0) return;
    textLayers[activeIdx].bold = e.target.checked;
    redraw(); pushHistory();
});
document.getElementById('active-opacity').addEventListener('input', e => {
    if (activeIdx < 0) return;
    textLayers[activeIdx].opacity = +e.target.value;
    document.getElementById('active-opacity-val').textContent = e.target.value + '%';
    redraw();
});

document.querySelectorAll('.align-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        if (activeIdx < 0) return;
        textLayers[activeIdx].align = btn.dataset.align;
        document.querySelectorAll('.align-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        redraw(); pushHistory();
    });
});

document.getElementById('center-h-btn').addEventListener('click', () => {
    if (activeIdx < 0) return;
    textLayers[activeIdx].x = CW / 2;
    textLayers[activeIdx].align = 'center';
    document.querySelectorAll('.align-btn').forEach(b => b.classList.toggle('active', b.dataset.align === 'center'));
    redraw(); pushHistory();
});
document.getElementById('center-v-btn').addEventListener('click', () => {
    if (activeIdx < 0) return;
    textLayers[activeIdx].y = CH / 2;
    redraw(); pushHistory();
});
document.getElementById('delete-layer-btn').addEventListener('click', () => {
    if (activeIdx < 0) return;
    textLayers.splice(activeIdx, 1);
    activeIdx = -1;
    renderLayersList();
    selectLayer(-1);
    redraw(); pushHistory();
});

// Layers list
function renderLayersList() {
    const list = document.getElementById('text-layers-list');
    if (!textLayers.length) { list.innerHTML = '<p style="color:var(--text-muted);font-size:.78rem;padding:.35rem 0">Chưa có text. Nhấn + Thêm.</p>'; return; }
    list.innerHTML = textLayers.map((l, i) => `
        <div class="text-layer-item ${i === activeIdx ? 'active' : ''}" onclick="selectLayer(${i})">
            <div class="tl-color" style="background:${l.color}"></div>
            <div class="tl-preview">${l.text.split('\n')[0]}</div>
            <div style="color:var(--text-muted);font-size:.7rem">${l.size}px</div>
        </div>`).join('');
}

// ---- Drag to move text ----
let dragging = false, dragStartX = 0, dragStartY = 0, dragLayerIdx = -1, origX = 0, origY = 0;

canvas.addEventListener('mousedown', e => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;

    // Find topmost layer at click
    for (let i = textLayers.length - 1; i >= 0; i--) {
        const l = textLayers[i];
        const size = l.size || 60;
        ctx.font = `${l.bold !== false ? 'bold ' : ''}${size}px "${l.font || 'Oswald'}", sans-serif`;
        const lines = l.text.split('\n');
        const maxW = lines.reduce((m, line) => Math.max(m, ctx.measureText(line).width), 0);
        const totalH = lines.length * size * 1.2;
        let lx = l.x;
        if (l.align === 'center') lx -= maxW / 2;
        else if (l.align === 'right') lx -= maxW;

        if (mx >= lx - 5 && mx <= lx + maxW + 5 && my >= l.y - size - 5 && my <= l.y + totalH + 5) {
            dragging = true;
            dragLayerIdx = i;
            dragStartX = mx; dragStartY = my;
            origX = l.x; origY = l.y;
            selectLayer(i);
            return;
        }
    }
    selectLayer(-1);
});

canvas.addEventListener('mousemove', e => {
    if (!dragging) return;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;
    textLayers[dragLayerIdx].x = origX + (mx - dragStartX);
    textLayers[dragLayerIdx].y = origY + (my - dragStartY);
    redraw();
});

canvas.addEventListener('mouseup', () => { if (dragging) { dragging = false; pushHistory(); } });
canvas.addEventListener('mouseleave', () => { if (dragging) { dragging = false; pushHistory(); } });

// Touch support
canvas.addEventListener('touchstart', e => {
    const t = e.touches[0];
    canvas.dispatchEvent(new MouseEvent('mousedown', { clientX:t.clientX, clientY:t.clientY }));
});
canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const t = e.touches[0];
    canvas.dispatchEvent(new MouseEvent('mousemove', { clientX:t.clientX, clientY:t.clientY }));
}, { passive:false });
canvas.addEventListener('touchend', () => canvas.dispatchEvent(new MouseEvent('mouseup')));

// Cursor
canvas.style.cursor = 'crosshair';
canvas.addEventListener('mousemove', e => {
    if (dragging) { canvas.style.cursor = 'grabbing'; return; }
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) / zoom;
    const my = (e.clientY - rect.top) / zoom;
    let onLayer = false;
    textLayers.forEach(l => {
        const size = l.size || 60;
        const lines = l.text.split('\n');
        ctx.font = `${l.bold !== false ? 'bold ' : ''}${size}px "${l.font || 'Oswald'}", sans-serif`;
        const maxW = lines.reduce((m, ln) => Math.max(m, ctx.measureText(ln).width), 0);
        let lx = l.x;
        if (l.align === 'center') lx -= maxW / 2;
        else if (l.align === 'right') lx -= maxW;
        if (mx >= lx - 5 && mx <= lx + maxW + 5 && my >= l.y - size - 5 && my <= l.y + lines.length * size * 1.2 + 5)
            onLayer = true;
    });
    canvas.style.cursor = onLayer ? 'grab' : 'crosshair';
});

function updateHandles() {
    // Minimal: just re-render layers list
    renderLayersList();
}

// ---- Stickers ----
document.querySelectorAll('.sticker-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        addTextLayer(btn.dataset.emoji, { size: 120, stroke: 0, shadow: 0, font: 'Poppins', bold: false });
    });
});

// ---- Toolbar ----
document.getElementById('clear-btn').addEventListener('click', () => {
    if (!textLayers.length) return;
    if (!confirm('Xóa tất cả text?')) return;
    textLayers = []; activeIdx = -1;
    renderLayersList();
    selectLayer(-1);
    redraw(); pushHistory();
});
document.getElementById('new-canvas-btn').addEventListener('click', () => {
    if (!confirm('Xóa tất cả và tạo mới?')) return;
    bgImage = null; textLayers = []; activeIdx = -1;
    renderLayersList(); selectLayer(-1);
    redraw();
});
document.getElementById('undo-btn').addEventListener('click', undo);
document.getElementById('redo-btn').addEventListener('click', redo);

// ---- History ----
function pushHistory() {
    const state = { layers: JSON.parse(JSON.stringify(textLayers)) };
    history = history.slice(0, historyIdx + 1);
    history.push(state);
    if (history.length > 30) history.shift();
    historyIdx = history.length - 1;
}
function undo() {
    if (historyIdx <= 0) return;
    historyIdx--;
    textLayers = JSON.parse(JSON.stringify(history[historyIdx].layers));
    activeIdx = -1; renderLayersList(); selectLayer(-1); redraw();
}
function redo() {
    if (historyIdx >= history.length - 1) return;
    historyIdx++;
    textLayers = JSON.parse(JSON.stringify(history[historyIdx].layers));
    activeIdx = -1; renderLayersList(); selectLayer(-1); redraw();
}

// ---- Download ----
document.getElementById('download-btn').addEventListener('click', () => {
    const qualEl = document.getElementById('export-quality');
    const quality = parseFloat(qualEl.value);
    let link = document.createElement('a');
    if (quality >= 1.0) {
        link.href = canvas.toDataURL('image/png');
        link.download = `soratools_post_${Date.now()}.png`;
    } else {
        link.href = canvas.toDataURL('image/jpeg', quality);
        link.download = `soratools_post_${Date.now()}.jpg`;
    }
    link.click();
});

// ---- Post to Facebook ----
document.getElementById('post-to-fb-btn').addEventListener('click', () => {
    const caption = document.getElementById('post-caption').value.trim();
    const groupUrl = document.getElementById('group-url').value.trim();

    if (caption) {
        navigator.clipboard.writeText(caption).then(() => {
            showToast('✅ Đã copy caption! Vào group và Ctrl+V để dán.');
        });
    }
    if (groupUrl) {
        setTimeout(() => window.open(groupUrl, '_blank'), 400);
    } else {
        showToast('💡 Nhập link group để mở nhanh!', 'info');
    }
});

// ---- Templates ----
let designTemplates = JSON.parse(localStorage.getItem('sora_design_tpls') || '[]');

document.getElementById('save-tpl-btn').addEventListener('click', () => {
    const name = prompt('Tên template:');
    if (!name) return;
    const thumb = canvas.toDataURL('image/jpeg', 0.3);
    designTemplates.unshift({
        id: Date.now(), name, thumb,
        layers: JSON.parse(JSON.stringify(textLayers)),
        overlayColor: overlayColor.value,
        overlayOpacity: overlayOpacity.value,
        gradType: gradType.value,
        date: new Date().toLocaleString('vi-VN'),
    });
    if (designTemplates.length > 10) designTemplates.pop();
    localStorage.setItem('sora_design_tpls', JSON.stringify(designTemplates));
    showToast(`✅ Đã lưu template "${name}"`);
});

document.getElementById('load-template-btn').addEventListener('click', () => {
    renderTemplates();
    document.getElementById('templates-modal').classList.add('active');
});
['close-templates','close-templates-btn'].forEach(id => {
    document.getElementById(id)?.addEventListener('click', () => document.getElementById('templates-modal').classList.remove('active'));
});
document.getElementById('templates-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('templates-modal')) document.getElementById('templates-modal').classList.remove('active');
});

function renderTemplates() {
    const list = document.getElementById('templates-list');
    if (!designTemplates.length) { list.innerHTML = '<p style="text-align:center;color:var(--text-muted);padding:2rem">Chưa có template. Thiết kế ảnh rồi nhấn "Lưu template".</p>'; return; }
    list.innerHTML = designTemplates.map((t, i) => `
        <div class="tpl-card">
            <img class="tpl-thumb" src="${t.thumb}" alt="">
            <div class="tpl-info">
                <div class="tpl-name">${t.name}</div>
                <div class="tpl-meta">📅 ${t.date} · ${t.layers.length} text layers</div>
            </div>
            <div class="tpl-actions">
                <button class="btn-ghost-sm" onclick="loadTemplate(${i})"><i class="fa-solid fa-rotate-left"></i> Dùng</button>
                <button class="btn-ghost-sm" style="color:#ef4444" onclick="deleteTemplate(${i})"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`).join('');
}

window.loadTemplate = function(i) {
    const t = designTemplates[i];
    if (!t) return;
    textLayers = JSON.parse(JSON.stringify(t.layers));
    overlayColor.value = t.overlayColor || '#000000';
    overlayOpacity.value = t.overlayOpacity || '30';
    overlayVal.textContent = (t.overlayOpacity || '30') + '%';
    gradType.value = t.gradType || 'none';
    activeIdx = -1; renderLayersList(); selectLayer(-1);
    redraw(); pushHistory();
    document.getElementById('templates-modal').classList.remove('active');
    showToast(`✅ Đã load template "${t.name}"`);
};

window.deleteTemplate = function(i) {
    if (!confirm('Xóa template này?')) return;
    designTemplates.splice(i, 1);
    localStorage.setItem('sora_design_tpls', JSON.stringify(designTemplates));
    renderTemplates();
};

// ---- Toast ----
function showToast(msg, type = 'success') {
    let toast = document.getElementById('pd-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'pd-toast';
        toast.style.cssText = 'position:fixed;bottom:1.5rem;right:1.5rem;padding:.75rem 1.25rem;border-radius:10px;font-size:.88rem;font-weight:600;z-index:9999;transition:all .3s;opacity:0;transform:translateY(10px);max-width:320px;box-shadow:0 8px 24px rgba(0,0,0,.3);font-family:UTM Avo,Outfit,sans-serif;';
        document.body.appendChild(toast);
    }
    const colors = { success:'#10b981', error:'#ef4444', info:'#60a5fa' };
    toast.textContent = msg;
    toast.style.background = colors[type] || '#10b981';
    toast.style.color = '#fff';
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { toast.style.opacity='0'; toast.style.transform='translateY(10px)'; }, 3500);
}

// ---- Quick start: add a default text when no content ----
function quickStart() {
    addTextLayer('TIÊU ĐỀ ĐÂY', { size:100, font:'Oswald', color:'#ffffff', stroke:3, shadow:10, align:'center' });
    textLayers[0].x = CW / 2;
    textLayers[0].y = CH * 0.4;
    addTextLayer('Nội dung phụ ở đây\nDòng thứ 2', { size:48, font:'Poppins', color:'#facc15', stroke:0, shadow:8, align:'center' });
    textLayers[1].x = CW / 2;
    textLayers[1].y = CH * 0.6;
    selectLayer(0);
    redraw(); pushHistory();
}

// ---- Init ----
initTheme();
if (window.SoraUI) SoraUI.initSidebar();
setCanvasSize(1080, 1080);
quickStart();
