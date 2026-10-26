// FieldPilot AI - Labour Management

(() => {
    const STORAGE_KEY = 'fieldpilot_labour_v1';

    // Sample workers shown on the first visit
    const starterWorkers = [{
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
    ];

    // Find page elements
    const tableBody = document.getElementById('labourTableBody');
    const formPanel = document.getElementById('labourFormPanel');
    const form = document.getElementById('labourForm');
    const search = document.getElementById('searchLabour');
    const roleFilter = document.getElementById('roleFilter');
    const statusFilter = document.getElementById('workerStatusFilter');
    const toast = document.getElementById('toast');

    let workers;
    let toastTimer;

    // Load saved worker records
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        workers = saved ? JSON.parse(saved) : starterWorkers;

        if (!Array.isArray(workers)) {
            workers = starterWorkers;
        }

        // Keep attendance available on older saved records
        workers.forEach(worker => {
            if (!worker.attendance ||
                typeof worker.attendance !== 'object' ||
                Array.isArray(worker.attendance)
            ) {
                worker.attendance = {};
            }
        });
    } catch {
        workers = starterWorkers;
    }

    // Return today's local date as YYYY-MM-DD
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

    // Display notification
    function notify(message) {
        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Save workers and their attendance
    function saveWorkers() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(workers)
            );

            return true;
        } catch {
            notify('Could not save worker data in this browser.');
            return false;
        }
    }

    // Format money in Indian Rupees
    function money(value) {
        return '₹' + Number(value).toLocaleString('en-IN', {
            maximumFractionDigits: 2
        });
    }

    // Display a date
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

    // Get a worker's attendance for today
    function getTodayAttendance(worker) {
        return worker.attendance[todayISO()] || 'Unmarked';
    }

    // Update summary cards
    function updateStats() {
        const activeWorkers = workers.filter(
            worker => worker.status === 'Active'
        );

        const presentToday = workers.filter(
            worker =>
            worker.status === 'Active' &&
            getTodayAttendance(worker) === 'Present'
        ).length;

        const totalDailyWages = activeWorkers.reduce(
            (sum, worker) => sum + Number(worker.wage || 0),
            0
        );

        document.getElementById('totalWorkers').textContent =
            workers.length;

        document.getElementById('activeWorkers').textContent =
            activeWorkers.length;

        document.getElementById('presentWorkers').textContent =
            presentToday;

        document.getElementById('dailyWageTotal').textContent =
            money(totalDailyWages);

        document.getElementById('labourRecordCount').textContent =
            workers.length +
            (workers.length === 1 ? ' worker' : ' workers');
    }

    // Create a safe text cell
    function createCell(value) {
        const cell = document.createElement('td');
        cell.textContent = value;
        return cell;
    }

    // Change attendance for today
    function markAttendance(worker, status) {
        if (worker.status !== 'Active') {
            notify('Change the worker status to Active first.');
            return;
        }

        const day = todayISO();
        const previousValue = worker.attendance[day];

        worker.attendance[day] = status;

        if (!saveWorkers()) {
            if (previousValue === undefined) {
                delete worker.attendance[day];
            } else {
                worker.attendance[day] = previousValue;
            }
            return;
        }

        renderAll();

        notify(
            worker.name + ' marked ' +
            status.toLowerCase() + ' for today.'
        );
    }

    // Draw worker table
    function renderLabour() {
        const query = search.value.trim().toLowerCase();
        const selectedRole = roleFilter.value;
        const selectedStatus = statusFilter.value;

        const visibleWorkers = workers
            .filter(worker => {
                const searchableValues = [
                    worker.name,
                    worker.role,
                    worker.phone,
                    worker.notes
                ];

                const matchesSearch = searchableValues.some(value =>
                    String(value || '').toLowerCase().includes(query)
                );

                const matchesRole =
                    selectedRole === 'All' ||
                    worker.role === selectedRole;

                const matchesStatus =
                    selectedStatus === 'All' ||
                    worker.status === selectedStatus;

                return matchesSearch && matchesRole && matchesStatus;
            })
            .sort((a, b) => a.name.localeCompare(b.name));

        tableBody.replaceChildren();

        visibleWorkers.forEach(worker => {
            const row = document.createElement('tr');

            // Worker name, phone, joining date and notes
            const workerCell = document.createElement('td');

            const name = document.createElement('span');
            name.className = 'labour-worker-name';
            name.textContent = worker.name;

            const details = document.createElement('span');
            details.className = 'labour-worker-sub';

            const detailsText = [];

            if (worker.phone) {
                detailsText.push('Phone: ' + worker.phone);
            }

            if (worker.joiningDate) {
                detailsText.push(
                    'Joined: ' + prettyDate(worker.joiningDate)
                );
            }

            if (worker.notes) {
                detailsText.push(worker.notes);
            }

            details.textContent =
                detailsText.join(' · ') || 'No extra details';

            workerCell.append(name, details);

            // Role
            const roleCell = createCell(worker.role);

            // Daily wage
            const wageCell = createCell(money(worker.wage) + '/day');

            // Worker status badge
            const statusCell = document.createElement('td');
            const statusBadge = document.createElement('span');

            statusBadge.className =
                'labour-status' +
                (worker.status === 'On Leave' ? ' leave' : '');

            statusBadge.textContent = worker.status;
            statusCell.append(statusBadge);

            // Attendance for today
            const attendanceCell = document.createElement('td');
            const attendance = getTodayAttendance(worker);

            const attendanceBadge = document.createElement('span');
            attendanceBadge.className = 'labour-attendance';

            if (worker.status === 'On Leave') {
                attendanceBadge.classList.add('unmarked');
                attendanceBadge.textContent = 'On Leave';
            } else {
                if (attendance === 'Absent') {
                    attendanceBadge.classList.add('absent');
                } else if (attendance === 'Unmarked') {
                    attendanceBadge.classList.add('unmarked');
                }

                attendanceBadge.textContent = attendance;
            }

            attendanceCell.append(attendanceBadge);

            // Action buttons
            const actionCell = document.createElement('td');
            const actions = document.createElement('div');

            actions.className = 'labour-row-actions';

            // Attendance buttons only for active workers
            if (worker.status === 'Active') {
                const presentButton = document.createElement('button');

                presentButton.type = 'button';
                presentButton.className = 'labour-action';
                presentButton.textContent = 'Present';

                presentButton.addEventListener('click', () => {
                    markAttendance(worker, 'Present');
                });

                const absentButton = document.createElement('button');

                absentButton.type = 'button';
                absentButton.className = 'labour-action';
                absentButton.textContent = 'Absent';

                absentButton.addEventListener('click', () => {
                    markAttendance(worker, 'Absent');
                });

                actions.append(presentButton, absentButton);
            }

            // Toggle Active / On Leave
            const statusButton = document.createElement('button');

            statusButton.type = 'button';
            statusButton.className = 'labour-action';
            statusButton.textContent =
                worker.status === 'Active' ? 'Set Leave' : 'Set Active';

            statusButton.addEventListener('click', () => {
                const previousStatus = worker.status;

                worker.status =
                    worker.status === 'Active' ? 'On Leave' : 'Active';

                if (!saveWorkers()) {
                    worker.status = previousStatus;
                    return;
                }

                renderAll();

                notify(
                    worker.name + ' status updated to ' + worker.status + '.'
                );
            });

            // Delete worker
            const deleteButton = document.createElement('button');

            deleteButton.type = 'button';
            deleteButton.className = 'labour-delete';
            deleteButton.textContent = 'Delete';

            deleteButton.addEventListener('click', () => {
                if (!confirm('Delete the record for ' + worker.name + '?')) {
                    return;
                }

                const previousWorkers = workers;

                workers = workers.filter(
                    item => item.id !== worker.id
                );

                if (!saveWorkers()) {
                    workers = previousWorkers;
                    return;
                }

                renderAll();
                notify('Worker record deleted.');
            });

            actions.append(statusButton, deleteButton);
            actionCell.append(actions);

            [
                workerCell,
                roleCell,
                wageCell,
                statusCell,
                attendanceCell,
                actionCell
            ].forEach(cell => row.append(cell));

            tableBody.append(row);
        });

        document.getElementById('labourEmpty').hidden =
            visibleWorkers.length > 0;
    }

    // Refresh all sections
    function renderAll() {
        updateStats();
        renderLabour();
    }

    // Open Add Worker form
    document.getElementById('openLabourForm')
        .addEventListener('click', () => {
            formPanel.hidden = false;

            form.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            form.elements.name.focus();
        });

    // Cancel adding a worker
    document.getElementById('cancelLabourForm')
        .addEventListener('click', () => {
            form.reset();
            formPanel.hidden = true;
        });

    // Add worker record
    form.addEventListener('submit', event => {
        event.preventDefault();

        const data = new FormData(form);

        const name = String(data.get('name') || '').trim();
        const wage = Number(data.get('wage'));
        const joiningDate = String(data.get('joiningDate') || '');

        if (!name) {
            notify('Please enter the worker name.');
            return;
        }

        if (!Number.isFinite(wage) || wage < 0) {
            notify('Please enter a valid daily wage.');
            return;
        }

        if (joiningDate) {
            const parsed = new Date(joiningDate + 'T00:00:00');

            if (
                Number.isNaN(parsed.getTime()) ||
                parsed.toISOString().slice(0, 10) !== joiningDate
            ) {
                notify('Please enter a valid joining date.');
                return;
            }
        }

        const newWorker = {
            id: Date.now(),
            name,
            role: String(data.get('role')),
            wage,
            status: String(data.get('status')),
            phone: String(data.get('phone') || '').trim(),
            joiningDate,
            notes: String(data.get('notes') || '').trim(),
            attendance: {}
        };

        workers.push(newWorker);

        if (!saveWorkers()) {
            workers.pop();
            return;
        }

        form.reset();
        formPanel.hidden = true;

        search.value = '';
        roleFilter.value = 'All';
        statusFilter.value = 'All';

        renderAll();
        notify('Worker added successfully.');
    });

    // Search and filters
    search.addEventListener('input', renderLabour);
    roleFilter.addEventListener('change', renderLabour);
    statusFilter.addEventListener('change', renderLabour);

    // Reset all filters
    document.getElementById('resetLabourFilters')
        .addEventListener('click', () => {
            search.value = '';
            roleFilter.value = 'All';
            statusFilter.value = 'All';

            renderLabour();
        });

    // Export worker and today's attendance records
    document.getElementById('exportLabour')
        .addEventListener('click', () => {
            const rows = [
                [
                    'Name',
                    'Role',
                    'Daily Wage',
                    'Status',
                    'Phone',
                    'Joining Date',
                    "Today's Attendance",
                    'Notes'
                ],
                ...workers.map(worker => [
                    worker.name,
                    worker.role,
                    worker.wage,
                    worker.status,
                    worker.phone || '',
                    worker.joiningDate || '',
                    worker.status === 'On Leave' ?
                    'On Leave' :
                    getTodayAttendance(worker),
                    worker.notes || ''
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
            link.download = 'fieldpilot-labour.csv';

            document.body.append(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);
            notify('Labour report exported.');
        });

    // Mobile sidebar
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