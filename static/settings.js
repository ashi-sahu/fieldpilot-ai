// FieldPilot AI - Settings JavaScript

(() => {
    'use strict';

    const STORAGE_KEY = 'fieldpilot_settings_v1';

    const form = document.getElementById('settingsForm');
    const toast = document.getElementById('toast');
    const sidebar = document.getElementById('sidebar');

    let toastTimer;

    // Default settings
    const defaultSettings = {
        farmName: 'My Farm',
        ownerName: (window.__FP_USER__ && window.__FP_USER__.name) || 'Farm Admin',
        location: '',
        phone: '',
        email: '',
        areaUnit: 'acres',
        currency: 'INR',
        language: 'English',
        dateFormat: 'DD MMM YYYY',
        taskReminders: true,
        lowStockAlerts: true,
        maintenanceReminders: true,
        weeklySummary: false
    };

    // Show a notification
    function notify(message) {
        if (!toast) return;

        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2600);
    }

    // Read saved settings safely
    function loadSettings() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) {
                return {...defaultSettings };
            }

            const parsed = JSON.parse(saved);

            if (!parsed ||
                typeof parsed !== 'object' ||
                Array.isArray(parsed)
            ) {
                return {...defaultSettings };
            }

            return {
                ...defaultSettings,
                ...parsed
            };
        } catch (error) {
            console.warn('Could not load saved settings.', error);
            return {...defaultSettings };
        }
    }

    // Fill the form with settings
    function applySettings(settings) {
        Object.keys(defaultSettings).forEach(key => {
            const field = form.elements.namedItem(key);

            if (!field) return;

            if (field.type === 'checkbox') {
                field.checked = Boolean(settings[key]);
            } else {
                field.value = settings[key] ?? defaultSettings[key];
            }
        });

        updateWorkspaceLabels(settings);
        updateHeaderDate(settings.dateFormat);
    }

    // Collect values from the form
    function collectSettings() {
        const settings = {};

        Object.keys(defaultSettings).forEach(key => {
            const field = form.elements.namedItem(key);

            if (!field) {
                settings[key] = defaultSettings[key];
                return;
            }

            if (field.type === 'checkbox') {
                settings[key] = field.checked;
            } else {
                settings[key] = field.value.trim();
            }
        });

        // Avoid blank names
        if (!settings.farmName) {
            settings.farmName = defaultSettings.farmName;
        }

        if (!settings.ownerName) {
            settings.ownerName = defaultSettings.ownerName;
        }

        return settings;
    }

    // Save settings in browser storage
    function saveSettings(settings) {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(settings)
            );

            return true;
        } catch (error) {
            console.error('Could not save settings.', error);
            notify('Could not save settings in this browser.');
            return false;
        }
    }

    // Update the farm and owner labels on this page
    function updateWorkspaceLabels(settings) {
        const farmLabel = document.getElementById('sidebarFarmName');
        const ownerLabel = document.getElementById('sidebarOwnerName');

        if (farmLabel) {
            farmLabel.textContent =
                settings.farmName || defaultSettings.farmName;
        }

        if (ownerLabel) {
            ownerLabel.textContent =
                settings.ownerName || defaultSettings.ownerName;
        }
    }

    // Format the top bar date using the chosen preference
    function updateHeaderDate(format) {
        const todayLabel = document.getElementById('todayLabel');

        if (!todayLabel) return;

        const now = new Date();

        const day = String(now.getDate()).padStart(2, '0');
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const year = now.getFullYear();

        if (format === 'DD/MM/YYYY') {
            todayLabel.textContent = `${day}/${month}/${year}`;
        } else if (format === 'MM/DD/YYYY') {
            todayLabel.textContent = `${month}/${day}/${year}`;
        } else if (format === 'YYYY-MM-DD') {
            todayLabel.textContent = `${year}-${month}-${day}`;
        } else {
            todayLabel.textContent = now.toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric'
            });
        }
    }

    // Update footer year
    function updateFooterYear() {
        const yearElement = document.getElementById('currentYear');

        if (yearElement) {
            yearElement.textContent = new Date().getFullYear();
        }
    }

    // Save the settings form
    form.addEventListener('submit', event => {
        event.preventDefault();

        if (!form.reportValidity()) {
            return;
        }

        const settings = collectSettings();

        if (!saveSettings(settings)) {
            return;
        }

        applySettings(settings);
        notify('Settings saved successfully.');
    });

    // Restore and save default settings
    document.getElementById('resetSettings')
        .addEventListener('click', () => {
            const confirmed = confirm(
                'Restore all settings to their default values?'
            );

            if (!confirmed) return;

            const defaults = {...defaultSettings };

            if (!saveSettings(defaults)) {
                return;
            }

            applySettings(defaults);
            notify('Default settings restored.');
        });

    // Mobile sidebar
    document.getElementById('mobileMenu')
        .addEventListener('click', () => {
            if (sidebar) {
                sidebar.classList.toggle('open');
            }
        });

    // Load saved settings on page opening
    const settings = loadSettings();

    applySettings(settings);
    updateFooterYear();

})();