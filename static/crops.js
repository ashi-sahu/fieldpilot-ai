(() => {
    const starterCrops = [{
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
    }];

    const STORAGE_KEY = 'fieldpilot_crops_v1';
    const body = document.getElementById('cropTableBody');
    const formPanel = document.getElementById('formPanel');
    const form = document.getElementById('cropForm');
    const search = document.getElementById('searchCrop');
    const filter = document.getElementById('statusFilter');
    const toast = document.getElementById('toast');
    let toastTimer;

    let crops;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        crops = saved ? JSON.parse(saved) : starterCrops;
        if (!Array.isArray(crops)) crops = starterCrops;
    } catch {
        crops = starterCrops;
    }

    function notify(message) {
        toast.textContent = message;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('show'), 2500);
    }

    function saveCrops() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(crops));
        } catch {
            notify('Could not save data in this browser.');
        }
    }

    function updateStats() {
        document.getElementById('totalArea').textContent =
            crops.reduce((sum, crop) => sum + Number(crop.area || 0), 0)
            .toLocaleString('en-IN');

        document.getElementById('activeCrops').textContent =
            crops.filter(crop => crop.status !== 'Planned').length;

        document.getElementById('harvestingCrops').textContent =
            crops.filter(crop => crop.status === 'Harvesting').length;
    }

    function displayDate(date) {
        if (!date) return '—';
        const parsed = new Date(date + 'T00:00:00');
        if (Number.isNaN(parsed.getTime())) return '—';
        return parsed.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    }

    function renderCrops() {
        const query = search.value.trim().toLowerCase();
        const selectedStatus = filter.value;

        const visibleCrops = crops.filter(crop => {
            const matchesText =
                crop.name.toLowerCase().includes(query) ||
                crop.field.toLowerCase().includes(query);
            const matchesStatus =
                selectedStatus === 'All' || crop.status === selectedStatus;
            return matchesText && matchesStatus;
        });

        body.replaceChildren();

        visibleCrops.forEach(crop => {
            const row = document.createElement('tr');

            const nameCell = document.createElement('td');
            const name = document.createElement('span');
            name.className = 'crop-name';
            name.textContent = '🌱 ' + crop.name;
            nameCell.append(name);

            const sub = document.createElement('span');
            sub.className = 'crop-sub';
            sub.textContent = 'Crop record';
            nameCell.append(sub);

            const fieldCell = document.createElement('td');
            fieldCell.textContent = crop.field;

            const areaCell = document.createElement('td');
            areaCell.textContent = Number(crop.area).toLocaleString('en-IN') + ' acres';

            const statusCell = document.createElement('td');
            const badge = document.createElement('span');
            badge.className = 'status' + (crop.status === 'Harvesting' ? ' harvesting' : crop.status === 'Planned' ? ' planned' : '');
            badge.textContent = crop.status;
            statusCell.append(badge);

            const dateCell = document.createElement('td');
            dateCell.textContent = displayDate(crop.date);

            const actionCell = document.createElement('td');
            const deleteButton = document.createElement('button');
            deleteButton.className = 'delete-btn';
            deleteButton.type = 'button';
            deleteButton.textContent = 'Delete';
            deleteButton.addEventListener('click', () => {
                if (!confirm('Delete the crop record for ' + crop.name + '?')) return;
                crops = crops.filter(item => item.id !== crop.id);
                saveCrops();
                renderCrops();
                updateStats();
                notify('Crop record deleted.');
            });
            actionCell.append(deleteButton);

            [nameCell, fieldCell, areaCell, statusCell, dateCell, actionCell]
            .forEach(cell => row.append(cell));

            body.append(row);
        });

        document.getElementById('emptyState').hidden = visibleCrops.length !== 0;
        updateStats();
    }

    document.getElementById('showForm').addEventListener('click', () => {
        formPanel.hidden = false;
        form.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
        form.elements.name.focus();
    });

    document.getElementById('cancelForm').addEventListener('click', () => {
        form.reset();
        formPanel.hidden = true;
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        const data = new FormData(form);
        const area = Number(data.get('area'));

        if (!Number.isFinite(area) || area <= 0) {
            notify('Please enter a valid area.');
            return;
        }

        crops.push({
            id: Date.now(),
            name: String(data.get('name')).trim(),
            field: String(data.get('field')).trim(),
            area,
            status: String(data.get('status')),
            date: String(data.get('date') || '')
        });

        saveCrops();
        form.reset();
        formPanel.hidden = true;
        search.value = '';
        filter.value = 'All';
        renderCrops();
        notify('New crop added successfully.');
    });

    search.addEventListener('input', renderCrops);
    filter.addEventListener('change', renderCrops);

    document.getElementById('resetSearch').addEventListener('click', () => {
        search.value = '';
        filter.value = 'All';
        renderCrops();
    });

    document.getElementById('mobileMenu').addEventListener('click', () => {
        document.getElementById('sidebar').classList.toggle('open');
    });

    document.querySelectorAll('[data-coming]').forEach(button => {
        button.addEventListener('click', () => {
            notify(button.dataset.coming + ' page will be added next.');
            document.getElementById('sidebar').classList.remove('open');
        });
    });

    const now = new Date();
    document.getElementById('todayLabel').textContent =
        now.toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
    document.getElementById('currentYear').textContent = now.getFullYear();

    if (new URLSearchParams(window.location.search).get('openForm') === '1') {
        formPanel.hidden = false;

        requestAnimationFrame(() => {
            formPanel.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            form.elements.name.focus();
        });
    }



    renderCrops();

    const cropParams = new URLSearchParams(window.location.search);

    if (cropParams.get('openForm') === '1') {
        formPanel.hidden = false;

        requestAnimationFrame(() => {
            formPanel.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });

            form.elements.name.focus();
        });
    }

})();