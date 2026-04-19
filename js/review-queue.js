document.addEventListener('DOMContentLoaded', () => {
    // UI Elements
    const tabReviewQueue = document.getElementById('tabReviewQueue');
    const tabRecentLogs = document.getElementById('tabRecentLogs');
    const paneReviewQueue = document.getElementById('paneReviewQueue');
    const paneRecentLogs = document.getElementById('paneRecentLogs');
    const pendingReviewCount = document.getElementById('pendingReviewCount');
    const reviewQueueBadge = document.getElementById('reviewQueueBadge');
    const reviewTableBody = document.getElementById('reviewTableBody');
    const reviewEmptyState = document.getElementById('reviewEmptyState');

    let pollInterval = null;
    let isReviewQueueActive = true;

    // Tab switching
    if (tabReviewQueue && tabRecentLogs) {
        tabReviewQueue.addEventListener('click', () => {
            isReviewQueueActive = true;
            tabReviewQueue.classList.add('active');
            tabRecentLogs.classList.remove('active');
            paneReviewQueue.style.display = 'block';
            paneRecentLogs.style.display = 'none';
        });

        tabRecentLogs.addEventListener('click', () => {
            isReviewQueueActive = false;
            tabRecentLogs.classList.add('active');
            tabReviewQueue.classList.remove('active');
            paneRecentLogs.style.display = 'block';
            paneReviewQueue.style.display = 'none';
        });
    }

    async function fetchReviewQueue() {
        if (!window.gatiqFetchAPI) return;
        
        try {
            // Include status filter to only get pending reviews
            const reviews = await window.gatiqFetchAPI('/scan/reviews?status=pending_review');
            updateReviewUI(reviews);
        } catch (err) {
            console.error('Failed to fetch review queue:', err);
        }
    }

    function parseHints(jsonStr) {
        if (!jsonStr) return [];
        try {
            return JSON.parse(jsonStr) || [];
        } catch {
            return [];
        }
    }
    
    function updateReviewUI(reviews) {
        if (!reviewTableBody || !pendingReviewCount) return;

        // Update counts
        const count = reviews.length;
        pendingReviewCount.textContent = count;
        if (reviewQueueBadge) {
            reviewQueueBadge.textContent = count;
            reviewQueueBadge.style.display = count > 0 ? 'inline-block' : 'none';
        }

        if (count === 0) {
            reviewTableBody.innerHTML = '';
            if (reviewEmptyState) reviewEmptyState.style.display = 'block';
            if (document.getElementById('reviewTable')) document.getElementById('reviewTable').style.display = 'none';
            return;
        }

        if (reviewEmptyState) reviewEmptyState.style.display = 'none';
        if (document.getElementById('reviewTable')) document.getElementById('reviewTable').style.display = 'table';

        // Get currently selected area for options
        const areaSelect = document.getElementById('deploymentArea');
        const activeArea = areaSelect ? areaSelect.value : 'Residential Society';
        const config = window.DeploymentConfig ? window.DeploymentConfig[activeArea] : null;
        
        const purposeOptions = config ? config.purposeOptions : ['Guest', 'Delivery', 'Staff', 'Other'];
        const taggingOptions = config ? config.taggingOptions : ['Resident', 'Non-Resident', 'Staff'];

        // Render rows
        reviewTableBody.innerHTML = reviews.map((r, idx) => {
            const timeStr = new Date(r.created_at).toLocaleString([], { 
                day: '2-digit', month: '2-digit', year: '2-digit',
                hour: '2-digit', minute: '2-digit' 
            });
            
            const flags = parseHints(r.duplicate_flags_json);
            let flagsHtml = flags.map(f => {
                if (f === 'already_inside') return `<span style="display:block; font-size:0.7rem; color:#f59e0b; margin-top:2px;">⚠️ In</span>`;
                if (f === 'recent_duplicate') return `<span style="display:block; font-size:0.7rem; color:#ef4444; margin-top:2px;">⚠️ Dup</span>`;
                return '';
            }).join('');

            return `
                <tr id="reviewRow_${r.id}">
                    <td>${idx + 1}</td>
                    <td><span style="font-size:0.85rem; font-weight:500;">${r.gate_no || '-'}</span></td>
                    <td>
                        <input type="text" class="form-input review-plate-input" id="plateInput_${r.id}" value="${r.detected_plate}" 
                            style="width: 110px; padding: 0.2rem 0.5rem; font-weight: bold; text-transform: uppercase; font-size:0.85rem; border-radius:4px;">
                        ${flagsHtml}
                    </td>
                    <td><span style="font-size:0.8rem; color:var(--text-secondary);">${timeStr}</span></td>
                    <td>
                        <select id="purposeInput_${r.id}" class="form-select" style="width:110px; padding: 0.2rem 0.4rem; font-size:0.8rem;">
                            ${purposeOptions.map(opt => `<option value="${opt}" ${r.purpose === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <select id="taggingInput_${r.id}" class="form-select" style="width:110px; padding: 0.2rem 0.4rem; font-size:0.8rem;">
                            ${taggingOptions.map(opt => `<option value="${opt}" ${r.tagging === opt ? 'selected' : ''}>${opt}</option>`).join('')}
                        </select>
                    </td>
                    <td>
                        <select id="dirInput_${r.id}" class="form-select" style="width:80px; padding: 0.2rem 0.4rem; font-size:0.8rem;">
                            <option value="Entry" ${r.direction==='Entry'?'selected':''}>Entry</option>
                            <option value="Exit" ${r.direction==='Exit'?'selected':''}>Exit</option>
                        </select>
                    </td>
                    <td><span style="font-size:0.85rem;">${r.vehicle_type || 'Car'}</span></td>
                    <td>
                        <div style="display:flex; gap:0.3rem; align-items:center;">
                            <button class="header-circle-btn" style="color:#059669; border-color:#6ee7b7; background:#d1fae5; width:26px; height:26px;" onclick="window.confirmReview(${r.id})" title="Confirm & Log">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                            <button class="header-circle-btn header-circle-btn--danger" style="width:26px; height:26px;" onclick="window.rejectReview(${r.id})" title="Reject">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // Actions attached to window so they can be called from onclick bindings
    window.confirmReview = async function(id) {
        if (!window.gatiqFetchAPI) return;
        const plateInput = document.getElementById(`plateInput_${id}`);
        const dirInput = document.getElementById(`dirInput_${id}`);
        const purposeInput = document.getElementById(`purposeInput_${id}`);
        const taggingInput = document.getElementById(`taggingInput_${id}`);
        
        try {
            await window.gatiqFetchAPI(`/scan/reviews/${id}/confirm`, {
                method: 'POST',
                body: JSON.stringify({
                    corrected_plate: (plateInput ? plateInput.value : '').toUpperCase(),
                    direction: dirInput ? dirInput.value : undefined,
                    purpose: purposeInput ? purposeInput.value : undefined,
                    tagging: taggingInput ? taggingInput.value : undefined
                })
            });
            if (window.gatiqShowToast) window.gatiqShowToast('Scan confirmed & logged.', 'success');
            // Optimistic deletion
            const el = document.getElementById(`reviewRow_${id}`);
            if (el) el.remove();
            
            // Reload logs using existing LogManager methods if available
            if (window.LogManager && window.LogManager.loadFromServer) {
                // Determine active area from the select dropdown if it exists
                const areaSelect = document.getElementById('deploymentArea');
                const area = areaSelect ? areaSelect.value : 'Residential Society';
                window.LogManager.loadFromServer(area).then(() => {
                    if (window.renderTable) window.renderTable();
                });
            }
        } catch (err) {
            if (window.gatiqShowToast) window.gatiqShowToast('Failed to confirm: ' + err.message, 'error');
            else alert('Failed to confirm.');
        }
    };

    window.rejectReview = async function(id) {
        if (!window.gatiqFetchAPI) return;
        try {
            await window.gatiqFetchAPI(`/scan/reviews/${id}/reject`, { method: 'POST' });
            if (window.gatiqShowToast) window.gatiqShowToast('Scan rejected.', 'info');
            const el = document.getElementById(`reviewRow_${id}`);
            if (el) el.remove();
        } catch (err) {
            if (window.gatiqShowToast) window.gatiqShowToast('Failed to reject: ' + err.message, 'error');
        }
    };

    window.markUnreadableReview = async function(id) {
        if (!window.gatiqFetchAPI) return;
        try {
            await window.gatiqFetchAPI(`/scan/reviews/${id}/unreadable`, { method: 'POST' });
            if (window.gatiqShowToast) window.gatiqShowToast('Scan marked unreadable.', 'warning');
            const el = document.getElementById(`reviewRow_${id}`);
            if (el) el.remove();
        } catch (err) {
            if (window.gatiqShowToast) window.gatiqShowToast('Action failed: ' + err.message, 'error');
        }
    };

    // Auto-polling timer
    function startPolling() {
        if (pollInterval) clearInterval(pollInterval);
        // Start polling after slight delay so app.js configures backend URL first
        setTimeout(() => {
            fetchReviewQueue();
            pollInterval = setInterval(fetchReviewQueue, 3500);
        }, 1500);
    }
    
    // Kickoff
    startPolling();
});
