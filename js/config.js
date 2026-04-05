const DeploymentConfig = {
    'Residential Society': {
        columns: [
            { id: 'srNo', label: 'No.' },
            { id: 'gateNo', label: 'Gate No.' },
            { id: 'vehicleNo', label: 'Vehicle No.' },
            { id: 'entryExitTime', label: 'Date / Time' },
            { id: 'purpose', label: 'Purpose of Visit' },
            { id: 'tagging', label: 'Tagging' },
            { id: 'entryExit', label: 'Entry / Exit' },
            { id: 'vehicleType', label: 'Vehicle Category' }
        ],
        purposeOptions: ['Resident', 'Guest', 'Delivery Guy', 'Cab', 'Maintenance', 'Service', 'Staff', 'Other'],
        taggingOptions: ['Resident', 'Non-Resident'],
        directionLabel: 'Direction',
        directionOptions: ['Entry', 'Exit'],
        hasDriverInfo: false,
        hasVehicleType: true
    },
    'Factories & Manufacturing Plants': {
        columns: [
            { id: 'srGate', label: 'Sr. No. & Gate ID' },
            { id: 'vehicleNo', label: 'Vehicle No.' },
            { id: 'vehicleType', label: 'Vehicle Category' },
            { id: 'driverInfo', label: 'Driver Name & Phone' },
            { id: 'entryExitTime', label: 'Entry / Exit Time' },
            { id: 'tat', label: 'TAT (Duration)' },
            { id: 'purpose', label: 'Purpose of Visit' },
            { id: 'tagging', label: 'Tagging' },
            { id: 'status', label: 'Status' }
        ],
        purposeOptions: ['Unloading (Raw Material)', 'Loading (Finished Goods)', 'Maintenance / Service', 'Staff / Management', 'Courier / Supply'],
        taggingOptions: ['Internal Fleet', 'Contractual', 'External Logistics', 'Visitor'],
        directionLabel: 'Status',
        directionOptions: ['Inside Premises', 'Left'],
        hasDriverInfo: true,
        hasVehicleType: true
    },
    'Warehouses & Logistics Hubs': {
        columns: [
            { id: 'srGate', label: 'Sr. No. & Gate ID' },
            { id: 'vehicleNo', label: 'Vehicle No.' },
            { id: 'vehicleType', label: 'Vehicle Category' },
            { id: 'vehicleCapacity', label: 'Vehicle Capacity' },
            { id: 'consignmentNo', label: 'Consignment / LR No.' },
            { id: 'dockNo', label: 'Dock No. Assigned' },
            { id: 'driverInfo', label: 'Driver Contact' },
            { id: 'entryExitTime', label: 'Entry / Exit Time' },
            { id: 'tat', label: 'Dwell Time / TAT' },
            { id: 'purpose', label: 'Purpose' },
            { id: 'tagging', label: 'Tagging' },
            { id: 'status', label: 'Status' }
        ],
        purposeOptions: ['Inbound (Unloading)', 'Outbound (Loading)', 'Transshipment', 'Returns (RTO)', 'Hub Supply'],
        taggingOptions: ['Own Fleet', '3PL Partner', 'Marketplace Seller', 'Local Runner'],
        directionLabel: 'Status',
        directionOptions: ['At Gate', 'Docked', 'Loading/Unloading', 'Dispatched'],
        hasDriverInfo: true,
        hasVehicleType: true,
        hasVehicleCapacity: true,
        hasConsignmentNo: true,
        hasDockNo: true
    },
    'Commercial Tech Parks & Business Centers': {
        columns: [
            { id: 'srGate', label: 'Sr. No. & Gate ID' },
            { id: 'vehicleNo', label: 'Vehicle No.' },
            { id: 'vehicleType', label: 'Vehicle Category' },
            { id: 'driverInfo', label: 'Driver Name & Phone' },
            { id: 'entryExitTime', label: 'Entry / Exit Time' },
            { id: 'tat', label: 'Parking Duration' },
            { id: 'purpose', label: 'Purpose of Visit' },
            { id: 'tagging', label: 'Tagging' },
            { id: 'status', label: 'Status' }
        ],
        purposeOptions: ['Employee', 'Client Visit', 'Interview', 'Vendor Support', 'Maintenance', 'Courier'],
        taggingOptions: ['Employee Vehicle', 'Visitor Vehicle', 'Vendor Vehicle', 'Taxi / Cab', 'Delivery'],
        directionLabel: 'Status',
        directionOptions: ['On Campus', 'Exited'],
        hasDriverInfo: true,
        hasVehicleType: true,
        hasVehicleCapacity: false,
        hasConsignmentNo: false,
        hasDockNo: false
    },
    'Educational Institutions': {
        columns: [
            { id: 'srGate', label: 'Sr. No. & Gate ID' },
            { id: 'vehicleNo', label: 'Vehicle No.' },
            { id: 'vehicleType', label: 'Vehicle Category' },
            { id: 'driverInfo', label: 'Driver Name & Phone' },
            { id: 'entryExitTime', label: 'Entry / Exit Time' },
            { id: 'tat', label: 'Campus Duration' },
            { id: 'purpose', label: 'Purpose of Visit' },
            { id: 'tagging', label: 'Tagging' },
            { id: 'status', label: 'Status' }
        ],
        purposeOptions: ['Student Pickup', 'Student Drop', 'Staff Entry', 'Parent Visit', 'Vendor Supply', 'Service / Maintenance'],
        taggingOptions: ['School Bus', 'Staff Vehicle', 'Parent Vehicle', 'Vendor Vehicle', 'Visitor'],
        directionLabel: 'Status',
        directionOptions: ['Inside Campus', 'Exited'],
        hasDriverInfo: true,
        hasVehicleType: true,
        hasVehicleCapacity: false,
        hasConsignmentNo: false,
        hasDockNo: false
    },
    'Hotels & Resorts': {
        columns: [
            { id: 'srGate', label: 'Sr. No. & Gate ID' },
            { id: 'vehicleNo', label: 'Vehicle No.' },
            { id: 'vehicleType', label: 'Vehicle Category' },
            { id: 'driverInfo', label: 'Driver Name & Phone' },
            { id: 'entryExitTime', label: 'Entry / Exit Time' },
            { id: 'tat', label: 'Stay Duration' },
            { id: 'purpose', label: 'Purpose of Visit' },
            { id: 'tagging', label: 'Tagging' },
            { id: 'status', label: 'Status' }
        ],
        purposeOptions: ['Guest Check-in', 'Guest Check-out', 'Restaurant Visit', 'Event Entry', 'Vendor Supply', 'Maintenance / Service'],
        taggingOptions: ['In-house Guest', 'Walk-in Guest', 'Staff Vehicle', 'Vendor Vehicle', 'Travel Partner'],
        directionLabel: 'Status',
        directionOptions: ['On Property', 'Checked Out'],
        hasDriverInfo: true,
        hasVehicleType: true,
        hasVehicleCapacity: false,
        hasConsignmentNo: false,
        hasDockNo: false
    }
};

if (typeof window !== 'undefined') {
    window.DeploymentConfig = DeploymentConfig;
}
