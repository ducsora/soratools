// ============================
// SoraTools – Chat với AI
// Supports: Google Gemini + OpenAI
// ============================

// ---- DOM refs ----
const messagesArea = document.getElementById('messages-area');
const welcomeState = document.getElementById('welcome-state');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const chatStatus = document.getElementById('chat-status');
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettings = document.getElementById('close-settings');
const saveSettingsBtn = document.getElementById('save-settings-btn');
const clearBtn = document.getElementById('clear-btn');
const configLink = document.getElementById('config-link');
const apiKeyInput = document.getElementById('api-key-input');
const apiKeyLabel = document.getElementById('api-key-label');
const apiKeyHint = document.getElementById('api-key-hint');
const apiKeyLink = document.getElementById('api-key-link');
const modelSelect = document.getElementById('model-select');
const systemPromptInput = document.getElementById('system-prompt-input');
const themeToggle = document.getElementById('theme-toggle');
const providerTabs = document.getElementById('provider-tabs');
const geminiModels = document.getElementById('gemini-models');
const openaiModels = document.getElementById('openai-models');

// ---- Default System Prompt ----
const DEFAULT_SYSTEM_PROMPT = `Bạn là Sora AI, trợ lý thông minh tích hợp trong ứng dụng SoraTools — 
một bộ công cụ năng suất cá nhân. Bạn thân thiện, nói tiếng Việt tự nhiên, 
trả lời súc tích và hữu ích. Có thể hỗ trợ về tài chính cá nhân, lập kế hoạch, 
và các vấn đề hàng ngày. Sử dụng emoji khi phù hợp để làm câu trả lời sinh động hơn.`;

// ---- State ----
let conversationHistory = [];
let isLoading = false;
let settings = loadSettings();

// ---- Theme ----
function initTheme() {
    if (localStorage.getItem('theme') === null) localStorage.setItem('theme', 'dark');
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

// ---- Settings ----
function loadSettings() {
    return {
        provider: localStorage.getItem('sora_ai_provider') || 'gemini',
        apiKey: localStorage.getItem('sora_ai_key') || '',
        model: localStorage.getItem('sora_ai_model') || 'gemini-2.0-flash',
        systemPrompt: localStorage.getItem('sora_ai_prompt') || DEFAULT_SYSTEM_PROMPT
    };
}

// ---- Provider UI switch ----
function switchProvider(provider) {
    settings.provider = provider;

    // Update tab styles
    document.querySelectorAll('.provider-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.provider === provider);
    });

    if (provider === 'gemini') {
        apiKeyLabel.textContent = 'Google Gemini API Key';
        apiKeyInput.placeholder = 'AIzaSy...';
        apiKeyHint.innerHTML = 'Lấy API key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank">Google AI Studio</a>';
        geminiModels.style.display = '';
        openaiModels.style.display = 'none';
        // Switch to a gemini model if currently on openai
        if (!modelSelect.value.startsWith('gemini')) {
            modelSelect.value = 'gemini-2.0-flash';
        }
    } else {
        apiKeyLabel.textContent = 'OpenAI API Key';
        apiKeyInput.placeholder = 'sk-...';
        apiKeyHint.innerHTML = 'Lấy API key tại <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>';
        geminiModels.style.display = 'none';
        openaiModels.style.display = '';
        if (modelSelect.value.startsWith('gemini')) {
            modelSelect.value = 'gpt-4o-mini';
        }
    }
}

// Provider tab click
providerTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.provider-tab');
    if (btn) switchProvider(btn.dataset.provider);
});

function openSettings() {
    // Populate form
    switchProvider(settings.provider);
    apiKeyInput.value = settings.apiKey;
    modelSelect.value = settings.model;
    systemPromptInput.value = settings.systemPrompt;
    settingsModal.classList.add('active');
}

settingsBtn.addEventListener('click', openSettings);
configLink.addEventListener('click', (e) => { e.preventDefault(); openSettings(); });
closeSettings.addEventListener('click', () => settingsModal.classList.remove('active'));
settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) settingsModal.classList.remove('active'); });

saveSettingsBtn.addEventListener('click', () => {
    settings.apiKey = apiKeyInput.value.trim();
    settings.model = modelSelect.value;
    settings.systemPrompt = systemPromptInput.value.trim() || DEFAULT_SYSTEM_PROMPT;

    localStorage.setItem('sora_ai_provider', settings.provider);
    localStorage.setItem('sora_ai_key', settings.apiKey);
    localStorage.setItem('sora_ai_model', settings.model);
    localStorage.setItem('sora_ai_prompt', settings.systemPrompt);

    settingsModal.classList.remove('active');
    updateStatusBar();
    showToast('✅ Đã lưu cài đặt!');
});

function updateStatusBar() {
    const providerName = settings.provider === 'gemini' ? '🔵 Gemini' : '🟢 OpenAI';
    chatStatus.textContent = settings.apiKey
        ? `Sẵn sàng · ${providerName} · ${settings.model}`
        : 'Chưa cài đặt API key';
}

// ---- Toast ----
function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = `
        position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
        background: var(--primary-color); color: #000; font-weight: 600;
        padding: 0.7rem 1.5rem; border-radius: 99px; z-index: 9999;
        font-size: 0.9rem; animation: msgIn 0.3s ease-out;
        font-family: 'UTM Avo', sans-serif;
    `;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 2500);
}

// ---- Messaging ----
function addMessage(role, content) {
    const msgEl = document.createElement('div');
    msgEl.className = `message ${role}`;
    const icon = role === 'user' ? 'fa-user' : 'fa-robot';
    msgEl.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid ${icon}"></i></div>
        <div class="msg-bubble">${formatContent(content)}</div>
    `;
    messagesArea.appendChild(msgEl);
    messagesArea.scrollTop = messagesArea.scrollHeight;
    return msgEl;
}

function formatContent(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br>');
}

function showTyping() {
    const el = document.createElement('div');
    el.className = 'message assistant';
    el.id = 'typing-indicator';
    el.innerHTML = `
        <div class="msg-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="msg-bubble">
            <div class="typing-dots"><span></span><span></span><span></span></div>
        </div>
    `;
    messagesArea.appendChild(el);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function removeTyping() {
    document.getElementById('typing-indicator')?.remove();
}

function showError(msg) {
    const el = document.createElement('div');
    el.className = 'error-msg';
    el.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> ${msg}`;
    messagesArea.appendChild(el);
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

// ---- API Calls ----
async function callGemini(text) {
    const model = settings.model;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${settings.apiKey}`;

    // Build Gemini conversation format
    const contents = conversationHistory.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }]
    }));

    const body = {
        system_instruction: {
            parts: [{ text: settings.systemPrompt }]
        },
        contents,
        generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,
        }
    };

    const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });

    const data = await res.json();

    if (!res.ok) {
        const msg = data.error?.message || 'Lỗi Gemini API';
        throw new Error(msg);
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || '(Không có phản hồi)';
}

async function callOpenAI(text) {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${settings.apiKey}`
        },
        body: JSON.stringify({
            model: settings.model,
            messages: [
                { role: 'system', content: settings.systemPrompt },
                ...conversationHistory
            ],
            max_tokens: 1500,
            temperature: 0.7
        })
    });

    const data = await res.json();

    if (!res.ok) {
        const msg = data.error?.message || 'Lỗi OpenAI API';
        throw new Error(msg);
    }

    return data.choices[0].message.content;
}

// ---- Send Message ----
async function sendMessage(text) {
    if (!text.trim() || isLoading) return;

    if (welcomeState) welcomeState.style.display = 'none';

    if (!settings.apiKey) {
        openSettings();
        showToast('⚠️ Vui lòng nhập API key trước!');
        return;
    }

    isLoading = true;
    sendBtn.disabled = true;
    chatStatus.textContent = settings.provider === 'gemini' ? '🔵 Gemini đang suy nghĩ...' : '🟢 GPT đang suy nghĩ...';

    conversationHistory.push({ role: 'user', content: text });
    addMessage('user', text);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    showTyping();

    try {
        let reply;
        if (settings.provider === 'gemini') {
            reply = await callGemini(text);
        } else {
            reply = await callOpenAI(text);
        }

        removeTyping();
        conversationHistory.push({ role: 'assistant', content: reply });
        addMessage('assistant', reply);

    } catch (err) {
        removeTyping();
        const isKeyErr = err.message.toLowerCase().includes('api key') || err.message.toLowerCase().includes('api_key');
        showError(isKeyErr
            ? `🔑 API key không hợp lệ. <a href="#" onclick="openSettings()">Kiểm tra lại</a>`
            : `❌ ${err.message}`
        );
        conversationHistory.pop();
    } finally {
        isLoading = false;
        sendBtn.disabled = false;
        updateStatusBar();
        chatInput.focus();
    }
}

// ---- Suggestion Chips ----
window.sendSuggestion = function(text) {
    chatInput.value = text;
    sendMessage(text);
};

// ---- Events ----
sendBtn.addEventListener('click', () => sendMessage(chatInput.value));

chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(chatInput.value);
    }
});

chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = chatInput.scrollHeight + 'px';
});

clearBtn.addEventListener('click', () => {
    if (conversationHistory.length === 0) return;
    if (!confirm('Xóa toàn bộ cuộc hội thoại này?')) return;
    conversationHistory = [];
    messagesArea.innerHTML = '';
    messagesArea.appendChild(welcomeState);
    welcomeState.style.display = 'flex';
});

// ---- Init ----
initTheme();
if (window.SoraUI) SoraUI.initSidebar();
updateStatusBar();
