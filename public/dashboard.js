/* ===== GreenSub – dashboard.js ===== */

document.addEventListener('DOMContentLoaded', () => {

    const user = JSON.parse(localStorage.getItem('gsUser'));
    if (!user) {
        window.location.href = '/login.html';
        return;
    }

    /* ---------- Greeting ---------- */
    const greeting = document.getElementById('dashGreeting');
    if (greeting) greeting.textContent = `Welcome, ${user.name} 👋`;

    /* ---------- Nav user & logout ---------- */
    const navUser = document.getElementById('navUser');
    if (navUser) navUser.textContent = '👤 ' + user.name;

    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.removeItem('gsUser');
        window.location.href = '/login.html';
    });

    /* ---------- Activity Tabs ---------- */
    const tabs = document.querySelectorAll('.activity-tab');
    const panels = {
        uploaded: document.getElementById('panelUploaded'),
        purchased: document.getElementById('panelPurchased'),
        scheduled: document.getElementById('panelScheduled'),
        pickups: document.getElementById('panelPickups')
    };

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            Object.values(panels).forEach(p => { if (p) p.style.display = 'none'; });
            const panel = panels[tab.dataset.tab];
            if (panel) panel.style.display = '';
        });
    });

    /* ---------- Load activity data ---------- */
    loadUploaded();
    loadPurchased();
    loadScheduledPickups();
    loadAcceptedPickups();

    // --- Items listed by the user (seller) ---
    async function loadUploaded() {
        const grid = document.getElementById('uploadedGrid');
        const empty = document.getElementById('uploadedEmpty');
        try {
            const res = await fetch('/api/users/' + user._id + '/items');
            const items = await res.json();
            grid.innerHTML = '';
            if (items.length === 0) { empty.style.display = ''; return; }
            items.forEach(item => {
                grid.innerHTML += renderItemCard(item, 'uploaded');
            });
        } catch (e) {
            grid.innerHTML = '<p style="color:var(--text-muted);padding:20px">Could not load data.</p>';
        }
    }

    // --- Items bought by the user (buyer) ---
    async function loadPurchased() {
        const grid = document.getElementById('purchasedGrid');
        const empty = document.getElementById('purchasedEmpty');
        try {
            const res = await fetch('/api/users/' + user._id + '/purchases');
            const items = await res.json();
            grid.innerHTML = '';
            if (items.length === 0) { empty.style.display = ''; return; }
            items.forEach(item => {
                grid.innerHTML += renderItemCard(item, 'purchased');
            });
        } catch (e) {
            grid.innerHTML = '<p style="color:var(--text-muted);padding:20px">Could not load data.</p>';
        }
    }

    // --- Pickups scheduled by the user (seller scheduled for recycling) ---
    async function loadScheduledPickups() {
        const grid = document.getElementById('scheduledGrid');
        const empty = document.getElementById('scheduledEmpty');
        try {
            const res = await fetch('/api/users/' + user._id + '/scheduled-pickups');
            const pickups = await res.json();
            grid.innerHTML = '';
            if (pickups.length === 0) { empty.style.display = ''; return; }
            pickups.forEach(pickup => {
                grid.innerHTML += renderPickupCard(pickup);
            });
        } catch (e) {
            grid.innerHTML = '<p style="color:var(--text-muted);padding:20px">Could not load data.</p>';
        }
    }

    // --- Pickups accepted by the user (as trash collector) ---
    async function loadAcceptedPickups() {
        const grid = document.getElementById('pickupsGrid');
        const empty = document.getElementById('pickupsEmpty');
        try {
            const res = await fetch('/api/users/' + user._id + '/pickups');
            const pickups = await res.json();
            grid.innerHTML = '';
            if (pickups.length === 0) { empty.style.display = ''; return; }
            pickups.forEach(pickup => {
                grid.innerHTML += renderPickupCard(pickup);
            });
        } catch (e) {
            grid.innerHTML = '<p style="color:var(--text-muted);padding:20px">Could not load data.</p>';
        }
    }

    function renderPickupCard(pickup) {
        return `
            <div class="activity-card">
                <div class="activity-card-header">
                    <h4>${pickup.itemName}</h4>
                    <span class="pickup-status status-${pickup.status}">${pickup.status}</span>
                </div>
                <div class="activity-card-details">
                    <span>📂 ${pickup.category}</span>
                    <span>🏭 ${pickup.partner}</span>
                    <span>📅 ${pickup.date} at ${pickup.time}</span>
                </div>
            </div>
        `;
    }

    function renderItemCard(item, type) {
        const statusBadge = type === 'purchased'
            ? '<span class="item-badge badge-bought">Purchased</span>'
            : item.sold
                ? '<span class="item-badge badge-sold">Sold</span>'
                : '<span class="item-badge badge-active">Active</span>';

        return `
            <div class="activity-card">
                <div class="activity-card-img">
                    ${item.imageUrl ? `<img src="${item.imageUrl}" alt="${item.name}" />` : '<div class="no-img">📦</div>'}
                </div>
                <div class="activity-card-body">
                    <h4>${item.name}</h4>
                    <div class="activity-card-meta">
                        <span>₹${item.price}</span>
                        <span>${item.category}</span>
                        ${statusBadge}
                    </div>
                </div>
            </div>
        `;
    }

});
