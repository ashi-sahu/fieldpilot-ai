// FieldPilot AI - Dashboard (reads live data saved by the other pages)
(() => {
    'use strict';

    const { read, write, esc, money, moneyShort, fmtDate, todayISO, alerts } = window.FP;

    const sidebar = document.getElementById('sidebar');
    const toast = document.getElementById('toast');
    let toastTimer;

    function showToast(message) {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
    }

    // ---------- greeting, date, navigation ----------
    function updateDateAndGreeting() {
        const now = new Date();
        const hour = now.getHours();
        const greeting = document.getElementById('greetingText');
        const todayLabel = document.getElementById('todayLabel');
        const year = document.getElementById('currentYear');
        if (greeting) greeting.textContent = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
        if (todayLabel) todayLabel.textContent = now.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
        if (year) year.textContent = now.getFullYear();
    }

    function navigateToPage(fileName, openForm) {
        if (fileName) window.location.href = fileName + (openForm ? '?openForm=1' : '');
    }

    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu && sidebar) mobileMenu.addEventListener('click', () => sidebar.classList.toggle('open'));

    document.querySelectorAll('.page-navigation[data-target]').forEach(button => {
        button.addEventListener('click', () => navigateToPage(button.dataset.target, false));
    });

    const addRecordButton = document.getElementById('addRecordButton');
    if (addRecordButton) addRecordButton.addEventListener('click', () => navigateToPage('crops.html', true));
    const addTaskButton = document.getElementById('addTaskButton');
    if (addTaskButton) addTaskButton.addEventListener('click', () => navigateToPage('tasks.html', true));

    // ---------- helpers ----------
    const FILL = { Growing: '', Harvesting: 'yellow-fill', Planned: 'purple-fill' };
    // The crop record stores a stage, not a growth percentage, so the bar is an estimate from the stage.
    const PROGRESS = { Planned: 10, Growing: 55, Harvesting: 90 };

    function cropEmoji(name) {
        const n = String(name).toLowerCase();
        if (/wheat|rice|paddy|barley|oat|jowar|bajra/.test(n)) return '🌾';
        if (/soy|bean|rajma|moong|urad|lentil|pea/.test(n)) return '🫘';
        if (/maize|corn/.test(n)) return '🌽';
        if (/potato/.test(n)) return '🥔';
        if (/tomato/.test(n)) return '🍅';
        if (/onion|garlic/.test(n)) return '🧅';
        if (/sugarcane/.test(n)) return '🎋';
        if (/mustard|sunflower/.test(n)) return '🌻';
        if (/cotton/.test(n)) return '☁️';
        if (/mango|apple|banana|orange|grape/.test(n)) return '🍎';
        return '🌱';
    }

    function emojiClass(name) {
        const n = String(name).toLowerCase();
        return ['wheat', 'soybean', 'maize', 'chickpea'].find(k => n.includes(k)) || '';
    }

    function dueLabel(dueDate) {
        if (!dueDate) return 'No date';
        const today = todayISO();
        if (dueDate < today) return 'Overdue';
        if (dueDate === today) return 'Today';
        const t = new Date();
        t.setDate(t.getDate() + 1);
        const tomorrow = t.getFullYear() + '-' + String(t.getMonth() + 1).padStart(2, '0') + '-' + String(t.getDate()).padStart(2, '0');
        return dueDate === tomorrow ? 'Tomorrow' : fmtDate(dueDate);
    }

    function empty(message, page, linkText) {
        return '<p class="empty-note">' + esc(message) + ' <a href="' + page + '">' + esc(linkText) + '</a></p>';
    }

    function monthKey(iso) {
        return String(iso || '').slice(0, 7);
    }

    // ---------- render ----------
    function renderStats(crops, tasks, tx) {
        const area = crops.reduce((sum, c) => sum + (Number(c.area) || 0), 0);
        const fields = new Set(crops.map(c => String(c.field || '').trim().toLowerCase()).filter(Boolean)).size;
        const growing = crops.filter(c => c.status === 'Growing').length;
        const harvesting = crops.filter(c => c.status === 'Harvesting').length;
        const planned = crops.filter(c => c.status === 'Planned').length;
        const active = growing + harvesting;
        const activePct = crops.length ? Math.round(active / crops.length * 100) : 0;

        const income = tx.filter(t => t.type === 'Income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expense = tx.filter(t => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);

        const today = todayISO();
        const pending = tasks.filter(t => t.status !== 'Completed');
        const high = pending.filter(t => t.priority === 'High').length;
        const overdue = pending.filter(t => t.dueDate && t.dueDate < today).length;

        const maxArea = Math.max(1, ...crops.map(c => Number(c.area) || 0));
        const bars = crops.slice(0, 7).map(c => '<i style="height:' + Math.max(12, Math.round((Number(c.area) || 0) / maxArea * 100)) + '%" title="' + esc(c.name) + '"></i>').join('');

        // income trend over the last 6 months
        const months = [];
        const now = new Date();
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
        }
        const series = months.map(m => tx.filter(t => t.type === 'Income' && monthKey(t.date) === m).reduce((s, t) => s + (Number(t.amount) || 0), 0));
        const top = Math.max(1, ...series);
        const points = series.map((v, i) => [Math.round(i / 5 * 160), Math.round(34 - v / top * 30)]);
        const line = points.map((p, i) => (i ? 'L' : 'M') + p[0] + ' ' + p[1]).join(' ');

        const dots = pending.slice(0, 8).map(t => '<i' + (t.priority === 'High' ? ' class="urgent"' : '') + '></i>').join('');

        document.getElementById('statsGrid').innerHTML =
            '<article class="stat-card"><div class="stat-top"><span class="stat-label">Total farm area</span><span class="stat-icon green">⌂</span></div>' +
            '<div class="stat-value">' + area.toLocaleString('en-IN') + ' <small>acres</small></div>' +
            '<div class="stat-foot"><span class="trend positive">' + crops.length + ' crop' + (crops.length === 1 ? '' : 's') + '</span><span>across ' + fields + ' field' + (fields === 1 ? '' : 's') + '</span></div>' +
            '<div class="mini-bars">' + bars + '</div></article>' +

            '<article class="stat-card"><div class="stat-top"><span class="stat-label">Active crops</span><span class="stat-icon yellow">♧</span></div>' +
            '<div class="stat-value">' + active + ' <small>crops</small></div>' +
            '<div class="stat-foot"><span class="trend positive">● ' + growing + ' growing</span><span>' + harvesting + ' harvesting, ' + planned + ' planned</span></div>' +
            '<div class="progress-track"><span style="width:' + activePct + '%"></span></div>' +
            '<div class="progress-caption"><span>Share of crops in the field</span><strong>' + activePct + '%</strong></div></article>' +

            '<article class="stat-card"><div class="stat-top"><span class="stat-label">Total income</span><span class="stat-icon blue">₹</span></div>' +
            '<div class="stat-value">' + moneyShort(income) + '</div>' +
            '<div class="stat-foot"><span class="trend ' + (income - expense >= 0 ? 'positive' : 'warning') + '">Net ' + moneyShort(income - expense) + '</span><span>expenses ' + moneyShort(expense) + '</span></div>' +
            '<div class="sparkline"><svg viewBox="0 0 160 38" preserveAspectRatio="none" aria-label="Income, last 6 months"><path d="' + line + '" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><path d="' + line + ' L160 38 L0 38 Z" fill="currentColor" opacity=".08"/></svg></div></article>' +

            '<article class="stat-card"><div class="stat-top"><span class="stat-label">Pending tasks</span><span class="stat-icon orange">✓</span></div>' +
            '<div class="stat-value" id="pendingCount">' + pending.length + ' <small>tasks</small></div>' +
            '<div class="stat-foot"><span class="trend warning">' + high + ' high priority</span><span>' + overdue + ' overdue</span></div>' +
            '<div class="task-dots">' + dots + '</div></article>';
    }

    function renderCrops(crops) {
        const list = document.getElementById('cropList');
        if (!crops.length) {
            list.innerHTML = empty('No crops added yet.', 'crops.html?openForm=1', 'Add your first crop');
            return;
        }
        list.innerHTML = crops.slice(0, 5).map(c => {
            const pct = PROGRESS[c.status] || 30;
            return '<div class="crop-row"><div class="crop-emoji ' + emojiClass(c.name) + '">' + cropEmoji(c.name) + '</div>' +
                '<div class="crop-info"><div class="crop-name-line"><strong>' + esc(c.name) + '</strong><span>' + esc(c.field) + '</span></div>' +
                '<div class="progress-track"><span class="' + (FILL[c.status] || '') + '" style="width:' + pct + '%"></span></div>' +
                '<small>' + esc(c.area) + ' acres · ' + esc(c.status) + '</small></div>' +
                '<strong class="crop-percent" title="Estimated from the crop stage">' + pct + '%</strong></div>';
        }).join('');
    }

    function renderTasks(tasks) {
        const pending = tasks.filter(t => t.status !== 'Completed')
            .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));
        const badge = document.getElementById('taskBadge');
        if (badge) badge.textContent = pending.length + ' pending';
        const list = document.getElementById('taskList');
        if (!pending.length) {
            list.innerHTML = empty('Nothing pending. Nice work!', 'tasks.html?openForm=1', 'Add a task');
            return;
        }
        list.innerHTML = pending.slice(0, 5).map(t =>
            '<label class="task-row"><input type="checkbox" class="task-check" data-id="' + esc(t.id) + '"><span class="custom-check"></span>' +
            '<span class="task-copy"><strong>' + esc(t.title) + '</strong><small>' + esc(dueLabel(t.dueDate)) + ' · ' + esc(t.category) + '</small></span>' +
            '<span class="priority ' + esc(String(t.priority || 'Medium').toLowerCase()) + '">' + esc(t.priority || 'Medium') + '</span></label>'
        ).join('');
        list.querySelectorAll('.task-check').forEach(box => {
            box.addEventListener('change', () => {
                const all = read('tasks');
                const task = all.find(t => String(t.id) === box.dataset.id);
                if (!task) return;
                task.status = 'Completed';
                if (!write('tasks', all)) { showToast('Could not save in this browser.'); box.checked = false; return; }
                const title = box.closest('.task-row').querySelector('.task-copy strong');
                title.style.textDecoration = 'line-through';
                title.style.opacity = '0.65';
                showToast('Task marked as completed.');
                setTimeout(render, 700);
            });
        });
    }

    function renderFinance(tx) {
        const income = tx.filter(t => t.type === 'Income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const expense = tx.filter(t => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
        const net = income - expense;
        document.getElementById('financeTotal').innerHTML =
            '<span>Net position</span><strong>' + (net < 0 ? '−' : '') + money(Math.abs(net)) + '</strong>' +
            '<span class="trend ' + (net >= 0 ? 'positive' : 'warning') + '">' + (net >= 0 ? '↗ Positive balance' : '↘ Expenses exceed income') + '</span>';

        const now = new Date();
        const months = [2, 1, 0].map(i => {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            return { key: d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'), label: d.toLocaleDateString('en-IN', { month: 'short' }) };
        });
        months.forEach(m => {
            m.income = tx.filter(t => t.type === 'Income' && monthKey(t.date) === m.key).reduce((s, t) => s + (Number(t.amount) || 0), 0);
            m.expense = tx.filter(t => t.type === 'Expense' && monthKey(t.date) === m.key).reduce((s, t) => s + (Number(t.amount) || 0), 0);
        });
        const top = Math.max(1, ...months.map(m => Math.max(m.income, m.expense)));
        document.getElementById('financeBars').innerHTML = months.map(m =>
            '<div class="finance-bar-group"><div class="bar-pair">' +
            '<span class="income-bar" style="height:' + Math.round(m.income / top * 100) + '%" title="Income ' + money(m.income) + '"></span>' +
            '<span class="expense-bar" style="height:' + Math.round(m.expense / top * 100) + '%" title="Expenses ' + money(m.expense) + '"></span>' +
            '</div><small>' + esc(m.label) + '</small></div>'
        ).join('') +
            '<div class="finance-legend"><span><i class="legend-income"></i>Income</span><span><i class="legend-expense"></i>Expenses</span></div>';
    }

    function renderTransactions(tx) {
        const list = document.getElementById('transactionList');
        if (!tx.length) {
            list.innerHTML = empty('No transactions yet.', 'finance.html', 'Record one');
            return;
        }
        const latest = tx.slice().sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (Number(b.id) || 0) - (Number(a.id) || 0)).slice(0, 4);
        list.innerHTML = latest.map(t => {
            const inc = t.type === 'Income';
            return '<div class="transaction-row"><span class="transaction-icon ' + (inc ? 'income-icon' : 'expense-icon') + '">' + (inc ? '↙' : '↗') + '</span>' +
                '<span class="transaction-copy"><strong>' + esc(t.description) + '</strong><small>' + esc(fmtDate(t.date)) + ' · ' + esc(t.category) + '</small></span>' +
                '<strong class="amount ' + (inc ? 'income-amount' : 'expense-amount') + '">' + (inc ? '+' : '−') + money(t.amount) + '</strong></div>';
        }).join('');
    }

    function render() {
        const crops = read('crops');
        const tasks = read('tasks');
        const tx = read('finance').filter(t => t && ['Income', 'Expense'].includes(t.type));
        renderStats(crops, tasks, tx);
        renderCrops(crops);
        renderTasks(tasks);
        renderFinance(tx);
        renderTransactions(tx);
        updateAlertDot();
    }

    // ---------- notifications ----------
    const bell = document.getElementById('notificationButton');
    let popover;

    function updateAlertDot() {
        const dot = bell && bell.querySelector('.notification-dot');
        if (dot) dot.style.display = alerts().length ? '' : 'none';
    }

    function closePopover() {
        if (popover) { popover.remove(); popover = null; }
    }

    if (bell) {
        bell.addEventListener('click', event => {
            event.stopPropagation();
            if (popover) return closePopover();
            const items = alerts();
            popover = document.createElement('div');
            popover.className = 'alert-popover';
            popover.setAttribute('role', 'dialog');
            popover.setAttribute('aria-label', 'Alerts');
            popover.innerHTML = '<h3>Alerts</h3>' + (items.length
                ? items.slice(0, 8).map(a => '<a class="alert-item ' + a.level + '" href="' + a.href + '">' + esc(a.text) + '</a>').join('') +
                (items.length > 8 ? '<p class="alert-more">and ' + (items.length - 8) + ' more</p>' : '')
                : '<p class="alert-none">You’re all caught up!</p>');
            bell.parentElement.style.position = 'relative';
            bell.parentElement.appendChild(popover);
        });
        document.addEventListener('click', event => {
            if (popover && !popover.contains(event.target)) closePopover();
        });
        document.addEventListener('keydown', event => { if (event.key === 'Escape') closePopover(); });
    }

    // ---------- export (from saved data) ----------
    const exportButton = document.getElementById('exportButton');
    if (exportButton) {
        exportButton.addEventListener('click', () => {
            const crops = read('crops');
            const tasks = read('tasks');
            const tx = read('finance');
            const inventory = read('inventory');
            const labour = read('labour');
            const machinery = read('machinery');
            const income = tx.filter(t => t.type === 'Income').reduce((s, t) => s + Number(t.amount || 0), 0);
            const expense = tx.filter(t => t.type === 'Expense').reduce((s, t) => s + Number(t.amount || 0), 0);

            const rows = [
                ['FieldPilot AI - Farm Summary'], ['Generated on', new Date().toLocaleDateString('en-IN')], [],
                ['Total farm area (acres)', crops.reduce((s, c) => s + Number(c.area || 0), 0)],
                ['Total income', income], ['Total expenses', expense], ['Net', income - expense],
                ['Pending tasks', tasks.filter(t => t.status !== 'Completed').length], [],
                ['CROPS'], ['Crop', 'Field', 'Area (acres)', 'Status', 'Sowing date'],
                ...crops.map(c => [c.name, c.field, c.area, c.status, c.date]), [],
                ['TASKS'], ['Task', 'Category', 'Due date', 'Priority', 'Status'],
                ...tasks.map(t => [t.title, t.category, t.dueDate, t.priority, t.status]), [],
                ['TRANSACTIONS'], ['Description', 'Category', 'Type', 'Amount', 'Date'],
                ...tx.map(t => [t.description, t.category, t.type, t.amount, t.date]), [],
                ['INVENTORY'], ['Item', 'Category', 'Quantity', 'Unit', 'Minimum', 'Unit cost'],
                ...inventory.map(i => [i.name, i.category, i.quantity, i.unit, i.minimum, i.unitCost]), [],
                ['LABOUR'], ['Name', 'Role', 'Daily wage', 'Status'],
                ...labour.map(w => [w.name, w.role, w.wage, w.status]), [],
                ['MACHINERY'], ['Name', 'Type', 'Condition', 'Next service'],
                ...machinery.map(m => [m.name, m.type, m.condition, m.nextService])
            ];
            const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\r\n');
            const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'fieldpilot-farm-summary.csv';
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            showToast('Farm summary exported.');
        });
    }

    updateDateAndGreeting();
    render();
})();
