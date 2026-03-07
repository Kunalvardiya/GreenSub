/* ===== GreenSub – collector.js ===== */

document.addEventListener('DOMContentLoaded', () => {

    const pickupList = document.getElementById('pickupList');
    const pickupLoading = document.getElementById('pickupLoading');
    const pickupEmpty = document.getElementById('pickupEmpty');
    const btnRefresh = document.getElementById('btnRefreshPickups');

    let collectorMap = null;
    let mapMarkers = [];
    const DEFAULT_CENTER = [20.5937, 78.9629]; // India
    const DEFAULT_ZOOM = 5;

    /* ---------- Init Tracking Map ---------- */
    function initMap() {
        if (!collectorMap) {
            collectorMap = L.map('collectorMap').setView(DEFAULT_CENTER, DEFAULT_ZOOM);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '&copy; OpenStreetMap',
                maxZoom: 19
            }).addTo(collectorMap);
        }
    }

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

            // Clear old markers
            mapMarkers.forEach(m => collectorMap.removeLayer(m));
            mapMarkers = [];
            const bounds = L.latLngBounds();

            pickups.forEach(pickup => {
                const card = document.createElement('div');
                card.className = 'pickup-card';

                let locationHtml = '';
                if (pickup.location && pickup.location.lat && pickup.location.lng) {
                    locationHtml = `<div class="pickup-detail"><span class="label">Location</span><span>📍 Map pinned</span></div>`;

                    if (pickup.status === 'pending') {
                        // Add marker to map
                        const marker = L.marker([pickup.location.lat, pickup.location.lng]).addTo(collectorMap);
                        bounds.extend([pickup.location.lat, pickup.location.lng]);

                        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${pickup.location.lat},${pickup.location.lng}`;

                        marker.bindPopup(`
                            <strong>${pickup.itemName}</strong><br>
                            ${pickup.category} • ${pickup.material}<br>
                            📅 ${pickup.date} ${pickup.time}<br>
                            <a href="${mapsUrl}" target="_blank" style="display:inline-block; margin-top:8px; color:var(--primary); font-weight:600; text-decoration:none;">🧭 Get Directions</a>
                        `);
                        mapMarkers.push(marker);
                    }
                }

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
            ${locationHtml}
          </div>
          ${pickup.status === 'pending' ? `
            <div class="pickup-card-actions">
              <button class="btn btn-primary btn-sm" onclick="updatePickupStatus('${pickup._id || pickup.id}', 'accepted', this)">✅ Accept</button>
              <button class="btn btn-outline btn-sm" onclick="updatePickupStatus('${pickup._id || pickup.id}', 'declined', this)">❌ Decline</button>
            </div>
          ` : ''}
        `;
                pickupList.appendChild(card);
            });

            // Auto fit map bounds if we have markers
            if (mapMarkers.length > 0) {
                collectorMap.fitBounds(bounds, { padding: [30, 30] });
            } else {
                collectorMap.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
            }

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
    initMap();
    fetchPickups();

});
