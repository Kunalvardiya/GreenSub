/* ===== GreenSub – collector.js ===== */

document.addEventListener('DOMContentLoaded', () => {

    const pickupList = document.getElementById('pickupList');
    const pickupLoading = document.getElementById('pickupLoading');
    const pickupEmpty = document.getElementById('pickupEmpty');
    const btnRefresh = document.getElementById('btnRefreshPickups');

    /* ---------- Fetch pickup requests ---------- */
    async function fetchPickups() {
        pickupList.innerHTML = '';
        pickupLoading.style.display = 'flex';
        pickupEmpty.style.display = 'none';
        pickupList.appendChild(pickupLoading);

        try {
            const res = await fetch('/api/pickups');
            const pickups = await res.json();

            pickupList.innerHTML = '';

            if (pickups.length === 0) {
                pickupEmpty.style.display = 'block';
                return;
            }

            pickups.forEach(pickup => {
                const card = document.createElement('div');
                card.className = 'pickup-card';
                card.innerHTML = `
          <div class="pickup-card-header">
            <h4>${pickup.itemName}</h4>
            <span class="pickup-status status-${pickup.status}">${pickup.status}</span>
          </div>
          <div class="pickup-card-details">
            <div class="pickup-detail"><span class="label">Category</span><span>${pickup.category}</span></div>
            <div class="pickup-detail"><span class="label">Material</span><span>${pickup.material}</span></div>
            <div class="pickup-detail"><span class="label">Partner</span><span>${pickup.partner}</span></div>
            <div class="pickup-detail"><span class="label">Pickup</span><span>📅 ${pickup.date} at ${pickup.time}</span></div>
          </div>
          ${pickup.status === 'pending' ? `
            <div class="pickup-card-actions">
              <button class="btn btn-primary btn-sm" onclick="updatePickupStatus('${pickup.id}', 'accepted', this)">✅ Accept</button>
              <button class="btn btn-outline btn-sm" onclick="updatePickupStatus('${pickup.id}', 'declined', this)">❌ Decline</button>
            </div>
          ` : ''}
        `;
                pickupList.appendChild(card);
            });

        } catch (err) {
            pickupList.innerHTML = `<p style="color:var(--text-muted);text-align:center;padding:40px">Could not load pickups. Make sure the server is running.</p>`;
        }
    }

    /* ---------- Update pickup status ---------- */
    window.updatePickupStatus = async function (id, status, btn) {
        btn.disabled = true;
        const gsUser = JSON.parse(localStorage.getItem('gsUser') || 'null');
        try {
            await fetch('/api/pickups/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status, collectorId: gsUser ? gsUser._id : null })
            });
            fetchPickups();
        } catch (err) {
            alert('Error updating status');
            btn.disabled = false;
        }
    };

    btnRefresh.addEventListener('click', fetchPickups);

    // Initial load
    fetchPickups();

});
