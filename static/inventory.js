// FieldPilot AI - Inventory Page JavaScript

(() => {
    'use strict';

    console.log('FieldPilot inventory.js loaded successfully');

    const STORAGE_KEY = 'fieldpilot_inventory_v1';

    // Sample inventory shown on the first visit
    const starterItems = [{
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
    ];

    // Get page elements
    const tableBody = document.getElementById('inventoryTableBody');
    const formPanel = document.getElementById('inventoryFormPanel');
    const form = document.getElementById('inventoryForm');
    const openFormButton = document.getElementById('openInventoryForm');
    const cancelFormButton = document.getElementById('cancelInventoryForm');
    const exportButton = document.getElementById('exportInventory');
    const search = document.getElementById('searchInventory');
    const categoryFilter = document.getElementById('categoryFilter');
    const stockFilter = document.getElementById('stockFilter');
    const resetFiltersButton = document.getElementById('resetInventoryFilters');
    const toast = document.getElementById('toast');
    const sidebar = document.getElementById('sidebar');

    let items = [];
    let toastTimer;

    // Load saved inventory or starter records
    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (saved === null) {
            items = starterItems.map(item => ({...item }));
        } else {
            const parsed = JSON.parse(saved);

            items = Array.isArray(parsed) ?
                parsed.filter(item =>
                    item &&
                    typeof item.name === 'string' &&
                    Number.isFinite(Number(item.quantity)) &&
                    Number.isFinite(Number(item.unitCost))
                ) :
                starterItems.map(item => ({...item }));
        }
    } catch (error) {
        console.error('Could not load inventory:', error);
        items = starterItems.map(item => ({...item }));
    }

    // Show a notification
    function notify(message) {
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Save inventory to localStorage
    function saveItems() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(items)
            );

            return true;
        } catch (error) {
            console.error('Could not save inventory:', error);
            notify('Could not save inventory in this browser.');
            return false;
        }
    }

    // Format Indian currency
    function money(value) {
        return '₹' + Number(value).toLocaleString('en-IN', {
            maximumFractionDigits: 2
        });
    }

    // Format quantity
    function formatQuantity(value) {
        return Number(value).toLocaleString('en-IN', {
            maximumFractionDigits: 2
        });
    }

    // Determine stock status
    function getStatus(item) {
        const quantity = Number(item.quantity) || 0;
        const minimum = Number(item.minimum) || 0;

        if (quantity <= 0) {
            return 'Out of Stock';
        }

        if (quantity <= minimum) {
            return 'Low Stock';
        }

        return 'In Stock';
    }

    // Update summary cards
    function updateStats() {
        const inStock = items.filter(
            item => getStatus(item) === 'In Stock'
        ).length;

        const lowStock = items.filter(
            item => getStatus(item) === 'Low Stock'
        ).length;

        const totalValue = items.reduce((sum, item) => {
            return sum +
                (Number(item.quantity) || 0) *
                (Number(item.unitCost) || 0);
        }, 0);

        document.getElementById('totalProducts').textContent =
            items.length;

        document.getElementById('inStockCount').textContent =
            inStock;

        document.getElementById('lowStockCount').textContent =
            lowStock;

        document.getElementById('totalStockValue').textContent =
            money(totalValue);

        document.getElementById('recordCount').textContent =
            items.length + (items.length === 1 ? ' item' : ' items');
    }

    // Create a safe text cell
    function createCell(value) {
        const cell = document.createElement('td');
        cell.textContent = value;
        return cell;
    }

    // Render inventory table
    function renderInventory() {
        const query = search.value.trim().toLowerCase();
        const selectedCategory = categoryFilter.value;
        const selectedStatus = stockFilter.value;

        const visibleItems = items
            .filter(item => {
                const searchableValues = [
                    item.name,
                    item.category,
                    item.supplier,
                    item.location
                ];

                const matchesSearch = searchableValues.some(value =>
                    String(value || '').toLowerCase().includes(query)
                );

                const matchesCategory =
                    selectedCategory === 'All' ||
                    item.category === selectedCategory;

                const matchesStatus =
                    selectedStatus === 'All' ||
                    getStatus(item) === selectedStatus;

                return matchesSearch && matchesCategory && matchesStatus;
            })
            .sort((a, b) =>
                String(a.name).localeCompare(String(b.name))
            );

        tableBody.replaceChildren();

        visibleItems.forEach(item => {
            const row = document.createElement('tr');

            // Item name and supplier/location
            const nameCell = document.createElement('td');

            const name = document.createElement('span');
            name.className = 'inventory-item-name';
            name.textContent = item.name;

            nameCell.appendChild(name);

            const sub = document.createElement('span');
            sub.className = 'inventory-item-sub';

            const details = [];

            if (item.supplier) {
                details.push('Supplier: ' + item.supplier);
            }

            if (item.location) {
                details.push('Location: ' + item.location);
            }

            sub.textContent = details.join(' · ') || 'No extra details';
            nameCell.appendChild(sub);

            // Category
            const categoryCell = createCell(item.category || 'Other');
            categoryCell.className = 'inventory-category';

            // Available quantity
            const quantityCell = document.createElement('td');
            const quantity = document.createElement('span');

            quantity.className = 'inventory-quantity';
            quantity.textContent =
                formatQuantity(item.quantity) + ' ' + (item.unit || 'units');

            quantityCell.appendChild(quantity);

            // Minimum quantity
            const minimumCell = createCell(
                formatQuantity(item.minimum || 0) + ' ' + (item.unit || 'units')
            );

            // Cost per unit
            const costCell = createCell(money(item.unitCost));

            // Total stock value
            const valueCell = createCell(
                money(Number(item.quantity) * Number(item.unitCost))
            );

            // Stock status
            const statusCell = document.createElement('td');
            const badge = document.createElement('span');
            const status = getStatus(item);

            badge.className = 'inventory-status';

            if (status === 'Low Stock') {
                badge.classList.add('low');
            } else if (status === 'Out of Stock') {
                badge.classList.add('out');
            }

            badge.textContent = status;
            statusCell.appendChild(badge);

            // Action buttons
            const actionCell = document.createElement('td');
            const actions = document.createElement('div');

            actions.className = 'inventory-row-actions';

            // Restock button
            const restockButton = document.createElement('button');

            restockButton.type = 'button';
            restockButton.className = 'inventory-action';
            restockButton.textContent = 'Restock';

            restockButton.addEventListener('click', () => {
                const answer = prompt(
                    'How much stock do you want to add for ' +
                    item.name +
                    '? Enter quantity in ' + (item.unit || 'units') + '.'
                );

                if (answer === null || answer.trim() === '') {
                    return;
                }

                const amount = Number(answer);

                if (!Number.isFinite(amount) || amount <= 0) {
                    notify('Please enter a quantity greater than zero.');
                    return;
                }

                const oldQuantity = Number(item.quantity) || 0;

                item.quantity = oldQuantity + amount;

                if (!saveItems()) {
                    item.quantity = oldQuantity;
                    return;
                }

                renderAll();
                notify('Stock updated successfully.');
            });

            // Delete button
            const deleteButton = document.createElement('button');

            deleteButton.type = 'button';
            deleteButton.className = 'inventory-delete';
            deleteButton.textContent = 'Delete';

            deleteButton.addEventListener('click', () => {
                if (!confirm('Delete ' + item.name + ' from inventory?')) {
                    return;
                }

                const previousItems = items;

                items = items.filter(current => current.id !== item.id);

                if (!saveItems()) {
                    items = previousItems;
                    return;
                }

                renderAll();
                notify('Inventory item deleted.');
            });

            actions.append(restockButton, deleteButton);
            actionCell.appendChild(actions);

            [
                nameCell,
                categoryCell,
                quantityCell,
                minimumCell,
                costCell,
                valueCell,
                statusCell,
                actionCell
            ].forEach(cell => row.appendChild(cell));

            tableBody.appendChild(row);
        });

        document.getElementById('inventoryEmpty').hidden =
            visibleItems.length !== 0;
    }

    // Refresh all inventory sections
    function renderAll() {
        updateStats();
        renderInventory();
    }

    // Open Add Item form
    openFormButton.addEventListener('click', () => {
        formPanel.hidden = false;

        formPanel.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });

        form.elements.namedItem('itemName').focus();
    });

    // Cancel Add Item form
    cancelFormButton.addEventListener('click', () => {
        form.reset();
        formPanel.hidden = true;
    });

    // Save a new inventory item
    form.addEventListener('submit', event => {
        event.preventDefault();

        const data = new FormData(form);

        const name = String(data.get('itemName') || '').trim();
        const quantity = Number(data.get('quantity'));
        const minimum = Number(data.get('minimum'));
        const unitCost = Number(data.get('unitCost'));

        if (!name) {
            notify('Please enter an item name.');
            return;
        }

        if (!Number.isFinite(quantity) ||
            quantity < 0 ||
            !Number.isFinite(minimum) ||
            minimum < 0 ||
            !Number.isFinite(unitCost) ||
            unitCost < 0
        ) {
            notify('Please enter valid quantity, minimum and cost.');
            return;
        }

        const newItem = {
            id: Date.now(),
            name,
            category: String(data.get('category')),
            quantity,
            unit: String(data.get('unit')),
            minimum,
            unitCost,
            supplier: String(data.get('supplier') || '').trim(),
            location: String(data.get('location') || '').trim()
        };

        items.push(newItem);

        if (!saveItems()) {
            items.pop();
            return;
        }

        form.reset();
        form.elements.namedItem('minimum').value = '5';
        formPanel.hidden = true;

        search.value = '';
        categoryFilter.value = 'All';
        stockFilter.value = 'All';

        renderAll();
        notify('Inventory item added successfully.');
    });

    // Search and filters
    search.addEventListener('input', renderInventory);
    categoryFilter.addEventListener('change', renderInventory);
    stockFilter.addEventListener('change', renderInventory);

    // Reset filters
    resetFiltersButton.addEventListener('click', () => {
        search.value = '';
        categoryFilter.value = 'All';
        stockFilter.value = 'All';

        renderInventory();
    });

    // Export inventory as CSV
    exportButton.addEventListener('click', () => {
        const rows = [
            [
                'Item',
                'Category',
                'Quantity',
                'Unit',
                'Minimum Stock',
                'Unit Cost',
                'Stock Value',
                'Status',
                'Supplier',
                'Location'
            ],
            ...items.map(item => [
                item.name,
                item.category,
                item.quantity,
                item.unit,
                item.minimum,
                item.unitCost,
                Number(item.quantity) * Number(item.unitCost),
                getStatus(item),
                item.supplier || '',
                item.location || ''
            ])
        ];

        // Properly quote CSV values; avoid invalid JavaScript syntax.
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
        link.download = 'fieldpilot-inventory.csv';

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);

        notify('Inventory report exported.');
    });

    // Mobile sidebar
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

    // Initial display
    renderAll();

})();