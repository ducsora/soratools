// ============================
// SoraTools - Mục tiêu hàng ngày
// ============================

const STORAGE_KEY = 'sora_goals';

let state = loadState();

// ---- DOM refs ----
const todayDateEl = document.getElementById('today-date');
const ringFill = document.getElementById('ring-fill');
const progressPct = document.getElementById('progress-pct');
const progressSummary = document.getElementById('progress-summary');
const motivationBadge = document.getElementById('motivation-badge');
const streakValEl = document.getElementById('streak-val');
const completedValEl = document.getElementById('completed-val');

const mainGoalDisplay = document.getElementById('main-goal-display');
const mainGoalInput = document.getElementById('main-goal-input');
const mainGoalText = document.getElementById('main-goal-text');
const editMainGoalBtn = document.getElementById('edit-main-goal-btn');
const saveMainGoalBtn = document.getElementById('save-main-goal-btn');

const taskListEl = document.getElementById('task-list');
const addTaskBtn = document.getElementById('add-task-btn');
const taskAddForm = document.getElementById('task-add-form');
const newTaskInput = document.getElementById('new-task-input');
const taskPriority = document.getElementById('task-priority');
const confirmAddTask = document.getElementById('confirm-add-task');
const cancelAddTask = document.getElementById('cancel-add-task');
const resetDayBtn = document.getElementById('reset-day-btn');
const themeToggle = document.getElementById('theme-toggle');

// ---- State Management ----
function loadState() {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return {
        mainGoal: saved.mainGoal || '',
        tasks: saved.tasks || [],
        streak: saved.streak || 0,
        totalCompleted: saved.totalCompleted || 0,
        lastDate: saved.lastDate || ''
    };
}

function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// ---- Theme ----
function initTheme() {
    if (localStorage.getItem('theme') === null) {
        localStorage.setItem('theme', 'dark');
    }
    if (localStorage.getItem('theme') === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }
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
    if (isDark) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
    }
    updateThemeIcon();
});

// ---- Today Date ----
function renderTodayDate() {
    const now = new Date();
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    todayDateEl.textContent = now.toLocaleDateString('vi-VN', opts);
}

// ---- Main Goal ----
function renderMainGoal() {
    if (state.mainGoal) {
        mainGoalDisplay.innerHTML = `<span>${state.mainGoal}</span>`;
        mainGoalText.value = state.mainGoal;
    } else {
        mainGoalDisplay.innerHTML = `<span class="placeholder-text">Chưa đặt mục tiêu chính. Nhấn <i class="fa-solid fa-pen-to-square"></i> để thiết lập.</span>`;
    }
}

editMainGoalBtn.addEventListener('click', () => {
    const editing = mainGoalInput.style.display !== 'none';
    if (editing) {
        mainGoalInput.style.display = 'none';
    } else {
        mainGoalInput.style.display = 'flex';
        mainGoalText.focus();
    }
});

saveMainGoalBtn.addEventListener('click', () => {
    const val = mainGoalText.value.trim();
    if (!val) return;
    state.mainGoal = val;
    saveState();
    renderMainGoal();
    mainGoalInput.style.display = 'none';
});

mainGoalText.addEventListener('keydown', e => {
    if (e.key === 'Enter') saveMainGoalBtn.click();
    if (e.key === 'Escape') mainGoalInput.style.display = 'none';
});

// ---- Tasks ----
const priorityLabels = { high: '🔴 Cao', medium: '🟡 Trung bình', low: '🟢 Thấp' };
const priorityClasses = { high: 'badge-high', medium: 'badge-medium', low: 'badge-low' };

function renderTasks() {
    if (state.tasks.length === 0) {
        taskListEl.innerHTML = '<div class="empty-tasks">Chưa có nhiệm vụ. Hãy thêm nhiệm vụ đầu tiên của bạn!</div>';
        return;
    }

    // Sort: incomplete first, then by priority
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const sorted = [...state.tasks].sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    taskListEl.innerHTML = sorted.map(task => `
        <div class="task-item ${task.done ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-checkbox" onclick="toggleTask('${task.id}')">
                <i class="fa-solid fa-check"></i>
            </div>
            <span class="task-text">${task.text}</span>
            <span class="task-priority-badge ${priorityClasses[task.priority] || 'badge-medium'}">${priorityLabels[task.priority] || ''}</span>
            <button class="task-delete" onclick="deleteTask('${task.id}')" title="Xóa">
                <i class="fa-solid fa-trash"></i>
            </button>
        </div>
    `).join('');
}

function toggleTask(id) {
    const task = state.tasks.find(t => t.id === id);
    if (!task) return;
    task.done = !task.done;
    if (task.done) state.totalCompleted++;
    saveState();
    renderTasks();
    updateProgress();
    updateStats();
}

function deleteTask(id) {
    state.tasks = state.tasks.filter(t => t.id !== id);
    saveState();
    renderTasks();
    updateProgress();
}

function addTask() {
    const text = newTaskInput.value.trim();
    if (!text) { newTaskInput.focus(); return; }
    state.tasks.push({
        id: crypto.randomUUID(),
        text,
        priority: taskPriority.value,
        done: false
    });
    newTaskInput.value = '';
    taskPriority.value = 'medium';
    taskAddForm.style.display = 'none';
    saveState();
    renderTasks();
    updateProgress();
}

addTaskBtn.addEventListener('click', () => {
    taskAddForm.style.display = taskAddForm.style.display === 'none' ? 'block' : 'none';
    if (taskAddForm.style.display !== 'none') newTaskInput.focus();
});

confirmAddTask.addEventListener('click', addTask);
cancelAddTask.addEventListener('click', () => { taskAddForm.style.display = 'none'; });
newTaskInput.addEventListener('keydown', e => { if (e.key === 'Enter') addTask(); });

// ---- Progress Ring ----
const CIRCUMFERENCE = 2 * Math.PI * 48; // ~301.6

function updateProgress() {
    const total = state.tasks.length;
    const done = state.tasks.filter(t => t.done).length;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);
    const offset = CIRCUMFERENCE - (pct / 100) * CIRCUMFERENCE;

    ringFill.style.strokeDashoffset = offset;
    progressPct.textContent = `${pct}%`;
    progressSummary.textContent = `${done} / ${total} nhiệm vụ hoàn thành`;

    // Motivation messages
    let msg = 'Hãy bắt đầu nào! 💪';
    if (pct >= 100) msg = 'Tuyệt vời! Bạn đã hoàn thành tất cả! 🎉';
    else if (pct >= 75) msg = 'Gần xong rồi! Cố lên! 🔥';
    else if (pct >= 50) msg = 'Đã đi được nửa đường! 🚀';
    else if (pct >= 25) msg = 'Bắt đầu tốt lắm! ⭐';
    motivationBadge.textContent = msg;
}

// ---- Stats ----
function updateStats() {
    streakValEl.textContent = state.streak;
    completedValEl.textContent = state.totalCompleted;
}

// ---- Reset Day ----
resetDayBtn.addEventListener('click', () => {
    if (!confirm('Đặt lại ngày mới? Tất cả nhiệm vụ sẽ trở về chưa hoàn thành.')) return;
    state.tasks = state.tasks.map(t => ({ ...t, done: false }));

    // Check streak
    const todayStr = new Date().toDateString();
    if (state.lastDate === todayStr) {
        state.streak = (state.streak || 0) + 1;
    } else {
        state.streak = 0;
    }
    state.lastDate = new Date().toDateString();

    saveState();
    renderTasks();
    updateProgress();
    updateStats();
});

// ---- Init ----
function init() {
    initTheme();
    renderTodayDate();
    renderMainGoal();
    renderTasks();
    updateProgress();
    updateStats();
}

init();
