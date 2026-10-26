// FieldPilot AI - Farm Assistant Demo

(() => {
    const STORAGE_KEY = 'fieldpilot_assistant_chat_v1';

    const chatMessages = document.getElementById('chatMessages');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const sendButton = document.getElementById('sendMessage');
    const toast = document.getElementById('toast');

    let chatHistory = [];
    let toastTimer;

    // Load saved conversation from this browser
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const parsed = saved ? JSON.parse(saved) : [];

        if (Array.isArray(parsed)) {
            chatHistory = parsed.filter(message =>
                message && ['user', 'bot'].includes(message.role) &&
                typeof message.text === 'string'
            );
        }
    } catch {
        chatHistory = [];
    }

    // Show small notification
    function notify(message) {
        toast.textContent = message;
        toast.classList.add('show');

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2500);
    }

    // Save conversation locally
    function saveChat() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(chatHistory)
            );
        } catch {
            notify('Chat history could not be saved in this browser.');
        }
    }

    // Scroll to the latest message
    function scrollToLatest() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Create the assistant's welcome message
    function renderWelcome() {
        const row = document.createElement('div');
        row.className = 'assistant-message assistant-bot-message';

        const avatar = document.createElement('div');
        avatar.className = 'assistant-message-avatar';
        avatar.textContent = '🌱';

        const content = document.createElement('div');
        content.className = 'assistant-message-content';

        const sender = document.createElement('span');
        sender.className = 'assistant-sender';
        sender.textContent = 'FieldPilot Assistant';

        const bubble = document.createElement('div');
        bubble.className = 'assistant-bubble';
        bubble.textContent =
            'Namaste! 👋 Welcome to FieldPilot AI.\n\n' +
            'You can explore questions about crops, soil, irrigation, ' +
            'pest management and farm planning.\n\n' +
            'Ask about your own farm, for example "What tasks are pending?", ' +
            '"Which items are low in stock?" or "How much income have I recorded?", ' +
            'or choose a suggested farming question.';

        const time = document.createElement('small');
        time.className = 'assistant-message-time';
        time.textContent = 'Farm support';

        content.append(sender, bubble, time);
        row.append(avatar, content);
        chatMessages.append(row);
    }

    // Add a message to the chat safely
    function appendMessage(role, text) {
        const row = document.createElement('div');

        row.className = role === 'user' ?
            'assistant-message assistant-user-message' :
            'assistant-message assistant-bot-message';

        if (role === 'bot') {
            const avatar = document.createElement('div');
            avatar.className = 'assistant-message-avatar';
            avatar.textContent = '🌱';
            row.append(avatar);
        }

        const content = document.createElement('div');
        content.className = 'assistant-message-content';

        const sender = document.createElement('span');
        sender.className = 'assistant-sender';
        sender.textContent = role === 'user' ?
            'You' :
            'FieldPilot Assistant';

        const bubble = document.createElement('div');
        bubble.className = 'assistant-bubble';
        bubble.textContent = text;

        const time = document.createElement('small');
        time.className = 'assistant-message-time';

        time.textContent = role === 'user' ?
            'Your message' :
            'FieldPilot · Verify locally';

        content.append(sender, bubble, time);
        row.append(content);
        chatMessages.append(row);
    }

    // Render the welcome message and saved conversation
    function renderChat() {
        chatMessages.replaceChildren();
        renderWelcome();

        chatHistory.forEach(message => {
            appendMessage(message.role, message.text);
        });

        scrollToLatest();
    }

    // Answers about the user's own farm, built from the data saved by the other pages.
    function getFarmReply(question) {
        const q = question.toLowerCase();
        const wantsData = /how many|how much|kitn[aei]|show|list|summary|overview|status|pending|total|left|remaining|low|balance|profit|loss|income|expense|kharch|kamai|due|overdue|mera|meri|mere|hamar[aei]|\bmy\b|\bour\b/.test(q);
        if (!wantsData) return null;

        const { read, money, fmtDate, todayISO } = window.FP;
        const today = todayISO();
        const crops = read('crops');
        const tasks = read('tasks');
        const tx = read('finance');
        const items = read('inventory');
        const workers = read('labour');
        const machines = read('machinery');

        const topicFinance = /income|expense|profit|loss|balance|kharch|kamai|earn|spent|paisa|money|₹|finance/.test(q);
        const topicTasks = /task|kaam|todo|reminder|overdue|pending/.test(q);
        const topicStock = /stock|inventory|seed|fertili|pesticide|khatam|supplies|fuel|low/.test(q);
        const topicLabour = /labou?r|worker|mazdoor|majdoor|staff|wage/.test(q);
        const topicMachines = /machine|tractor|pump|sprayer|equipment|service|repair/.test(q);
        const topicCrops = /crop|fasal|area|acre|field|khet|land|zameen/.test(q);
        const topicAll = /summary|overview|everything|sab kuch|status of (my|the) farm/.test(q);

        const parts = [];

        if (topicAll || topicCrops) {
            if (!crops.length) {
                parts.push('🌾 You have not added any crops yet. Add one on the Crops & Fields page.');
            } else {
                const area = crops.reduce((s, c) => s + (Number(c.area) || 0), 0);
                parts.push('🌾 You have ' + crops.length + ' crop' + (crops.length === 1 ? '' : 's') + ' on ' + area.toLocaleString('en-IN') + ' acres:\n' +
                    crops.map(c => '• ' + c.name + ' (' + c.field + ', ' + c.area + ' acres) - ' + c.status).join('\n'));
            }
        }
        if (topicAll || topicTasks) {
            const pending = tasks.filter(t => t.status !== 'Completed')
                .sort((a, b) => String(a.dueDate || '9999').localeCompare(String(b.dueDate || '9999')));
            if (!pending.length) {
                parts.push('✅ You have no pending tasks.');
            } else {
                const overdue = pending.filter(t => t.dueDate && t.dueDate < today).length;
                parts.push('📋 ' + pending.length + ' pending task' + (pending.length === 1 ? '' : 's') + (overdue ? ' (' + overdue + ' overdue)' : '') + ':\n' +
                    pending.slice(0, 6).map(t => '• ' + t.title + ' - ' + (t.dueDate ? (t.dueDate < today ? 'overdue since ' : 'due ') + fmtDate(t.dueDate) : 'no date') + ', ' + (t.priority || 'Medium') + ' priority').join('\n'));
            }
        }
        if (topicAll || topicStock) {
            const low = items.filter(i => (Number(i.quantity) || 0) <= (Number(i.minimum) || 0));
            if (!items.length) {
                parts.push('📦 Your inventory is empty.');
            } else if (!low.length) {
                parts.push('📦 All ' + items.length + ' inventory items are above their minimum level.');
            } else {
                parts.push('📦 ' + low.length + ' item' + (low.length === 1 ? ' is' : 's are') + ' low or out of stock:\n' +
                    low.map(i => '• ' + i.name + ': ' + i.quantity + ' ' + (i.unit || '') + ' left (minimum ' + i.minimum + ')').join('\n'));
            }
        }
        if (topicAll || topicFinance) {
            const income = tx.filter(t => t.type === 'Income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
            const expense = tx.filter(t => t.type === 'Expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
            if (!tx.length) {
                parts.push('₹ No transactions recorded yet. Add income and expenses on the Finance page.');
            } else {
                const net = income - expense;
                parts.push('₹ From your ' + tx.length + ' recorded transactions: income ' + money(income) + ', expenses ' + money(expense) +
                    ', so you are ' + (net >= 0 ? 'ahead by ' : 'behind by ') + money(Math.abs(net)) + '.');
            }
        }
        if (topicAll || topicLabour) {
            const active = workers.filter(w => w.status === 'Active');
            if (!workers.length) {
                parts.push('👷 No workers added yet.');
            } else {
                const daily = active.reduce((s, w) => s + (Number(w.wage) || 0), 0);
                parts.push('👷 ' + active.length + ' of ' + workers.length + ' workers are active. Total daily wages for active workers: ' + money(daily) + '.');
            }
        }
        if (topicAll || topicMachines) {
            const need = machines.filter(m => m.condition && m.condition !== 'Good');
            if (!machines.length) {
                parts.push('⚙️ No machinery added yet.');
            } else if (!need.length) {
                parts.push('⚙️ All ' + machines.length + ' machines are marked Good.');
            } else {
                parts.push('⚙️ ' + need.length + ' machine' + (need.length === 1 ? ' needs' : 's need') + ' attention:\n' +
                    need.map(m => '• ' + m.name + ': ' + m.condition + (m.nextService ? ' (next service ' + fmtDate(m.nextService) + ')' : '')).join('\n'));
            }
        }

        if (!parts.length) return null;
        return parts.join('\n\n') + '\n\nThis comes from the records saved in this browser.';
    }

    // Return a demo reply based on common farming keywords.
    // These are sample rules, not a connected AI model.
    function getDemoReply(question) {
        const q = question.toLowerCase();

        // Yellow leaves and general crop symptoms
        if (
            /yellow|peeli|peela|peele|leaves turning|patte.*(rang|sukh|peel)|patt.*(peel|sukh)/i.test(q)
        ) {
            return (
                '🍃 Yellow leaves can have several causes, such as ' +
                'water stress, nutrient deficiency, pests or disease.\n\n' +
                'What to check:\n' +
                '1. See whether older leaves or new leaves are affected.\n' +
                '2. Check the soil for excess water or dryness.\n' +
                '3. Look at the underside of leaves for pests or spots.\n' +
                '4. Note how quickly the symptoms are spreading.\n\n' +
                'To narrow this down, identify the crop and share the ' +
                'plant age, visible symptoms and your location. This demo ' +
                'cannot diagnose a crop disease.'
            );
        }

        // Soybean
        if (/soybean|soyabean|soya|सोयाबीन/i.test(q)) {
            return (
                '🌱 Soybean crop care — general checklist:\n\n' +
                '• Monitor crop growth and look for unusual leaf spots or pests.\n' +
                '• Avoid waterlogging and check the field after heavy rain.\n' +
                '• Keep field records for sowing, irrigation and crop observations.\n' +
                '• Base fertilizer or plant-protection decisions on soil tests, ' +
                'local recommendations and the crop growth stage.\n\n' +
                'For more relevant guidance, tell me your state or district, ' +
                'sowing date and current crop growth stage. This is a demo ' +
                'reply, not a crop-specific expert assessment.'
            );
        }

        // Irrigation and watering
        if (/irrigat|water|paani|watering|पानी|सिंचाई/i.test(q)) {
            return (
                '💧 Irrigation planning — general guidance:\n\n' +
                '1. Check soil moisture before watering.\n' +
                '2. Consider the crop type, growth stage, soil and recent rainfall.\n' +
                '3. Avoid unnecessary watering and waterlogging.\n' +
                '4. During hot or dry weather, monitor the field more frequently.\n\n' +
                'Tell me your crop, soil type and recent rainfall for more ' +
                'specific guidance. This demo has no live weather or soil sensors.'
            );
        }

        // Soil
        if (/soil|mitti|मिट्टी|soil health|fertility/i.test(q)) {
            return (
                '🌾 Improving soil health — general checklist:\n\n' +
                '• Consider a soil test to understand pH and nutrient levels.\n' +
                '• Use suitable organic matter where appropriate.\n' +
                '• Reduce erosion by maintaining suitable soil cover and field practices.\n' +
                '• Plan fertilizer use according to crop needs and test results.\n\n' +
                'Share your crop, soil type and any available soil-test results ' +
                'for more relevant guidance. The demo cannot test your soil.'
            );
        }

        // Pests and insects
        if (/pest|insect|bug|कीट|कीड़ा|keeda|insect attack/i.test(q)) {
            return (
                '🐛 Common pest-management steps:\n\n' +
                '1. Identify the crop and the affected plant parts.\n' +
                '2. Check how many plants are affected and whether damage is spreading.\n' +
                '3. Photograph the pest or symptoms and note the crop growth stage.\n' +
                '4. Ask a local agriculture expert about integrated pest management.\n\n' +
                'Do not choose or mix a pesticide based only on a guess. ' +
                'Follow the product label and local agricultural guidance. ' +
                'This demo cannot identify a pest from a message alone.'
            );
        }

        // Disease
        if (/disease|fungus|fungal|spots on leaves|crop infection|रोग|बीमारी/i.test(q)) {
            return (
                '🔎 For a possible crop disease:\n\n' +
                '• Note the crop name and plant age.\n' +
                '• Observe whether spots, wilting or damage appear on leaves, stems or roots.\n' +
                '• Check whether the problem is limited to one area or spreading.\n' +
                '• Take clear photographs and consult an agricultural expert.\n\n' +
                'Do not apply a pesticide or fungicide until the problem has ' +
                'been identified. This demo cannot provide a confirmed diagnosis.'
            );
        }

        // Fertilizers
        if (/fertiliz|urea|npk|nutrient|खाद|उर्वरक/i.test(q)) {
            return (
                '🌿 Fertilizer planning — general guidance:\n\n' +
                '• Start with the crop, growth stage and soil-test information.\n' +
                '• Use locally recommended nutrient rates for the crop.\n' +
                '• Avoid applying more than recommended.\n' +
                '• Store fertilizers safely and follow the product label.\n\n' +
                'Tell me the crop, location and available soil-test results. ' +
                'This demo cannot calculate a reliable fertilizer dose without ' +
                'the required information.'
            );
        }

        // Sowing and harvesting
        if (/sow|sowing|planting|harvest|crop planning|बुवाई|कटाई/i.test(q)) {
            return (
                '📅 Crop planning depends on your location, season, water ' +
                'availability, soil and crop variety.\n\n' +
                'A useful plan should consider:\n' +
                '1. Local sowing window and suitable variety.\n' +
                '2. Field preparation and soil-test results.\n' +
                '3. Expected irrigation requirements.\n' +
                '4. Likely crop duration and harvest arrangements.\n\n' +
                'Tell me your district, the crop you are considering and ' +
                'available irrigation. This demo does not have live local ' +
                'agricultural advisories.'
            );
        }

        // Weather
        if (/weather|rain|rainfall|temperature|mausam|बारिश|मौसम/i.test(q)) {
            return (
                '🌦️ Weather can affect irrigation, spraying and crop planning.\n\n' +
                'Check a reliable local forecast before time-sensitive farm work, ' +
                'especially before spraying or when heavy rain is expected.\n\n' +
                'This demo is not connected to live weather data, so it cannot ' +
                'tell you the current forecast for your farm.'
            );
        }

        // Finance
        if (/finance|expense|income|profit|cost|budget|kharcha|कमाई|खर्च|लाभ/i.test(q)) {
            return (
                '₹ Farm finance planning — a useful starting point:\n\n' +
                '• Record seed, fertilizer, labour, irrigation and machinery costs.\n' +
                '• Record crop sales and other farm income separately.\n' +
                '• Compare total income with total expenses to estimate profit or loss.\n' +
                '• Keep receipts and transaction dates for accurate records.\n\n' +
                'You can use the Finance page in FieldPilot AI to record transactions. ' +
                'This demo chatbot cannot yet access your saved finance records.'
            );
        }

        // Farm tasks
        if (/task|reminder|schedule|plan.*week|काम|कार्य/i.test(q)) {
            return (
                '📋 A practical farm task plan can include:\n\n' +
                '1. Crop and soil inspection.\n' +
                '2. Irrigation checks based on soil moisture and rainfall.\n' +
                '3. Checking inventory before planned farm work.\n' +
                '4. Machinery inspection and scheduled maintenance.\n' +
                '5. Recording completed work and expenses.\n\n' +
                'You can add and track tasks on the Tasks page. This demo ' +
                'does not automatically schedule notifications.'
            );
        }

        // Machinery
        if (/machinery|tractor|pump|equipment|machine|ट्रैक्टर|मशीन/i.test(q)) {
            return (
                '🚜 General farm equipment checklist:\n\n' +
                '• Follow the manufacturer’s operation and maintenance instructions.\n' +
                '• Check for visible damage or leaks before use.\n' +
                '• Keep service dates and repairs recorded.\n' +
                '• Turn equipment off and follow safety procedures before inspection.\n\n' +
                'You can record equipment and service dates on the Machinery page.'
            );
        }

        // Inventory
        if (/inventory|stock|seed|supplies|available fertilizer|बीज|भंडार/i.test(q)) {
            return (
                '📦 Good inventory practices:\n\n' +
                '• Record item quantities and minimum stock levels.\n' +
                '• Keep seeds, fertilizers and pesticides in suitable separate storage.\n' +
                '• Check packaging, storage instructions and expiry information where applicable.\n' +
                '• Update records whenever stock is used or replenished.\n\n' +
                'You can manage these records on the Inventory page. This demo ' +
                'cannot yet read your actual saved inventory.'
            );
        }

        // Default
        return (
            '🌱 Thanks for your farming question!\n\n' +
            'This is currently a demo chatbot, so I can only provide ' +
            'prewritten guidance for common topics such as crops, irrigation, ' +
            'soil, pests, fertilizers, weather planning, machinery and finance.\n\n' +
            'Try asking about one of those topics, or tell me your crop, ' +
            'growth stage and location so I can point you in the right direction. ' +
            'designed around the information farmers need.'
        );
    }

    // Send a message
    let sending = false;

    function sendChatMessage(text) {
        const question = String(text || '').trim();

        if (!question || sending) {
            return;
        }

        chatHistory.push({
            role: 'user',
            text: question
        });

        appendMessage('user', question);
        saveChat();
        scrollToLatest();

        // 1) answers from the user's own saved farm data (instant), 2) the server assistant, 3) offline fallback
        const farmReply = getFarmReply(question);

        function finish(reply) {
            chatHistory.push({
                role: 'bot',
                text: reply
            });

            appendMessage('bot', reply);
            saveChat();
            scrollToLatest();
            sending = false;
            if (sendButton) sendButton.disabled = false;
        }

        if (farmReply) {
            finish(farmReply);
            return;
        }

        sending = true;
        if (sendButton) sendButton.disabled = true;
        const history = chatHistory.slice(-9, -1).map(m => ({ role: m.role, text: m.text }));

        fetch('/api/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fp' },
            body: JSON.stringify({ message: question, history: history })
        }).then(res => {
            if (res.status === 401) { window.location.href = '/login'; throw new Error('login'); }
            return res.json().then(body => {
                if (!res.ok) throw new Error(body.error || 'Request failed');
                return body.reply;
            });
        }).then(finish).catch(error => {
            if (error.message === 'login') return;
            finish(getDemoReply(question) + '\n\n(The assistant server could not be reached, so this is a basic offline answer.)');
        });
    }

    // Handle chat form submission
    chatForm.addEventListener('submit', event => {
        event.preventDefault();

        const question = chatInput.value.trim();

        if (!question) {
            return;
        }

        sendChatMessage(question);
        chatInput.value = '';
        chatInput.style.height = 'auto';
    });

    // Press Enter to send on computers (Shift+Enter adds a new line). Phones keep Enter as a new line.
    chatInput.addEventListener('keydown', event => {
        if (event.key === 'Enter' && !event.shiftKey && window.matchMedia('(pointer: fine)').matches) {
            event.preventDefault();
            chatForm.requestSubmit();
        }
    });

    // Quick-question buttons on both sides of the page
    document.querySelectorAll('[data-prompt]').forEach(button => {
        button.addEventListener('click', () => {
            const prompt = button.dataset.prompt;

            sendChatMessage(prompt);
            chatInput.value = '';
            chatInput.focus();
        });
    });

    // Adjust textarea height while typing
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';

        chatInput.style.height =
            Math.min(chatInput.scrollHeight, 120) + 'px';
    });

    // Clear saved chat
    document.getElementById('clearChat')
        .addEventListener('click', () => {
            if (
                chatHistory.length > 0 &&
                !confirm('Clear your saved chat conversation?')
            ) {
                return;
            }

            chatHistory = [];

            try {
                localStorage.removeItem(STORAGE_KEY);
            } catch {
                // The page can still reset the visible conversation.
            }

            renderChat();
            notify('Chat cleared.');
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

    // Render saved conversation
    renderChat();

})();