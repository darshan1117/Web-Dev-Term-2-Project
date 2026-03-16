
let transactions = [];
let budgets = { housing: 0, food: 0, transport: 0, entertainment: 0, other: 0 };
let savingsGoal = 0; 
let chartInstance = null; 
let overviewChartInstance = null; 
let trendChartInstance = null; 

const categories = {
    housing: { name: 'Housing & Utilities', icon: 'home', color: '#8b5cf6' },
    food: { name: 'Food & Dining', icon: 'restaurant', color: '#f59e0b' },
    transport: { name: 'Transportation', icon: 'directions_car', color: '#3b82f6' },
    entertainment: { name: 'Entertainment', icon: 'movie', color: '#ec4899' },
    salary: { name: 'Salary / Income', icon: 'payments', color: '#10b981' },
    other: { name: 'Other', icon: 'more_horiz', color: '#94a3b8' }
};

const navLinks = document.querySelectorAll('.nav-item');
const tabPanes = document.querySelectorAll('.tab-pane');

for (let i = 0; i < navLinks.length; i++) {
    navLinks[i].addEventListener('click', function(e) {
        e.preventDefault();
        
        for (let j = 0; j < navLinks.length; j++) {
            navLinks[j].classList.remove('active');
            tabPanes[j].classList.remove('active');
        }

        this.classList.add('active');
        
        let selectedTab = this.getAttribute('data-tab');
        document.getElementById('tab-' + selectedTab).classList.add('active');
    });
}

const form = document.getElementById('transaction-form');
form.addEventListener('submit', function(e) {
    e.preventDefault();

    let type = 'expense';
    const typeRadios = document.getElementsByName('type');
    for (let i = 0; i < typeRadios.length; i++) {
        if (typeRadios[i].checked) { type = typeRadios[i].value; break; }
    }

    const amountInput = parseFloat(document.getElementById('amount').value);
    const categoryInput = document.getElementById('category').value;
    const descriptionInput = document.getElementById('description').value || 'Income';

    if (amountInput <= 0) { alert("Enter positive amount."); return; }

    transactions.push({
        id: Math.random().toString(36).substr(2, 9),
        type: type,
        amount: amountInput,
        category: categoryInput,
        description: descriptionInput,
        date: new Date().toLocaleDateString('en-IN')
    });

    updateUI();
    form.reset();
    resetCategoryOptions(); 
});

const typeRadios = document.getElementsByName('type');
for (let i = 0; i < typeRadios.length; i++) {
    typeRadios[i].addEventListener('change', function() {
        resetCategoryOptions(this.value);
    });
}

function resetCategoryOptions(selectedType = 'expense') {
    const categorySelect = document.getElementById('category');
    const options = categorySelect.options;
    const noteGroup = document.getElementById('note-group');
    const noteInput = document.getElementById('description');

    if (selectedType === 'income') {
        noteGroup.style.display = 'none';
        noteInput.removeAttribute('required');
    } else {
        noteGroup.style.display = 'flex';
        noteInput.setAttribute('required', 'true');
    }

    for (let i = 1; i < options.length; i++) {
        const val = options[i].value;
        if (selectedType === 'income') {
            if (val === 'salary' || val === 'other') {
                options[i].style.display = 'block';
            } else {
                options[i].style.display = 'none';
            }
        } else {
            if (val === 'salary') {
                options[i].style.display = 'none';
            } else {
                options[i].style.display = 'block';
            }
        }
    }
    categorySelect.selectedIndex = 0;
}
resetCategoryOptions('expense');

const transactionLists = [document.getElementById('transaction-list'), document.getElementById('recent-transaction-list')];
for (let i = 0; i < transactionLists.length; i++) {
    transactionLists[i].addEventListener('click', function(e) {
        const delBtn = e.target.closest('.delete-btn');
        if (delBtn) {
            const id = delBtn.getAttribute('data-id');
            const newArr = [];
            for (let j = 0; j < transactions.length; j++) {
                if (transactions[j].id !== id) newArr.push(transactions[j]);
            }
            transactions = newArr;
            updateUI();
        }
    });
}

function updateUI() {
    let listEl = document.getElementById('transaction-list');
    let recentListEl = document.getElementById('recent-transaction-list');
    
    listEl.innerHTML = '';
    recentListEl.innerHTML = '';

    let tInc = 0;
    let tExp = 0;
    
    let categoryGraphData = { housing: 0, food: 0, transport: 0, entertainment: 0, other: 0 };

    let runningBalance = 0;
    let trendLabels = [];
    let trendData = [];

    const today = new Date();
    document.getElementById('reports-date').textContent = today.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });

    if (transactions.length === 0) {
        listEl.innerHTML = '<li class="empty-state">No transactions recorded.</li>';
        recentListEl.innerHTML = '<li class="empty-state">No recent activity.</li>';
    } else {
        for (let i = transactions.length - 1; i >= 0; i--) {
            let t = transactions[i];

            if (t.type === 'income') {
                tInc += t.amount;
            } else {
                tExp += t.amount;
                if (categoryGraphData[t.category] !== undefined) {
                    categoryGraphData[t.category] += t.amount;
                }
            }

            const li = buildTransactionItem(t);
            listEl.appendChild(li);

            if (transactions.length - i <= 5) {
                recentListEl.appendChild(li.cloneNode(true));
            }
        }
    }

    for (let i = 0; i < transactions.length; i++) {
        let t = transactions[i];
        if (t.type === 'income') {
            runningBalance += t.amount;
        } else {
            runningBalance -= t.amount;
        }
        trendLabels.push(t.date);
        
        let plottedBalance = runningBalance < 0 ? 0 : runningBalance;
        trendData.push(plottedBalance);
    }

    let currentBalance = tInc - tExp;
    document.getElementById('total-balance').textContent = '₹' + currentBalance.toFixed(2);
    document.getElementById('total-income').textContent = '+₹' + tInc.toFixed(2);
    document.getElementById('total-expense').textContent = '-₹' + tExp.toFixed(2);

    renderChart(categoryGraphData);
    renderOverviewChart(tInc, tExp);
    renderTrendChart(trendLabels, trendData);
    renderBudget(categoryGraphData);
    updateSavingsUI(currentBalance);
    saveData(); 
}

function buildTransactionItem(t) {
    const li = document.createElement('li');
    li.className = 'transaction-item ' + (t.type === 'income' ? 'income-item' : 'expense-item');
    const cat = categories[t.category] || categories.other;
    li.innerHTML = `
        <div class="t-info">
            <div class="t-icon" style="background:${cat.color}22; color:${cat.color}">
                <span class="material-symbols-rounded">${cat.icon}</span>
            </div>
            <div class="t-details">
                <h4>${t.description}</h4>
                <p>${cat.name} • ${t.date}</p>
            </div>
        </div>
        <div class="t-action">
            <span class="t-amount">${t.type==='income'?'+':'-'}₹${t.amount.toFixed(2)}</span>
            <button class="delete-btn" data-id="${t.id}"><span class="material-symbols-rounded">delete</span></button>
        </div>
    `;
    return li;
}

function renderChart(graphData) {
    const ctx = document.getElementById('expenseChart');
    if (!ctx) return;
    
    const labels = [];
    const datavals = [];
    const colors = [];

    for (let key in graphData) {
        if(graphData[key] > 0) {
            labels.push(categories[key].name);
            datavals.push(graphData[key]);
            colors.push(categories[key].color);
        }
    }

    if (chartInstance !== null) { chartInstance.destroy(); }
    
    chartInstance = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: datavals, backgroundColor: colors, borderWidth: 0 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '75%',
            plugins: { legend: { position: 'right', labels: { color: '#94a3b8', font: { family: 'Outfit', size: 12 } } } }
        }
    });
}

function renderOverviewChart(income, expense) {
    const ctx = document.getElementById('overviewChart');
    if (!ctx) return;

    if (overviewChartInstance !== null) { overviewChartInstance.destroy(); }

    overviewChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Overview'],
            datasets: [
                { label: 'Income', data: [income], backgroundColor: '#10b981', borderRadius: 8 },
                { label: 'Expense', data: [expense], backgroundColor: '#f43f5e', borderRadius: 8 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { display: false } }
            },
            plugins: { legend: { position: 'top', labels: { color: '#94a3b8', font: { family: 'Outfit' } } } }
        }
    });
}

function renderTrendChart(labels, data) {
    const ctx = document.getElementById('trendChart');
    if (!ctx) return;

    if (trendChartInstance !== null) { trendChartInstance.destroy(); }

    if(labels.length === 0) {
        labels = [new Date().toLocaleDateString('en-IN')];
        data = [0];
    }

    trendChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Balance',
                data: data,
                borderColor: '#0ea5e9', 
                backgroundColor: 'rgba(14, 165, 233, 0.1)',
                borderWidth: 3,
                pointBackgroundColor: '#0ea5e9',
                pointHoverRadius: 6,
                pointRadius: 4,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { min: 0, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
                x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function renderBudget(spentData) {
    const budgetList = document.getElementById('budget-list');
    if (!budgetList) return;
    budgetList.innerHTML = '';

    for (let cat in budgets) {
        let limit = budgets[cat];
        let spent = spentData[cat] || 0;
        let percentage = limit > 0 ? (spent / limit) * 100 : 0;
        if (percentage > 100) percentage = 100;
        
        let c = categories[cat];
        let barColor = spent > limit && limit > 0 ? '#ef4444' : c.color;

        let div = document.createElement('div');
        div.className = 'budget-item';
        div.innerHTML = `
            <div class="budget-header">
                <div class="budget-info">
                    <div class="budget-icon" style="background:${c.color}22; color:${c.color}">
                        <span class="material-symbols-rounded">${c.icon}</span>
                    </div>
                    <div>
                        <h4 style="font-size:0.95rem; font-weight:500;">${c.name}</h4>
                        <p style="font-size:0.8rem; color:#94a3b8;">₹${spent.toFixed(2)} spent</p>
                    </div>
                </div>
                <div>
                   <input type="number" class="budget-limit-input" data-cat="${cat}" value="${limit > 0 ? limit : ''}" placeholder="Set Limit ₹">
                </div>
            </div>
            <div class="budget-progress">
                <div class="budget-fill" style="width:${percentage}%; background:${barColor}"></div>
            </div>
        `;
        budgetList.appendChild(div);
    }
}

document.getElementById('budget-list').addEventListener('change', function(e) {
    if (e.target.classList.contains('budget-limit-input')) {
        let cat = e.target.getAttribute('data-cat');
        let val = parseFloat(e.target.value);
        if (val > 0) {
            budgets[cat] = val;
        } else {
            budgets[cat] = 0;
        }
        updateUI(); 
    }
});

document.getElementById('savings-goal-input').addEventListener('input', function(e) {
    let val = parseFloat(e.target.value);
    savingsGoal = isNaN(val) || val < 0 ? 0 : val;
    updateUI(); 
});

function updateSavingsUI(currentBalance) {
    let saved = currentBalance > 0 ? currentBalance : 0;
    let percentage = savingsGoal > 0 ? (saved / savingsGoal) * 100 : 0;
    
    let visualPercentage = percentage > 100 ? 100 : percentage;

    document.getElementById('savings-current').textContent = '₹' + saved.toFixed(2) + ' Saved';
    document.getElementById('savings-target').textContent = 'Target: ₹' + savingsGoal.toFixed(2);
    document.getElementById('savings-percentage').textContent = percentage.toFixed(1) + '% Achieved';
    document.getElementById('savings-fill').style.width = visualPercentage + '%';
    
    if (percentage >= 100 && savingsGoal > 0) {
        document.getElementById('savings-fill').style.background = '#8b5cf6'; 
    } else {
        document.getElementById('savings-fill').style.background = '#10b981'; 
    }
}

function saveData() {
    const appData = {
        transactions: transactions,
        budgets: budgets,
        savingsGoal: savingsGoal
    };
    localStorage.setItem('financeAppData', JSON.stringify(appData));
}

function loadData() {
    const savedData = localStorage.getItem('financeAppData');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        transactions = parsed.transactions || [];
        budgets = parsed.budgets || { housing: 0, food: 0, transport: 0, entertainment: 0, other: 0 };
        savingsGoal = parsed.savingsGoal || 0;
        
        const goalInput = document.getElementById('savings-goal-input');
        if (goalInput) goalInput.value = savingsGoal > 0 ? savingsGoal : '';
    }
}

loadData();
updateUI();
