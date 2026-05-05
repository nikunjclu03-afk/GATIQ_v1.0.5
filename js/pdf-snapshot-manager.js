/* ============================================================
   pdf-snapshot-manager.js — Real-time Monthly PDF Snapshots
   Automatically manages monthly logs and Quick Access reports
   ============================================================ */

const PdfSnapshotManager = (() => {
    let isProcessing = false;

    /**
     * Initialize the manager and check for month transition
     */
    async function init() {
        console.log('[SnapshotManager] Initializing...');
        await checkMonthTransition();
        // Trigger an initial snapshot for the current month if one doesn't exist
        await updateCurrentMonthSnapshot();
    }

    /**
     * Triggered every time a new entry is added.
     * Generates/Updates the PDF for the current month.
     */
    async function handleNewEntry() {
        if (isProcessing) return;
        isProcessing = true;
        
        try {
            await updateCurrentMonthSnapshot();
        } catch (err) {
            console.error('[SnapshotManager] Error updating real-time snapshot:', err);
        } finally {
            isProcessing = false;
        }
    }

    /**
     * Checks if we have entered a new month.
     * If so, it clears the visible table/view state and archives the old PDF.
     */
    async function checkMonthTransition() {
        const lastRunMonth = localStorage.getItem('gatiq_last_run_month'); 
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        if (lastRunMonth && lastRunMonth !== currentMonth) {
            console.log(`[SnapshotManager] New month detected: ${currentMonth}.`);
            // Ensure the previous month has a final snapshot
            await updateCurrentMonthSnapshot(lastRunMonth);
            
            // Clear current log table by forcing a reload (which will now filter for new month)
            if (window.LogManager && window.getActiveArea) {
                await window.LogManager.loadFromServer(window.getActiveArea());
            }
        }

        localStorage.setItem('gatiq_last_run_month', currentMonth);
    }

    /**
     * Generates a monthly PDF snapshot and saves it to history.
     */
    async function updateCurrentMonthSnapshot(targetMonth = null) {
        const now = new Date();
        const activeMonth = targetMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const rawArea = window.getActiveArea ? window.getActiveArea() : 'Residential Society';
        const rawSociety = window.getSocietyName ? window.getSocietyName() : 'Sky Heights';
        const gateId = window.getGateId ? window.getGateId() : 'Gate 1';

        // Sanitize using app.js logic to ensure filtering matches
        const area = rawArea.trim();
        const societyName = rawSociety.trim();

        console.log(`[SnapshotManager] Processing snapshot for ${activeMonth} in ${area}...`);

        // 1. Get logs for the target month
        const allLogs = window.LogManager.getAll();
        const entries = allLogs.filter(entry => {
            const d = new Date(entry.timestamp);
            const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            return m === activeMonth;
        });

        if (entries.length === 0) {
            console.log(`[SnapshotManager] No entries found for ${activeMonth}. Skipping snapshot.`);
            return;
        }

        const reportId = `MONTHLY_${activeMonth}`; // One per month, regardless of area name variations
        console.log(`[SnapshotManager] Generating snapshot ${reportId} with ${entries.length} entries...`);

        // 2. Save PDF to Disk via Electron (Local Storage)
        try {
            if (window.PDFExport && window.PDFExport.exportPDFBase64) {
                const base64 = await window.PDFExport.exportPDFBase64({
                    societyName,
                    gateId,
                    entries,
                    area
                });

                const filename = `GATIQ_Audit_Log_${activeMonth}_${gateId.replace(/\s+/g, '_')}.pdf`;
                
                if (window.electron && window.electron.invoke) {
                    await window.electron.invoke('exports:save-file', {
                        filename,
                        bodyBase64: base64,
                        subdirectory: 'Monthly_Audit_Logs'
                    });
                    console.log(`[SnapshotManager] PDF saved to disk: ${filename}`);
                }
            }
        } catch (err) {
            console.error('[SnapshotManager] Failed to save PDF to disk:', err);
        }

        // 3. Update History using the app's internal API
        // This ensures local state sync, correct storage keys, and UI refresh
        try {
            if (window.addPDFSnapshot) {
                await window.addPDFSnapshot({
                    societyName,
                    gateId,
                    area,
                    entries,
                    customId: reportId
                });
                console.log(`[SnapshotManager] Local history updated for ${reportId}`);
            }
        } catch (err) {
            console.error('[SnapshotManager] Failed to update app history:', err);
        }
    }


    return {
        init,
        handleNewEntry,
        checkMonthTransition
    };
})();

if (typeof window !== 'undefined') {
    window.PdfSnapshotManager = PdfSnapshotManager;
}
