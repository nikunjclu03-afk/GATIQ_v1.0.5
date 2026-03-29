document.addEventListener('DOMContentLoaded', () => {
    let healthPollInterval = null;

    // UI elements
    const dashboardCameraState = document.getElementById('dashboardCameraState');
    const cameraStatusPill = document.getElementById('cameraStatusPill');

    const exceptionDashboardPanel = document.getElementById('exceptionDashboardPanel');
    const uiMap = {
        unreadable_scans: document.getElementById('excUnreadableCount'),
        missing_purpose: document.getElementById('excMissingPurposeCount'),
        manual_entries: document.getElementById('excManualEntriesCount'),
        pending_exits: document.getElementById('excPendingExitsCount'),
        open_visits: document.getElementById('excOpenVisitsCount'),
        overstays: document.getElementById('excOverstaysCount'),
        failed_scans: document.getElementById('excFailedScansCount'),
    };

    function updateCameraStatus(online) {
        // App.js may override this based on scanner connection, 
        // but we'll try to provide realtime backend network status.
        if (dashboardCameraState) {
            dashboardCameraState.textContent = online ? 'Online' : 'Offline';
            dashboardCameraState.style.color = online ? 'var(--text-primary)' : '#ef4444';
        }
        if (cameraStatusPill) {
            cameraStatusPill.textContent = online ? 'Camera: On' : 'Camera: Offline';
            cameraStatusPill.style.background = online ? 'rgba(52, 211, 153, 0.2)' : 'rgba(239, 68, 68, 0.2)';
            cameraStatusPill.style.borderColor = online ? '#6ee7b7' : '#fca5a5';
            cameraStatusPill.style.color = online ? '#059669' : '#dc2626';
        }
    }

    async function checkSystemHealth() {
        if (!window.gatiqFetchAPI) return;

        try {
            // Check Exceptions
            const exceptions = await window.gatiqFetchAPI('/exceptions/summary');
            if (exceptionDashboardPanel) exceptionDashboardPanel.style.display = 'block';

            for (const key of Object.keys(uiMap)) {
                if (uiMap[key]) {
                    uiMap[key].textContent = exceptions[key] || 0;
                }
            }

            // Check Camera Health
            const cameras = await window.gatiqFetchAPI('/camera/health');
            const hasCameras = cameras && cameras.length > 0;
            const allOnline = hasCameras && cameras.every(c => c.is_online);
            const cameraMode = localStorage.getItem('gatiq_camera_source') || 'webcam';
            
            // If they are using CCTV, we want to reflect the backend network status
            if (cameraMode === 'cctv' && hasCameras) {
                updateCameraStatus(allOnline);
            }
        } catch (err) {
            console.error('Failed to parse system health API:', err);
        }
    }

    // Auto-polling timer
    function startHealthPolling() {
        if (healthPollInterval) clearInterval(healthPollInterval);
        setTimeout(() => {
            checkSystemHealth();
            // Polling every 10 seconds to keep load low
            healthPollInterval = setInterval(checkSystemHealth, 10000);
        }, 3000); // Startup delay
    }
    
    startHealthPolling();
});
