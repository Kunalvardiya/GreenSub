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
    let analysisData = null; // Store the AI analysis result

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

    /* ---------- Analyze using Gemini API ---------- */
    btnAnalyze.addEventListener('click', async () => {
        if (!uploadedFile) return;
        btnAnalyze.disabled = true;
        btnAnalyze.textContent = '⏳ Analyzing with AI...';

        try {
            const formData = new FormData();
            formData.append('image', uploadedFile);

            const res = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!res.ok) {
                alert('Analysis error: ' + (data.error || 'Unknown error'));
                btnAnalyze.disabled = false;
                btnAnalyze.textContent = '🔬 Analyze Waste';
                return;
            }

            analysisData = data;
            hideAllResults();

            if (data.route === 'marketplace') {
                showMarketplaceResult(data);
            } else {
                showTrashResult(data);
            }

            btnAnalyze.style.display = 'none';
            btnReset.style.display = 'inline-flex';

        } catch (err) {
            alert('Network error: ' + err.message);
            btnAnalyze.disabled = false;
            btnAnalyze.textContent = '🔬 Analyze Waste';
        }
    });

    function hideAllResults() {
        resultPlaceholder.style.display = 'none';
        resultMarketplace.style.display = 'none';
        resultTrash.style.display = 'none';
        resultConfirmation.style.display = 'none';
    }

    function showMarketplaceResult(item) {
        document.getElementById('mpItemName').textContent = item.name;
        document.getElementById('mpCategory').textContent = item.category;
        document.getElementById('mpCondition').textContent = item.condition;
        document.getElementById('mpValue').textContent = '₹' + item.marketValue;
        document.getElementById('mpScrapValue').textContent = '₹' + (item.scrapValue || 0);
        document.getElementById('mpScore').textContent = item.reuseScore + '%';
        document.getElementById('mpScoreFill').style.width = item.reuseScore + '%';
        document.getElementById('mpTip').textContent = item.tip;

        // Pre-fill listing form
        document.getElementById('listName').value = item.name;

        const priceInput = document.getElementById('listPrice');
        priceInput.value = item.marketValue;
        priceInput.max = item.marketValue;

        const priceHint = document.getElementById('priceHint');
        if (priceHint) {
            priceHint.textContent = `Max: ₹${item.marketValue}`;
            priceHint.style.fontSize = '0.75rem';
            priceHint.style.color = 'var(--text-muted)';
            priceHint.style.marginTop = '4px';
            priceHint.style.display = 'block';
        }

        // Set category dropdown
        const catSelect = document.getElementById('listCategory');
        for (let i = 0; i < catSelect.options.length; i++) {
            if (catSelect.options[i].value === item.category) {
                catSelect.selectedIndex = i;
                break;
            }
        }
        document.getElementById('listCondition').value = item.condition;

        resultMarketplace.style.display = 'block';
    }

    function showTrashResult(item) {
        document.getElementById('tcItemName').textContent = item.name;
        document.getElementById('tcCategory').textContent = item.category;
        document.getElementById('tcMaterial').textContent = item.material || 'Mixed';

        document.getElementById('tcScrapValue').textContent = '₹' + (item.scrapValue || 0);
        document.getElementById('tcSellValue').textContent = '₹' + (item.marketValue || 0);

        document.getElementById('tcScore').textContent = item.reuseScore + '%';
        document.getElementById('tcScoreFill').style.width = item.reuseScore + '%';
        document.getElementById('tcPartner').textContent = item.partner || 'General Recycling';
        document.getElementById('tcTip').textContent = item.tip || '♻️ This item should be sent for recycling.';

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        const defaultDate = `${yyyy}-${mm}-${dd}`;

        const fpDate = document.getElementById('pickupDate');
        if (fpDate._flatpickr) fpDate._flatpickr.setDate(defaultDate);
        else fpDate.value = defaultDate;

        const fpTime = document.getElementById('pickupTime');
        if (fpTime._flatpickr) fpTime._flatpickr.setDate('10:00');
        else fpTime.value = '10:00';

        resultTrash.style.display = 'block';
    }

    /* ---------- Switch to Trash (From Marketplace) ---------- */
    document.getElementById('btnSwitchToTrash').addEventListener('click', () => {
        resultMarketplace.style.display = 'none';

        const convertedItem = {
            name: analysisData.name,
            category: analysisData.category,
            material: analysisData.material || analysisData.category,
            reuseScore: analysisData.reuseScore,
            partner: analysisData.partner || 'GreenSub Partner Network',
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
            const gsUser = JSON.parse(localStorage.getItem('gsUser') || 'null');
            const formData = new FormData();
            formData.append('image', uploadedFile);
            formData.append('name', document.getElementById('listName').value);
            formData.append('price', document.getElementById('listPrice').value);
            formData.append('category', document.getElementById('listCategory').value);
            formData.append('condition', document.getElementById('listCondition').value);
            formData.append('distance', document.getElementById('listDistance').value || '3');
            formData.append('description', document.getElementById('listDescription').value || '');
            formData.append('reuseScore', document.getElementById('mpScore').textContent.replace('%', ''));
            if (gsUser) formData.append('userId', gsUser._id);

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
            const gsUser2 = JSON.parse(localStorage.getItem('gsUser') || 'null');
            const body = {
                itemName: document.getElementById('tcItemName').textContent,
                category: document.getElementById('tcCategory').textContent,
                material: document.getElementById('tcMaterial').textContent,
                partner: document.getElementById('tcPartner').textContent,
                date, time,
                userId: gsUser2 ? gsUser2._id : null
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
        analysisData = null;
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
