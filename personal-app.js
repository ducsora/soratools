// ============================
// SoraTools – Personal Hub App
// Self-contained: Finance + Jars + Todo + Goals
// ============================
'use strict';

// ======== THEME ========
const themeToggle = document.getElementById('theme-toggle');
function initTheme() {
    if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'dark');
    if (localStorage.getItem('theme') === 'dark') document.body.setAttribute('data-theme', 'dark');
    updateThemeIcon();
}
function updateThemeIcon() {
    const dark = document.body.getAttribute('data-theme') === 'dark';
    themeToggle.innerHTML = dark
        ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>'
        : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
}
themeToggle.addEventListener('click', () => {
    const dark = document.body.getAttribute('data-theme') === 'dark';
    dark ? document.body.removeAttribute('data-theme') : document.body.setAttribute('data-theme', 'dark');
    localStorage.setItem('theme', dark ? 'light' : 'dark');
    updateThemeIcon();
});

// ======== DATE ========
document.getElementById('p-date').textContent =
    new Date().toLocaleDateString('vi-VN', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

// ======== TABS ========
const LAST_TAB = 'sora_personal_tab';
document.querySelectorAll('.ptab').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});
function switchTab(id) {
    document.querySelectorAll('.ptab').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    document.querySelectorAll('.ptab-panel').forEach(p => p.classList.toggle('active', p.id === 'tab-' + id));
    localStorage.setItem(LAST_TAB, id);
}
switchTab(localStorage.getItem(LAST_TAB) || 'chitieu');

// ======== FINANCE ========
const TX_KEY = 'sora_transactions';
let transactions = JSON.parse(localStorage.getItem(TX_KEY) || '[]');

const fmt = n => new Intl.NumberFormat('vi-VN').format(Math.abs(n)) + ' ₫';

function saveTx() { localStorage.setItem(TX_KEY, JSON.stringify(transactions)); }

function renderTx() {
    const list = document.getElementById('tx-list');
    const sorted = [...transactions].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 30);
    if (!sorted.length) { list.innerHTML = '<div class="empty-hint">Chưa có giao dịch nào.</div>'; updateKPI(); return; }
    list.innerHTML = sorted.map(t => {
        const isInc = t.type === 'income';
        const icons = { 'Ăn uống':'🍜','Di chuyển':'🚗','Mua sắm':'🛍','Hóa đơn':'⚡','Giải trí':'🎮','Sức khỏe':'💊','Tiền lương':'💵','Đầu tư':'📈','Khác':'📌' };
        return `<div class="tx-item">
            <div class="tx-icon ${isInc?'income':'expense'}">${icons[t.cat]||'💰'}</div>
            <div class="tx-info">
                <div class="tx-cat">${t.cat}</div>
                <div class="tx-note">${t.note||''}</div>
            </div>
            <div style="text-align:right">
                <div class="tx-amount ${isInc?'income':'expense'}">${isInc?'+':'-'}${fmt(t.amount)}</div>
                <div class="tx-date">${t.date}</div>
            </div>
            <button class="tx-del" onclick="deleteTx('${t.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>`;
    }).join('');
    updateKPI();
}

function updateKPI() {
    let income = 0, expense = 0;
    transactions.forEach(t => { t.type === 'income' ? (income += t.amount) : (expense += t.amount); });
    document.getElementById('kpi-income').textContent  = fmt(income);
    document.getElementById('kpi-expense').textContent = fmt(expense);
    document.getElementById('kpi-balance').textContent = (income - expense >= 0 ? '' : '-') + fmt(income - expense);
    // savings = income - expense
    const savings = income - expense;
    document.getElementById('kpi-savings').textContent = fmt(Math.max(0, savings));
}

window.deleteTx = function(id) {
    transactions = transactions.filter(t => t.id !== id);
    saveTx(); renderTx();
};

// Add transaction
const txModal = document.getElementById('tx-modal');
document.getElementById('open-tx-btn').addEventListener('click', () => {
    document.getElementById('tx-date').valueAsDate = new Date();
    txModal.classList.add('active');
});
document.getElementById('close-tx-modal').addEventListener('click', () => txModal.classList.remove('active'));
txModal.addEventListener('click', e => { if (e.target === txModal) txModal.classList.remove('active'); });
document.getElementById('save-tx-btn').addEventListener('click', () => {
    const amount = parseFloat(document.getElementById('tx-amount').value);
    if (!amount || amount <= 0) { alert('Nhập số tiền hợp lệ!'); return; }
    const tx = {
        id: Date.now().toString(),
        type: document.querySelector('input[name="txtype"]:checked').value,
        amount,
        cat: document.getElementById('tx-cat').value,
        date: document.getElementById('tx-date').value,
        note: document.getElementById('tx-note').value.trim()
    };
    transactions.unshift(tx);
    saveTx(); renderTx();
    txModal.classList.remove('active');
    document.getElementById('tx-amount').value = '';
    document.getElementById('tx-note').value   = '';
});

// ======== JARS ========
const JARS_KEY = 'sora_jars';
const DEFAULT_JARS = [
    { id:'j1', emoji:'🎯', name:'Chi tiêu thiết yếu', pct:55, balance:0, color:'#facc15' },
    { id:'j2', emoji:'🏦', name:'Tiết kiệm',          pct:10, balance:0, color:'#60a5fa' },
    { id:'j3', emoji:'📈', name:'Đầu tư',             pct:10, balance:0, color:'#34d399' },
    { id:'j4', emoji:'🎓', name:'Giáo dục',           pct:10, balance:0, color:'#a78bfa' },
    { id:'j5', emoji:'🎉', name:'Hưởng thụ',          pct:10, balance:0, color:'#f97316' },
    { id:'j6', emoji:'💝', name:'Từ thiện',            pct:5,  balance:0, color:'#f43f5e' },
];
let jars = JSON.parse(localStorage.getItem(JARS_KEY) || 'null') || DEFAULT_JARS;
function saveJars() { localStorage.setItem(JARS_KEY, JSON.stringify(jars)); }

function renderJars() {
    const el = document.getElementById('jars-list');
    el.innerHTML = jars.map(j => {
        const target = j.target || 0;
        const pct = target > 0 ? Math.min(100, Math.round((j.balance / target) * 100)) : 0;
        return `<div class="jar-item">
            <div class="jar-header">
                <div class="jar-title">
                    <span class="jar-emoji">${j.emoji}</span>
                    <div><div class="jar-name">${j.name}</div><div class="jar-pct">${j.pct}% thu nhập</div></div>
                </div>
                <div class="jar-balance">
                    <div class="jar-amount">${fmt(j.balance)}</div>
                    <div class="jar-target">${target ? 'Target: '+fmt(target) : 'Chưa đặt target'}</div>
                </div>
            </div>
            ${target ? `<div class="jar-bar-wrap"><div class="jar-bar" style="width:${pct}%;background:${j.color}"></div></div>
            <div style="font-size:.7rem;color:var(--text-muted);text-align:right">${pct}%</div>` : ''}
            <div class="jar-actions">
                <button class="jar-btn add-jar" onclick="jarAdd('${j.id}')"><i class="fa-solid fa-plus"></i> Nạp tiền</button>
                <button class="jar-btn sub-jar" onclick="jarSub('${j.id}')"><i class="fa-solid fa-minus"></i> Rút tiền</button>
                <button class="jar-btn edit-jar" onclick="jarEdit('${j.id}')"><i class="fa-solid fa-pen"></i> Sửa</button>
            </div>
        </div>`;
    }).join('');
}

window.jarAdd = function(id) {
    const j = jars.find(x => x.id === id);
    const v = parseFloat(prompt(`Nạp vào hũ "${j.name}" (₫):`));
    if (!v || v <= 0) return;
    j.balance += v; saveJars(); renderJars();
};
window.jarSub = function(id) {
    const j = jars.find(x => x.id === id);
    const v = parseFloat(prompt(`Rút từ hũ "${j.name}" (₫):`));
    if (!v || v <= 0) return;
    if (v > j.balance) { alert('Số dư không đủ!'); return; }
    j.balance -= v; saveJars(); renderJars();
};
window.jarEdit = function(id) {
    const j = jars.find(x => x.id === id);
    const target = parseFloat(prompt(`Target cho hũ "${j.name}" (₫, để trống = bỏ qua):`, j.target || ''));
    if (!isNaN(target) && target >= 0) j.target = target;
    const pct = parseFloat(prompt(`Phân bổ % thu nhập (hiện tại: ${j.pct}%):`, j.pct));
    if (!isNaN(pct) && pct >= 0) j.pct = pct;
    saveJars(); renderJars();
};

// Distribute income to jars
const distModal = document.getElementById('dist-modal');
document.getElementById('distribute-btn').addEventListener('click', () => {
    document.getElementById('dist-amount').value = '';
    document.getElementById('dist-preview').innerHTML = '';
    distModal.classList.add('active');
});
document.getElementById('close-dist-modal').addEventListener('click', () => distModal.classList.remove('active'));
distModal.addEventListener('click', e => { if (e.target === distModal) distModal.classList.remove('active'); });

document.getElementById('dist-amount').addEventListener('input', function() {
    const amt = parseFloat(this.value) || 0;
    const prev = document.getElementById('dist-preview');
    if (!amt) { prev.innerHTML = ''; return; }
    const totalPct = jars.reduce((s,j) => s+j.pct, 0);
    prev.innerHTML = jars.map(j => {
        const share = Math.round(amt * j.pct / totalPct);
        return `<div class="dist-row"><span>${j.emoji} ${j.name} (${j.pct}%)</span><strong>+${fmt(share)}</strong></div>`;
    }).join('') + `<div class="dist-row"><span>Tổng</span><strong>${fmt(amt)}</strong></div>`;
});

document.getElementById('confirm-dist-btn').addEventListener('click', () => {
    const amt = parseFloat(document.getElementById('dist-amount').value);
    if (!amt || amt <= 0) { alert('Nhập số tiền!'); return; }
    const totalPct = jars.reduce((s,j) => s+j.pct, 0);
    jars.forEach(j => { j.balance += Math.round(amt * j.pct / totalPct); });
    // Also add as income transaction
    transactions.unshift({ id:Date.now()+'', type:'income', amount:amt, cat:'Tiền lương', date:new Date().toISOString().split('T')[0], note:'Phân bổ hũ tiền' });
    saveTx(); saveJars(); renderTx(); renderJars();
    distModal.classList.remove('active');
});

// ======== TO-DO ========
const TODO_KEY = 'sora_todo_v2';
let todos = JSON.parse(localStorage.getItem(TODO_KEY) || '[]');
let todoFilter = 'all';
let selectedPri = 'medium';
let editingTodoId = null;

function saveTodos() { localStorage.setItem(TODO_KEY, JSON.stringify(todos)); }

function renderTodos() {
    const search = document.getElementById('search-task').value.toLowerCase();
    const pri = document.getElementById('filter-pri').value;
    const sort = document.getElementById('sort-task').value;
    const now = new Date();

    let list = todos.filter(t => {
        if (search && !t.title.toLowerCase().includes(search)) return false;
        if (pri && t.priority !== pri) return false;
        const overdue = t.due && new Date(t.due) < now && !t.done;
        if (todoFilter === 'pending') return !t.done;
        if (todoFilter === 'done') return t.done;
        if (todoFilter === 'overdue') return overdue;
        return true;
    });

    if (sort === 'due') list.sort((a,b) => (a.due||'9') < (b.due||'9') ? -1 : 1);
    else if (sort === 'priority') { const p = {high:0,medium:1,low:2}; list.sort((a,b) => p[a.priority]-p[b.priority]); }
    else list.sort((a,b) => b.id - a.id);

    const el = document.getElementById('todo-list');
    if (!list.length) { el.innerHTML = '<div class="empty-hint">Không có task nào.</div>'; updateTodoPills(); return; }

    const catMap = { work:'💼', personal:'🏠', health:'💪', finance:'💰', other:'📌' };
    el.innerHTML = list.map(t => {
        const overdue = t.due && new Date(t.due) < now && !t.done;
        return `<div class="task-row ${t.done?'done-row':''}">
            <div class="task-check ${t.done?'checked':''}"><i class="fa-solid fa-check"></i></div>
            <div class="task-body" onclick="toggleTodo('${t.id}')">
                <div class="task-title-txt">${t.title}</div>
                <div class="task-meta">
                    <span class="task-badge badge-${t.priority}">${{high:'🔴 Cao',medium:'🟡 TB',low:'🟢 Thấp'}[t.priority]}</span>
                    ${t.cat ? `<span>${catMap[t.cat]||''} ${t.cat}</span>` : ''}
                    ${t.due ? `<span style="color:${overdue?'#ef4444':'var(--text-muted)'}">${overdue?'⚠ ':''}${t.due}</span>` : ''}
                    ${t.note ? `<span>${t.note}</span>` : ''}
                </div>
            </div>
            <div class="task-row-actions">
                <button class="task-action-btn" onclick="editTodo('${t.id}')" title="Sửa"><i class="fa-solid fa-pen"></i></button>
                <button class="task-action-btn del" onclick="deleteTodo('${t.id}')" title="Xóa"><i class="fa-solid fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');

    // Bind checkbox click separately
    document.querySelectorAll('#todo-list .task-check').forEach((cb, i) => {
        cb.addEventListener('click', (e) => { e.stopPropagation(); toggleTodo(list[i].id); });
    });
    updateTodoPills();
}

function updateTodoPills() {
    const now = new Date();
    document.getElementById('st-all').textContent    = todos.length;
    document.getElementById('st-pending').textContent = todos.filter(t => !t.done).length;
    document.getElementById('st-done').textContent   = todos.filter(t => t.done).length;
    document.getElementById('st-overdue').textContent = todos.filter(t => t.due && new Date(t.due) < now && !t.done).length;
}

window.toggleTodo = function(id) {
    const t = todos.find(x => x.id===id);
    if (t) { t.done = !t.done; saveTodos(); renderTodos(); }
};
window.deleteTodo = function(id) {
    todos = todos.filter(x => x.id!==id); saveTodos(); renderTodos();
};
window.editTodo = function(id) {
    const t = todos.find(x => x.id===id);
    if (!t) return;
    editingTodoId = id;
    document.getElementById('task-title-input').value = t.title;
    document.getElementById('task-note-input').value  = t.note||'';
    document.getElementById('task-due-input').value   = t.due||'';
    document.getElementById('task-time-input').value  = t.time||'';
    document.getElementById('task-cat-input').value   = t.cat||'work';
    selectedPri = t.priority||'medium';
    document.querySelectorAll('.prio-btn').forEach(b => b.classList.toggle('active', b.dataset.p===selectedPri));
    document.getElementById('task-modal-title').innerHTML = '<i class="fa-solid fa-pen"></i> Sửa nhiệm vụ';
    document.getElementById('add-task-modal').classList.add('active');
};

document.querySelectorAll('.prio-btn').forEach(b => {
    b.addEventListener('click', () => {
        selectedPri = b.dataset.p;
        document.querySelectorAll('.prio-btn').forEach(x => x.classList.toggle('active', x.dataset.p===selectedPri));
    });
});

document.querySelectorAll('.tpill').forEach(p => {
    p.addEventListener('click', () => {
        todoFilter = p.dataset.filter;
        document.querySelectorAll('.tpill').forEach(x => x.classList.toggle('active', x.dataset.filter===todoFilter));
        renderTodos();
    });
});

document.getElementById('search-task').addEventListener('input', renderTodos);
document.getElementById('filter-pri').addEventListener('change', renderTodos);
document.getElementById('sort-task').addEventListener('change', renderTodos);

const addTaskModal = document.getElementById('add-task-modal');
document.getElementById('open-add-task-btn').addEventListener('click', () => {
    editingTodoId = null;
    document.getElementById('task-title-input').value = '';
    document.getElementById('task-note-input').value  = '';
    document.getElementById('task-due-input').value   = '';
    document.getElementById('task-time-input').value  = '';
    selectedPri = 'medium';
    document.querySelectorAll('.prio-btn').forEach(b => b.classList.toggle('active', b.dataset.p==='medium'));
    document.getElementById('task-modal-title').innerHTML = '<i class="fa-solid fa-plus"></i> Thêm nhiệm vụ';
    addTaskModal.classList.add('active');
});
document.getElementById('close-task-modal').addEventListener('click', () => addTaskModal.classList.remove('active'));
document.getElementById('cancel-task-btn').addEventListener('click', () => addTaskModal.classList.remove('active'));
addTaskModal.addEventListener('click', e => { if (e.target === addTaskModal) addTaskModal.classList.remove('active'); });

document.getElementById('save-task-btn').addEventListener('click', () => {
    const title = document.getElementById('task-title-input').value.trim();
    if (!title) { document.getElementById('task-title-input').focus(); return; }
    if (editingTodoId) {
        const t = todos.find(x => x.id===editingTodoId);
        if (t) { t.title=title; t.note=document.getElementById('task-note-input').value.trim(); t.priority=selectedPri; t.cat=document.getElementById('task-cat-input').value; t.due=document.getElementById('task-due-input').value; t.time=document.getElementById('task-time-input').value; }
    } else {
        todos.unshift({ id:Date.now(), title, note:document.getElementById('task-note-input').value.trim(), priority:selectedPri, cat:document.getElementById('task-cat-input').value, due:document.getElementById('task-due-input').value, time:document.getElementById('task-time-input').value, done:false });
    }
    saveTodos(); renderTodos(); addTaskModal.classList.remove('active');
});

document.getElementById('clear-done-btn').addEventListener('click', () => {
    if (!todos.some(t=>t.done)) return;
    if (!confirm('Xóa tất cả task đã xong?')) return;
    todos = todos.filter(t=>!t.done); saveTodos(); renderTodos();
});

// ======== GOALS ========
const GOALS_KEY = 'sora_goals';
let gState = JSON.parse(localStorage.getItem(GOALS_KEY) || '{}');
gState = { mainGoal:'', tasks:[], streak:0, totalCompleted:0, lastDate:'', ...gState };
function saveGoals() { localStorage.setItem(GOALS_KEY, JSON.stringify(gState)); }

const CIRC = 2 * Math.PI * 48;

function renderMainGoal() {
    const el = document.getElementById('main-goal-display');
    el.innerHTML = gState.mainGoal
        ? `<span style="font-weight:600">${gState.mainGoal}</span>`
        : '<span class="placeholder-text">Chưa đặt mục tiêu. Nhấn ✏️ để thiết lập.</span>';
    const inp = document.getElementById('main-goal-text');
    if (inp) inp.value = gState.mainGoal||'';
}

function renderGoalTasks() {
    const el = document.getElementById('goal-task-list');
    if (!gState.tasks.length) { el.innerHTML = '<div class="empty-hint">Chưa có nhiệm vụ. Nhấn Thêm.</div>'; updateRing(); return; }
    const priOrder = {high:0,medium:1,low:2};
    const sorted = [...gState.tasks].sort((a,b) => { if(a.done!==b.done) return a.done?1:-1; return priOrder[a.priority]-priOrder[b.priority]; });
    el.innerHTML = sorted.map(t => `
        <div class="goal-task-row ${t.done?'done-row':''}">
            <div class="goal-check ${t.done?'checked':''}"><i class="fa-solid fa-check"></i></div>
            <span class="goal-task-txt">${t.text}</span>
            <span class="task-badge badge-${t.priority}" style="font-size:.67rem">${{high:'🔴',medium:'🟡',low:'🟢'}[t.priority]}</span>
            <button class="goal-del" onclick="gDeleteTask('${t.id}')"><i class="fa-solid fa-trash"></i></button>
        </div>`).join('');
    document.querySelectorAll('#goal-task-list .goal-check').forEach((cb,i) => {
        cb.addEventListener('click', () => gToggle(sorted[i].id));
    });
    updateRing();
}

function updateRing() {
    const total = gState.tasks.length, done = gState.tasks.filter(t=>t.done).length;
    const pct = total ? Math.round(done/total*100) : 0;
    document.getElementById('ring-fill').style.strokeDashoffset = CIRC - (pct/100)*CIRC;
    document.getElementById('ring-pct').textContent    = pct + '%';
    document.getElementById('ring-summary').textContent = `${done} / ${total} mục tiêu`;
    const msgs = pct>=100?'Tuyệt vời! Hoàn thành! 🎉':pct>=75?'Gần xong! Cố lên! 🔥':pct>=50?'Nửa đường rồi! 🚀':pct>=25?'Bắt đầu tốt! ⭐':'Hãy bắt đầu nào! 💪';
    document.getElementById('motivation-badge').textContent = msgs;
    document.getElementById('streak-val').textContent    = gState.streak||0;
    document.getElementById('completed-val').textContent = gState.totalCompleted||0;
}

window.gToggle = function(id) {
    const t = gState.tasks.find(x=>x.id===id);
    if (!t) return;
    t.done = !t.done;
    if (t.done) gState.totalCompleted++;
    saveGoals(); renderGoalTasks();
};
window.gDeleteTask = function(id) {
    gState.tasks = gState.tasks.filter(x=>x.id!==id); saveGoals(); renderGoalTasks();
};

// Edit main goal
document.getElementById('edit-main-goal-btn').addEventListener('click', () => {
    const inp = document.getElementById('main-goal-input');
    inp.style.display = inp.style.display==='none'?'flex':'none';
    if (inp.style.display!=='none') document.getElementById('main-goal-text').focus();
});
document.getElementById('save-main-goal-btn').addEventListener('click', () => {
    const val = document.getElementById('main-goal-text').value.trim();
    if (!val) return;
    gState.mainGoal = val; saveGoals(); renderMainGoal();
    document.getElementById('main-goal-input').style.display = 'none';
});
document.getElementById('main-goal-text').addEventListener('keydown', e => {
    if (e.key==='Enter') document.getElementById('save-main-goal-btn').click();
    if (e.key==='Escape') document.getElementById('main-goal-input').style.display='none';
});

// Add goal task
document.getElementById('add-goal-task-btn').addEventListener('click', () => {
    const f = document.getElementById('goal-add-form');
    f.style.display = f.style.display==='none'?'block':'none';
    if (f.style.display!=='none') document.getElementById('goal-task-input').focus();
});
document.getElementById('confirm-goal-task').addEventListener('click', addGoalTask);
document.getElementById('cancel-goal-task').addEventListener('click', () => { document.getElementById('goal-add-form').style.display='none'; });
document.getElementById('goal-task-input').addEventListener('keydown', e => { if (e.key==='Enter') addGoalTask(); });

function addGoalTask() {
    const text = document.getElementById('goal-task-input').value.trim();
    if (!text) return;
    gState.tasks.push({ id:Date.now()+'', text, priority:document.getElementById('goal-task-pri').value, done:false });
    document.getElementById('goal-task-input').value = '';
    document.getElementById('goal-add-form').style.display = 'none';
    saveGoals(); renderGoalTasks();
}

document.getElementById('reset-day-btn').addEventListener('click', () => {
    if (!confirm('Đặt lại ngày mới?\nTất cả nhiệm vụ sẽ trở về chưa hoàn thành.')) return;
    gState.tasks = gState.tasks.map(t=>({...t,done:false}));
    const today = new Date().toDateString();
    gState.streak = gState.lastDate===today ? (gState.streak||0)+1 : 0;
    gState.lastDate = today;
    saveGoals(); renderGoalTasks();
});

// ======== INIT ========
initTheme();
renderTx();
renderJars();
renderTodos();
renderMainGoal();
renderGoalTasks();
