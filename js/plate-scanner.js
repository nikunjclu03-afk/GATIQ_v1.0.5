/* ============================================================
   plate-scanner.js - GATIQ Backend Plate Scanning Client
   Uses the local/backend API instead of calling Gemini directly
   ============================================================ */

const PlateScanner = (() => {
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

    function parseJsonResponse(responseText) {
        if (!responseText) return null;

        const trimmed = responseText.trim();
        const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
        const jsonCandidate = fencedMatch ? fencedMatch[1].trim() : trimmed;

        try {
            return JSON.parse(jsonCandidate);
        } catch {
            const start = jsonCandidate.indexOf('{');
            const end = jsonCandidate.lastIndexOf('}');
            const arrayStart = jsonCandidate.indexOf('[');
            const arrayEnd = jsonCandidate.lastIndexOf(']');

            if (start !== -1 && end !== -1 && end > start) {
                try {
                    return JSON.parse(jsonCandidate.slice(start, end + 1));
                } catch {
                    // Try array shape next.
                }
            }

            if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
                try {
                    return JSON.parse(jsonCandidate.slice(arrayStart, arrayEnd + 1));
                } catch {
                    return null;
                }
            }
        }

        return null;
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

    function parseLegacyResponse(responseText) {
        const sideMatch = responseText.match(/VEHICLE_SIDE:\s*([^\n\r]+)/i);
        const plateMatch = responseText.match(/PLATE_NUMBER:\s*([^\n\r]+)/i);
        const colorMatch = responseText.match(/PLATE_COLOR:\s*([^\n\r]+)/i);

        return buildDetection({
            vehicleSide: sideMatch ? sideMatch[1].trim() : '',
            plateNumber: plateMatch ? plateMatch[1].trim() : 'UNREADABLE',
            plateColor: colorMatch ? colorMatch[1].trim() : 'White'
        });
    }

    /**
     * Scan vehicle number plates from image
     * Returns a primary detection plus all visible detections in the frame.
     */
    async function scanPlate(connection, imageData) {
        const baseUrl = String(connection?.baseUrl || '').trim().replace(/\/+$/, '');
        const apiKey = String(connection?.apiKey || '').trim();

        if (!baseUrl || !apiKey) {
            throw new Error('Please configure your GATIQ backend URL and API key first.');
        }

        if (!imageData || !imageData.base64) {
            throw new Error('No image provided. Capture from camera or upload an image.');
        }
        const url = `${baseUrl}/scan/plate`;

        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                body: JSON.stringify({
                    image_base64: imageData.base64
                })
            });
        } catch (fetchErr) {
            throw new Error(`Network error: ${fetchErr.message}`);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.detail || errorData?.error?.message || `API Error: ${response.status}`;

            if (response.status === 400) throw new Error(`Invalid scan request: ${errorMsg}`);
            if (response.status === 403) throw new Error('GATIQ backend API key invalid or no access.');
            if (response.status === 429) throw new Error(`Backend rate limit reached: ${errorMsg}`);
            throw new Error(errorMsg);
        }

        const data = await response.json();
        let detections = Array.isArray(data?.vehicles)
            ? data.vehicles.map(buildDetection)
            : [];

        detections = detections.filter(item => item && item.plateNumber);

        if (detections.length === 0) {
            detections = [buildDetection({ plateNumber: 'UNREADABLE', vehicleSide: 'Unknown', plateColor: 'Unknown' })];
        }

        const primaryDetection = detections.find(item => item.plateNumber !== 'UNREADABLE') || detections[0];

        console.log('[PlateScanner] Parsed detections:', detections);

        return {
            plateNumber: primaryDetection.plateNumber,
            direction: primaryDetection.direction,
            tagging: primaryDetection.tagging,
            detections,
            detection_time: data?.detection_time,
            provider: data?.provider || 'GATIQ Backend'
        };
    }

    /**
     * Scan from CCTV RTSP stream
     */
    async function scanCCTV(connection, rtspUrl) {
        const baseUrl = String(connection?.baseUrl || '').trim().replace(/\/+$/, '');
        const apiKey = String(connection?.apiKey || '').trim();

        if (!baseUrl || !apiKey) {
            throw new Error('Please configure your GATIQ backend URL and API key first.');
        }

        if (!rtspUrl) {
            throw new Error('No CCTV RTSP URL provided.');
        }

        const url = `${baseUrl}/scan/cctv`;

        let response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                body: JSON.stringify({
                    rtsp_url: rtspUrl
                })
            });
        } catch (fetchErr) {
            throw new Error(`Network error: ${fetchErr.message}`);
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMsg = errorData?.detail || errorData?.error?.message || `API Error: ${response.status}`;
            throw new Error(errorMsg);
        }

        const data = await response.json();
        let detections = Array.isArray(data?.vehicles)
            ? data.vehicles.map(buildDetection)
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
            detection_time: data?.detection_time,
            provider: data?.provider || 'GATIQ CCTV Scanner'
        };
    }

    /**
     * Validate backend API key / connectivity
     */
    async function validateKey(connection) {
        const baseUrl = String(connection?.baseUrl || '').trim().replace(/\/+$/, '');
        const apiKey = String(connection?.apiKey || '').trim();
        if (!baseUrl || !apiKey) return false;
        try {
            const url = `${baseUrl}/health`;
            const resp = await fetch(url, {
                method: 'GET',
                headers: { 'X-API-Key': apiKey }
            });
            return resp.ok;
        } catch {
            return false;
        }
    }

    return {
        scanPlate,
        scanCCTV,
        validateKey
    };
})();

if (typeof window !== 'undefined') {
    window.PlateScanner = PlateScanner;
}
