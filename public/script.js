/* ===== GreenSub – Shared script.js ===== */

document.addEventListener('DOMContentLoaded', () => {

    /* ---------- Auth guard (protect pages) ---------- */
    const publicPages = ['/', '/index.html', '/login.html'];
    const currentPath = window.location.pathname;
    const user = JSON.parse(localStorage.getItem('gsUser') || 'null');

    if (!publicPages.includes(currentPath) && !user) {
        window.location.href = '/login.html';
        return;
    }

    /* ---------- Navbar: inject user info ---------- */
    const navLinks = document.getElementById('navLinks');
    if (navLinks && user && !document.getElementById('btnLogout')) {
        // Remove existing static auth links if any
        const existingLogout = navLinks.querySelector('.nav-logout');
        if (!existingLogout) {
            const userLi = document.createElement('li');
            userLi.innerHTML = `<span class="nav-user">👤 ${user.name}</span>`;
            navLinks.appendChild(userLi);

            const logoutLi = document.createElement('li');
            logoutLi.innerHTML = `<button class="btn btn-outline btn-sm nav-logout" id="navBtnLogout">Logout</button>`;
            navLinks.appendChild(logoutLi);

            document.getElementById('navBtnLogout').addEventListener('click', () => {
                localStorage.removeItem('gsUser');
                window.location.href = '/login.html';
            });
        }
    }

    /* ---------- Index page: swap CTA if logged in ---------- */
    if ((currentPath === '/' || currentPath === '/index.html') && navLinks) {
        const ctaLinks = navLinks.querySelectorAll('.nav-cta, .nav-cta-outline');
        if (user) {
            // Add Dashboard link if logged in
            ctaLinks.forEach(el => {
                if (el.textContent.includes('Upload')) {
                    el.href = '/dashboard.html';
                    el.textContent = '📊 Dashboard';
                }
            });
        } else {
            // Add Login link if not logged in
            const hasLogin = Array.from(navLinks.querySelectorAll('a')).some(a => a.href.includes('login'));
            if (!hasLogin) {
                const loginLi = document.createElement('li');
                loginLi.innerHTML = `<a href="/login.html" class="nav-cta">🔓 Login</a>`;
                navLinks.appendChild(loginLi);
            }
        }
    }

    /* ---------- Navbar scroll effect (landing page only) ---------- */
    const navbar = document.getElementById('navbar');
    if (navbar && !navbar.classList.contains('scrolled')) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 60);
        });
    }

    /* ---------- Mobile nav toggle ---------- */
    const navToggle = document.getElementById('navToggle');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });

        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => navLinks.classList.remove('open'));
        });
    }

    /* ---------- Hero particles (landing page) ---------- */
    const particlesContainer = document.getElementById('heroParticles');
    if (particlesContainer) {
        for (let i = 0; i < 20; i++) {
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

    /* ---------- Scroll fade-in (IntersectionObserver) ---------- */
    const fadeEls = document.querySelectorAll('.fade-in');
    const fadeObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                fadeObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    fadeEls.forEach(el => fadeObserver.observe(el));

    /* ---------- Smooth scroll for anchor links ---------- */
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            e.preventDefault();
            const target = document.querySelector(anchor.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    });

});
