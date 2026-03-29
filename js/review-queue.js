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

        // Render rows
        reviewTableBody.innerHTML = reviews.map(r => {
            const timeStr = new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            // Quality UI
            let qualityHtml = '';
            if (r.quality_level === 'poor') {
                qualityHtml = `<span class="stat-badge" style="background:#fee2e2; color:#ef4444; border-color:#fca5a5;">Poor Quality</span>`;
            } else if (r.quality_level === 'fair') {
                qualityHtml = `<span class="stat-badge" style="background:#fef3c7; color:#d97706; border-color:#fcd34d;">Fair</span>`;
            } else {
                qualityHtml = `<span class="stat-badge" style="background:#d1fae5; color:#059669; border-color:#6ee7b7;">Good</span>`;
            }

            // Duplicate flags
            const flags = parseHints(r.duplicate_flags_json);
            let flagsHtml = flags.map(f => {
                if (f === 'already_inside') return `<span style="display:block; font-size:0.75rem; color:#f59e0b; margin-top:2px;">⚠️ Already Inside</span>`;
                if (f === 'recent_duplicate') return `<span style="display:block; font-size:0.75rem; color:#ef4444; margin-top:2px;">⚠️ Recent Duplicate</span>`;
                return '';
            }).join('');

            return `
                <tr id="reviewRow_${r.id}">
                    <td>
                        <input type="text" class="form-input review-plate-input" id="plateInput_${r.id}" value="${r.detected_plate}" style="width: 130px; padding: 0.3rem 0.6rem; font-weight: bold; text-transform: uppercase;">
                        ${flagsHtml}
                    </td>
                    <td>${qualityHtml}</td>
                    <td>
                        <select id="dirInput_${r.id}" class="form-select" style="width:90px; padding: 0.2rem 0.5rem; font-size:0.85rem;">
                            <option value="Entry" ${r.direction==='Entry'?'selected':''}>Entry</option>
                            <option value="Exit" ${r.direction==='Exit'?'selected':''}>Exit</option>
                        </select>
                    </td>
                    <td>
                        <span style="font-size: 0.8rem; color: var(--text-secondary);">${r.vehicle_type || '-'}</span><br>
                        <span style="font-size: 0.75rem; color: var(--text-tertiary);">${timeStr}</span>
                    </td>
                    <td>
                        <div style="display:flex; gap:0.4rem; align-items:center;">
                            <button class="header-circle-btn" style="color:#059669; border-color:#6ee7b7; background:#d1fae5;" onclick="window.confirmReview(${r.id})" title="Confirm & Log">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>
                            <button class="header-circle-btn header-circle-btn--danger" onclick="window.rejectReview(${r.id})" title="Reject (Spam/False Positive)">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                            <button class="header-circle-btn" style="color:#64748b; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem;" onclick="window.markUnreadableReview(${r.id})">Unreadable</button>
                            <button class="header-circle-btn" style="color:#d97706; border-color:#fcd34d; background:#fef3c7;" onclick="window.logIncident(${r.id}, null, '${r.detected_plate}')" title="Log Incident / Tailgating">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
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
        
        try {
            await window.gatiqFetchAPI(`/scan/reviews/${id}/confirm`, {
                method: 'POST',
                body: JSON.stringify({
                    corrected_plate: (plateInput ? plateInput.value : '').toUpperCase(),
                    direction: dirInput ? dirInput.value : undefined
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
