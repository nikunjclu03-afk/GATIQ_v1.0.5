/* ============================================================
   plate-scanner.js - GATIQ async scan client
   Uses backend job APIs and polls until a terminal state.
   ============================================================ */

const PlateScanner = (() => {
    const DEFAULT_POLL_INTERVAL_MS = 1500;
    const DEFAULT_TIMEOUT_MS = 60000;
    const TERMINAL_STATES = new Set(['succeeded', 'failed', 'cancelled']);

    function formatPlateNumber(rawPlate) {
        let formattedPlate = rawPlate || 'UNREADABLE';

        if (formattedPlate !== 'UNREADABLE' && formattedPlate !== '') {
            formattedPlate = formattedPlate.replace(/[^A-Z0-9]/ig, '').toUpperCase();
            const len = formattedPlate.length;

            if (len >= 9 && len <= 10) {
                const state = formattedPlate.substring(0, 2);
                const rto = formattedPlate.substring(2, 4);
                const series = formattedPlate.substring(4, len - 4);
                const num = formattedPlate.substring(len - 4);
                formattedPlate = `${state} ${rto} ${series} ${num}`;
            } else if (len >= 6 && len <= 8) {
                formattedPlate = formattedPlate
                    .replace(/([A-Z]+)(\d+)/g, '$1 $2')
                    .replace(/(\d+)([A-Z]+)/g, '$1 $2');
            }
        } else {
            formattedPlate = 'UNREADABLE';
        }

        return formattedPlate;
    }

    function mapSideToDirection(rawSide) {
        const side = String(rawSide || '').trim().toLowerCase();
        if (side.includes('back') || side.includes('rear')) return 'Exit';
        return 'Entry';
    }

    function mapColorToTagging(rawColor) {
        const color = String(rawColor || '').trim().toLowerCase();
        return color.includes('yellow') ? 'Non-Resident' : 'Resident';
    }

    function buildDetection(rawVehicle = {}) {
        const rawDirection = String(rawVehicle.direction || rawVehicle.vehicleSide || rawVehicle.side || rawVehicle.VEHICLE_SIDE || '').trim();
        const rawPlate = String(rawVehicle.plate_number || rawVehicle.plateNumber || rawVehicle.plate || rawVehicle.PLATE_NUMBER || 'UNREADABLE').trim();
        const rawTagging = String(rawVehicle.tagging || '').trim();
        const rawColor = String(rawVehicle.plateColor || rawVehicle.color || rawVehicle.PLATE_COLOR || 'White').trim();

        return {
            plateNumber: formatPlateNumber(rawPlate),
            direction: rawDirection ? (rawDirection.toLowerCase() === 'exit' ? 'Exit' : rawDirection.toLowerCase() === 'entry' ? 'Entry' : mapSideToDirection(rawDirection)) : 'Entry',
            tagging: rawTagging || mapColorToTagging(rawColor),
            vehicleSide: rawDirection || 'Unknown',
            plateColor: rawColor || 'Unknown',
            vehicleType: String(rawVehicle.vehicle_type || rawVehicle.vehicleType || 'Unknown').trim() || 'Unknown'
        };
    }

    function normalizeConnection(connection) {
        const baseUrl = String(connection?.baseUrl || '').trim().replace(/\/+$/, '');
        const apiKey = String(connection?.apiKey || '').trim();
        if (!baseUrl || !apiKey) {
            throw new Error('Please configure your GATIQ backend URL and API key first.');
        }
        return { baseUrl, apiKey };
    }

    async function requestJson(connection, endpoint, options = {}) {
        const { baseUrl, apiKey } = normalizeConnection(connection);
        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'X-API-Key': apiKey,
                ...(options.headers || {})
            }
        });

        let data = null;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        if (!response.ok) {
            const errorMsg = data?.detail || data?.error?.message || `API Error: ${response.status}`;
            if (response.status === 403) throw new Error('GATIQ backend API key invalid or no access.');
            throw new Error(errorMsg);
        }

        return data;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForJob(connection, jobId, options = {}) {
        const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT_MS);
        const startedAt = Date.now();

        while (true) {
            const job = await requestJson(connection, `/jobs/${encodeURIComponent(jobId)}`, { method: 'GET' });
            if (TERMINAL_STATES.has(job?.status)) {
                if (job.status !== 'succeeded') {
                    throw new Error(job?.error_message || `Job ${job.status}`);
                }
                return job;
            }

            if (Date.now() - startedAt > timeoutMs) {
                throw new Error('Timed out waiting for backend job.');
            }

            await sleep(Number(job?.poll_interval_ms || options.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS));
        }
    }

    function parseScanResult(jobData, providerFallback) {
        const result = jobData?.result || {};
        let detections = Array.isArray(result?.vehicles)
            ? result.vehicles.map(buildDetection)
            : [];

        detections = detections.filter(item => item && item.plateNumber);
        if (detections.length === 0) {
            detections = [buildDetection({ plateNumber: 'UNREADABLE', vehicleSide: 'Unknown', plateColor: 'Unknown' })];
        }

        const primaryDetection = detections.find(item => item.plateNumber !== 'UNREADABLE') || detections[0];

        return {
            plateNumber: primaryDetection.plateNumber,
            direction: primaryDetection.direction,
            tagging: primaryDetection.tagging,
            detections,
            detection_time: result?.detection_time,
            provider: result?.provider || providerFallback,
            logIds: Array.isArray(result?.log_ids) ? result.log_ids : [],
            reportJobIds: Array.isArray(result?.report_job_ids) ? result.report_job_ids : [],
            reviewIds: Array.isArray(result?.review_ids) ? result.review_ids : [],
            jobId: jobData?.job_id || ''
        };
    }

    async function scanPlate(connection, scanInput) {
        if (!scanInput?.imageBase64) {
            throw new Error('No image provided. Capture from camera or upload an image.');
        }

        const accepted = await requestJson(connection, '/scan/plate/jobs', {
            method: 'POST',
            body: JSON.stringify({
                image_base64: scanInput.imageBase64,
                area: scanInput.area,
                gate_no: scanInput.gateNo,
                facility_name: scanInput.facilityName,
                purpose: scanInput.purpose,
                tagging: scanInput.tagging,
                vehicle_type: scanInput.vehicleType,
                vehicle_capacity: scanInput.vehicleCapacity,
                dock_no: scanInput.dockNo,
                consignment_no: scanInput.consignmentNo,
                driver_name: scanInput.driverName,
                driver_phone: scanInput.driverPhone,
                status: scanInput.status,
                operator_name: scanInput.operatorName,
                device_id: scanInput.deviceId
            })
        });

        const completed = await waitForJob(connection, accepted.job_id, {
            pollIntervalMs: accepted.poll_interval_ms
        });
        return parseScanResult(completed, 'GATIQ Backend');
    }

    async function scanCCTV(connection, scanInput) {
        if (!scanInput?.rtspUrl) {
            throw new Error('No CCTV RTSP URL provided.');
        }

        const accepted = await requestJson(connection, '/scan/cctv/jobs', {
            method: 'POST',
            body: JSON.stringify({
                rtsp_url: scanInput.rtspUrl,
                area: scanInput.area,
                gate_no: scanInput.gateNo,
                facility_name: scanInput.facilityName,
                purpose: scanInput.purpose,
                tagging: scanInput.tagging,
                vehicle_type: scanInput.vehicleType,
                vehicle_capacity: scanInput.vehicleCapacity,
                dock_no: scanInput.dockNo,
                consignment_no: scanInput.consignmentNo,
                driver_name: scanInput.driverName,
                driver_phone: scanInput.driverPhone,
                status: scanInput.status,
                operator_name: scanInput.operatorName,
                device_id: scanInput.deviceId
            })
        });

        const completed = await waitForJob(connection, accepted.job_id, {
            pollIntervalMs: accepted.poll_interval_ms
        });
        return parseScanResult(completed, 'GATIQ CCTV Scanner');
    }

    async function validateKey(connection) {
        try {
            const resp = await requestJson(connection, '/health', { method: 'GET' });
            return !!resp;
        } catch {
            return false;
        }
    }

    return {
        scanPlate,
        scanCCTV,
        validateKey,
        waitForJob
    };
})();

if (typeof window !== 'undefined') {
    window.PlateScanner = PlateScanner;
}
