// FieldPilot AI - Tasks & Reminders

(() => {
    const STORAGE_KEY = 'fieldpilot_tasks_v1';

    // Generate a date relative to today
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

    // Sample tasks for the first visit
    const starterTasks = [{
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
    ];

    // Get the page elements
    const tableBody = document.getElementById('tasksTableBody');
    const formPanel = document.getElementById('taskFormPanel');
    const form = document.getElementById('taskForm');
    const search = document.getElementById('searchTasks');
    const categoryFilter = document.getElementById('taskCategoryFilter');
    const statusFilter = document.getElementById('taskStatusFilter');
    const toast = document.getElementById('toast');

    let tasks;
    let toastTimer;

    // Load saved tasks from the browser
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        tasks = saved ? JSON.parse(saved) : starterTasks;

        if (!Array.isArray(tasks)) {
            tasks = starterTasks;
        }

        // Ensure old saved records have a status
        tasks.forEach(task => {
            if (
                task.status !== 'Completed' &&
                task.status !== 'Pending'
            ) {
                task.status = 'Pending';
            }
        });
    } catch {
        tasks = starterTasks;
    }

    // Show notification
    function notify(message) {
        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Save tasks to localStorage
    function saveTasks() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(tasks)
            );

            return true;
        } catch {
            notify('Could not save tasks in this browser.');
            return false;
        }
    }

    // Display a readable date
    function prettyDate(value) {
        if (!value) return '—';

        const date = new Date(value + 'T12:00:00');

        if (Number.isNaN(date.getTime())) {
            return '—';
        }

        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    // Determine whether a task is overdue
    function isOverdue(task) {
        return (
            task.status !== 'Completed' &&
            Boolean(task.dueDate) &&
            task.dueDate < dateOffsetISO(0)
        );
    }

    // Return a safe display status
    function displayStatus(task) {
        if (task.status === 'Completed') {
            return 'Completed';
        }

        if (isOverdue(task)) {
            return 'Overdue';
        }

        return 'Pending';
    }

    // Update summary cards
    function updateStats() {
        const pending = tasks.filter(
            task => task.status !== 'Completed'
        );

        document.getElementById('totalTasks').textContent =
            tasks.length;

        document.getElementById('pendingTasks').textContent =
            pending.length;

        document.getElementById('overdueTasks').textContent =
            pending.filter(isOverdue).length;

        document.getElementById('completedTasks').textContent =
            tasks.filter(task => task.status === 'Completed').length;

        document.getElementById('taskRecordCount').textContent =
            tasks.length +
            (tasks.length === 1 ? ' task' : ' tasks');
    }

    // Create a text cell safely
    function createCell(value) {
        const cell = document.createElement('td');
        cell.textContent = value;
        return cell;
    }

    // Draw the task table
    function renderTasks() {
        const query = search.value.trim().toLowerCase();
        const selectedCategory = categoryFilter.value;
        const selectedStatus = statusFilter.value;

        const visibleTasks = tasks
            .filter(task => {
                const searchableValues = [
                    task.title,
                    task.category,
                    task.location,
                    task.assignedTo,
                    task.notes
                ];

                const matchesSearch = searchableValues.some(value =>
                    String(value || '').toLowerCase().includes(query)
                );

                const matchesCategory =
                    selectedCategory === 'All' ||
                    task.category === selectedCategory;

                const matchesStatus =
                    selectedStatus === 'All' ||
                    (selectedStatus === 'Pending' &&
                        task.status !== 'Completed') ||
                    (selectedStatus === 'Completed' &&
                        task.status === 'Completed');

                return (
                    matchesSearch &&
                    matchesCategory &&
                    matchesStatus
                );
            })
            .sort((a, b) => {
                // Pending tasks first, then sort by due date
                if (a.status !== b.status) {
                    return a.status === 'Completed' ? 1 : -1;
                }

                return String(a.dueDate || '')
                    .localeCompare(String(b.dueDate || ''));
            });

        tableBody.replaceChildren();

        visibleTasks.forEach(task => {
            const row = document.createElement('tr');

            // Task title, location, assignee and notes
            const titleCell = document.createElement('td');

            const title = document.createElement('span');
            title.className = 'task-title';
            title.textContent = task.title;

            const details = [];

            if (task.location) {
                details.push(task.location);
            }

            if (task.assignedTo) {
                details.push('Assigned: ' + task.assignedTo);
            }

            if (task.notes) {
                details.push(task.notes);
            }

            const sub = document.createElement('span');
            sub.className = 'task-sub';
            sub.textContent = details.join(' · ') || 'No extra details';

            titleCell.append(title, sub);

            // Category
            const categoryCell = createCell(task.category);

            // Due date
            const dueDateCell = createCell(prettyDate(task.dueDate));

            if (isOverdue(task)) {
                dueDateCell.style.color = '#b44f42';
                dueDateCell.style.fontWeight = '700';
            }

            // Priority badge
            const priorityCell = document.createElement('td');
            const priorityBadge = document.createElement('span');

            priorityBadge.className =
                'task-priority ' +
                String(task.priority || 'Medium').toLowerCase();

            priorityBadge.textContent = task.priority || 'Medium';
            priorityCell.append(priorityBadge);

            // Status badge
            const statusCell = document.createElement('td');
            const statusBadge = document.createElement('span');
            const status = displayStatus(task);

            statusBadge.className =
                'task-status ' + status.toLowerCase();

            statusBadge.textContent = status;
            statusCell.append(statusBadge);

            // Action buttons
            const actionCell = document.createElement('td');
            const actions = document.createElement('div');

            actions.className = 'task-row-actions';

            // Mark complete or reopen task
            const toggleButton = document.createElement('button');

            toggleButton.type = 'button';
            toggleButton.className = 'task-action';

            toggleButton.textContent =
                task.status === 'Completed' ? 'Reopen' : 'Complete';

            toggleButton.addEventListener('click', () => {
                const previousStatus = task.status;

                task.status =
                    task.status === 'Completed' ?
                    'Pending' :
                    'Completed';

                if (!saveTasks()) {
                    task.status = previousStatus;
                    return;
                }

                renderAll();

                notify(
                    task.status === 'Completed' ?
                    'Task marked complete.' :
                    'Task reopened.'
                );
            });

            // Delete task
            const deleteButton = document.createElement('button');

            deleteButton.type = 'button';
            deleteButton.className = 'task-delete';
            deleteButton.textContent = 'Delete';

            deleteButton.addEventListener('click', () => {
                if (!confirm('Delete task: ' + task.title + '?')) {
                    return;
                }

                const previousTasks = tasks;

                tasks = tasks.filter(item => item.id !== task.id);

                if (!saveTasks()) {
                    tasks = previousTasks;
                    return;
                }

                renderAll();
                notify('Task deleted.');
            });

            actions.append(toggleButton, deleteButton);
            actionCell.append(actions);

            [
                titleCell,
                categoryCell,
                dueDateCell,
                priorityCell,
                statusCell,
                actionCell
            ].forEach(cell => row.append(cell));

            tableBody.append(row);
        });

        document.getElementById('tasksEmpty').hidden =
            visibleTasks.length > 0;
    }

    // Refresh all task sections
    function renderAll() {
        updateStats();
        renderTasks();
    }

    // Open the Add Task form
    document.getElementById('openTaskForm')
        .addEventListener('click', () => {
            formPanel.hidden = false;

            if (!form.elements.dueDate.value) {
                form.elements.dueDate.value = dateOffsetISO(0);
            }

            form.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            form.elements.title.focus();
        });

    // Close the form
    document.getElementById('cancelTaskForm')
        .addEventListener('click', () => {
            form.reset();
            formPanel.hidden = true;
        });

    // Add a new task
    form.addEventListener('submit', event => {
        event.preventDefault();

        const data = new FormData(form);

        const title = String(data.get('title') || '').trim();
        const dueDate = String(data.get('dueDate') || '');

        if (!title || !dueDate) {
            notify('Please enter a task title and due date.');
            return;
        }

        // Validate date format and date value
        const parsedDate = new Date(dueDate + 'T12:00:00');

        if (
            Number.isNaN(parsedDate.getTime()) ||
            parsedDate.getFullYear() + '-' +
            String(parsedDate.getMonth() + 1).padStart(2, '0') + '-' +
            String(parsedDate.getDate()).padStart(2, '0') !== dueDate
        ) {
            notify('Please enter a valid due date.');
            return;
        }

        const newTask = {
            id: Date.now(),
            title,
            category: String(data.get('category')),
            dueDate,
            priority: String(data.get('priority')),
            location: String(data.get('location') || '').trim(),
            assignedTo: String(data.get('assignedTo') || '').trim(),
            notes: String(data.get('notes') || '').trim(),
            status: 'Pending'
        };

        tasks.push(newTask);

        if (!saveTasks()) {
            tasks.pop();
            return;
        }

        form.reset();
        formPanel.hidden = true;

        search.value = '';
        categoryFilter.value = 'All';
        statusFilter.value = 'All';

        renderAll();
        notify('Task added successfully.');
    });

    // Search and filters
    search.addEventListener('input', renderTasks);
    categoryFilter.addEventListener('change', renderTasks);
    statusFilter.addEventListener('change', renderTasks);

    // Reset filters
    document.getElementById('resetTaskFilters')
        .addEventListener('click', () => {
            search.value = '';
            categoryFilter.value = 'All';
            statusFilter.value = 'All';

            renderTasks();
        });

    // Export tasks to CSV
    document.getElementById('exportTasks')
        .addEventListener('click', () => {
            const rows = [
                [
                    'Task',
                    'Category',
                    'Due Date',
                    'Priority',
                    'Status',
                    'Location',
                    'Assigned To',
                    'Notes'
                ],
                ...tasks.map(task => [
                    task.title,
                    task.category,
                    task.dueDate,
                    task.priority,
                    displayStatus(task),
                    task.location || '',
                    task.assignedTo || '',
                    task.notes || ''
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
            link.download = 'fieldpilot-tasks.csv';

            document.body.append(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(url);
            notify('Task report exported.');
        });

    // Mobile sidebar toggle
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
    // Open task form when redirected from Dashboard
    const taskParams = new URLSearchParams(window.location.search);

    if (taskParams.get('openForm') === '1') {
        formPanel.hidden = false;

        requestAnimationFrame(() => {
            formPanel.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            form.elements.title.focus();
        });
    }

})();