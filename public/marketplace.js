/* ===== GreenSub – marketplace.js ===== */

document.addEventListener('DOMContentLoaded', () => {

    const mpSearch = document.getElementById('mpSearch');
    const mpRange = document.getElementById('mpRange');
    const mpRangeLabel = document.getElementById('mpRangeLabel');
    const mpGrid = document.getElementById('marketplaceGrid');
    const mpLoading = document.getElementById('mpLoading');
    const mpEmpty = document.getElementById('mpEmpty');
    const btnRefresh = document.getElementById('btnRefresh');

    const gsUser = JSON.parse(localStorage.getItem('gsUser') || 'null');

    /* ---------- Fetch items from MongoDB ---------- */
    async function fetchItems() {
        const search = mpSearch.value.trim();
        const range = mpRange.value;
        mpRangeLabel.textContent = range;

        mpGrid.innerHTML = '';
        mpLoading.style.display = 'flex';
        mpEmpty.style.display = 'none';
        mpGrid.appendChild(mpLoading);

        try {
            let url = '/api/items?range=' + range;
            if (search) url += '&search=' + encodeURIComponent(search);

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

                card.innerHTML = `
          ${imgContent}
          <div class="mp-item-info">
            <h4>${item.name}</h4>
            <div class="mp-item-meta">
              <span class="mp-item-price">₹${item.price}</span>
              <span class="mp-item-distance">📍 ${item.distance || 0} km</span>
            </div>
            <div class="mp-item-meta">
              <span class="mp-item-category">${item.category}</span>
              <span class="mp-item-condition">${item.condition || 'Good'}</span>
            </div>
            ${item.description ? `<p class="mp-item-desc">${item.description}</p>` : ''}
            ${buyBtn}
          </div>
        `;
                mpGrid.appendChild(card);
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
            'Rubber': '🛞', 'Other': '📦'
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

    // Initial load
    fetchItems();

});
