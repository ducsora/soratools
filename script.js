let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let expenseChartInstance = null;

const totalBalanceEl = document.getElementById('total-balance');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const transactionListEl = document.getElementById('transaction-list');
const transactionModal = document.getElementById('transaction-modal');
const addBtn = document.getElementById('add-btn');
const closeModalBtn = document.getElementById('close-modal');
const transactionForm = document.getElementById('transaction-form');
const themeToggle = document.getElementById('theme-toggle');

const categoryIcons = {
    'Eating': 'fa-utensils',
    'Transport': 'fa-car',
    'Shopping': 'fa-bag-shopping',
    'Bills': 'fa-plug',
    'Entertainment': 'fa-film',
    'Health': 'fa-notes-medical',
    'Salary': 'fa-money-bill-wave',
    'Investment': 'fa-chart-line',
    'Other': 'fa-circle-question'
};

const categoryLabels = {
    'Eating': 'Ăn uống',
    'Transport': 'Di chuyển',
    'Shopping': 'Mua sắm',
    'Bills': 'Hóa đơn',
    'Entertainment': 'Giải trí',
    'Health': 'Sức khỏe',
    'Salary': 'Tiền lương',
    'Investment': 'Đầu tư',
    'Other': 'Khác'
};

function init() {
    document.getElementById('date').valueAsDate = new Date();
    
    if (localStorage.getItem('theme') === null) {
        localStorage.setItem('theme', 'dark');
    }
    const isDark = localStorage.getItem('theme') === 'dark';
    if(isDark) document.body.setAttribute('data-theme', 'dark');
    updateThemeIcon();

    updateUI();
    setupEventListeners();
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function updateUI() {
    const amounts = transactions.map(t => t.type === 'income' ? t.amount : -t.amount);
    const total = amounts.reduce((acc, item) => (acc += item), 0);
    const income = transactions.filter(t => t.type === 'income').reduce((acc, t) => acc + t.amount, 0);
    const expense = transactions.filter(t => t.type === 'expense').reduce((acc, t) => acc + t.amount, 0);

    totalBalanceEl.innerText = formatCurrency(total);
    totalIncomeEl.innerText = formatCurrency(income);
    totalExpenseEl.innerText = formatCurrency(expense);

    renderTransactionList();
    updateChart();
}

function renderTransactionList() {
    transactionListEl.innerHTML = '';

    if (transactions.length === 0) {
        transactionListEl.innerHTML = '<div class="empty-state">Chưa có giao dịch. Hãy thêm giao dịch mới!</div>';
        return;
    }

    const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));

    sorted.forEach(t => {
        const item = document.createElement('div');
        item.classList.add('transaction-item');
        
        const sign = t.type === 'income' ? '+' : '-';
        const iconClass = categoryIcons[t.category] || categoryIcons['Other'];
        const label = categoryLabels[t.category] || 'Khác';
        
        item.innerHTML = `
            <div class="t-info">
                <div class="t-icon">
                    <i class="fa-solid ${iconClass}"></i>
                </div>
                <div class="t-details">
                    <h4>${label}</h4>
                    <p>${new Date(t.date).toLocaleDateString('vi-VN')} ${t.description ? '• ' + t.description : ''}</p>
                </div>
            </div>
            <div style="display: flex; align-items: center;">
                <div class="t-amount ${t.type}">${sign} ${formatCurrency(t.amount)}</div>
                <div class="t-actions" onclick="deleteTransaction('${t.id}')" title="Xóa">
                    <i class="fa-solid fa-trash"></i>
                </div>
            </div>
        `;
        transactionListEl.appendChild(item);
    });
}

function updateChart() {
    const ctx = document.getElementById('expenseChart').getContext('2d');
    
    const expensesByCategory = {};
    transactions.filter(t => t.type === 'expense').forEach(t => {
        const label = categoryLabels[t.category] || 'Khác';
        expensesByCategory[label] = (expensesByCategory[label] || 0) + t.amount;
    });

    const labels = Object.keys(expensesByCategory);
    const data = Object.values(expensesByCategory);

    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#f8fafc' : '#0f172a';

    if (expenseChartInstance) {
        expenseChartInstance.destroy();
    }

    if (labels.length === 0) {
        expenseChartInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Chưa có dữ liệu'],
                datasets: [{
                    data: [1],
                    backgroundColor: [isDark ? '#334155' : '#e2e8f0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            }
        });
        return;
    }

    const colors = ['#facc15', '#fde047', '#ca8a04', '#a16207', '#4ade80', '#f87171', '#fbbf24'];

    expenseChartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: isDark ? '#1e293b' : '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { color: textColor, font: { family: 'Outfit' } }
                }
            }
        }
    });
}

function handleAddTransaction(e) {
    e.preventDefault();
    
    const type = document.querySelector('input[name="type"]:checked').value;
    const amount = Number(document.getElementById('amount').value);
    const category = document.getElementById('category').value;
    const date = document.getElementById('date').value;
    const description = document.getElementById('description').value;

    if (!amount || !category || !date) return;

    const transaction = {
        id: crypto.randomUUID(),
        type,
        amount,
        category,
        date,
        description
    };

    transactions.push(transaction);
    saveData();
    updateUI();
    
    transactionForm.reset();
    document.getElementById('date').valueAsDate = new Date();
    document.querySelector('input[name="type"][value="expense"]').click();
    transactionModal.classList.remove('active');
}

function deleteTransaction(id) {
    if(confirm('Bạn có chắc chắn muốn xóa giao dịch này?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
    }
}

function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
}

function setupEventListeners() {
    addBtn.addEventListener('click', () => {
        transactionModal.classList.add('active');
        updateCategoryOptions();
    });
    
    closeModalBtn.addEventListener('click', () => {
        transactionModal.classList.remove('active');
    });

    transactionModal.addEventListener('click', (e) => {
        if(e.target === transactionModal) {
            transactionModal.classList.remove('active');
        }
    });

    transactionForm.addEventListener('submit', handleAddTransaction);

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        if(isDark) {
            document.body.removeAttribute('data-theme');
            localStorage.setItem('theme', 'light');
        } else {
            document.body.setAttribute('data-theme', 'dark');
            localStorage.setItem('theme', 'dark');
        }
        updateThemeIcon();
        updateChart();
    });

    const typeRadios = document.querySelectorAll('input[name="type"]');
    typeRadios.forEach(radio => {
        radio.addEventListener('change', updateCategoryOptions);
    });
}

function updateCategoryOptions() {
    const type = document.querySelector('input[name="type"]:checked').value;
    const select = document.getElementById('category');
    const incomeOpts = document.querySelectorAll('.income-opt');
    const expenseOpts = select.querySelectorAll('option:not(.income-opt):not([value="Other"])');
    
    if(type === 'income') {
        incomeOpts.forEach(opt => opt.style.display = '');
        expenseOpts.forEach(opt => opt.style.display = 'none');
        select.value = 'Salary';
    } else {
        incomeOpts.forEach(opt => opt.style.display = 'none');
        expenseOpts.forEach(opt => opt.style.display = '');
        select.value = 'Eating';
    }
}

function updateThemeIcon() {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    themeToggle.innerHTML = isDark 
        ? '<i class="fa-solid fa-sun"></i><span>Chế độ Sáng</span>' 
        : '<i class="fa-solid fa-moon"></i><span>Chế độ Tối</span>';
}

init();
