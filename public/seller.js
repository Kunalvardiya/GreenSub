/* ===== GreenSub – seller.js ===== */

document.addEventListener('DOMContentLoaded', () => {

    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const imagePreview = document.getElementById('imagePreview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    const btnAnalyze = document.getElementById('btnAnalyze');
    const btnReset = document.getElementById('btnReset');

    const resultPlaceholder = document.getElementById('resultPlaceholder');
    const resultMarketplace = document.getElementById('resultMarketplace');
    const resultTrash = document.getElementById('resultTrash');
    const resultConfirmation = document.getElementById('resultConfirmation');

    let uploadedFile = null;

    /* ---------- Initialize Flatpickr ---------- */
    if (typeof flatpickr !== 'undefined') {
        flatpickr("#pickupDate", {
            dateFormat: "Y-m-d",
            minDate: "today",
            disableMobile: "true"
        });
        flatpickr("#pickupTime", {
            enableTime: true,
            noCalendar: true,
            dateFormat: "H:i",
            time_24hr: true,
            disableMobile: "true"
        });
    }

    /* ---------- Upload handlers ---------- */
    uploadArea.addEventListener('click', () => fileInput.click());

    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        if (e.dataTransfer.files.length && e.dataTransfer.files[0].type.startsWith('image/')) {
            handleFile(e.dataTransfer.files[0]);
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) handleFile(fileInput.files[0]);
    });

    function handleFile(file) {
        uploadedFile = file;
        const reader = new FileReader();
        reader.onload = (e) => {
            imagePreview.src = e.target.result;
            imagePreview.classList.add('show');
            uploadPlaceholder.style.display = 'none';
            btnAnalyze.disabled = false;
        };
        reader.readAsDataURL(file);
    }

    /* ---------- Static prediction data ---------- */
    const marketplaceItems = [
        { name: 'Plastic Water Bottle', category: 'Plastic', condition: 'Good', value: 25, score: 72, tip: '💡 This bottle is still in good condition. Listing it allows someone to reuse it instead of buying new.' },
        { name: 'Glass Jar', category: 'Glass', condition: 'Excellent', value: 40, score: 85, tip: '💡 Glass jars are highly reusable for storage, crafts, and décor. High demand!' },
        { name: 'Wooden Crate', category: 'Wood', condition: 'Good', value: 60, score: 78, tip: '💡 Wooden crates are popular for DIY furniture and garden planters.' },
        { name: 'Metal Water Bottle', category: 'Metal', condition: 'Excellent', value: 80, score: 88, tip: '💡 Metal bottles last a long time and have great resale value.' },
        { name: 'Cotton Tote Bag', category: 'Textile', condition: 'Good', value: 35, score: 70, tip: '💡 Reusable bags are always in demand. Great for eco-conscious buyers.' }
    ];

    const trashItems = [
        { name: 'Crushed Aluminum Can', category: 'Metal', material: 'Aluminum', score: 28, partner: 'Gravita India', tip: '♻️ Send for metal recycling. Gravita India processes aluminum scrap.' },
        { name: 'Torn Cardboard Box', category: 'Paper', material: 'Corrugated Card', score: 35, partner: 'ITC WOW', tip: '♻️ Damaged cardboard is easily recyclable. Schedule a pickup.' },
        { name: 'Broken Styrofoam', category: 'Plastic', material: 'Expanded Polystyrene', score: 12, partner: 'Nepra Resource Management', tip: '♻️ Styrofoam needs specialized recycling. Use a certified partner.' },
        { name: 'Old Newspaper Stack', category: 'Paper', material: 'Newsprint', score: 22, partner: 'ITC WOW', tip: '♻️ Newspaper is great for paper recycling. Keep it dry for best quality.' }
    ];

    /* ---------- Analyze ---------- */
    btnAnalyze.addEventListener('click', () => {
        if (!uploadedFile) return;
        btnAnalyze.disabled = true;
        btnAnalyze.textContent = '⏳ Analyzing...';

        setTimeout(() => {
            const isMarketplace = Math.random() > 0.4; // ~60% chance marketplace
            hideAllResults();
            if (isMarketplace) {
                showMarketplaceResult();
            } else {
                showTrashResult();
            }
            btnAnalyze.style.display = 'none';
            btnReset.style.display = 'inline-flex';
        }, 1800);
    });

    function hideAllResults() {
        resultPlaceholder.style.display = 'none';
        resultMarketplace.style.display = 'none';
        resultTrash.style.display = 'none';
        resultConfirmation.style.display = 'none';
    }

    function showMarketplaceResult() {
        const item = marketplaceItems[Math.floor(Math.random() * marketplaceItems.length)];
        document.getElementById('mpItemName').textContent = item.name;
        document.getElementById('mpCategory').textContent = item.category;
        document.getElementById('mpCondition').textContent = item.condition;
        document.getElementById('mpValue').textContent = '₹' + item.value;
        document.getElementById('mpScore').textContent = item.score + '%';
        document.getElementById('mpScoreFill').style.width = item.score + '%';
        document.getElementById('mpTip').textContent = item.tip;

        // Pre-fill listing form
        document.getElementById('listName').value = item.name;

        const priceInput = document.getElementById('listPrice');
        priceInput.value = item.value;
        priceInput.max = item.value; // Prevent user from increasing price above estimate

        const priceHint = document.getElementById('priceHint');
        if (priceHint) {
            priceHint.textContent = `Max: ₹${item.value}`;
            priceHint.style.fontSize = '0.75rem';
            priceHint.style.color = 'var(--text-muted)';
            priceHint.style.marginTop = '4px';
            priceHint.style.display = 'block';
        }

        document.getElementById('listCategory').value = item.category;
        document.getElementById('listCondition').value = item.condition;

        resultMarketplace.style.display = 'block';
    }

    function showTrashResult(forcedItem = null) {
        const item = forcedItem || trashItems[Math.floor(Math.random() * trashItems.length)];
        document.getElementById('tcItemName').textContent = item.name;
        document.getElementById('tcCategory').textContent = item.category;
        document.getElementById('tcMaterial').textContent = item.material || 'Mixed';

        let scoreVal = item.score;
        if (typeof scoreVal === 'string' && scoreVal.endsWith('%')) scoreVal = scoreVal.replace('%', '');

        document.getElementById('tcScore').textContent = scoreVal + '%';
        document.getElementById('tcScoreFill').style.width = scoreVal + '%';
        document.getElementById('tcPartner').textContent = item.partner || 'General Recycling';
        document.getElementById('tcTip').textContent = item.tip || '♻️ Opted for recycling instead of marketplace listing.';

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        const defaultDateTime = `${yyyy}-${mm}-${dd} 10:00`;

        const fpDate = document.getElementById('pickupDate');
        if (fpDate._flatpickr) fpDate._flatpickr.setDate(defaultDateTime.split(' ')[0]);
        else fpDate.value = defaultDateTime.split(' ')[0];

        const fpTime = document.getElementById('pickupTime');
        if (fpTime._flatpickr) fpTime._flatpickr.setDate(defaultDateTime.split(' ')[1]);
        else fpTime.value = defaultDateTime.split(' ')[1];

        resultTrash.style.display = 'block';
    }

    /* ---------- Switch to Trash (From Marketplace) ---------- */
    document.getElementById('btnSwitchToTrash').addEventListener('click', () => {
        resultMarketplace.style.display = 'none';

        const itemName = document.getElementById('listName').value || document.getElementById('mpItemName').textContent;
        const itemCategory = document.getElementById('listCategory').value || document.getElementById('mpCategory').textContent;
        const itemScore = document.getElementById('mpScore').textContent;

        const convertedItem = {
            name: itemName,
            category: itemCategory,
            material: itemCategory, // Fallback material to category
            score: itemScore,
            partner: 'GreenSub Partner network',
            tip: '♻️ Scheduled for pickup. Thank you for choosing to recycle!'
        };

        showTrashResult(convertedItem);
    });

    /* ---------- List on Marketplace (POST to MongoDB) ---------- */
    document.getElementById('btnListItem').addEventListener('click', async () => {
        const btn = document.getElementById('btnListItem');
        const priceInput = document.getElementById('listPrice');

        if (Number(priceInput.value) > Number(priceInput.max)) {
            alert(`Price cannot exceed the estimated market value of ₹${priceInput.max}`);
            return;
        }

        btn.disabled = true;
        btn.textContent = '⏳ Listing...';

        try {
            const formData = new FormData();
            formData.append('image', uploadedFile);
            formData.append('name', document.getElementById('listName').value);
            formData.append('price', document.getElementById('listPrice').value);
            formData.append('category', document.getElementById('listCategory').value);
            formData.append('condition', document.getElementById('listCondition').value);
            formData.append('distance', document.getElementById('listDistance').value || '3');
            formData.append('description', document.getElementById('listDescription').value || '');
            formData.append('reuseScore', document.getElementById('mpScore').textContent.replace('%', ''));

            const res = await fetch('/api/items', { method: 'POST', body: formData });
            const data = await res.json();

            if (res.ok) {
                hideAllResults();
                document.getElementById('confirmTitle').textContent = '🎉 Listed on Marketplace!';
                document.getElementById('confirmMsg').textContent =
                    `"${data.name}" has been listed at ₹${data.price}. It's now visible to nearby buyers on the marketplace.`;
                resultConfirmation.style.display = 'block';
            } else {
                alert('Error: ' + (data.error || 'Could not list item'));
                btn.disabled = false;
                btn.textContent = '🛒 List on Marketplace';
            }
        } catch (err) {
            alert('Network error: ' + err.message);
            btn.disabled = false;
            btn.textContent = '🛒 List on Marketplace';
        }
    });

    /* ---------- Schedule Pickup (POST to API) ---------- */
    document.getElementById('btnSchedulePickup').addEventListener('click', async () => {
        const btn = document.getElementById('btnSchedulePickup');
        const date = document.getElementById('pickupDate').value;
        const time = document.getElementById('pickupTime').value;

        if (!date || !time) { alert('Please select a date and time.'); return; }

        btn.disabled = true;
        btn.textContent = '⏳ Scheduling...';

        try {
            const body = {
                itemName: document.getElementById('tcItemName').textContent,
                category: document.getElementById('tcCategory').textContent,
                material: document.getElementById('tcMaterial').textContent,
                partner: document.getElementById('tcPartner').textContent,
                date, time
            };

            const res = await fetch('/api/pickups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                hideAllResults();
                document.getElementById('confirmTitle').textContent = '📤 Pickup Scheduled!';
                document.getElementById('confirmMsg').textContent =
                    `A notification has been sent to the trash collector. Pickup is scheduled for ${date} at ${time}. The collector will route this to ${body.partner} for recycling.`;
                resultConfirmation.style.display = 'block';
            } else {
                alert('Error scheduling pickup');
                btn.disabled = false;
                btn.textContent = '📤 Notify Trash Collector';
            }
        } catch (err) {
            alert('Network error: ' + err.message);
            btn.disabled = false;
            btn.textContent = '📤 Notify Trash Collector';
        }
    });

    /* ---------- Reset ---------- */
    btnReset.addEventListener('click', () => {
        uploadedFile = null;
        fileInput.value = '';
        imagePreview.src = '';
        imagePreview.classList.remove('show');
        uploadPlaceholder.style.display = '';
        hideAllResults();
        resultPlaceholder.style.display = '';
        btnAnalyze.textContent = '🔬 Analyze Waste';
        btnAnalyze.disabled = true;
        btnAnalyze.style.display = 'inline-flex';
        btnReset.style.display = 'none';
    });

});
