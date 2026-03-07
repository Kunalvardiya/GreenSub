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

            // Attach listeners to new action buttons
            document.querySelectorAll('.btn-remove-item').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    if (confirm('Are you sure you want to remove this item from the marketplace?')) {
                        await handleRemoveItem(id);
                    }
                });
            });

            document.querySelectorAll('.btn-send-collector').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const id = e.target.dataset.id;
                    const itemData = items.find(i => i._id === id);
                    if (confirm('Remove from marketplace and request a trash pickup for this item?')) {
                        await handleSendToCollector(itemData);
                    }
                });
            });

        } catch (e) {
            grid.innerHTML = '<p style="color:var(--text-muted);padding:20px">Could not load data.</p>';
        }
    }

    async function handleRemoveItem(itemId) {
        try {
            const res = await fetch('/api/items/' + itemId, { method: 'DELETE' });
            if (res.ok) {
                loadUploaded(); // reload grid
            } else {
                alert('Failed to remove item.');
            }
        } catch (err) {
            alert('Error removing item: ' + err.message);
        }
    }

    async function handleSendToCollector(item) {
        // 1. Delete from marketplace
        await fetch('/api/items/' + item._id, { method: 'DELETE' });

        // 2. Schedule Pickup for tomorrow at 10 AM
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');

        const pickupData = {
            itemName: item.name,
            category: item.category,
            material: item.category, // Guessing material from category
            partner: 'GreenSub Partner Network', // Default
            date: `${yyyy}-${mm}-${dd}`,
            time: '10:00',
            userId: user._id,
        };
        if (item.location && item.location.lat != null) {
            pickupData.lat = item.location.lat;
            pickupData.lng = item.location.lng;
        }

        try {
            const res = await fetch('/api/pickups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(pickupData)
            });
            if (res.ok) {
                alert('Item sent to trash collector! Pick up scheduled for tomorrow morning.');
                loadUploaded();
                loadScheduledPickups();
            } else {
                alert('Failed to schedule pickup.');
            }
        } catch (err) {
            alert('Error scheduling pickup: ' + err.message);
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

        let actionButtons = '';
        if (type === 'uploaded' && !item.sold) {
            actionButtons = `
                <div class="activity-card-actions" style="margin-top: 12px; display: flex; gap: 8px;">
                    <button class="btn btn-outline btn-sm btn-send-collector" data-id="${item._id}" style="padding: 6px 12px; font-size: 0.8rem; flex: 1;">🚛 Send to Collector</button>
                    <button class="btn btn-outline btn-sm btn-remove-item" data-id="${item._id}" style="padding: 6px 12px; font-size: 0.8rem; color: #ef4444; border-color: rgba(239, 68, 68, 0.3);">❌ Remove</button>
                </div>
            `;
        }

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
                    ${actionButtons}
                </div>
            </div>
        `;
    }

});
