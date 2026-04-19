/* ============================================================
   log-manager.js — Unified SQLite + API Log Management
   Replaces localStorage with GATIQ Local Backend (SQLite)
   ============================================================ */

const LogManager = (() => {
    let entries = [];
    let activeArea = 'Residential Society';
    
    // Config for API communication (will be set from app.js)
    let apiConfig = {
        baseUrl: 'http://127.0.0.1:8001',
        apiKey: ''
    };

    function setConfig(config) {
        apiConfig = { ...apiConfig, ...config };
    }

    /**
     * Fetch all logs for a specific area from the SQLite backend
     */
    async function loadFromServer(area) {
        activeArea = area || activeArea;
        const url = `${apiConfig.baseUrl}/logs/history?area=${encodeURIComponent(activeArea)}&limit=1000`;
        
        try {
            const response = await fetch(url, {
                headers: { 'X-API-Key': apiConfig.apiKey }
            });
            
            if (!response.ok) throw new Error(`Server returned ${response.status}`);
            
            const raw = await response.json();
            
            // Map backend fields back to frontend expected keys
            entries = raw.map((log, index) => ({
                id: log.id,
                srNo: raw.length - index,
                vehicleNo: log.vehicle_no,
                vehicleType: log.vehicle_type,
                gateNo: log.gate_no,
                area: log.area,
                entryExit: log.entry_exit,
                date: formatDate(new Date(log.timestamp)),
                time: formatTime(new Date(log.timestamp)),
                purpose: log.purpose,
                tagging: log.tagging,
                vehicleCapacity: log.vehicle_capacity || '',
                dockNo: log.dock_no || '',
                consignmentNo: log.consignment_no || '',
                driverName: log.driver_name || '',
                driverPhone: log.driver_phone || '',
                status: log.status,
                timestamp: log.timestamp
            }));
            
            // Reverse so newest is first in the list if not sorted by backend
            // (Backend already sorts by id desc, so index 0 is newest)
            
            return entries;
        } catch (err) {
            console.error('Failed to load logs from SQLite:', err);
            // Fallback to empty if server unreachable
            entries = [];
            return [];
        }
    }

    /**
     * Add a new entry to the SQLite database via API
     */
    async function addEntry(data) {
        const url = `${apiConfig.baseUrl}/logs/entry`;
        
        const payload = {
            vehicle_no: data.vehicleNo || 'UNKNOWN',
            vehicle_type: data.vehicleType || 'Car',
            gate_no: data.gateNo || 'Gate 1',
            area: data.area || activeArea,
            entry_exit: data.entryExit || 'Entry',
            purpose: data.purpose || 'Visit',
            tagging: data.tagging || 'Non-Resident',
            vehicle_capacity: data.vehicleCapacity || '',
            dock_no: data.dockNo || '',
            consignment_no: data.consignmentNo || '',
            driver_name: data.driverName || '',
            driver_phone: data.driverPhone || '',
            status: data.status || data.entryExit || 'Entry'
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiConfig.apiKey
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(error || 'Failed to save log');
            }

            const savedLog = await response.json();
            
            // Refresh local list from server to ensure consistency
            await loadFromServer(data.area);
            
            return savedLog;
        } catch (err) {
            console.error('Add log error:', err);
            throw err;
        }
    }

    /**
     * Delete an entry by id (numeric for SQLite)
     */
    async function deleteEntry(id) {
        const url = `${apiConfig.baseUrl}/logs/${id}`;
        
        try {
            const response = await fetch(url, {
                method: 'DELETE',
                headers: { 'X-API-Key': apiConfig.apiKey }
            });
            
            if (!response.ok) throw new Error('Delete failed');
            
            // Remove from local cache
            entries = entries.filter(e => e.id !== id);
            // Re-number
            entries.forEach((e, i) => { e.srNo = i + 1; });
            
            return true;
        } catch (err) {
            console.error('Delete log error:', err);
            return false;
        }
    }

    /**
     * Clear all logs for current area (Simulated via batch delete if needed)
     */
    async function clearAll() {
        console.warn('ClearAll not implemented for SQLite yet. Use manual delete.');
        // For now, don't clear everything to prevent accidents
    }

    /**
     * Synchronous access for UI rendering
     */
    function getAll() {
        return [...entries];
    }

    function getCount() {
        return entries.length;
    }

    function getStats() {
        const entryCount = entries.filter(e => e.entryExit === 'Entry').length;
        const exitCount = entries.filter(e => e.entryExit === 'Exit').length;
        return { total: entries.length, entries: entryCount, exits: exitCount };
    }

    function getDateRange() {
        if (entries.length === 0) return { from: '—', to: '—' };
        // Entries are sorted newest first
        const first = entries[entries.length - 1];
        const last = entries[0];
        return { from: first.date, to: last.date };
    }

    // -- Helpers --
    function formatDate(date) {
        const dd = String(date.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mmm = months[date.getMonth()];
        const yyyy = date.getFullYear();
        return `${dd}-${mmm}-${yyyy}`;
    }

    function formatTime(date) {
        let h = date.getHours();
        const m = String(date.getMinutes()).padStart(2, '0');
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${m} ${ampm}`;
    }

    return {
        setConfig,
        loadFromServer,
        addEntry,
        deleteEntry,
        clearAll,
        getAll,
        getCount,
        getStats,
        getDateRange
    };
})();

if (typeof window !== 'undefined') {
    window.LogManager = LogManager;
}

