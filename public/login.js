/* ===== GreenSub – login.js ===== */

document.addEventListener('DOMContentLoaded', () => {

    // If already logged in, redirect to dashboard
    if (localStorage.getItem('gsUser')) {
        window.location.href = '/dashboard.html';
        return;
    }

    /* ---------- Tab switching ---------- */
    const tabLogin = document.getElementById('tabLogin');
    const tabRegister = document.getElementById('tabRegister');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const authMessage = document.getElementById('authMessage');

    tabLogin.addEventListener('click', () => {
        tabLogin.classList.add('active');
        tabRegister.classList.remove('active');
        loginForm.style.display = '';
        registerForm.style.display = 'none';
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    });

    tabRegister.addEventListener('click', () => {
        tabRegister.classList.add('active');
        tabLogin.classList.remove('active');
        registerForm.style.display = '';
        loginForm.style.display = 'none';
        authMessage.textContent = '';
        authMessage.className = 'auth-message';
    });

    /* ---------- Show message ---------- */
    function showMsg(text, type = 'error') {
        authMessage.textContent = text;
        authMessage.className = 'auth-message ' + type;
    }

    /* ---------- Login ---------- */
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnLogin');
        btn.disabled = true;
        btn.textContent = '⏳ Signing in...';
        authMessage.textContent = '';

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: document.getElementById('loginEmail').value,
                    password: document.getElementById('loginPassword').value
                })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('gsUser', JSON.stringify(data));
                showMsg('✅ Welcome back, ' + data.name + '!', 'success');
                setTimeout(() => window.location.href = '/dashboard.html', 600);
            } else {
                showMsg(data.error || 'Login failed');
                btn.disabled = false;
                btn.textContent = '🔓 Sign In';
            }
        } catch (err) {
            showMsg('Network error: ' + err.message);
            btn.disabled = false;
            btn.textContent = '🔓 Sign In';
        }
    });

    /* ---------- Register ---------- */
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnRegister');
        btn.disabled = true;
        btn.textContent = '⏳ Creating account...';
        authMessage.textContent = '';

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: document.getElementById('regName').value,
                    email: document.getElementById('regEmail').value,
                    password: document.getElementById('regPassword').value
                })
            });
            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('gsUser', JSON.stringify(data));
                showMsg('🎉 Account created! Redirecting...', 'success');
                setTimeout(() => window.location.href = '/dashboard.html', 600);
            } else {
                showMsg(data.error || 'Registration failed');
                btn.disabled = false;
                btn.textContent = '🌱 Create Account';
            }
        } catch (err) {
            showMsg('Network error: ' + err.message);
            btn.disabled = false;
            btn.textContent = '🌱 Create Account';
        }
    });

    /* ---------- Auth particles ---------- */
    const particlesContainer = document.getElementById('authParticles');
    if (particlesContainer) {
        for (let i = 0; i < 25; i++) {
            const p = document.createElement('span');
            p.classList.add('particle');
            const size = Math.random() * 6 + 3;
            p.style.width = size + 'px';
            p.style.height = size + 'px';
            p.style.left = Math.random() * 100 + '%';
            p.style.top = Math.random() * 100 + '%';
            p.style.animationDelay = Math.random() * 6 + 's';
            p.style.animationDuration = (Math.random() * 4 + 4) + 's';
            particlesContainer.appendChild(p);
        }
    }
});
