(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    let mode = 'login';
    let cfg = { google_client_id: '', phone_enabled: false };

    const next = new URLSearchParams(location.search).get('next');
    const dest = next && /^\/[A-Za-z0-9_.\-]*$/.test(next) ? next : '/';

    async function post(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'fp' },
            body: JSON.stringify(body)
        });
        let data = {};
        try { data = await res.json(); } catch (e) {}
        if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
        return data;
    }

    function setMode(m) {
        mode = m;
        const reg = m === 'register';
        $('nameRow').hidden = !reg;
        $('authTitle').textContent = reg ? 'Create your account' : 'Welcome back';
        $('emailSubmit').textContent = reg ? 'Create account' : 'Log in';
        $('switchText').textContent = reg ? 'Already have an account?' : 'New here?';
        $('switchBtn').textContent = reg ? 'Log in' : 'Create an account';
        document.querySelector('#emailForm [name=password]').autocomplete = reg ? 'new-password' : 'current-password';
        $('emailError').textContent = '';
    }
    $('switchBtn').addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));

    $('emailForm').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        const btn = $('emailSubmit');
        btn.disabled = true;
        $('emailError').textContent = '';
        try {
            await post(mode === 'register' ? '/auth/register' : '/auth/login',
                { name: f.name.value, email: f.email.value, password: f.password.value });
            location.href = dest;
        } catch (err) {
            $('emailError').textContent = err.message;
            btn.disabled = false;
        }
    });

    function showTab(tab) {
        document.querySelectorAll('.tab').forEach(t => {
            const on = t.dataset.tab === tab;
            t.classList.toggle('on', on);
            t.setAttribute('aria-selected', on);
        });
        $('emailForm').hidden = tab !== 'email';
        $('phoneForm').hidden = tab !== 'phone';
    }
    document.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => showTab(t.dataset.tab)));

    $('phoneForm').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target;
        $('phoneError').textContent = '';
        const step2 = !$('phoneStep2').hidden;
        try {
            if (!step2) {
                const out = await post('/auth/otp/request', { phone: f.phone.value });
                $('phoneStep1').hidden = true;
                $('phoneStep2').hidden = false;
                if (out.demo_code) {
                    $('demoNote').hidden = false;
                    $('demoNote').textContent = 'Demo mode: your code is ' + out.demo_code + ' (a real SMS service is not connected).';
                }
            } else {
                await post('/auth/otp/verify', { phone: f.phone.value, code: f.code.value, name: f.pname.value });
                location.href = dest;
            }
        } catch (err) {
            $('phoneError').textContent = err.message;
        }
    });

    function setupGoogle() {
        if (!cfg.google_client_id) return;
        const s = document.createElement('script');
        s.src = 'https://accounts.google.com/gsi/client';
        s.async = true;
        s.onload = () => {
            window.google.accounts.id.initialize({
                client_id: cfg.google_client_id,
                callback: async resp => {
                    try {
                        await post('/auth/google', { credential: resp.credential });
                        location.href = dest;
                    } catch (err) {
                        $('emailError').textContent = err.message;
                    }
                }
            });
            window.google.accounts.id.renderButton($('googleButton'), { theme: 'outline', size: 'large', width: 300 });
            $('googleBlock').hidden = false;
        };
        document.head.appendChild(s);
    }

    fetch('/api/config').then(r => r.json()).then(c => {
        cfg = c;
        $('phoneTab').hidden = !c.phone_enabled;
        setupGoogle();
    }).catch(() => {});
})();
