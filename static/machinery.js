// FieldPilot AI - Machinery Page JavaScript

(() => {
    const STORAGE_KEY = 'fieldpilot_machinery_v1';

    // Sample equipment shown on first visit
    const starterEquipment = [{
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
    ];

    // Get HTML elements
    const tableBody = document.getElementById('machineryTableBody');
    const formPanel = document.getElementById('machineryFormPanel');
    const form = document.getElementById('machineryForm');
    const search = document.getElementById('searchMachinery');
    const typeFilter = document.getElementById('typeFilter');
    const conditionFilter = document.getElementById('conditionFilter');
    const toast = document.getElementById('toast');

    let equipment;
    let toastTimer;

    // Load saved equipment
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        equipment = saved ? JSON.parse(saved) : starterEquipment;

        if (!Array.isArray(equipment)) {
            equipment = starterEquipment;
        }
    } catch {
        equipment = starterEquipment;
    }

    // Show a notification message
    function notify(message) {
        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Save equipment records
    function saveEquipment() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(equipment)
            );
            return true;
        } catch {
            notify('Could not save equipment in this browser.');
            return false;
        }
    }

    // Return today's date in YYYY-MM-DD format
    function todayISO() {
        const now = new Date();

        return (
            now.getFullYear() +
            '-' +
            String(now.getMonth() + 1).padStart(2, '0') +
            '-' +
            String(now.getDate()).padStart(2, '0')
        );
    }

    // Format a saved date
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

    // Format condition labels
    function conditionClass(condition) {
        if (condition === 'Needs Service') {
            return 'service';
        }

        if (condition === 'Under Repair') {
            return 'repair';
        }

        return '';
    }

    // Update equipment summary cards
    function updateStats() {
        document.getElementById('totalEquipment').textContent =
            equipment.length;

        document.getElementById('goodEquipment').textContent =
            equipment.filter(item => item.condition === 'Good').length;

        document.getElementById('serviceEquipment').textContent =
            equipment.filter(item =>
                item.condition === 'Needs Service'
            ).length;

        document.getElementById('repairEquipment').textContent =
            equipment.filter(item =>
                item.condition === 'Under Repair'
            ).length;

        document.getElementById('machineryRecordCount').textContent =
            equipment.length +
            (equipment.length === 1 ? ' item' : ' items');
    }

    // Create a table cell using textContent
    function createCell(value) {
        const cell = document.createElement('td');
        cell.textContent = value;
        return cell;
    }

    // Draw the equipment table
    function renderMachinery() {
        const query = search.value.trim().toLowerCase();
        const selectedType = typeFilter.value;
        const selectedCondition = conditionFilter.value;

        const visibleEquipment = equipment
            .filter(item => {
                const searchableValues = [
                    item.name,
                    item.type,
                    item.location,
                    item.notes
                ];

                const matchesSearch = searchableValues.some(value =>
                    String(value || '').toLowerCase().includes(query)
                );

                const matchesType =
                    selectedType === 'All' ||
                    item.type === selectedType;

                const matchesCondition =
                    selectedCondition === 'All' ||
                    item.condition === selectedCondition;

                return matchesSearch && matchesType && matchesCondition;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        tableBody.replaceChildren();

        visibleEquipment.forEach(item => {
            const row = document.createElement('tr');

            // Equipment name and notes
            const nameCell = document.createElement('td');

            const name = document.createElement('span');
            name.className = 'machinery-name';
            name.textContent = item.name;

            const note = document.createElement('span');
            note.className = 'machinery-sub';

            const details = [];

            if (item.purchaseDate) {
                details.push(
                    'Purchased: ' + prettyDate(item.purchaseDate)
                );
            }

            if (item.notes) {
                details.push(item.notes);
            }

            note.textContent = details.join(' · ') || 'No extra details';

            nameCell.append(name, note);

            // Equipment type
            const typeCell = createCell(item.type);

            // Condition badge
            const conditionCell = document.createElement('td');
            const badge = document.createElement('span');

            badge.className =
                'machinery-condition ' +
                conditionClass(item.condition);

            badge.textContent = item.condition;
            conditionCell.append(badge);

            // Service dates
            const lastServiceCell = createCell(
                prettyDate(item.lastService)
            );

            const nextServiceCell = createCell(
                prettyDate(item.nextService)
            );

            // Location
            const locationCell = createCell(
                item.location || '—'
            );

            // Action buttons
            const actionCell = document.createElement('td');
            const actions = document.createElement('div');

            actions.className = 'machinery-row-actions';

            // Mark equipment as serviced
            const serviceButton = document.createElement('button');

            serviceButton.type = 'button';
            serviceButton.className = 'machinery-action';
            serviceButton.textContent = 'Mark Serviced';

            serviceButton.addEventListener('click', () => {
                const nextDateAnswer = prompt(
                    'Enter the next service due date for ' +
                    item.name +
                    ' in YYYY-MM-DD format.\n' +
                    'Leave blank if not scheduled yet.'
                );

                if (nextDateAnswer === null) {
                    return;
                }

                const nextDate = nextDateAnswer.trim();

                if (
                    nextDate &&
                    !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)
                ) {
                    notify('Use the date format YYYY-MM-DD.');
                    return;
                }

                if (nextDate) {
                    const parsed = new Date(nextDate + 'T00:00:00');

                    if (
                        Number.isNaN(parsed.getTime()) ||
                        parsed.toISOString().slice(0, 10) !== nextDate
                    ) {
                        notify('Please enter a valid service date.');
                        return;
                    }
                }

                const previousItem = {...item };

                item.lastService = todayISO();
                item.nextService = nextDate;
                item.condition = 'Good';

                if (!saveEquipment()) {
                    Object.assign(item, previousItem);
                    return;
                }

                renderAll();
                notify('Service record updated.');
            });

            // Delete equipment
            const deleteButton = document.createElement('button');

            deleteButton.type = 'button';
            deleteButton.className = 'machinery-delete';
            deleteButton.textContent = 'Delete';

            deleteButton.addEventListener('click', () => {
                if (!confirm(
                        'Delete the equipment record for ' +
                        item.name + '?'
                    )) {
                    return;
                }

                const previousEquipment = equipment;

                equipment = equipment.filter(
                    current => current.id !== item.id
                );

                if (!saveEquipment()) {
                    equipment = previousEquipment;
                    return;
                }

                renderAll();
                notify('Equipment record deleted.');
            });

            actions.append(serviceButton, deleteButton);
            actionCell.append(actions);

            [
                nameCell,
                typeCell,
                conditionCell,
                lastServiceCell,
                nextServiceCell,
                locationCell,
                actionCell
            ].forEach(cell => row.append(cell));

            tableBody.append(row);
        });

        document.getElementById('machineryEmpty').hidden =
            visibleEquipment.length !== 0;
    }

    // Refresh summary and table
    function renderAll() {
        updateStats();
        renderMachinery();
    }

    // Open the equipment form
    document.getElementById('openMachineryForm')
        .addEventListener('click', () => {
            formPanel.hidden = false;

            form.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            form.elements.name.focus();
        });

    // Cancel form
    document.getElementById('cancelMachineryForm')
        .addEventListener('click', () => {
            form.reset();
            formPanel.hidden = true;
        });

    // Add new equipment
    form.addEventListener('submit', event => {
        event.preventDefault();

        const data = new FormData(form);

        const name = String(data.get('name') || '').trim();
        const purchaseDate = String(data.get('purchaseDate') || '');
        const lastService = String(data.get('lastService') || '');
        const nextService = String(data.get('nextService') || '');

        if (!name) {
            notify('Please enter the equipment name.');
            return;
        }

        const dates = [purchaseDate, lastService, nextService];

        for (const value of dates) {
            if (!value) continue;

            const parsed = new Date(value + 'T00:00:00');

            if (
                Number.isNaN(parsed.getTime()) ||
                parsed.toISOString().slice(0, 10) !== value
            ) {
                notify('Please check the dates entered.');
                return;
            }
        }

        const newEquipment = {
            id: Date.now(),
            name,
            type: String(data.get('type')),
            condition: String(data.get('condition')),
            purchaseDate,
            lastService,
            nextService,
            location: String(data.get('location') || '').trim(),
            notes: String(data.get('notes') || '').trim()
        };

        equipment.push(newEquipment);

        if (!saveEquipment()) {
            equipment.pop();
            return;
        }

        form.reset();
        formPanel.hidden = true;

        search.value = '';
        typeFilter.value = 'All';
        conditionFilter.value = 'All';

        renderAll();
        notify('Equipment added successfully.');
    });

    // Search and filters
    search.addEventListener('input', renderMachinery);
    typeFilter.addEventListener('change', renderMachinery);
    conditionFilter.addEventListener('change', renderMachinery);

    // Reset filters
    document.getElementById('resetMachineryFilters')
        .addEventListener('click', () => {
            search.value = '';
            typeFilter.value = 'All';
            conditionFilter.value = 'All';

            renderMachinery();
        });

    // Export equipment records as CSV
    document.getElementById('exportMachinery')
        .addEventListener('click', () => {
            const rows = [
                [
                    'Equipment',
                    'Type',
                    'Condition',
                    'Purchase Date',
                    'Last Service',
                    'Next Service',
                    'Location',
                    'Notes'
                ],
                ...equipment.map(item => [
                    item.name,
                    item.type,
                    item.condition,
                    item.purchaseDate,
                    item.lastService,
                    item.nextService,
                    item.location || '',
                    item.notes || ''
                ])
            ];

            const csv = rows.map(row =>
                row.map(value =>
                    '"' + String(value ?? '').replace(/"/g, '""') + '"'
                ).join(',')
            ).join('\r\n');

            const blob = new Blob(
                ['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }
            );

            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');

            link.href = url;
            link.download = 'fieldpilot-machinery.csv';

            document.body.append(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);
            notify('Machinery report exported.');
        });

    // Mobile sidebar button
    document.getElementById('mobileMenu')
        .addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('open');
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

    // Initial render
    renderAll();

})();