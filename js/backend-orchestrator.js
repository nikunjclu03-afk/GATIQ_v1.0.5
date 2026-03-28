const GatiqBackend = (() => {
    async function fetchPDFHistoryAPI({ fetchAPI, area }) {
        const query = area ? `?area=${encodeURIComponent(area)}` : '';
        const data = await fetchAPI(`/reports${query}`);
        return data.map(r => ({
            id: r.id,
            generatedAt: r.timestamp,
            area: r.area,
            societyName: r.name,
            gateId: 'Main Gate',
            totalEntries: r.entry_count,
            entries: []
        }));
    }

    async function savePDFReportAPI({ fetchAPI, report }) {
        return fetchAPI('/reports/jobs', {
            method: 'POST',
            body: JSON.stringify({
                id: report.id,
                name: report.societyName,
                area: report.area,
                gate_no: report.gateId,
                timestamp: report.generatedAt,
                entry_count: report.totalEntries,
                snapshot: {
                    generatedAt: report.generatedAt,
                    totalEntries: report.totalEntries
                }
            })
        });
    }

    async function syncArea({ fetchAPI, waitForBackendJob, area, onSyncing }) {
        onSyncing?.();
        const accepted = await fetchAPI('/sync/jobs', {
            method: 'POST',
            body: JSON.stringify({ area })
        });
        return waitForBackendJob(accepted.job_id, 45000);
    }

    return {
        fetchPDFHistoryAPI,
        savePDFReportAPI,
        syncArea
    };
})();

if (typeof window !== 'undefined') {
    window.GatiqBackend = GatiqBackend;
}
