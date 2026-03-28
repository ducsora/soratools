// ============================
// SoraTools – Personal Hub
// Tab controller + theme
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

// ---- Date ----
const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
const dateStr = new Date().toLocaleDateString('vi-VN', options);
const headerDate = document.getElementById('personal-date');
if (headerDate) headerDate.textContent = dateStr;
const todayDateEl = document.getElementById('today-date');
if (todayDateEl) todayDateEl.textContent = new Date().toLocaleDateString('vi-VN');

// ---- Tab switching ----
const LAST_TAB_KEY = 'sora_personal_tab';
const tabs   = document.querySelectorAll('.ptab');
const panels = document.querySelectorAll('.ptab-panel');

function switchTab(tabId) {
    tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
    panels.forEach(p => p.classList.toggle('active', p.id === 'tab-' + tabId));
    localStorage.setItem(LAST_TAB_KEY, tabId);
}

tabs.forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.tab));
});

// Restore last tab
const saved = localStorage.getItem(LAST_TAB_KEY) || 'chi-tieu';
switchTab(saved);

// ---- Goals.js patch ----
// goals.js renders to #task-list by default — redirect it to #goal-task-list
// We override getElementById scoped after goals.js loads
// (goals.js uses document.getElementById('task-list'))
// Patch: after all scripts load, re-bind #goal-task-list
document.addEventListener('DOMContentLoaded', () => {
    // The goals.js uses id="task-list" — we need to remap
    // Since we renamed the goals task list div to #goal-task-list in personal.html,
    // we patch goals.js's reference by temporarily aliasing the element
    const goalTaskList = document.getElementById('goal-task-list');
    if (goalTaskList) goalTaskList.id = 'task-list'; // let goals.js find it
    // After goals.js runs via its own init, restore
    // (goals.js is already loaded and runs immediately at script load time, so this is for future re-renders)
});
