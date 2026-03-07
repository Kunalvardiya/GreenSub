/* ===== GreenSub – marketplace.js ===== */

document.addEventListener('DOMContentLoaded', () => {

    const mpSearch = document.getElementById('mpSearch');
    const mpRange = document.getElementById('mpRange');
    const mpRangeLabel = document.getElementById('mpRangeLabel');
    const mpGrid = document.getElementById('marketplaceGrid');
    const mpLoading = document.getElementById('mpLoading');
    const mpEmpty = document.getElementById('mpEmpty');
    const btnRefresh = document.getElementById('btnRefresh');

    // Modal elements
    const locationModal = document.getElementById('locationModal');
    const closeLocationModal = document.getElementById('closeLocationModal');
    const modalItemDetails = document.getElementById('modalItemDetails');

    const gsUser = JSON.parse(localStorage.getItem('gsUser') || 'null');

    /* ---------- Fetch items from MongoDB ---------- */
    let userLat = null;
    let userLng = null;
    let locationRequested = false;

    async function fetchItems() {
        const search = mpSearch.value.trim();
        const range = mpRange.value;
        mpRangeLabel.textContent = range;

        mpGrid.innerHTML = '';
        mpLoading.style.display = 'flex';
        mpEmpty.style.display = 'none';
        mpGrid.appendChild(mpLoading);

        // Get location on first load to calculate true distance before fetching
        if (!locationRequested && navigator.geolocation) {
            locationRequested = true;
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    userLat = pos.coords.latitude;
                    userLng = pos.coords.longitude;
                    performFetch(search, range);
                },
                (err) => {
                    console.warn('Geolocation error:', err);
                    performFetch(search, range);
                },
                { timeout: 5000 }
            );
            return; // Exit fetchItems completely here, performFetch will be called by the callbacks
        }

        // Only run immediately if location was already requested and cached
        performFetch(search, range);
    }

    async function performFetch(search, range) {
        try {
            let url = '/api/items?range=' + range;
            if (search) url += '&search=' + encodeURIComponent(search);
            if (userLat !== null && userLng !== null) {
                url += `&lat=${userLat}&lng=${userLng}`;
            }

            const res = await fetch(url);
            const items = await res.json();

            mpGrid.innerHTML = '';

            if (items.length === 0) {
                mpEmpty.style.display = 'block';
                return;
            }

            items.forEach(item => {
                const card = document.createElement('div');
                card.className = 'mp-item-card';

                const imgContent = item.imageUrl
                    ? `<img src="${item.imageUrl}" alt="${item.name}" style="width:100%;height:160px;object-fit:cover;" />`
                    : `<div class="mp-item-img">${getCategoryIcon(item.category)}</div>`;

                const isOwnItem = gsUser && item.userId === gsUser._id;
                const buyBtn = gsUser && !isOwnItem
                    ? `<button class="btn btn-primary btn-sm mp-buy-btn" data-id="${item._id}">🛒 Buy</button>`
                    : isOwnItem
                        ? `<span class="mp-own-badge">Your Item</span>`
                        : '';

                const hasLocation = item.location && item.location.lat != null && item.location.lng != null;
                const locationBtn = hasLocation
                    ? `<button class="btn btn-outline btn-sm mp-loc-btn" data-lat="${item.location.lat}" data-lng="${item.location.lng}" data-name="${item.name.replace(/"/g, '&quot;')}">📍 View</button>`
                    : '';

                card.innerHTML = `
          ${imgContent}
          <div class="mp-item-info">
            <h4>${item.name}</h4>
            <div class="mp-item-meta">
              <span class="mp-item-price">₹${item.price}</span>
              <span class="mp-item-distance">📍 ${item.distance != null ? item.distance : 0} km</span>
            </div>
            <div class="mp-item-meta">
              <span class="mp-item-category">${item.category}</span>
              <span class="mp-item-condition">${item.condition || 'Good'}</span>
              <span class="mp-item-quantity" style="margin-left:auto; font-weight: 500; font-size: 0.8rem; padding: 2px 6px; background: var(--bg-card); border-radius: 4px;">Qty: ${item.quantity || 1}</span>
            </div>
            ${item.description ? `<p class="mp-item-desc">${item.description}</p>` : ''}
            <div style="display: flex; gap: 8px; margin-top: 12px; align-items: center;">
                ${locationBtn}
                ${buyBtn}
            </div>
          </div>
        `;
                mpGrid.appendChild(card);
            });

            // Attach view location listeners
            document.querySelectorAll('.mp-loc-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const lat = parseFloat(btn.dataset.lat);
                    const lng = parseFloat(btn.dataset.lng);
                    const name = btn.dataset.name;
                    openLocationModal(name, lat, lng);
                });
            });

            // Attach buy listeners
            document.querySelectorAll('.mp-buy-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    if (!gsUser) { alert('Please login first'); return; }
                    btn.disabled = true;
                    btn.textContent = '⏳ Processing...';
                    try {
                        const res = await fetch('/api/items/' + btn.dataset.id + '/buy', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ buyerId: gsUser._id })
                        });
                        if (res.ok) {
                            btn.textContent = '✅ Purchased!';
                            btn.classList.add('btn-bought');
                            setTimeout(fetchItems, 1200);
                        } else {
                            const data = await res.json();
                            alert(data.error || 'Could not purchase');
                            btn.disabled = false;
                            btn.textContent = '🛒 Buy';
                        }
                    } catch (err) {
                        alert('Network error');
                        btn.disabled = false;
                        btn.textContent = '🛒 Buy';
                    }
                });
            });

        } catch (err) {
            mpGrid.innerHTML = `<p style="color:var(--text-muted);grid-column:1/-1;text-align:center;padding:40px">Could not load items. Make sure the server is running.</p>`;
        }
    }

    function getCategoryIcon(category) {
        const icons = {
            'Plastic': '🧴', 'Glass': '🫙', 'Metal': '🪣', 'Wood': '🪵',
            'Paper': '📦', 'Textile': '👜', 'Ceramic': '🏺', 'Electronics': '📱',
            'Rubber': '🛞', 'Furniture': '🪑', 'Organic': '🍎', 'Chemical': '🧪',
            'Other': '📦'
        };
        return icons[category] || '📦';
    }

    /* ---------- Event listeners ---------- */
    let debounceTimer;
    mpSearch.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchItems, 400);
    });

    mpRange.addEventListener('input', () => {
        mpRangeLabel.textContent = mpRange.value;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchItems, 400);
    });

    btnRefresh.addEventListener('click', fetchItems);

    /* ---------- Modal Logic ---------- */
    function openLocationModal(itemName, lat, lng) {
        modalItemDetails.innerHTML = `<strong>${itemName}</strong> is located at coordinates: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        locationModal.style.display = 'block';

        const mapContainer = document.getElementById('itemLocationMap');

        // Use a simple, robust OpenStreetMap iframe to avoid any CSS layout conflicts with Leaflet tiles
        const bboxSize = 0.01;
        const bbox = `${lng - bboxSize},${lat - bboxSize},${lng + bboxSize},${lat + bboxSize}`;
        const embedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;

        mapContainer.innerHTML = `
            <iframe 
                width="100%" 
                height="100%" 
                frameborder="0" 
                scrolling="no" 
                marginheight="0" 
                marginwidth="0" 
                src="${embedUrl}" 
                style="border: 1px solid var(--glass-border); border-radius: var(--radius-sm); width: 100%; height: 350px;">
            </iframe>
            <div style="text-align: right; margin-top: 8px;">
                <small><a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=16/${lat}/${lng}" target="_blank" style="color: var(--accent);">View Larger Map</a></small>
            </div>
        `;
    }

    closeLocationModal.addEventListener('click', () => {
        locationModal.style.display = 'none';
    });

    // Close modal when clicking outside of it
    window.addEventListener('click', (event) => {
        if (event.target == locationModal) {
            locationModal.style.display = 'none';
        }
    });

    // Initial load
    fetchItems();

});
