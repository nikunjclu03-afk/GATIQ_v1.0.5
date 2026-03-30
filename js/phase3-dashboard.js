/**
 * Phase 3: Analytics, Report Center, Plan Feature Gating — Frontend Logic
 */
document.addEventListener('DOMContentLoaded', () => {

    // ───── Analytics Dashboard ─────
    const analyticsMonth = document.getElementById('analyticsMonth');
    const btnRefreshAnalytics = document.getElementById('btnRefreshAnalytics');

    // Set default month to current
    if (analyticsMonth) {
        const now = new Date();
        analyticsMonth.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }

    async function fetchAnalytics() {
        if (!window.gatiqFetchAPI) return;
        try {
            const month = analyticsMonth ? analyticsMonth.value : '';
            let dateFrom = '', dateTo = '';
            if (month) {
                const [y, m] = month.split('-');
                dateFrom = `${y}-${m}-01`;
                const lastDay = new Date(parseInt(y), parseInt(m), 0).getDate();
                dateTo = `${y}-${m}-${lastDay}T23:59:59`;
            }
            const params = new URLSearchParams();
            if (dateFrom) params.set('date_from', dateFrom);
            if (dateTo) params.set('date_to', dateTo);

            const data = await window.gatiqFetchAPI(`/analytics/summary?${params.toString()}`);

            // Populate UI
            const el = (id) => document.getElementById(id);
            if (el('anTotalEntries')) el('anTotalEntries').textContent = data.total_entries || 0;
            if (el('anTotalExits')) el('anTotalExits').textContent = data.total_exits || 0;
            if (el('anUniqueVehicles')) el('anUniqueVehicles').textContent = data.unique_vehicles || 0;
            if (el('anAvgStay')) el('anAvgStay').textContent = data.avg_stay_minutes != null ? data.avg_stay_minutes : '—';
            if (el('anOverstays')) el('anOverstays').textContent = data.overstay_count || 0;
            if (el('anWhitelistHits')) el('anWhitelistHits').textContent = data.whitelist_hits || 0;
            if (el('anCorrectionRate')) el('anCorrectionRate').textContent = (data.correction_rate != null ? data.correction_rate + '%' : '0%');
            if (el('anManualVsScan')) el('anManualVsScan').textContent = `${data.manual_entries || 0} / ${data.scan_entries || 0}`;

            // Top repeat vehicles
            const repeatContainer = el('anTopRepeatVehicles');
            if (repeatContainer && data.top_repeat_vehicles && data.top_repeat_vehicles.length > 0) {
                repeatContainer.innerHTML = data.top_repeat_vehicles.map(v =>
                    `<span style="background:var(--bg-glass-strong); padding:0.2rem 0.5rem; border-radius:20px; border:1px solid var(--border-color);">
                        <strong>${v.plate}</strong> × ${v.count}
                    </span>`
                ).join('');
            } else if (repeatContainer) {
                repeatContainer.innerHTML = '<span style="color:var(--text-tertiary);">No repeat vehicles found.</span>';
            }
        } catch (err) {
            console.error('Analytics fetch error:', err);
        }
    }

    if (btnRefreshAnalytics) btnRefreshAnalytics.addEventListener('click', fetchAnalytics);
    // Auto-fetch on load with delay
    setTimeout(fetchAnalytics, 4000);

    // ───── Report Center / CSV Export ─────
    const btnExportCsv = document.getElementById('btnExportCsv');
    const exportJobsList = document.getElementById('exportJobsList');

    if (btnExportCsv) {
        btnExportCsv.addEventListener('click', async () => {
            if (!window.gatiqFetchAPI) return;

            const dateFrom = document.getElementById('exportDateFrom')?.value || '';
            const dateTo = document.getElementById('exportDateTo')?.value || '';
            const direction = document.getElementById('exportDirection')?.value || '';

            btnExportCsv.disabled = true;
            btnExportCsv.textContent = 'Generating...';

            try {
                const result = await window.gatiqFetchAPI('/reports/export', {
                    method: 'POST',
                    body: JSON.stringify({
                        export_type: 'csv',
                        date_from: dateFrom || null,
                        date_to: dateTo ? dateTo + 'T23:59:59' : null,
                        direction: direction || null,
                    })
                });

                if (window.gatiqShowToast) {
                    window.gatiqShowToast(`CSV exported! ${result.total_rows} rows generated.`, 'success');
                }

                // Try to trigger download
                if (result.id) {
                    let baseUrl = 'http://127.0.0.1:8001';
                    const urlInput = document.getElementById('backendApiUrl');
                    if (urlInput && urlInput.value) baseUrl = urlInput.value.trim();

                    const downloadLink = document.createElement('a');
                    downloadLink.href = `${baseUrl}/reports/export/download/${result.id}?api_key=7t%23K9!vP%242wL5*G8%5Em1%26Q4%2BZ7xR0_B3%23`;
                    downloadLink.download = `gatiq_export_${result.id}.csv`;
                    downloadLink.click();
                }

                // Refresh export jobs list
                loadExportJobs();

            } catch (err) {
                if (window.gatiqShowToast) window.gatiqShowToast('Export failed: ' + err.message, 'error');
            } finally {
                btnExportCsv.disabled = false;
                btnExportCsv.innerHTML = '<i data-lucide="download" style="width:14px;height:14px;"></i> Export CSV';
                if (window.lucide) lucide.createIcons();
            }
        });
    }

    async function loadExportJobs() {
        if (!window.gatiqFetchAPI || !exportJobsList) return;
        try {
            const jobs = await window.gatiqFetchAPI('/reports/export/jobs?limit=5');
            if (!jobs || jobs.length === 0) {
                exportJobsList.innerHTML = '<span style="color:var(--text-tertiary);">No exports generated yet.</span>';
                return;
            }
            exportJobsList.innerHTML = jobs.map(j => {
                const statusColor = j.status === 'completed' ? '#059669' : j.status === 'failed' ? '#ef4444' : '#d97706';
                const date = j.created_at ? new Date(j.created_at).toLocaleDateString() : '';
                return `<div style="display:flex; justify-content:space-between; align-items:center; padding:0.3rem 0; border-bottom:1px solid var(--border-color);">
                    <span>Export #${j.id} — ${j.total_rows} rows — ${date}</span>
                    <span style="color:${statusColor}; font-weight:600; text-transform:capitalize;">${j.status}</span>
                </div>`;
            }).join('');
        } catch (err) {
            console.error('Failed to load export jobs:', err);
        }
    }
    setTimeout(loadExportJobs, 5000);

    // ───── Plan Info Display ─────
    async function loadPlanInfo() {
        if (!window.gatiqFetchAPI) return;
        try {
            const plan = await window.gatiqFetchAPI('/plans/active');
            if (!plan) return;

            const el = (id) => document.getElementById(id);
            if (el('activePlanTier')) el('activePlanTier').textContent = plan.plan_tier || '—';
            if (el('planMaxCameras')) el('planMaxCameras').textContent = plan.max_cameras || '—';
            if (el('planRetentionDays')) el('planRetentionDays').textContent = plan.retention_days || '—';

            // Feature pills
            const pillsContainer = el('planFeaturePills');
            if (pillsContainer && plan.features) {
                pillsContainer.innerHTML = Object.entries(plan.features).map(([feature, allowed]) => {
                    const bg = allowed ? 'rgba(52, 211, 153, 0.15)' : 'rgba(239, 68, 68, 0.1)';
                    const color = allowed ? '#059669' : '#ef4444';
                    const icon = allowed ? '✓' : '✗';
                    const label = feature.replace(/_/g, ' ');
                    return `<span style="background:${bg}; color:${color}; padding:0.15rem 0.4rem; border-radius:10px; border:1px solid ${color}20; white-space:nowrap;">
                        ${icon} ${label}
                    </span>`;
                }).join('');
            }
        } catch (err) {
            console.error('Plan info fetch error:', err);
        }
    }
    setTimeout(loadPlanInfo, 3500);
});
