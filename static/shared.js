// FieldPilot AI - shared helpers (loaded on every page before the page script)
// Starter data (identical to what each page shows on first visit)
function dateOffsetISO(offset) {
        const date = new Date();
        date.setHours(12, 0, 0, 0);
        date.setDate(date.getDate() + offset);

        return (
            date.getFullYear() +
            '-' +
            String(date.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(date.getDate()).padStart(2, '0')
        );
    }

const FP_STARTERS = {
crops: [{
        id: 1,
        name: 'Wheat',
        field: 'North Field',
        area: 42,
        status: 'Growing',
        date: '2026-09-15'
    }, {
        id: 2,
        name: 'Soybean',
        field: 'East Field',
        area: 35,
        status: 'Harvesting',
        date: '2026-06-20'
    }, {
        id: 3,
        name: 'Maize',
        field: 'South Field',
        area: 25,
        status: 'Growing',
        date: '2026-08-10'
    }, {
        id: 4,
        name: 'Chickpea',
        field: 'West Field',
        area: 18,
        status: 'Planned',
        date: ''
    }],
finance: [{
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
    ],
tasks: [{
            id: 1,
            title: 'Irrigate the north field',
            category: 'Irrigation',
            dueDate: dateOffsetISO(1),
            priority: 'High',
            location: 'North Field',
            assignedTo: 'Ramesh',
            notes: 'Check soil moisture before watering.',
            status: 'Pending'
        },
        {
            id: 2,
            title: 'Inspect soybean crop',
            category: 'Crop Inspection',
            dueDate: dateOffsetISO(-1),
            priority: 'High',
            location: 'East Field',
            assignedTo: 'Farm Admin',
            notes: 'Check leaves for signs of pests.',
            status: 'Pending'
        },
        {
            id: 3,
            title: 'Check tractor engine oil',
            category: 'Machinery',
            dueDate: dateOffsetISO(3),
            priority: 'Medium',
            location: 'Equipment Shed',
            assignedTo: 'Suresh',
            notes: 'Inspect oil level and look for leaks.',
            status: 'Pending'
        },
        {
            id: 4,
            title: 'Apply fertilizer to maize',
            category: 'Fertilizer',
            dueDate: dateOffsetISO(-2),
            priority: 'Low',
            location: 'South Field',
            assignedTo: 'Farm Admin',
            notes: 'Sample completed task.',
            status: 'Completed'
        }
    ],
inventory: [{
            id: 1,
            name: 'Wheat Seeds',
            category: 'Seeds',
            quantity: 12,
            unit: 'bags',
            minimum: 5,
            unitCost: 1100,
            supplier: 'Local Seed Store',
            location: 'Store Room'
        },
        {
            id: 2,
            name: 'NPK Fertilizer',
            category: 'Fertilizer',
            quantity: 4,
            unit: 'bags',
            minimum: 6,
            unitCost: 1350,
            supplier: 'Agro Supply Store',
            location: 'Fertilizer Room'
        },
        {
            id: 3,
            name: 'Pesticide Spray',
            category: 'Pesticide',
            quantity: 0,
            unit: 'litres',
            minimum: 2,
            unitCost: 450,
            supplier: 'Farm Care Store',
            location: 'Storage Shelf'
        },
        {
            id: 4,
            name: 'Drip Connectors',
            category: 'Tools',
            quantity: 45,
            unit: 'pieces',
            minimum: 10,
            unitCost: 18,
            supplier: 'Irrigation Supplies',
            location: 'Tool Room'
        },
        {
            id: 5,
            name: 'Diesel',
            category: 'Fuel',
            quantity: 22,
            unit: 'litres',
            minimum: 8,
            unitCost: 95,
            supplier: 'Fuel Station',
            location: 'Fuel Storage'
        },
        {
            id: 6,
            name: 'Organic Compost',
            category: 'Fertilizer',
            quantity: 18,
            unit: 'bags',
            minimum: 5,
            unitCost: 250,
            supplier: 'Organic Farm Store',
            location: 'Storage Room'
        }
    ],
labour: [{
            id: 1,
            name: 'Ramesh Kumar',
            role: 'Field Worker',
            wage: 500,
            status: 'Active',
            phone: '',
            joiningDate: '2025-06-10',
            notes: 'Crop and field work',
            attendance: {}
        },
        {
            id: 2,
            name: 'Suresh Patel',
            role: 'Tractor Operator',
            wage: 700,
            status: 'Active',
            phone: '',
            joiningDate: '2025-07-15',
            notes: 'Tractor operations',
            attendance: {}
        },
        {
            id: 3,
            name: 'Mohan Singh',
            role: 'Irrigation Worker',
            wage: 550,
            status: 'Active',
            phone: '',
            joiningDate: '2025-08-01',
            notes: 'Irrigation support',
            attendance: {}
        },
        {
            id: 4,
            name: 'Rajesh Verma',
            role: 'Seasonal Worker',
            wage: 450,
            status: 'On Leave',
            phone: '',
            joiningDate: '2026-06-01',
            notes: 'Seasonal farm work',
            attendance: {}
        }
    ],
machinery: [{
            id: 1,
            name: 'Farm Tractor',
            type: 'Tractor',
            condition: 'Good',
            purchaseDate: '2024-06-15',
            lastService: '2026-08-10',
            nextService: '2026-11-10',
            location: 'Main Equipment Shed',
            notes: '45 HP tractor'
        },
        {
            id: 2,
            name: 'Water Pump',
            type: 'Water Pump',
            condition: 'Needs Service',
            purchaseDate: '2023-04-20',
            lastService: '2026-05-12',
            nextService: '2026-10-20',
            location: 'North Field',
            notes: 'Check motor and connections'
        },
        {
            id: 3,
            name: 'Crop Sprayer',
            type: 'Sprayer',
            condition: 'Under Repair',
            purchaseDate: '2024-02-08',
            lastService: '2026-07-05',
            nextService: '',
            location: 'Tool Room',
            notes: 'Spray nozzle needs repair'
        },
        {
            id: 4,
            name: 'Power Tiller',
            type: 'Tiller',
            condition: 'Good',
            purchaseDate: '2025-01-18',
            lastService: '2026-09-02',
            nextService: '2026-12-02',
            location: 'Equipment Shed',
            notes: 'Ready for field work'
        }
    ]
};

// ---- Server sync: the database is the source of truth, localStorage is the fast working copy ----
(function () {
    'use strict';
    const NAMES = {
        fieldpilot_crops_v1: 'crops', fieldpilot_finance_v1: 'finance', fieldpilot_tasks_v1: 'tasks',
        fieldpilot_inventory_v1: 'inventory', fieldpilot_labour_v1: 'labour', fieldpilot_machinery_v1: 'machinery',
        fieldpilot_settings_v1: 'settings'
    };
    const rawSet = Storage.prototype.setItem;
    const rawRemove = Storage.prototype.removeItem;
    const user = window.__FP_USER__;
    const data = window.__FP_DATA__;

    function toast(message) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = message;
        el.classList.add('show');
        setTimeout(() => el.classList.remove('show'), 3500);
    }

    if (user && data) {
        try {
            if (localStorage.getItem('fieldpilot_uid') !== String(user.id)) {
                Object.keys(localStorage).filter(k => k.indexOf('fieldpilot_') === 0).forEach(k => rawRemove.call(localStorage, k));
                rawSet.call(localStorage, 'fieldpilot_uid', String(user.id));
            }
            Object.keys(NAMES).forEach(key => {
                if (NAMES[key] in data) rawSet.call(localStorage, key, JSON.stringify(data[NAMES[key]]));
                else rawRemove.call(localStorage, key);
            });
        } catch (error) {
            console.error('Could not load saved data', error);
        }
    }

    function push(name, raw) {
        let value;
        try { value = JSON.parse(raw); } catch (error) { return; }
        fetch('/api/data/' + name, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fp' },
            body: JSON.stringify({ value: value }),
            keepalive: true
        }).then(res => {
            if (res.status === 401) { window.location.href = '/login'; return; }
            if (!res.ok) toast('Could not save to the server. Your change may be lost.');
        }).catch(() => toast('You look offline. Changes are not saved to the server.'));
    }

    Storage.prototype.setItem = function (key, value) {
        rawSet.call(this, key, value);
        if (this === localStorage && NAMES[key]) push(NAMES[key], value);
    };

    window.FPSync = { clearLocal: () => Object.keys(localStorage).filter(k => k.indexOf('fieldpilot_') === 0).forEach(k => rawRemove.call(localStorage, k)) };
})();

(function () {
    'use strict';

    const KEYS = {
        crops: 'fieldpilot_crops_v1',
        finance: 'fieldpilot_finance_v1',
        tasks: 'fieldpilot_tasks_v1',
        inventory: 'fieldpilot_inventory_v1',
        labour: 'fieldpilot_labour_v1',
        machinery: 'fieldpilot_machinery_v1',
        settings: 'fieldpilot_settings_v1'
    };

    const DEFAULT_SETTINGS = {
        farmName: 'My Farm',
        ownerName: (window.__FP_USER__ && window.__FP_USER__.name) || 'Farm Admin',
        location: '',
        taskReminders: true,
        lowStockAlerts: true,
        maintenanceReminders: true
    };

    function clone(value) {
        return JSON.parse(JSON.stringify(value));
    }

    // Read a list saved by one of the pages. A missing key means "first visit", so starter data is used.
    function read(name) {
        try {
            const raw = localStorage.getItem(KEYS[name]);
            if (raw !== null) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (error) {
            console.error('Could not read ' + name, error);
        }
        return clone(FP_STARTERS[name]);
    }

    function write(name, list) {
        try {
            localStorage.setItem(KEYS[name], JSON.stringify(list));
            return true;
        } catch (error) {
            return false;
        }
    }

    function settings() {
        try {
            const raw = localStorage.getItem(KEYS.settings);
            if (raw) return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
        } catch (error) {}
        return Object.assign({}, DEFAULT_SETTINGS);
    }

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[ch]);
    }

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function todayISO() {
        const d = new Date();
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function fmtDate(iso) {
        if (!iso) return '';
        const d = new Date(iso + 'T12:00:00');
        if (isNaN(d)) return iso;
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }

    function money(n) {
        return '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
    }

    function moneyShort(n) {
        const v = Number(n) || 0;
        const a = Math.abs(v);
        const sign = v < 0 ? '−' : '';
        if (a >= 10000000) return sign + '₹' + (a / 10000000).toFixed(2) + 'Cr';
        if (a >= 100000) return sign + '₹' + (a / 100000).toFixed(2) + 'L';
        return sign + '₹' + Math.round(a).toLocaleString('en-IN');
    }

    // In-app alerts built from the saved data and the notification preferences
    function alerts() {
        const s = settings();
        const today = todayISO();
        const out = [];

        if (s.taskReminders) {
            read('tasks').forEach(task => {
                if (task.status === 'Completed' || !task.dueDate) return;
                if (task.dueDate < today) {
                    out.push({ level: 'high', text: 'Overdue task: ' + task.title, href: 'tasks.html' });
                } else if (task.dueDate === today) {
                    out.push({ level: 'medium', text: 'Due today: ' + task.title, href: 'tasks.html' });
                }
            });
        }

        if (s.lowStockAlerts) {
            read('inventory').forEach(item => {
                const qty = Number(item.quantity) || 0;
                const min = Number(item.minimum) || 0;
                if (qty === 0) {
                    out.push({ level: 'high', text: 'Out of stock: ' + item.name, href: 'inventory.html' });
                } else if (qty <= min) {
                    out.push({
                        level: 'medium',
                        text: 'Low stock: ' + item.name + ' (' + qty + ' ' + (item.unit || '') + ' left, minimum ' + min + ')',
                        href: 'inventory.html'
                    });
                }
            });
        }

        if (s.maintenanceReminders) {
            const soon = new Date();
            soon.setDate(soon.getDate() + 7);
            const soonISO = soon.getFullYear() + '-' + pad(soon.getMonth() + 1) + '-' + pad(soon.getDate());
            read('machinery').forEach(item => {
                if (item.condition && item.condition !== 'Good') {
                    out.push({ level: 'high', text: item.name + ': ' + item.condition, href: 'machinery.html' });
                } else if (item.nextService && item.nextService <= soonISO) {
                    out.push({
                        level: 'medium',
                        text: item.name + ': service ' + (item.nextService < today ? 'overdue since ' : 'due ') + fmtDate(item.nextService),
                        href: 'machinery.html'
                    });
                }
            });
        }
        return out;
    }

    // Show the saved farm name and owner name in the sidebar on every page
    function applyProfile() {
        const s = settings();
        const farm = String(s.farmName || '').trim() || DEFAULT_SETTINGS.farmName;
        const owner = String(s.ownerName || '').trim() || DEFAULT_SETTINGS.ownerName;
        document.querySelectorAll('.farm-switcher strong').forEach(el => { el.textContent = farm; });
        document.querySelectorAll('.farm-avatar').forEach(el => { el.textContent = farm.charAt(0).toUpperCase(); });
        document.querySelectorAll('.profile-row strong').forEach(el => { el.textContent = owner; });
        document.querySelectorAll('.profile-avatar, .top-avatar').forEach(el => { el.textContent = owner.charAt(0).toUpperCase(); });
    }

    // Backup, restore and "start empty" tools (Settings page)
    function note(message) {
        const toast = document.getElementById('toast');
        if (!toast) return alert(message);
        toast.textContent = message;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    }

    function setupDataTools() {
        const backup = document.getElementById('backupData');
        const restoreInput = document.getElementById('restoreFile');
        const fresh = document.getElementById('startFresh');

        const logout = document.getElementById('logoutBtn');
        const del = document.getElementById('deleteAccountBtn');
        const info = document.getElementById('accountInfo');
        const u = window.__FP_USER__;
        if (info && u) info.textContent = 'Signed in as ' + (u.email || u.phone || u.name) + '.';
        const post = (url, method) => fetch(url, { method: method, headers: { 'X-Requested-With': 'fp' } });
        if (logout) {
            logout.addEventListener('click', () => {
                window.FPSync.clearLocal();
                post('/auth/logout', 'POST').finally(() => { window.location.href = '/login'; });
            });
        }
        if (del) {
            del.addEventListener('click', () => {
                if (!confirm('Delete your account and all your farm data permanently? This cannot be undone.')) return;
                post('/api/account', 'DELETE').then(res => {
                    if (!res.ok) return note('Could not delete the account. Please try again.');
                    window.FPSync.clearLocal();
                    window.location.href = '/login';
                });
            });
        }

        if (backup) {
            backup.addEventListener('click', () => {
                const data = {};
                Object.keys(KEYS).forEach(name => {
                    const raw = localStorage.getItem(KEYS[name]);
                    data[name] = raw !== null ? JSON.parse(raw) : (name === 'settings' ? settings() : FP_STARTERS[name]);
                });
                const file = { app: 'FieldPilot AI', version: 1, savedOn: new Date().toISOString(), data: data };
                const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = 'fieldpilot-backup-' + todayISO() + '.json';
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                note('Backup downloaded.');
            });
        }

        if (restoreInput) {
            restoreInput.addEventListener('change', () => {
                const file = restoreInput.files && restoreInput.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    try {
                        const parsed = JSON.parse(String(reader.result));
                        if (!parsed || parsed.app !== 'FieldPilot AI' || typeof parsed.data !== 'object') {
                            throw new Error('Not a FieldPilot backup');
                        }
                        if (!confirm('Restore this backup? It replaces the data currently saved in this browser.')) return;
                        Object.keys(KEYS).forEach(name => {
                            const value = parsed.data[name];
                            const ok = name === 'settings' ? value && typeof value === 'object' && !Array.isArray(value) : Array.isArray(value);
                            if (ok) localStorage.setItem(KEYS[name], JSON.stringify(value));
                        });
                        note('Backup restored. Reloading...');
                        setTimeout(() => location.reload(), 900);
                    } catch (error) {
                        note('This file is not a valid FieldPilot backup.');
                    }
                    restoreInput.value = '';
                };
                reader.readAsText(file);
            });
        }

        if (fresh) {
            fresh.addEventListener('click', () => {
                if (!confirm('Remove the sample crops, tasks, workers, stock, machines and transactions and start with an empty farm? Download a backup first if you want to keep anything.')) return;
                ['crops', 'finance', 'tasks', 'inventory', 'labour', 'machinery'].forEach(name => write(name, []));
                note('Your farm is now empty. Add your own records.');
            });
        }
    }

    window.FP = {
        KEYS, read, write, settings, alerts, esc, todayISO, fmtDate, money, moneyShort, starters: FP_STARTERS
    };

    document.addEventListener('DOMContentLoaded', () => {
        applyProfile();
        setupDataTools();
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
})();
