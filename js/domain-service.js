const GatiqDomain = (() => {
    function getScopedEntries({ entries = [], area, sanitizeArea, defaultArea }) {
        const normalizedArea = sanitizeArea(area);
        return entries.filter(entry => sanitizeArea(entry.area || defaultArea) === normalizedArea);
    }

    function getEntryStats(entries = [], normalizeText) {
        return {
            total: entries.length,
            entries: entries.filter(e => normalizeText(e.entryExit) === 'entry').length,
            exits: entries.filter(e => normalizeText(e.entryExit) === 'exit').length
        };
    }

    function getVisiblePDFHistory({ history = [], policy, sanitizeArea, defaultArea }) {
        if (policy?.isSuperAdmin) return history;
        return history.filter(report => sanitizeArea(report.area || defaultArea) === policy?.assignedArea);
    }

    function enforceAreaAccess({ area, actionLabel, policy, sanitizeArea, onDenied }) {
        const normalizedArea = sanitizeArea(area);
        if (policy?.isSuperAdmin || normalizedArea === policy?.assignedArea) {
            return true;
        }
        onDenied?.(`${actionLabel} is limited to ${policy?.assignedArea}.`);
        return false;
    }

    function normalizePlateKey(value) {
        return String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    }



    function buildScanSummary(detections = []) {
        if (!Array.isArray(detections) || detections.length === 0) {
            return {
                plateLabel: 'UNREADABLE',
                directionLabel: 'Direction: -',
                taggingLabel: 'Tagging: -'
            };
        }

        if (detections.length === 1) {
            const [item] = detections;
            return {
                plateLabel: item.plateNumber,
                directionLabel: `Direction: ${item.direction}`,
                taggingLabel: `Tagging: ${item.tagging || 'Unknown'}`,
                vehicleTypeLabel: item.vehicleType || 'Vehicle'
            };
        }

        const distinctDirections = [...new Set(detections.map(item => item.direction))];
        const distinctTags = [...new Set(detections.map(item => item.tagging || 'Unknown'))];

        return {
            plateLabel: `${detections.length} VEHICLES DETECTED`,
            directionLabel: `Direction: ${distinctDirections.length === 1 ? distinctDirections[0] : 'Mixed'}`,
            taggingLabel: `Tagging: ${distinctTags.length === 1 ? distinctTags[0] : 'Mixed'}`,
            vehicleTypeLabel: 'Multiple'
        };
    }

    function getFacilityLabel(area, sanitizeArea) {
        const labelMap = {
            'Residential Society': 'Society Name',
            'Factories & Manufacturing Plants': 'Factory Name',
            'Warehouses & Logistics Hubs': 'Warehouse Name',
            'Commercial Tech Parks & Business Centers': 'Company / Building Name',
            'Educational Institutions': 'Institution Name',
            'Hotels & Resorts': 'Hotel / Resort Name'
        };
        return labelMap[sanitizeArea(area)] || 'Facility / Site Name';
    }

    function getReportPageCount(report, sanitizeArea, defaultArea) {
        const entryCount = Array.isArray(report?.entries)
            ? report.entries.length
            : Number(report?.totalEntries) || 0;
        if (entryCount <= 0) return 1;
        const area = sanitizeArea(report?.area || defaultArea);
        const rowsPerPage = area === 'Warehouses & Logistics Hubs' ? 34 : 26;
        return Math.max(1, Math.ceil(entryCount / rowsPerPage));
    }

    function getReportMonthLabel(report) {
        const d = new Date(report.generatedAt);
        if (Number.isNaN(d.getTime())) return 'Unknown Month';
        return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    function buildMonthlyHistory({ list, sanitizeArea, defaultArea }) {
        const monthlyMap = new Map();

        (Array.isArray(list) ? list : []).forEach(rawReport => {
            if (!rawReport || typeof rawReport !== 'object') return;
            const report = {
                ...rawReport,
                area: sanitizeArea(rawReport.area || defaultArea),
                societyName: rawReport.societyName || 'N/A',
                gateId: rawReport.gateId || 'Gate 1',
                generatedAt: rawReport.generatedAt || new Date().toISOString(),
                entries: Array.isArray(rawReport.entries) ? rawReport.entries : []
            };
            const d = new Date(report.generatedAt);
            const monthStamp = Number.isNaN(d.getTime())
                ? 'unknown-month'
                : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

            if (!monthlyMap.has(monthStamp)) {
                monthlyMap.set(monthStamp, {
                    ...report,
                    id: report.id || `${monthStamp}_${Math.random().toString(36).slice(2, 8)}`,
                    totalEntries: report.entries.length,
                    pageCount: Number(report.pageCount) || getReportPageCount(report, sanitizeArea, defaultArea),
                    entries: report.entries.map((entry, index) => ({ ...entry, srNo: index + 1 }))
                });
                return;
            }

            const existing = monthlyMap.get(monthStamp);
            const existingTs = new Date(existing.generatedAt).getTime();
            const nextTs = new Date(report.generatedAt).getTime();
            if (!Number.isNaN(existingTs) && (Number.isNaN(nextTs) || existingTs >= nextTs)) return;

            monthlyMap.set(monthStamp, {
                ...existing,
                ...report,
                id: existing.id,
                totalEntries: report.entries.length,
                pageCount: Number(report.pageCount) || getReportPageCount(report, sanitizeArea, defaultArea),
                entries: report.entries.map((entry, index) => ({ ...entry, srNo: index + 1 }))
            });
        });

        return Array.from(monthlyMap.values())
            .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
            .slice(0, 60);
    }

    return {
        getScopedEntries,
        getEntryStats,
        getVisiblePDFHistory,
        enforceAreaAccess,
        normalizePlateKey,

        buildScanSummary,
        getFacilityLabel,
        getReportPageCount,
        getReportMonthLabel,
        buildMonthlyHistory
    };
})();

if (typeof window !== 'undefined') {
    window.GatiqDomain = GatiqDomain;
}
