// ============================
// SoraTools – To-Do List
// ============================

// ---- DOM ----
const taskList       = document.getElementById('task-list');
const emptyState     = document.getElementById('empty-state');
const taskModal      = document.getElementById('task-modal');
const taskTitleInput = document.getElementById('task-title');
const taskNoteInput  = document.getElementById('task-note');
const taskDueInput   = document.getElementById('task-due');
const taskTimeInput  = document.getElementById('task-time');
const taskCatInput   = document.getElementById('task-category');
const searchInput    = document.getElementById('search-todo');
const filterPriority = document.getElementById('filter-priority');
const filterCategory = document.getElementById('filter-category');
const sortTasks      = document.getElementById('sort-tasks');
const themeToggle    = document.getElementById('theme-toggle');
const todayDateEl    = document.getElementById('today-date');

let tasks      = [];
let editingId  = null;
let activeFilter = 'all';
let selectedPriority = 'medium';

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

// ---- Helpers ----
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function todayStr() { return new Date().toISOString().split('T')[0]; }

function isToday(dateStr) { return dateStr === todayStr(); }

function isOverdue(task) {
    if (task.done || !task.due) return false;
    const due = new Date(task.due + (task.time ? 'T' + task.time : 'T23:59:59'));
    return due < new Date();
}

function formatDue(task) {
    if (!task.due) return null;
    const d = new Date(task.due);
    const day = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const time = task.time ? ' ' + task.time : '';
    return day + time;
}

const CAT_ICONS = { work: '💼', personal: '🏠', health: '💪', finance: '💰', other: '📌' };
const CAT_LABELS = { work: 'Công việc', personal: 'Cá nhân', health: 'Sức khỏe', finance: 'Tài chính', other: 'Khác' };
const PRIO_ORDER = { high: 0, medium: 1, low: 2 };

// ---- Storage ----
function saveTasks() { localStorage.setItem('sora_todo', JSON.stringify(tasks)); }
function loadTasks() {
    const s = localStorage.getItem('sora_todo');
    tasks = s ? JSON.parse(s) : [];
}

// ---- Render ----
function render() {
    updateStats();

    let filtered = [...tasks];

    // Tab filter
    const today = todayStr();
    if (activeFilter === 'today')   filtered = filtered.filter(t => t.due === today);
    if (activeFilter === 'pending') filtered = filtered.filter(t => !t.done);
    if (activeFilter === 'done')    filtered = filtered.filter(t => t.done);
    if (activeFilter === 'overdue') filtered = filtered.filter(t => isOverdue(t));

    // Toolbar filters
    const q    = searchInput.value.toLowerCase();
    const prio = filterPriority.value;
    const cat  = filterCategory.value;
    if (q)    filtered = filtered.filter(t => t.title.toLowerCase().includes(q) || (t.note||'').toLowerCase().includes(q));
    if (prio) filtered = filtered.filter(t => t.priority === prio);
    if (cat)  filtered = filtered.filter(t => t.category === cat);

    // Sort
    const sort = sortTasks.value;
    filtered.sort((a, b) => {
        if (sort === 'due') {
            if (!a.due && !b.due) return 0;
            if (!a.due) return 1;
            if (!b.due) return -1;
            return (a.due + (a.time||'')) < (b.due + (b.time||'')) ? -1 : 1;
        }
        if (sort === 'priority') return PRIO_ORDER[a.priority] - PRIO_ORDER[b.priority];
        if (sort === 'alpha')    return a.title.localeCompare(b.title);
        return b.createdAt - a.createdAt; // newest first
    });

    if (!filtered.length) {
        taskList.innerHTML = '';
        emptyState.style.display = 'flex';
        return;
    }
    emptyState.style.display = 'none';

    // Group: overdue, today, upcoming, someday, done
    const groups = {};
    filtered.forEach(t => {
        let g;
        if (t.done)            g = 'done';
        else if (isOverdue(t)) g = 'overdue';
        else if (t.due === today) g = 'today';
        else if (t.due)        g = 'upcoming';
        else                   g = 'someday';
        if (!groups[g]) groups[g] = [];
        groups[g].push(t);
    });

    const ORDER  = ['overdue','today','upcoming','someday','done'];
    const GLABEL = {
        overdue:  '🔴 Quá hạn',
        today:    '📅 Hôm nay',
        upcoming: '📆 Sắp tới',
        someday:  '📋 Chưa đặt ngày',
        done:     '✅ Hoàn thành'
    };

    let html = '';
    ORDER.forEach(g => {
        if (!groups[g]) return;
        html += `<div class="task-group">
            <div class="task-group-label">${GLABEL[g]} <em style="font-weight:400">(${groups[g].length})</em></div>`;
        groups[g].forEach(t => { html += renderTask(t); });
        html += '</div>';
    });

    taskList.innerHTML = html;
}

function renderTask(t) {
    const overdue = isOverdue(t);
    const todayDue = t.due === todayStr();
    const dueStr  = formatDue(t);
    const dueClass = overdue ? 'overdue' : todayDue ? 'today' : '';

    return `
    <div class="task-card prio-${t.priority} ${t.done ? 'done-card' : ''} ${overdue ? 'overdue-card' : ''}" data-id="${t.id}">
        <button class="task-check ${t.done ? 'checked' : ''}" onclick="toggleDone('${t.id}')"></button>
        <div class="task-body">
            <div class="task-title">${escHtml(t.title)}</div>
            ${t.note ? `<div class="task-note">${escHtml(t.note)}</div>` : ''}
            <div class="task-meta">
                <span class="meta-tag tag-cat">${CAT_ICONS[t.category] || '📌'} ${CAT_LABELS[t.category] || t.category}</span>
                ${dueStr ? `<span class="meta-tag tag-due ${dueClass}"><i class="fa-regular fa-clock"></i> ${dueStr}${overdue ? ' • Quá hạn' : ''}</span>` : ''}
            </div>
        </div>
        <div class="task-actions">
            <button class="task-act-btn" onclick="editTask('${t.id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
            <button class="task-act-btn del" onclick="deleteTask('${t.id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
        </div>
    </div>`;
}

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function updateStats() {
    const today = todayStr();
    const all     = tasks.length;
    const todayN  = tasks.filter(t => t.due === today && !t.done).length;
    const done    = tasks.filter(t => t.done).length;
    const pending = tasks.filter(t => !t.done).length;
    const overdue = tasks.filter(t => isOverdue(t)).length;

    document.getElementById('stat-all').textContent     = all;
    document.getElementById('stat-today').textContent   = todayN;
    document.getElementById('stat-done').textContent    = done;
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-overdue').textContent = overdue;
    document.getElementById('done-count').textContent   = done;
    document.getElementById('total-count').textContent  = all;
}

// ---- CRUD ----
window.toggleDone = function(id) {
    const t = tasks.find(t => t.id === id);
    if (t) { t.done = !t.done; t.doneAt = t.done ? Date.now() : null; }
    saveTasks(); render();
};

window.deleteTask = function(id) {
    if (!confirm('Xóa nhiệm vụ này?')) return;
    tasks = tasks.filter(t => t.id !== id);
    saveTasks(); render();
};

window.editTask = function(id) {
    const t = tasks.find(t => t.id === id);
    if (!t) return;
    editingId = id;
    taskTitleInput.value = t.title;
    taskNoteInput.value  = t.note || '';
    taskDueInput.value   = t.due  || '';
    taskTimeInput.value  = t.time || '';
    taskCatInput.value   = t.category;
    selectedPriority     = t.priority;
    document.querySelectorAll('.prio-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.p === selectedPriority);
    });
    document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-pen"></i> Sửa nhiệm vụ';
    taskModal.classList.add('active');
    taskTitleInput.focus();
};

function saveTask() {
    const title = taskTitleInput.value.trim();
    if (!title) { taskTitleInput.focus(); taskTitleInput.style.borderColor = '#ef4444'; return; }

    if (editingId) {
        const t = tasks.find(t => t.id === editingId);
        if (t) {
            t.title    = title;
            t.note     = taskNoteInput.value.trim();
            t.due      = taskDueInput.value;
            t.time     = taskTimeInput.value;
            t.category = taskCatInput.value;
            t.priority = selectedPriority;
        }
    } else {
        tasks.unshift({
            id:        uid(),
            title,
            note:      taskNoteInput.value.trim(),
            priority:  selectedPriority,
            category:  taskCatInput.value,
            due:       taskDueInput.value,
            time:      taskTimeInput.value,
            done:      false,
            createdAt: Date.now(),
        });
    }

    saveTasks();
    closeModal();
    render();
}

function closeModal() {
    taskModal.classList.remove('active');
    taskTitleInput.value = '';
    taskNoteInput.value  = '';
    taskDueInput.value   = '';
    taskTimeInput.value  = '';
    taskCatInput.value   = 'work';
    taskTitleInput.style.borderColor = '';
    selectedPriority = 'medium';
    document.querySelectorAll('.prio-btn').forEach(b => b.classList.toggle('active', b.dataset.p === 'medium'));
    editingId = null;
    document.getElementById('modal-title').innerHTML = '<i class="fa-solid fa-plus"></i> Thêm nhiệm vụ mới';
}

// ---- Events ----
document.getElementById('open-add-btn').addEventListener('click', () => {
    editingId = null;
    closeModal();
    taskModal.classList.add('active');
    taskDueInput.value = todayStr();
    taskTitleInput.focus();
});

document.getElementById('save-task-btn').addEventListener('click', saveTask);
document.getElementById('cancel-modal-btn').addEventListener('click', closeModal);
document.getElementById('close-modal').addEventListener('click', closeModal);
taskModal.addEventListener('click', e => { if (e.target === taskModal) closeModal(); });

// Enter to save in title
taskTitleInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveTask(); });

// Priority buttons
document.querySelectorAll('.prio-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedPriority = btn.dataset.p;
        document.querySelectorAll('.prio-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
});

// Stat pills
document.querySelectorAll('.stat-pill').forEach(pill => {
    pill.addEventListener('click', () => {
        document.querySelectorAll('.stat-pill').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        activeFilter = pill.dataset.filter;
        render();
    });
});

// Filter / sort / search
searchInput.addEventListener('input', render);
filterPriority.addEventListener('change', render);
filterCategory.addEventListener('change', render);
sortTasks.addEventListener('change', render);

// Clear done
document.getElementById('clear-done-btn').addEventListener('click', () => {
    const n = tasks.filter(t => t.done).length;
    if (!n) return;
    if (!confirm(`Xóa ${n} nhiệm vụ đã hoàn thành?`)) return;
    tasks = tasks.filter(t => !t.done);
    saveTasks(); render();
});

// Today label
function setTodayLabel() {
    todayDateEl.textContent = new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ---- Init ----
initTheme();
loadTasks();
setTodayLabel();
render();
