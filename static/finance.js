// FieldPilot AI - Finance Page JavaScript

(() => {
    'use strict';

    console.log('FieldPilot finance.js loaded successfully');

    const STORAGE_KEY = 'fieldpilot_finance_v1';

    // Initial demo transactions
    const sampleTransactions = [{
            id: 1,
            description: 'Wheat sale',
            category: 'Crop sale',
            type: 'Income',
            amount: 42000,
            date: '2026-10-12',
            notes: ''
        },
        {
            id: 2,
            description: 'Fertilizer purchase',
            category: 'Fertilizer',
            type: 'Expense',
            amount: 8500,
            date: '2026-10-10',
            notes: ''
        },
        {
            id: 3,
            description: 'Soybean advance',
            category: 'Crop sale',
            type: 'Income',
            amount: 25000,
            date: '2026-10-08',
            notes: ''
        },
        {
            id: 4,
            description: 'Equipment repair',
            category: 'Equipment',
            type: 'Expense',
            amount: 3200,
            date: '2026-10-05',
            notes: ''
        }
    ];

    // HTML elements
    const body = document.getElementById('transactionBody');
    const formPanel = document.getElementById('formPanel');
    const form = document.getElementById('financeForm');
    const openFormButton = document.getElementById('openFinanceForm');
    const cancelFormButton = document.getElementById('cancelFinanceForm');
    const exportButton = document.getElementById('exportFinance');
    const search = document.getElementById('searchTransactions');
    const filter = document.getElementById('transactionFilter');
    const toast = document.getElementById('toast');
    const sidebar = document.getElementById('sidebar');

    let transactions = [];
    let toastTimer;

    // Load transactions saved in this browser
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === null) {
            transactions = sampleTransactions.map(item => ({...item }));
        } else {
            const parsed = JSON.parse(saved);

            transactions = Array.isArray(parsed) ?
                parsed.filter(item =>
                    item &&
                    typeof item.description === 'string' && ['Income', 'Expense'].includes(item.type) &&
                    Number.isFinite(Number(item.amount))
                ) :
                sampleTransactions.map(item => ({...item }));
        }
    } catch (error) {
        console.error('Could not load finance data:', error);
        transactions = sampleTransactions.map(item => ({...item }));
    }

    // Today's local date in YYYY-MM-DD format
    function todayISO() {
        const now = new Date();

        return (
            now.getFullYear() + '-' +
            String(now.getMonth() + 1).padStart(2, '0') + '-' +
            String(now.getDate()).padStart(2, '0')
        );
    }

    // Show notification
    function notify(message) {
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Save all transactions
    function saveTransactions() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(transactions)
            );

            return true;
        } catch (error) {
            console.error('Could not save finance data:', error);
            notify('Could not save data in this browser.');
            return false;
        }
    }

    // Format Indian currency
    function money(value) {
        return '₹' + Number(value).toLocaleString('en-IN', {
            maximumFractionDigits: 2
        });
    }

    // Format date
    function prettyDate(value) {
        if (!value) return '—';

        const date = new Date(value + 'T00:00:00');

        if (Number.isNaN(date.getTime())) {
            return '—';
        }

        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    // Update summary cards
    function updateSummary() {
        const income = transactions
            .filter(item => item.type === 'Income')
            .reduce((sum, item) => sum + Number(item.amount), 0);

        const expenses = transactions
            .filter(item => item.type === 'Expense')
            .reduce((sum, item) => sum + Number(item.amount), 0);

        const balance = income - expenses;

        document.getElementById('totalIncome').textContent = money(income);
        document.getElementById('totalExpenses').textContent = money(expenses);

        const balanceElement = document.getElementById('netBalance');
        balanceElement.textContent = money(balance);
        balanceElement.style.color =
            balance < 0 ? '#bd5548' : '#28804b';

        document.getElementById('transactionCount').textContent =
            transactions.length;

        document.getElementById('balanceNote').textContent =
            balance >= 0 ?
            'Your recorded income is currently higher than your expenses.' :
            'Your recorded expenses are higher than your income. Review your spending.';
    }

    // Draw chart for the last six months
    function renderChart() {
        const chart = document.getElementById('financeChart');

        if (!chart) return;

        chart.replaceChildren();

        const now = new Date();
        const months = [];

        for (let i = 5; i >= 0; i--) {
            const date = new Date(
                now.getFullYear(),
                now.getMonth() - i,
                1
            );

            const key =
                date.getFullYear() + '-' +
                String(date.getMonth() + 1).padStart(2, '0');

            months.push({
                key,
                label: date.toLocaleDateString('en-IN', {
                    month: 'short'
                })
            });
        }

        const totals = months.map(month => {
            const monthTransactions = transactions.filter(
                item => String(item.date || '').slice(0, 7) === month.key
            );

            return {
                ...month,
                income: monthTransactions
                    .filter(item => item.type === 'Income')
                    .reduce((sum, item) => sum + Number(item.amount), 0),

                expense: monthTransactions
                    .filter(item => item.type === 'Expense')
                    .reduce((sum, item) => sum + Number(item.amount), 0)
            };
        });

        const maxAmount = Math.max(
            1,
            ...totals.flatMap(month => [month.income, month.expense])
        );

        totals.forEach(month => {
            const group = document.createElement('div');
            group.className = 'month-group';

            const bars = document.createElement('div');
            bars.className = 'month-bars';

            const chartItems = [{
                    value: month.income,
                    className: 'income-bar',
                    label: 'Income'
                },
                {
                    value: month.expense,
                    className: 'expense-bar',
                    label: 'Expenses'
                }
            ];

            chartItems.forEach(item => {
                const bar = document.createElement('span');

                bar.className = item.className;
                bar.style.height =
                    Math.max(3, (item.value / maxAmount) * 100) + '%';

                bar.title = item.label + ': ' + money(item.value);

                bars.appendChild(bar);
            });

            const label = document.createElement('small');
            label.textContent = month.label;

            group.append(bars, label);
            chart.appendChild(group);
        });
    }

    // Build transaction table
    function renderTransactions() {
        const query = search.value.trim().toLowerCase();
        const selectedType = filter.value;

        const visible = transactions
            .filter(item => {
                const description =
                    String(item.description || '').toLowerCase();

                const category =
                    String(item.category || '').toLowerCase();

                const notes =
                    String(item.notes || '').toLowerCase();

                const matchesQuery =
                    description.includes(query) ||
                    category.includes(query) ||
                    notes.includes(query);

                const matchesType =
                    selectedType === 'All' ||
                    item.type === selectedType;

                return matchesQuery && matchesType;
            })
            .sort((a, b) =>
                String(b.date || '').localeCompare(String(a.date || ''))
            );

        body.replaceChildren();

        visible.forEach(item => {
            const row = document.createElement('tr');

            // Description and optional notes
            const descriptionCell = document.createElement('td');

            const title = document.createElement('span');
            title.className = 'transaction-title';
            title.textContent = item.description;

            descriptionCell.appendChild(title);

            if (item.notes) {
                const note = document.createElement('span');
                note.className = 'transaction-sub';
                note.textContent = item.notes;
                descriptionCell.appendChild(note);
            }

            // Category
            const categoryCell = document.createElement('td');
            categoryCell.textContent = item.category || 'Other';

            // Date
            const dateCell = document.createElement('td');
            dateCell.textContent = prettyDate(item.date);

            // Transaction type
            const typeCell = document.createElement('td');
            const badge = document.createElement('span');

            badge.className =
                'type-badge' +
                (item.type === 'Expense' ? ' expense' : '');

            badge.textContent = item.type;
            typeCell.appendChild(badge);

            // Amount
            const amountCell = document.createElement('td');

            amountCell.textContent =
                (item.type === 'Income' ? '+' : '−') +
                money(item.amount);

            amountCell.style.color =
                item.type === 'Income' ? '#28804b' : '#bd7a50';

            // Delete action
            const actionCell = document.createElement('td');
            const deleteButton = document.createElement('button');

            deleteButton.className = 'delete-transaction';
            deleteButton.type = 'button';
            deleteButton.textContent = 'Delete';

            deleteButton.addEventListener('click', () => {
                if (!confirm('Delete this transaction?')) return;

                const oldTransactions = transactions;

                transactions = transactions.filter(
                    transaction => transaction.id !== item.id
                );

                if (!saveTransactions()) {
                    transactions = oldTransactions;
                    return;
                }

                renderAll();
                notify('Transaction deleted.');
            });

            actionCell.appendChild(deleteButton);

            [
                descriptionCell,
                categoryCell,
                dateCell,
                typeCell,
                amountCell,
                actionCell
            ].forEach(cell => row.appendChild(cell));

            body.appendChild(row);
        });

        document.getElementById('emptyTransactions').hidden =
            visible.length !== 0;
    }

    // Refresh summary, chart and table
    function renderAll() {
        updateSummary();
        renderChart();
        renderTransactions();
    }

    // OPEN TRANSACTION FORM
    openFormButton.addEventListener('click', () => {
        formPanel.hidden = false;

        const dateInput = form.elements.namedItem('date');

        if (dateInput && !dateInput.value) {
            dateInput.value = todayISO();
        }

        formPanel.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });

    // CANCEL TRANSACTION FORM
    cancelFormButton.addEventListener('click', () => {
        form.reset();
        formPanel.hidden = true;
    });

    // SAVE A NEW TRANSACTION
    form.addEventListener('submit', event => {
        event.preventDefault();

        const data = new FormData(form);

        const description =
            String(data.get('description') || '').trim();

        const category = String(data.get('category') || 'Other');
        const type = String(data.get('type') || 'Income');
        const amount = Number(data.get('amount'));
        const date = String(data.get('date') || '');
        const notes = String(data.get('notes') || '').trim();

        if (!description) {
            notify('Please enter a transaction description.');
            return;
        }

        if (!Number.isFinite(amount) || amount <= 0) {
            notify('Please enter an amount greater than zero.');
            return;
        }

        if (!['Income', 'Expense'].includes(type)) {
            notify('Please select Income or Expense.');
            return;
        }

        if (!date) {
            notify('Please select the transaction date.');
            return;
        }

        const newTransaction = {
            id: Date.now(),
            description,
            category,
            type,
            amount,
            date,
            notes
        };

        transactions.push(newTransaction);

        if (!saveTransactions()) {
            transactions.pop();
            return;
        }

        form.reset();
        formPanel.hidden = true;

        search.value = '';
        filter.value = 'All';

        renderAll();
        notify('Transaction saved successfully.');
    });

    // Search and filtering
    search.addEventListener('input', renderTransactions);
    filter.addEventListener('change', renderTransactions);

    // EXPORT CSV
    exportButton.addEventListener('click', () => {
        const rows = [
            [
                'Description',
                'Category',
                'Date',
                'Type',
                'Amount',
                'Notes'
            ],
            ...transactions.map(item => [
                item.description,
                item.category,
                item.date,
                item.type,
                item.amount,
                item.notes || ''
            ])
        ];

        const csv = rows.map(row =>
            row.map(value =>
                '"' +
                String(value == null ? '' : value).replace(/"/g, '""') +
                '"'
            ).join(',')
        ).join('\r\n');

        const blob = new Blob(
            ['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');

        link.href = url;
        link.download = 'fieldpilot-finance.csv';

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        notify('Finance report exported.');
    });

    // Mobile sidebar toggle
    document.getElementById('mobileMenu').addEventListener('click', () => {
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    });

    // Header date and footer year
    const now = new Date();

    document.getElementById('todayLabel').textContent =
        now.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });

    document.getElementById('currentYear').textContent =
        now.getFullYear();

    // Initialise page
    renderAll();

})();