/* ============================================================
   app.js — Main Application Logic
   Wires camera, scanner, log, and PDF export together
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
    const desktopBridge = window.gatiqDesktop || null;
    const IOS_BUTTON_SELECTOR = 'button, .btn, .auth-google-btn, .profile-trigger, .dashboard-action-btn, .quick-access-toggle, .header-circle-btn, .header-pill-btn, .quick-back-btn, .quick-cloud-toggle, .quick-viewer-toolbtn, .quick-viewer-actionbtn, .profile-menu-item, .theme-toggle, .header-link-btn';

    // ---- DOM Elements ----
    const startupSplash = document.getElementById('startupSplash');
    const authShell = document.getElementById('authShell');
    const appShell = document.getElementById('appShell');
    const btnAuthTabLogin = document.getElementById('btnAuthTabLogin');
    const btnAuthTabSignup = document.getElementById('btnAuthTabSignup');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const loginEmail = document.getElementById('loginEmail');
    const loginPassword = document.getElementById('loginPassword');
    const btnLoginGoogle = document.getElementById('btnLoginGoogle');
    const btnSignupGoogle = document.getElementById('btnSignupGoogle');
    const signupName = document.getElementById('signupName');
    const signupEmail = document.getElementById('signupEmail');
    const signupPhone = document.getElementById('signupPhone');
    const signupPassword = document.getElementById('signupPassword');
    const loginPasswordToggle = document.getElementById('loginPasswordToggle');
    const signupPasswordToggle = document.getElementById('signupPasswordToggle');
    const signupAssignedArea = document.getElementById('signupAssignedArea');
    const authLoginHint = document.getElementById('authLoginHint');
    const authSignupHint = document.getElementById('authSignupHint');
    const googleLoginButtonHost = document.getElementById('googleLoginButtonHost');
    const googleSignupButtonHost = document.getElementById('googleSignupButtonHost');

    const backendApiUrlInput = document.getElementById('backendApiUrl');
    const backendApiKeyInput = document.getElementById('backendApiKeyInput');
    const backendApiKeyToggle = document.getElementById('backendApiKeyToggle');
    const btnRestartBackendConnection = document.getElementById('btnRestartBackendConnection');
    const btnTestBackendConnection = document.getElementById('btnTestBackendConnection');
    const backendConnectionStatus = document.getElementById('backendConnectionStatus');
    const googleClientIdInput = document.getElementById('googleClientIdInput');
    const societyInput = document.getElementById('societyName');
    const gateSelect = document.getElementById('gateId');
    const cameraSourceSelect = document.getElementById('cameraSource');
    const cctvUrlInput = document.getElementById('cctvUrl');
    const cctvUrlGroup = document.getElementById('cctvUrlGroup');

    const btnStartCamera = document.getElementById('btnStartCamera');
    const imageUpload = document.getElementById('imageUpload');
    const btnScanPlate = document.getElementById('btnScanPlate');
    const scanOverlay = document.getElementById('scanOverlay');
    const plateResult = document.getElementById('plateResult');
    const plateNumber = document.getElementById('plateNumber');
    const detectedDir = document.getElementById('detectedDirection');
    const detectedTag = document.getElementById('detectedTagging');
    const purposeSelect = document.getElementById('purposeSelect');

    const manualVehicle = document.getElementById('manualVehicle');
    const manualDirection = document.getElementById('manualDirection');
    const manualTagging = document.getElementById('manualTagging');
    const btnAddManual = document.getElementById('btnAddManual');

    const logTableBody = document.getElementById('logTableBody');
    const emptyState = document.getElementById('emptyState');
    const totalEntries = document.getElementById('totalEntries');
    const entryCount = document.getElementById('entryCount');
    const exitCount = document.getElementById('exitCount');

    const btnExportPDF = document.getElementById('btnExportPDF');
    const btnQuickAccess = document.getElementById('btnQuickAccess');
    const quickDrawer = document.getElementById('quickDrawer');
    const quickDrawerBackdrop = document.getElementById('quickDrawerBackdrop');
    const btnQuickBack = document.getElementById('btnQuickBack');
    const quickAccessSearch = document.getElementById('quickAccessSearch');
    const quickAccessResults = document.getElementById('quickAccessResults');
    const btnQuickExportSelected = document.getElementById('btnQuickExportSelected');
    const quickChipMonth = document.getElementById('quickChipMonth');
    const quickChipYear = document.getElementById('quickChipYear');
    const quickAreaFilter = document.getElementById('quickAreaFilter');
    const quickCloudSyncToggle = document.getElementById('quickCloudSyncToggle');
    const quickCloudSyncState = document.getElementById('quickCloudSyncState');
    const quickViewerModal = document.getElementById('quickViewerModal');
    const btnCloseQuickViewer = document.getElementById('btnCloseQuickViewer');
    const quickViewerTitle = document.getElementById('quickViewerTitle');
    const quickViewerSubtitle = document.getElementById('quickViewerSubtitle');
    const quickViewerSearch = document.getElementById('quickViewerSearch');
    const quickViewerMatchStatus = document.getElementById('quickViewerMatchStatus');
    const quickViewerSearchEmpty = document.getElementById('quickViewerSearchEmpty');
    const quickViewerCanvas = document.getElementById('quickViewerCanvas');
    const quickViewerPaperShell = document.getElementById('quickViewerPaperShell');
    const quickViewerContent = document.getElementById('quickViewerContent');
    const btnQuickViewerPrev = document.getElementById('btnQuickViewerPrev');
    const btnQuickViewerNext = document.getElementById('btnQuickViewerNext');
    const btnQuickViewerZoomOut = document.getElementById('btnQuickViewerZoomOut');
    const btnQuickViewerZoomIn = document.getElementById('btnQuickViewerZoomIn');
    const btnQuickViewerZoomReset = document.getElementById('btnQuickViewerZoomReset');
    const quickViewerZoomLabel = document.getElementById('quickViewerZoomLabel');
    const btnQuickViewerDownload = document.getElementById('btnQuickViewerDownload');
    const btnQuickViewerOpenTab = document.getElementById('btnQuickViewerOpenTab');
    const btnQuickViewerShare = document.getElementById('btnQuickViewerShare');
    const cameraRightSplit = document.getElementById('cameraRightSplit');
    const btnHeaderHome = document.getElementById('btnHeaderHome');
    const btnNotifications = document.getElementById('btnNotifications');
    const notificationPanel = document.getElementById('notificationPanel');
    const notificationList = document.getElementById('notificationList');
    const notificationCountBadge = document.getElementById('notificationCountBadge');
    const btnClearNotifications = document.getElementById('btnClearNotifications');
    const btnHelpShortcuts = document.getElementById('btnHelpShortcuts');
    const helpModal = document.getElementById('helpModal');
    const btnCloseHelp = document.getElementById('btnCloseHelp');
    const btnEmergencyAlert = document.getElementById('btnEmergencyAlert');
    const emergencyConfirmModal = document.getElementById('emergencyConfirmModal');
    const btnCancelEmergencyAlert = document.getElementById('btnCancelEmergencyAlert');
    const btnConfirmEmergencyAlert = document.getElementById('btnConfirmEmergencyAlert');
    const logoutConfirmModal = document.getElementById('logoutConfirmModal');
    const btnCancelLogout = document.getElementById('btnCancelLogout');
    const btnConfirmLogout = document.getElementById('btnConfirmLogout');
    const cameraStatusPill = document.getElementById('cameraStatusPill');
    const scannerStatusPill = document.getElementById('scannerStatusPill');
    const cloudStatusPill = document.getElementById('cloudStatusPill');
    const syncStatusText = document.getElementById('syncStatusText');
    const homeDashboard = document.getElementById('homeDashboard');
    const workspaceView = document.getElementById('workspaceView');
    const btnOpenWorkspace = document.getElementById('btnOpenWorkspace');
    const btnDashboardQuickAccess = document.getElementById('btnDashboardQuickAccess');
    const btnDashStartCamera = document.getElementById('btnDashStartCamera');
    const btnDashManualEntry = document.getElementById('btnDashManualEntry');
    const btnDashOpenSettings = document.getElementById('btnDashOpenSettings');
    const btnDashOpenNotifications = document.getElementById('btnDashOpenNotifications');
    const dashboardTotalEntries = document.getElementById('dashboardTotalEntries');
    const dashboardEntryCount = document.getElementById('dashboardEntryCount');
    const dashboardExitCount = document.getElementById('dashboardExitCount');
    const dashboardPdfCount = document.getElementById('dashboardPdfCount');
    const dashboardCameraState = document.getElementById('dashboardCameraState');
    const dashboardScannerState = document.getElementById('dashboardScannerState');
    const dashboardCloudState = document.getElementById('dashboardCloudState');
    const dashboardLastSync = document.getElementById('dashboardLastSync');
    const dashboardRecentActivity = document.getElementById('dashboardRecentActivity');
    const dashboardTrendTitle = document.getElementById('dashboardTrendTitle');
    const dashboardTrendChip = document.getElementById('dashboardTrendChip');
    const dashboardTrendLine = document.getElementById('dashboardTrendLine');
    const dashboardTrendArea = document.getElementById('dashboardTrendArea');

    const editModal = document.getElementById('editModal');
    const editVehicle = document.getElementById('editVehicle');
    const editEntryExit = document.getElementById('editEntryExit');
    const editPurpose = document.getElementById('editPurpose');
    const editTagging = document.getElementById('editTagging');
    const btnSaveEdit = document.getElementById('btnSaveEdit');
    const btnCancelEdit = document.getElementById('btnCancelEdit');

    const deploymentAreaSelect = document.getElementById('deploymentArea');

    const settingsModal = document.getElementById('settingsModal');
    const btnSettings = document.getElementById('btnSettings');
    const btnCloseSettings = document.getElementById('btnCloseSettings');
    const btnManageResidents = document.getElementById('btnManageResidents');
    const systemVersion = document.getElementById('systemVersion');
    const appUpdateStatus = document.getElementById('appUpdateStatus');
    const appUpdateMeta = document.getElementById('appUpdateMeta');
    const btnCheckForUpdates = document.getElementById('btnCheckForUpdates');
    const btnInstallUpdate = document.getElementById('btnInstallUpdate');
    const firstRunSetupModal = document.getElementById('firstRunSetupModal');
    const firstRunOperatorName = document.getElementById('firstRunOperatorName');
    const firstRunFacility = document.getElementById('firstRunFacility');
    const firstRunGate = document.getElementById('firstRunGate');
    const firstRunArea = document.getElementById('firstRunArea');
    const firstRunBackendStatus = document.getElementById('firstRunBackendStatus');
    const btnFirstRunLater = document.getElementById('btnFirstRunLater');
    const btnFirstRunOpenSettings = document.getElementById('btnFirstRunOpenSettings');
    const btnFirstRunSave = document.getElementById('btnFirstRunSave');
    const profileModal = document.getElementById('profileModal');
    const btnOpenProfile = document.getElementById('btnOpenProfile');
    const btnCloseProfile = document.getElementById('btnCloseProfile');
    const btnSaveProfile = document.getElementById('btnSaveProfile');
    const btnUpgradePlan = document.getElementById('btnUpgradePlan');
    const profileName = document.getElementById('profileName');
    const profileAccessRole = document.getElementById('profileAccessRole');
    const profileAssignedArea = document.getElementById('profileAssignedArea');
    const profileAccessNote = document.getElementById('profileAccessNote');
    const profileEmail = document.getElementById('profileEmail');
    const profilePhone = document.getElementById('profilePhone');
    const profileSummaryAvatar = document.getElementById('profileSummaryAvatar');
    const profileSummaryName = document.getElementById('profileSummaryName');
    const profileSummaryRole = document.getElementById('profileSummaryRole');
    const profilePlanBadge = document.getElementById('profilePlanBadge');
    const subscriptionPlanName = document.getElementById('subscriptionPlanName');
    const subscriptionRenewalInfo = document.getElementById('subscriptionRenewalInfo');
    const deploymentAreaBadge = document.getElementById('deploymentAreaBadge');
    const deploymentAreaHint = document.getElementById('deploymentAreaHint');
    const areaLockedPill = document.getElementById('areaLockedPill');
    const areaLockedText = document.getElementById('areaLockedText');

    const whitelistModal = document.getElementById('whitelistModal');
    const btnCloseWhitelist = document.getElementById('btnCloseWhitelist');
    const wlName = document.getElementById('wlName');
    const wlFlat = document.getElementById('wlFlat');
    const wlVehicle = document.getElementById('wlVehicle');
    const wlContact = document.getElementById('wlContact');
    const wlStatus = document.getElementById('wlStatus');
    const btnAddResident = document.getElementById('btnAddResident');
    const whitelistTableBody = document.getElementById('whitelistTableBody');
    const wlEmptyState = document.getElementById('wlEmptyState');

    const toastContainer = document.getElementById('toastContainer');
    const themeToggle = document.getElementById('themeToggle');
    const themeKnob = document.getElementById('themeKnob');
    const btnProfileMenu = document.getElementById('btnProfileMenu');
    const profileMenu = document.getElementById('profileMenu');
    const btnLogout = document.getElementById('btnLogout');

    // ---- State ----
    let isScanning = false;
    let editingEntryId = null;
    let currentImageBase64 = null;
    const PDF_HISTORY_KEY = 'gatiq_pdf_history';
    const CLOUD_SYNC_KEY = 'gatiq_cloud_sync_enabled';
    const LAST_SYNC_KEY = 'gatiq_last_sync_at';
    const APP_VIEW_KEY = 'gatiq_active_view';
    const BACKEND_API_URL_KEY = 'gatiq_backend_url';
    const BACKEND_API_KEY_KEY = 'gatiq_backend_key';
    const GOOGLE_CLIENT_ID_KEY = 'gatiq_google_client_id';
    const PROFILE_KEY = 'gatiq_operator_profile';
    const AUTH_USERS_KEY = 'gatiq_auth_users';
    const AUTH_SESSION_KEY = 'gatiq_auth_session';
    const SOCIETY_KEY = 'gatiq_society';
    const GATE_KEY = 'gatiq_gate';
    const DEPLOYMENT_KEY = 'gatiq_deployment';
    const WHITELIST_KEY = 'gatiq_whitelist';
    const CAMERA_SOURCE_KEY = 'gatiq_camera_source';
    const CCTV_URL_KEY = 'gatiq_cctv_url';
    const selectedQuickReportIds = new Set();
    let quickGroupMode = 'month';
    let quickSelectedArea = '';
    let quickViewerReportId = '';
    let quickViewerSearchTerm = '';
    let quickViewerMatchIndex = 0;
    let quickViewerMatchCount = 0;
    let quickViewerZoom = 1;
    let notifications = [];
    let unreadNotificationCount = 0;
    let currentView = 'home';
    const DEFAULT_AREA = 'Residential Society';
    const SUPER_ADMIN_ROLE = 'super_admin';
    const OPERATOR_ROLE = 'operator';
    let removeDesktopBackendListener = null;
    let removeDesktopUpdaterListener = null;
    let managedBackendConfig = null;
    let googleAuthInitializedFor = '';
    let lastUpdaterState = '';

    // ---- Initialize ----
    let currentConfig = DeploymentConfig[DEFAULT_AREA];
    const VEHICLE_TYPE_OPTIONS = [
        'Car',
        'Bike',
        'Bus',
        'Auto Riksha',
        'Scooty',
        'Taxi / Cab',
        'Van',
        'Pickup',
        'Tempo',
        'Truck',
        'Mini Truck',
        'Container',
        'Emergency Vehicle',
        'Other'
    ];
    const DEFAULT_BACKEND_URL = 'http://127.0.0.1:8001';
    const DEFAULT_BACKEND_API_KEY = '7t#K9!vP$2wL5*G8^m1&Q4+Z7xR0_B3#';
    const startupTimestamp = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const QUICK_VIEWER_MIN_ZOOM = 0.7;
    const QUICK_VIEWER_MAX_ZOOM = 1.6;
    const QUICK_VIEWER_ZOOM_STEP = 0.1;
    const FIRST_RUN_SETUP_KEY = 'gatiq_desktop_first_run_complete_v1';
    const BRAND_LOGO_LIGHT = 'img/gatiq-mark-light.png';
    const BRAND_LOGO_DARK = 'img/gatiq-mark-dark.png';
    const IS_BROWSER_FILE_PREVIEW = !desktopBridge && window.location.protocol === 'file:';
    let activeUserScope = 'guest';

    function getScopedStorageKey(key) {
        return `${key}__${activeUserScope}`;
    }

    function getBackendConfig() {
        const baseUrl = backendApiUrlInput?.value.trim() || storageGet(BACKEND_API_URL_KEY) || DEFAULT_BACKEND_URL;
        const apiKey = backendApiKeyInput?.value.trim() || storageGet(BACKEND_API_KEY_KEY) || DEFAULT_BACKEND_API_KEY;
        return { baseUrl, apiKey };
    }

    async function fetchAPI(endpoint, options = {}) {
        const { baseUrl, apiKey } = getBackendConfig();
        const url = `${baseUrl}${endpoint}`;
        const headers = {
            'X-API-Key': apiKey,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };
        const response = await fetch(url, { ...options, headers });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(err || `API Error: ${response.status}`);
        }
        return response.json();
    }

    // ---- Whitelist API ----
    async function fetchWhitelist() {
        try {
            const data = await fetchAPI('/whitelist');
            return data.map(r => ({
                id: r.id,
                name: r.owner_name,
                flat: r.flat_no,
                vehicle: r.vehicle_no,
                contact: r.contact,
                category: r.category,
                status: r.status
            }));
        } catch (err) {
            console.error('Whitelist fetch failed:', err);
            return [];
        }
    }

    async function saveWhitelistAPI(entry) {
        return fetchAPI('/whitelist', {
            method: 'POST',
            body: JSON.stringify({
                vehicle_no: entry.vehicle,
                owner_name: entry.name,
                flat_no: entry.flat,
                contact: entry.contact,
                category: 'Resident',
                status: entry.status || 'Active'
            })
        });
    }

    async function deleteWhitelistAPI(id) {
        return fetchAPI(`/whitelist/${id}`, { method: 'DELETE' });
    }

    // ---- PDF Reports API ----
    async function fetchPDFHistoryAPI(area) {
        try {
            const query = area ? `?area=${encodeURIComponent(area)}` : '';
            const data = await fetchAPI(`/reports${query}`);
            return data.map(r => ({
                id: r.id,
                generatedAt: r.timestamp,
                area: r.area,
                societyName: r.name,
                gateId: 'Main Gate',
                totalEntries: r.entry_count,
                entries: [] // Details fetched on demand if needed
            }));
        } catch (err) {
            console.error('PDF History fetch failed:', err);
            return [];
        }
    }

    async function savePDFReportAPI(report) {
        return fetchAPI('/reports', {
            method: 'POST',
            body: JSON.stringify({
                id: report.id,
                name: report.societyName,
                area: report.area,
                timestamp: report.generatedAt,
                entry_count: report.totalEntries
            })
        });
    }

    async function deletePDFReportAPI(id) {
        return fetchAPI(`/reports/${id}`, { method: 'DELETE' });
    }

    function storageGet(key) {
        return localStorage.getItem(getScopedStorageKey(key));
    }

    function storageSet(key, value) {
        localStorage.setItem(getScopedStorageKey(key), value);
    }

    function storageRemove(key) {
        localStorage.removeItem(getScopedStorageKey(key));
    }

    function setActiveUserScope(userId) {
        activeUserScope = userId ? `user_${String(userId).trim()}` : 'guest';
        if (typeof LogManager?.setStorageKey === 'function') {
            LogManager.setStorageKey(getScopedStorageKey('gatiq_vehicle_log'));
        }
    }

    async function loadScopedWorkspaceSettings() {
        const savedSociety = storageGet(SOCIETY_KEY);
        const savedGate = storageGet(GATE_KEY);
        const savedDeployment = sanitizeArea(storageGet(DEPLOYMENT_KEY) || DEFAULT_AREA);

        if (societyInput) societyInput.value = savedSociety || 'Sky Heights';
        if (gateSelect) gateSelect.value = savedGate || 'Gate 1';
        if (deploymentAreaSelect) deploymentAreaSelect.value = savedDeployment;

        const config = getBackendConfig();
        if (backendApiUrlInput) backendApiUrlInput.value = config.baseUrl;
        if (backendApiKeyInput) backendApiKeyInput.value = config.apiKey;

        // Initialize LogManager config
        LogManager.setConfig({
            baseUrl: config.baseUrl,
            apiKey: config.apiKey
        });

        const savedCamSource = storageGet(CAMERA_SOURCE_KEY) || 'webcam';
        if (cameraSourceSelect) cameraSourceSelect.value = savedCamSource;
        if (cctvUrlInput) cctvUrlInput.value = storageGet(CCTV_URL_KEY) || '';
        if (cctvUrlGroup) cctvUrlGroup.style.display = savedCamSource === 'cctv' ? 'block' : 'none';

        applyCloudSyncState(storageGet(CLOUD_SYNC_KEY) === '1');
        updateSyncStatusText(storageGet(LAST_SYNC_KEY));
        updateDeploymentUI(savedDeployment);
        updateFacilityLabel(savedDeployment);

        // Load SQL data
        await LogManager.loadFromServer(savedDeployment);
        renderTable();
        syncQuickAreaFilterOptions();
        renderQuickAccessResults();
    }

    function finishStartupSplash() {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const elapsed = now - startupTimestamp;
        const remaining = Math.max(0, 220 - elapsed);

        window.setTimeout(() => {
            if (startupSplash) {
                startupSplash.classList.add('startup-splash-hidden');
                window.setTimeout(() => {
                    startupSplash.hidden = true;
                }, 180);
            }
            document.body.classList.remove('startup-loading');
        }, remaining);
    }

    function updateDeploymentUI(area) {
        currentConfig = DeploymentConfig[area] || DeploymentConfig['Residential Society'];

        // Show/hide specific factory fields
        document.getElementById('visitExtraFields').style.display = currentConfig.hasVehicleType ? '' : 'none';
        document.getElementById('visitDriverFields').style.display = currentConfig.hasDriverInfo ? '' : 'none';

        // Show/hide logistics fields
        document.getElementById('logisticsExtraFields').style.display = (currentConfig.hasVehicleCapacity || currentConfig.hasDockNo) ? '' : 'none';
        document.getElementById('logisticsConsignmentFields').style.display = currentConfig.hasConsignmentNo ? '' : 'none';

        document.getElementById('editVehicleTypeGroup').style.display = currentConfig.hasVehicleType ? '' : 'none';
        document.getElementById('editDriverFieldsGroup').style.display = currentConfig.hasDriverInfo ? '' : 'none';
        document.getElementById('editLogisticsFieldsGroup').style.display = (currentConfig.hasVehicleCapacity || currentConfig.hasDockNo || currentConfig.hasConsignmentNo) ? '' : 'none';

        // Split right-side options into 2 columns only when area introduces extra fields
        if (cameraRightSplit) {
            const hasExtraDynamicFields = currentConfig.hasVehicleType
                || currentConfig.hasDriverInfo
                || currentConfig.hasVehicleCapacity
                || currentConfig.hasDockNo
                || currentConfig.hasConsignmentNo;
            cameraRightSplit.classList.toggle('split-active', hasExtraDynamicFields);
        }

        // Update labels
        document.getElementById('manualDirLabel').textContent = currentConfig.directionLabel;
        document.getElementById('editEntryExitLabel').textContent = currentConfig.directionLabel;

        // Populate dropdowns function
        const populateSelect = (id, options) => {
            const select = document.getElementById(id);
            if (!select) return;
            select.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join('');
        };

        populateSelect('purposeSelect', currentConfig.purposeOptions);
        populateSelect('visitVehicleType', VEHICLE_TYPE_OPTIONS);
        populateSelect('manualTagging', currentConfig.taggingOptions);
        populateSelect('manualDirection', currentConfig.directionOptions);
        populateSelect('editPurpose', currentConfig.purposeOptions);
        populateSelect('editEntryExit', currentConfig.directionOptions);
        populateSelect('editTagging', currentConfig.taggingOptions);
        populateSelect('editVehicleType', VEHICLE_TYPE_OPTIONS);

        // Render <thead> dynamically
        const thead = document.getElementById('logTableHead');
        if (thead) {
            thead.innerHTML = '<tr>' + currentConfig.columns.map(c => `<th>${c.label}</th>`).join('') + '</tr>';
        }

        renderTable();
    }

    function updateFacilityLabel(area) {
        const facilityLabel = document.getElementById('facilityLabel');
        if (!facilityLabel) return;

        const labelMap = {
            'Residential Society': 'Society Name',
            'Factories & Manufacturing Plants': 'Factory Name',
            'Warehouses & Logistics Hubs': 'Warehouse Name',
            'Commercial Tech Parks & Business Centers': 'Company / Building Name',
            'Educational Institutions': 'Institution Name',
            'Hotels & Resorts': 'Hotel / Resort Name'
        };

        facilityLabel.textContent = labelMap[area] || 'Facility / Society Name';
    }

    function getAllAreas() {
        return Object.keys(DeploymentConfig || {});
    }

    function sanitizeArea(area) {
        return getAllAreas().includes(area) ? area : DEFAULT_AREA;
    }

    function sanitizeAccessRole(role) {
        return role === SUPER_ADMIN_ROLE ? SUPER_ADMIN_ROLE : OPERATOR_ROLE;
    }

    function getRoleLabel(role) {
        return role === SUPER_ADMIN_ROLE ? 'Super Admin' : 'Operator';
    }

    function getAccessPolicy(profile = getProfile()) {
        const accessRole = sanitizeAccessRole(profile.accessRole);
        const assignedArea = sanitizeArea(profile.assignedArea);
        return {
            accessRole,
            assignedArea,
            isSuperAdmin: accessRole === SUPER_ADMIN_ROLE,
            allowedAreas: accessRole === SUPER_ADMIN_ROLE ? getAllAreas() : [assignedArea]
        };
    }

    function getDefaultProfile() {
        return {
            name: 'GATIQ Operator',
            role: getRoleLabel(OPERATOR_ROLE),
            accessRole: OPERATOR_ROLE,
            assignedArea: DEFAULT_AREA,
            email: 'operator@gatiq.in',
            phone: '+91 98765 43210',
            plan: 'Starter',
            renewal: 'Renews on 30 Apr 2026'
        };
    }

    function normalizeProfile(profile) {
        const defaults = getDefaultProfile();
        const raw = profile && typeof profile === 'object' ? profile : {};
        const legacyRole = normalizeText(raw.role);
        const hasConfirmedAccessRole = raw.accessRoleConfirmed === true;
        const inferredRole = hasConfirmedAccessRole && (legacyRole.includes('super admin') || raw.accessRole === SUPER_ADMIN_ROLE)
            ? SUPER_ADMIN_ROLE
            : OPERATOR_ROLE;
        const accessRole = hasConfirmedAccessRole
            ? sanitizeAccessRole(raw.accessRole || inferredRole)
            : inferredRole;
        const assignedArea = sanitizeArea(raw.assignedArea || defaults.assignedArea);

        return {
            ...defaults,
            ...raw,
            accessRole,
            accessRoleConfirmed: true,
            assignedArea,
            role: getRoleLabel(accessRole)
        };
    }

    function getProfile() {
        try {
            const saved = JSON.parse(storageGet(PROFILE_KEY) || '{}');
            return normalizeProfile(saved);
        } catch {
            return getDefaultProfile();
        }
    }

    function normalizeAuthUser(user) {
        const normalizedProfile = normalizeProfile(user);
        return {
            id: user?.id || `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            name: normalizedProfile.name,
            email: String(user?.email || normalizedProfile.email || '').trim().toLowerCase(),
            phone: normalizedProfile.phone,
            password: String(user?.password || ''),
            accessRole: normalizedProfile.accessRole,
            accessRoleConfirmed: true,
            assignedArea: normalizedProfile.assignedArea,
            role: normalizedProfile.role,
            plan: normalizedProfile.plan,
            renewal: normalizedProfile.renewal,
            freshWorkspace: user?.freshWorkspace === true
        };
    }

    function getAuthUsers() {
        try {
            const saved = JSON.parse(localStorage.getItem(AUTH_USERS_KEY) || '[]');
            return Array.isArray(saved) ? saved.map(normalizeAuthUser) : [];
        } catch {
            return [];
        }
    }

    function saveAuthUsers(users) {
        localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users.map(normalizeAuthUser)));
    }

    function buildProfileFromAuthUser(user) {
        return normalizeProfile({
            name: user.name,
            email: user.email,
            phone: user.phone,
            accessRole: user.accessRole,
            accessRoleConfirmed: true,
            assignedArea: user.assignedArea,
            role: user.role,
            plan: user.plan,
            renewal: user.renewal
        });
    }

    function getAuthSession() {
        try {
            return JSON.parse(localStorage.getItem(AUTH_SESSION_KEY) || 'null');
        } catch {
            return null;
        }
    }

    function saveAuthSession(session) {
        localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
    }

    function clearAuthSession() {
        localStorage.removeItem(AUTH_SESSION_KEY);
    }

    function getDemoLogEntries() {
        const today = new Date();
        const date = formatDateForEntry(today);
        return [
            { id: 'demo1', srNo: 1, area: 'Residential Society', gateNo: 'Gate 1', vehicleNo: 'MH01AB1234', date, entryExit: 'Entry', status: 'Entry', time: '09:15 AM', purpose: 'Guest', tagging: 'Non-Resident', vehicleType: '-', driverName: '-', driverPhone: '-', tat: '-' },
            { id: 'demo2', srNo: 2, area: 'Residential Society', gateNo: 'Gate 2', vehicleNo: 'DL4CAF5678', date, entryExit: 'Exit', status: 'Exit', time: '09:30 AM', purpose: 'Service', tagging: 'Non-Resident', vehicleType: '-', driverName: '-', driverPhone: '-', tat: '-' },
            { id: 'demo3', srNo: 3, area: 'Factories & Manufacturing Plants', gateNo: 'Main Entrance', vehicleNo: 'KA03HG9876', date, entryExit: 'Inside Premises', status: 'Inside Premises', time: '10:05 AM', purpose: 'Maintenance / Service', tagging: 'Contractual', vehicleType: 'Truck', driverName: 'Rakesh', driverPhone: '9876543210', tat: '45 min' },
            { id: 'demo4', srNo: 4, area: 'Residential Society', gateNo: 'Gate 1', vehicleNo: 'UP16GH4321', date, entryExit: 'Entry', status: 'Entry', time: '10:45 AM', purpose: 'Resident', tagging: 'Resident', vehicleType: '-', driverName: '-', driverPhone: '-', tat: '-' },
            { id: 'demo5', srNo: 5, area: 'Warehouses & Logistics Hubs', gateNo: 'Service Gate', vehicleNo: 'GJ05MN1122', date, entryExit: 'Docked', status: 'Docked', time: '11:20 AM', purpose: 'Inbound (Unloading)', tagging: '3PL Partner', vehicleCapacity: '16T', dockNo: 'D-04', consignmentNo: 'LR-22018', driverName: 'Imran', driverPhone: '9123456780', tat: '1 hr 10 min' }
        ];
    }

    function formatDateForEntry(date) {
        const dd = String(date.getDate()).padStart(2, '0');
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${dd}-${months[date.getMonth()]}-${date.getFullYear()}`;
    }

    function seedWorkspaceIfNeeded(user) {
        if (!user || user.freshWorkspace) return;
        if (typeof LogManager?.getCount === 'function' && LogManager.getCount() === 0) {
            LogManager.replaceAll(getDemoLogEntries());
        }
        if (getPDFHistory().length === 0) {
            const seededEntries = LogManager.getAll();
            const demoReport = {
                id: `demo_report_${Date.now()}`,
                generatedAt: new Date().toISOString(),
                area: 'Residential Society',
                societyName: 'Sky Heights',
                gateId: 'Gate 1',
                totalEntries: seededEntries.length,
                entries: seededEntries
            };
            savePDFHistory([demoReport]);
        }
    }

    function syncCurrentUserRecord(profile) {
        const session = getAuthSession();
        if (!session?.userId) return;
        const users = getAuthUsers();
        const index = users.findIndex(user => user.id === session.userId);
        if (index === -1) return;

        const nextUser = normalizeAuthUser({
            ...users[index],
            ...profile,
            email: profile.email || users[index].email
        });
        users[index] = nextUser;
        saveAuthUsers(users);
        saveAuthSession({ ...session, userId: nextUser.id, email: nextUser.email });
    }

    function saveProfile(profile) {
        const normalized = normalizeProfile(profile);
        storageSet(PROFILE_KEY, JSON.stringify(normalized));
        syncCurrentUserRecord(normalized);
        return normalized;
    }

    function getActiveArea() {
        const policy = getAccessPolicy();
        if (!policy.isSuperAdmin) return policy.assignedArea;
        return sanitizeArea(deploymentAreaSelect?.value || storageGet(DEPLOYMENT_KEY) || policy.assignedArea);
    }

    function setAuthTab(mode) {
        const isLogin = mode !== 'signup';
        if (btnAuthTabLogin) btnAuthTabLogin.classList.toggle('active', isLogin);
        if (btnAuthTabSignup) btnAuthTabSignup.classList.toggle('active', !isLogin);
        if (loginForm) loginForm.classList.toggle('auth-form-hidden', !isLogin);
        if (signupForm) signupForm.classList.toggle('auth-form-hidden', isLogin);
        initializeGoogleAuth();
    }

    function populateAuthAreaOptions() {
        if (!signupAssignedArea) return;
        signupAssignedArea.innerHTML = getAllAreas()
            .map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`)
            .join('');
        signupAssignedArea.value = DEFAULT_AREA;
    }

    function showAuthShell(mode = 'login') {
        setAuthTab(mode);
        if (authShell) authShell.classList.remove('auth-hidden');
        if (appShell) appShell.classList.add('auth-locked');
        document.body.classList.add('auth-open');
    }

    function hideAuthShell() {
        if (authShell) authShell.classList.add('auth-hidden');
        if (appShell) appShell.classList.remove('auth-locked');
        document.body.classList.remove('auth-open');
    }

    async function applyAuthenticatedUser(user) {
        setActiveUserScope(user.id);
        seedWorkspaceIfNeeded(user);
        await loadScopedWorkspaceSettings();
        saveAuthSession({ userId: user.id, email: user.email });
        saveProfile(buildProfileFromAuthUser(user));
        renderProfileDetails();
        updateProfileTrigger();
        hideAuthShell();
        restoreInitialView();
        renderTable();
        renderDashboard();
        syncQuickAreaFilterOptions();
        renderQuickAccessResults();
        window.setTimeout(() => {
            maybeOpenFirstRunSetup();
        }, 220);
    }

    async function restoreAuthenticatedSession() {
        const session = getAuthSession();
        if (!session?.userId) {
            setActiveUserScope(null);
            showAuthShell('login');
            return false;
        }

        const user = getAuthUsers().find(item => item.id === session.userId);
        if (!user) {
            clearAuthSession();
            setActiveUserScope(null);
            showAuthShell('login');
            return false;
        }

        await applyAuthenticatedUser(user);
        return true;
    }

    function getScopedEntries(area = getActiveArea()) {
        const normalizedArea = sanitizeArea(area);
        return LogManager.getAll().filter(entry => sanitizeArea(entry.area || DEFAULT_AREA) === normalizedArea);
    }

    function getEntryStats(entries) {
        return {
            total: entries.length,
            entries: entries.filter(e => normalizeText(e.entryExit) === 'entry').length,
            exits: entries.filter(e => normalizeText(e.entryExit) === 'exit').length
        };
    }

    function getVisiblePDFHistory() {
        const policy = getAccessPolicy();
        const history = getPDFHistory();
        if (policy.isSuperAdmin) return history;
        return history.filter(report => sanitizeArea(report.area || DEFAULT_AREA) === policy.assignedArea);
    }

    function showAreaRestriction(message) {
        const safe = escapeHtml(message);
        showToast(`<i data-lucide="shield-alert" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> ${safe}`, 'error');
        addNotification(message, 'error');
    }

    function enforceAreaAccess(area, actionLabel) {
        const normalizedArea = sanitizeArea(area);
        const policy = getAccessPolicy();
        if (policy.isSuperAdmin || normalizedArea === policy.assignedArea) {
            return true;
        }
        showAreaRestriction(`${actionLabel} is limited to ${policy.assignedArea}.`);
        return false;
    }

    function setDeploymentAreaOptions(select, allowedAreas, hideRestricted = false) {
        if (!select) return;
        Array.from(select.options).forEach(option => {
            const allowed = allowedAreas.includes(option.value);
            option.disabled = !allowed;
            option.hidden = hideRestricted && !allowed;
        });
    }

    function applyAccessPolicy() {
        const profile = getProfile();
        const policy = getAccessPolicy(profile);
        const nextArea = policy.isSuperAdmin
            ? sanitizeArea(deploymentAreaSelect?.value || storageGet(DEPLOYMENT_KEY) || profile.assignedArea)
            : policy.assignedArea;

        if (profileAccessRole) {
            profileAccessRole.value = policy.accessRole;
            profileAccessRole.disabled = !policy.isSuperAdmin;
        }
        if (profileAssignedArea) {
            profileAssignedArea.innerHTML = getAllAreas()
                .map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`)
                .join('');
            profileAssignedArea.value = profile.assignedArea;
            profileAssignedArea.disabled = !policy.isSuperAdmin;
            setDeploymentAreaOptions(profileAssignedArea, policy.allowedAreas);
        }
        if (profileAccessNote) {
            profileAccessNote.textContent = policy.isSuperAdmin
                ? 'Super admins can switch deployment areas and assign area scope from this profile.'
                : `Operator access is locked to ${policy.assignedArea}. Change requests should go through a super admin.`;
        }
        if (deploymentAreaSelect) {
            deploymentAreaSelect.value = nextArea;
            deploymentAreaSelect.disabled = !policy.isSuperAdmin;
            deploymentAreaSelect.classList.toggle('access-locked', !policy.isSuperAdmin);
            setDeploymentAreaOptions(deploymentAreaSelect, policy.allowedAreas, !policy.isSuperAdmin);
        }
        if (deploymentAreaBadge) {
            deploymentAreaBadge.textContent = policy.isSuperAdmin ? 'Editable' : 'Locked';
            deploymentAreaBadge.classList.toggle('locked', !policy.isSuperAdmin);
        }
        if (deploymentAreaHint) {
            deploymentAreaHint.textContent = policy.isSuperAdmin
                ? 'Changes the data entry fields and report columns.'
                : `Locked by access policy. This operator can only work in ${policy.assignedArea}.`;
        }
        if (areaLockedPill) areaLockedPill.hidden = policy.isSuperAdmin;
        if (areaLockedText) areaLockedText.textContent = `Area: ${policy.assignedArea}`;

        storageSet(DEPLOYMENT_KEY, nextArea);
        updateDeploymentUI(nextArea);
        updateFacilityLabel(nextArea);
        syncQuickAreaFilterOptions();
    }

    function getProfileInitials(name) {
        return String(name || 'GA')
            .split(' ')
            .filter(Boolean)
            .slice(0, 2)
            .map(part => part[0]?.toUpperCase() || '')
            .join('') || 'GA';
    }

    function renderDefaultProfileAvatar(target) {
        if (!target) return;
        target.innerHTML = `
            <span class="profile-summary-avatar-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
                    stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 12a4 4 0 1 0 0-8a4 4 0 0 0 0 8Z"></path>
                    <path d="M5 20a7 7 0 0 1 14 0"></path>
                </svg>
            </span>`;
        target.setAttribute('aria-label', 'Default user profile icon');
    }

    function renderProfileDetails() {
        const profile = getProfile();
        const policy = getAccessPolicy(profile);

        if (profileName) profileName.value = profile.name;
        if (profileAccessRole) profileAccessRole.value = policy.accessRole;
        if (profileAssignedArea) profileAssignedArea.value = profile.assignedArea;
        if (profileEmail) profileEmail.value = profile.email;
        if (profilePhone) profilePhone.value = profile.phone;
        if (profileSummaryAvatar) renderDefaultProfileAvatar(profileSummaryAvatar);
        if (profileSummaryName) profileSummaryName.textContent = profile.name;
        if (profileSummaryRole) profileSummaryRole.textContent = `${getRoleLabel(policy.accessRole)} | ${profile.assignedArea}`;
        if (profilePlanBadge) profilePlanBadge.textContent = profile.plan;
        if (subscriptionPlanName) subscriptionPlanName.textContent = `${profile.plan} Plan`;
        if (subscriptionRenewalInfo) subscriptionRenewalInfo.textContent = profile.renewal;
        applyAccessPolicy();
    }

    function updateProfileTrigger() {
        const profile = getProfile();
        const policy = getAccessPolicy(profile);
        const triggerAvatar = document.querySelector('.profile-avatar');
        const triggerName = document.querySelector('.profile-copy strong');
        const triggerMeta = document.querySelector('.profile-copy small');

        if (triggerAvatar) renderDefaultProfileAvatar(triggerAvatar);
        if (triggerName) triggerName.textContent = profile.name;
        if (triggerMeta) triggerMeta.textContent = `${getRoleLabel(policy.accessRole)} | ${policy.assignedArea}`;
    }

    function initProfile() {
        saveProfile(getProfile());
        renderProfileDetails();
        updateProfileTrigger();
        // Initialize Engine Status Pill
        const engineInfoPill = document.getElementById('engineInfoPill');
        if (engineInfoPill) {
            engineInfoPill.innerHTML = '<span class="engine-badge"><i data-lucide="zap" style="width:10px;height:10px;"></i> GATIQ Ai</span>';
            if (window.lucide) window.lucide.createIcons();
        }
    }

    function handleSignupAreaChange() {
        if (!signupAssignedArea || !authSignupHint) return;
        authSignupHint.textContent = `Operators will be locked to ${sanitizeArea(signupAssignedArea.value)} after signup.`;
    }

    function isValidEmail(value) {
        const email = String(value || '').trim().toLowerCase();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function getNameFromEmail(email) {
        const localPart = String(email || '').split('@')[0] || 'Operator';
        const cleaned = localPart.replace(/[._-]+/g, ' ').trim();
        if (!cleaned) return 'Google User';
        return cleaned
            .split(' ')
            .filter(Boolean)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ');
    }

    function getGoogleClientId() {
        return String(googleClientIdInput?.value || localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || '').trim();
    }

    function isGoogleAuthOriginSupported() {
        return window.location.protocol === 'http:' || window.location.protocol === 'https:';
    }

    function getGoogleAuthMode() {
        if (!getGoogleClientId() && !desktopBridge?.auth) return 'missing_client_id_polling';
        if (desktopBridge?.auth) return 'ready_desktop';
        if (!isGoogleAuthOriginSupported()) return 'python_polling';
        if (!window.google?.accounts?.id) return 'script_unavailable';
        return 'ready_web';
    }

    function updateGoogleAuthHint() {
        const mode = getGoogleAuthMode();
        let loginMessage = 'Sign in with your authorized GATIQ account to access the system.';
        let signupMessage = authSignupHint?.textContent || '';

        if (mode === 'missing_client_id_polling') {
            loginMessage = 'Select Google Sign-In to authenticate.';
        } else if (mode === 'unsupported_origin' || mode === 'python_polling') {
            loginMessage = 'Google Auth will open in your default browser.';
        }

        if (authLoginHint) authLoginHint.textContent = loginMessage;
        if (authSignupHint && mode === 'missing_client_id') {
            authSignupHint.textContent = 'Set a Google OAuth Client ID in Settings, then use Sign up with Google.';
        } else {
            handleSignupAreaChange();
        }
    }

    function decodeJwtPayload(token) {
        const segment = String(token || '').split('.')[1] || '';
        const normalized = segment.replace(/-/g, '+').replace(/_/g, '/');
        const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
        const json = atob(padded);
        const utf8 = decodeURIComponent(Array.from(json).map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''));
        return JSON.parse(utf8);
    }

    function getVisibleGoogleAction() {
        return signupForm?.classList.contains('auth-form-hidden') ? 'login' : 'signup';
    }

    function upsertGoogleUser(googleProfile, action) {
        const email = String(googleProfile?.email || '').trim().toLowerCase();
        if (!isValidEmail(email)) {
            throw new Error('Google account did not provide a valid email address.');
        }
        if (googleProfile.email_verified === false) {
            throw new Error('Google account email is not verified.');
        }

        const users = getAuthUsers();
        const existingUser = users.find(user => user.email === email);

        if (action === 'login') {
            if (!existingUser) {
                throw new Error('Google account not found. Use "Sign up with Google" first.');
            }
            return { user: existingUser, created: false };
        }

        if (existingUser) {
            throw new Error('This Google account is already registered. Please log in.');
        }

        const accessRole = OPERATOR_ROLE;
        const assignedArea = sanitizeArea(signupAssignedArea?.value);
        const enteredName = String(signupName?.value || '').trim();
        const nextUser = normalizeAuthUser({
            name: enteredName || String(googleProfile?.name || '').trim() || getNameFromEmail(email),
            email,
            phone: String(signupPhone?.value || '').trim() || '+91 98765 43210',
            password: '',
            accessRole,
            accessRoleConfirmed: true,
            assignedArea,
            role: getRoleLabel(accessRole),
            plan: 'Starter',
            renewal: 'Renews on 30 Apr 2026',
            freshWorkspace: true
        });

        users.push(nextUser);
        saveAuthUsers(users);
        return { user: nextUser, created: true };
    }

    function handleGoogleCredentialResponse(response) {
        try {
            const googleProfile = decodeJwtPayload(response?.credential || '');
            const action = getVisibleGoogleAction();
            const result = upsertGoogleUser(googleProfile, action);

            if (loginEmail) loginEmail.value = result.user.email;
            if (signupEmail) signupEmail.value = result.user.email;
            applyAuthenticatedUser(result.user);

            if (signupForm) signupForm.reset();
            populateAuthAreaOptions();
            handleSignupAreaChange();

            showToast(
                result.created
                    ? `Google signup complete for ${result.user.name}.`
                    : `Logged in with Google as ${result.user.name}.`,
                'success'
            );
        } catch (error) {
            showToast(error.message || 'Google authentication failed.', 'error');
        }
    }

    function syncGoogleAuthButtons() {
        const mode = getGoogleAuthMode();
        const readyWeb = mode === 'ready_web';

        if (btnLoginGoogle) btnLoginGoogle.hidden = readyWeb;
        if (btnSignupGoogle) btnSignupGoogle.hidden = readyWeb;
        if (googleLoginButtonHost) googleLoginButtonHost.hidden = !readyWeb;
        if (googleSignupButtonHost) googleSignupButtonHost.hidden = !readyWeb;
    }

    function initializeGoogleAuth() {
        syncGoogleAuthButtons();
        updateGoogleAuthHint();

        if (getGoogleAuthMode() !== 'ready_web') {
            googleAuthInitializedFor = '';
            return;
        }

        const clientId = getGoogleClientId();
        if (googleAuthInitializedFor !== clientId) {
            window.google.accounts.id.initialize({
                client_id: clientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                use_fedcm_for_button: true
            });
            googleAuthInitializedFor = clientId;
        }

        if (googleLoginButtonHost) {
            googleLoginButtonHost.innerHTML = '';
            window.google.accounts.id.renderButton(googleLoginButtonHost, {
                theme: 'outline',
                size: 'large',
                shape: 'pill',
                text: 'continue_with',
                width: googleLoginButtonHost.clientWidth || 380
            });
        }

        if (googleSignupButtonHost) {
            googleSignupButtonHost.innerHTML = '';
            window.google.accounts.id.renderButton(googleSignupButtonHost, {
                theme: 'outline',
                size: 'large',
                shape: 'pill',
                text: 'signup_with',
                width: googleSignupButtonHost.clientWidth || 380
            });
        }
    }

    async function runDesktopGoogleAuth(action) {
        const mode = getGoogleAuthMode();
        
        // Let legacy desktopBridge take precedence if it exists
        if (mode === 'ready_desktop' && desktopBridge?.auth) {
            try {
                showToast('Opening Google sign-in in your browser...', 'info');
                const result = await desktopBridge.auth.startGoogleAuth({
                    action,
                    clientId: getGoogleClientId()
                });
                const resultAction = result?.action === 'signup' ? 'signup' : 'login';
                const authResult = upsertGoogleUser(result?.profile || {}, resultAction);
                finishGoogleAuthWithUI(authResult);
                return;
            } catch (error) {
                showToast(error.message || 'Google authentication failed.', 'error');
                return;
            }
        }
        
        // Otherwise, use the Python Backend window.open local polling flow
        try {
            showToast('Opening Google sign-in in your default browser (Chrome)...', 'info');
            
            // Unique session ID for polling
            const sessionId = crypto.randomUUID ? crypto.randomUUID() : 'sess-' + Math.random().toString(36).substr(2, 9);
            
            // Call the local backend endpoint to trigger the system default browser popup
            fetch(`http://127.0.0.1:8001/auth/google/login?session_id=${sessionId}`).catch(() => console.warn('Could not reach Py backend'));
            
            let attempts = 0;
            const maxAttempts = 120; // 2 minutes max
            
            const btnLogin = action === 'signup' ? document.getElementById('btnSignupGoogle') : document.getElementById('btnLoginGoogle');
            const originalHTML = btnLogin ? btnLogin.innerHTML : '';
            if (btnLogin) btnLogin.innerHTML = `<span class="spinner" style="margin-right: 8px;"></span> Waiting for Chrome...`;
            
            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const res = await fetch(`http://127.0.0.1:8001/auth/google/status?session_id=${sessionId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.status === 'success' && data.user) {
                            clearInterval(pollInterval);
                            if (btnLogin) btnLogin.innerHTML = originalHTML;
                            
                            const userProfile = {
                                name: data.user.name || "Google User",
                                email: data.user.email,
                                sub: data.user.email
                            };
                            
                            const authResult = upsertGoogleUser(userProfile, action);
                            finishGoogleAuthWithUI(authResult);
                            
                        } else if (data.status === 'failed') {
                            clearInterval(pollInterval);
                            if (btnLogin) btnLogin.innerHTML = originalHTML;
                            showToast(data.error || 'Google login failed.', 'error');
                        }
                    }
                } catch (e) {
                    // ignore network errors while polling
                }
                
                if (attempts >= maxAttempts) {
                    clearInterval(pollInterval);
                    if (btnLogin) btnLogin.innerHTML = originalHTML;
                    showToast('Google login timed out.', 'error');
                }
            }, 1000);
            
        } catch (error) {
            showToast('Could not reach local API for Google Auth. Please check backend is running.', 'error');
        }
    }

    function finishGoogleAuthWithUI(authResult) {
        if (loginEmail) loginEmail.value = authResult.user.email;
        if (signupEmail) signupEmail.value = authResult.user.email;
        applyAuthenticatedUser(authResult.user);

        if (signupForm) signupForm.reset();
        populateAuthAreaOptions();
        handleSignupAreaChange();

        showToast(
            authResult.created
                ? `Google signup complete for ${authResult.user.name}.`
                : `Logged in securely with Google as ${authResult.user.name}.`,
            'success'
        );
    }

    function handleGoogleLogin() {
        const mode = getGoogleAuthMode();
        if (mode === 'ready_desktop' || mode === 'python_polling' || mode === 'missing_client_id_polling') {
            void runDesktopGoogleAuth('login');
        } else if (mode === 'unsupported_origin') {
            showToast('Google auth needs localhost or HTTPS.', 'error');
        } else {
            showToast('Google auth is still loading. Retry in a moment.', 'info');
        }
    }

    async function handleCloudConnect() {
        const clientId = String(googleClientIdInput?.value || '').trim();
        if (!clientId) {
            showToast('⚠️ Please provide a Google Client ID in settings first.', 'error');
            return;
        }

        try {
            showToast('Opening Google Cloud Auth...', 'info');
            const result = await window.electron.invoke('auth:start-google', {
                clientId,
                action: 'cloud_connect'
            });

            if (result && result.profile) {
                storageSet('gatiq_cloud_token', 'connected_real'); 
                storageSet('gatiq_cloud_user', result.profile.email || result.profile.name);
                updateCloudConnectionUI();
                showToast(`Google Cloud connected as ${result.profile.email}. Backup enabled.`, 'success');
            }
        } catch (err) {
            console.error('Cloud connect error:', err);
            showToast(`Could not connect to Google Cloud: ${err.message}`, 'error');
        }
    }

    async function updateCloudConnectionUI() {
        const statusEl = document.getElementById('cloudConnectionStatus');
        const connectBtn = document.getElementById('btnConnectGoogleCloud');
        
        let isConnected = false;
        let cloudUser = storageGet('gatiq_cloud_user');

        try {
            const status = await window.electron.invoke('cloud:get-status');
            isConnected = status.connected;
        } catch (e) {
            isConnected = false;
        }

        if (isConnected && cloudUser) {
            statusEl.textContent = `Connected: ${cloudUser}`;
            statusEl.className = 'stat-badge on'; 
            statusEl.style.color = 'var(--text-accent)';
        } else {
            statusEl.textContent = 'Disconnected';
            statusEl.className = 'stat-badge';
            statusEl.style.color = '';
        }
        
        if (isConnected && cloudUser) {
            connectBtn.innerHTML = '<span style="display:flex;align-items:center;"><i data-lucide="log-out" style="width:16px;height:16px;"></i></span> Disconnect Cloud';
            connectBtn.classList.replace('btn-secondary', 'btn-danger');
            connectBtn.onclick = async () => {
                await window.electron.invoke('cloud:disconnect');
                storageRemove('gatiq_cloud_token');
                storageRemove('gatiq_cloud_user');
                updateCloudConnectionUI();
                syncCloudUI(false);
                showToast('Google Cloud disconnected.', 'info');
            };
        } else if (connectBtn) {
            connectBtn.innerHTML = '<span style="display:flex;align-items:center;"><i data-lucide="link" style="width:16px;height:16px;"></i></span> Connect Google Account';
            connectBtn.classList.replace('btn-danger', 'btn-secondary');
            connectBtn.onclick = handleCloudConnect;
        }
    }

    async function purgeExpiredData() {
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, now.getDate());
        const cutoffIso = twelveMonthsAgo.toISOString();
        
        try {
            // 1. Purge Reports (PDFs)
            // Backend should handle cutoff filtering normally via logs/reports clean up.
            // But we can trigger deletion of old reports if needed.
            const history = await getPDFHistory();
            for (const report of history) {
                const date = new Date(report.generatedAt);
                if (date < twelveMonthsAgo) {
                    await deletePDFReportAPI(report.id);
                }
            }

            // 2. Clear old logs via direct backend cutoff if exists, 
            // or just rely on local LogManager filtering and delete.
            // For now, let's keep it simple.
            console.log(`[Retention Policy] Purge check completed. (12-month limit: ${cutoffIso})`);
        } catch (err) {
            console.warn('Purge data error:', err);
        }
    }

    function handleGoogleSignup() {
        const mode = getGoogleAuthMode();
        if (mode === 'ready_desktop' || mode === 'python_polling' || mode === 'missing_client_id_polling') {
            void runDesktopGoogleAuth('signup');
            return;
        }
        handleGoogleLogin();
    }

    function handleLoginSubmit(e) {
        e.preventDefault();
        const email = String(loginEmail?.value || '').trim().toLowerCase();
        const password = String(loginPassword?.value || '');

        if (!email || !password) {
            showToast('Enter email and password to continue.', 'error');
            return;
        }

        const user = getAuthUsers().find(item => item.email === email && item.password === password);
        if (!user) {
            showToast('Invalid login credentials.', 'error');
            return;
        }

        applyAuthenticatedUser(user);
        if (loginPassword) loginPassword.value = '';
        showToast(`Logged in as ${user.name}.`, 'success');
    }

    function handleSignupSubmit(e) {
        e.preventDefault();
        const name = String(signupName?.value || '').trim();
        const email = String(signupEmail?.value || '').trim().toLowerCase();
        const phone = String(signupPhone?.value || '').trim() || '+91 98765 43210';
        const password = String(signupPassword?.value || '');
        const accessRole = OPERATOR_ROLE;
        const assignedArea = sanitizeArea(signupAssignedArea?.value);

        if (!name || !email || !password) {
            showToast('Name, email, and password are required for signup.', 'error');
            return;
        }

        const users = getAuthUsers();
        if (users.some(user => user.email === email)) {
            showToast('An account with this email already exists.', 'error');
            return;
        }

        const nextUser = normalizeAuthUser({
            name,
            email,
            phone,
            password,
            accessRole,
            accessRoleConfirmed: true,
            assignedArea,
            role: getRoleLabel(accessRole),
            plan: 'Starter',
            renewal: 'Renews on 30 Apr 2026',
            freshWorkspace: true
        });

        users.push(nextUser);
        saveAuthUsers(users);
        applyAuthenticatedUser(nextUser);

        if (signupForm) signupForm.reset();
        populateAuthAreaOptions();
        handleSignupAreaChange();
        showToast(`Account created for ${name}.`, 'success');
    }

    function toggleAuthPasswordVisibility(input, openIcon, closedIcon) {
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        if (openIcon) openIcon.style.display = isPassword ? 'none' : 'block';
        if (closedIcon) closedIcon.style.display = isPassword ? 'block' : 'none';
    }

    function initAuth() {
        populateAuthAreaOptions();
        handleSignupAreaChange();
        updateGoogleAuthHint();

        if (btnAuthTabLogin) btnAuthTabLogin.addEventListener('click', () => setAuthTab('login'));
        if (btnAuthTabSignup) btnAuthTabSignup.addEventListener('click', () => setAuthTab('signup'));
        if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
        if (signupForm) signupForm.addEventListener('submit', handleSignupSubmit);
        if (signupAssignedArea) signupAssignedArea.addEventListener('change', handleSignupAreaChange);
        if (loginPasswordToggle) {
            loginPasswordToggle.addEventListener('click', () => {
                toggleAuthPasswordVisibility(loginPassword, loginEyeOpen, loginEyeClosed);
            });
        }
        if (signupPasswordToggle) {
            signupPasswordToggle.addEventListener('click', () => {
                toggleAuthPasswordVisibility(signupPassword, signupEyeOpen, signupEyeClosed);
            });
        }
        if (btnLoginGoogle) btnLoginGoogle.addEventListener('click', handleGoogleLogin);
        if (btnSignupGoogle) btnSignupGoogle.addEventListener('click', handleGoogleSignup);
        if (googleClientIdInput) {
            googleClientIdInput.value = localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || '';
            googleClientIdInput.addEventListener('input', () => {
                const clientId = String(googleClientIdInput.value || '').trim();
                if (clientId) localStorage.setItem(GOOGLE_CLIENT_ID_KEY, clientId);
                else localStorage.removeItem(GOOGLE_CLIENT_ID_KEY);
                initializeGoogleAuth();
            });
        }

        initializeGoogleAuth();
        window.setTimeout(initializeGoogleAuth, 1200);
        updateCloudConnectionUI();
        purgeExpiredData();

        restoreAuthenticatedSession();
    }

    init();

    function getInteractiveButton(target) {
        return target?.closest?.(IOS_BUTTON_SELECTOR) || null;
    }

    function resetInteractiveButtonState(button) {
        if (!button) return;
        button.classList.remove('ios-pressing');
    }

    function setupButtonMotion() {
        document.addEventListener('pointerdown', (event) => {
            const button = getInteractiveButton(event.target);
            if (!button || button.disabled) return;
            button.classList.add('ios-pressing');
        });

        document.addEventListener('pointerup', (event) => {
            resetInteractiveButtonState(getInteractiveButton(event.target));
        });

        document.addEventListener('pointercancel', (event) => {
            resetInteractiveButtonState(getInteractiveButton(event.target));
        });

        document.addEventListener('pointerleave', (event) => {
            resetInteractiveButtonState(getInteractiveButton(event.target));
        }, true);

        document.addEventListener('click', (event) => {
            const button = getInteractiveButton(event.target);
            if (!button || button.disabled) return;
            button.classList.remove('ios-tap-pop');
            void button.offsetWidth;
            button.classList.add('ios-tap-pop');
            window.setTimeout(() => button.classList.remove('ios-tap-pop'), 620);
        });
    }

    function applyModalTriggerOrigin(modalOverlay, trigger) {
        const modalCard = modalOverlay?.querySelector?.('.modal');
        if (!modalCard) return;

        if (!trigger || typeof trigger.getBoundingClientRect !== 'function') {
            modalCard.style.setProperty('--modal-origin-x', '50%');
            modalCard.style.setProperty('--modal-origin-y', '50%');
            modalCard.style.setProperty('--modal-start-x', '0px');
            modalCard.style.setProperty('--modal-start-y', '16px');
            modalCard.style.setProperty('--modal-start-scale', '0.94');
            return;
        }

        const rect = trigger.getBoundingClientRect();
        const triggerCenterX = rect.left + (rect.width / 2);
        const triggerCenterY = rect.top + (rect.height / 2);
        const viewportCenterX = window.innerWidth / 2;
        const viewportCenterY = window.innerHeight / 2;
        const deltaX = Math.round(triggerCenterX - viewportCenterX);
        const deltaY = Math.round(triggerCenterY - viewportCenterY);
        const originX = `${((triggerCenterX / window.innerWidth) * 100).toFixed(2)}%`;
        const originY = `${((triggerCenterY / window.innerHeight) * 100).toFixed(2)}%`;
        const triggerScale = Math.max(0.18, Math.min(0.34, rect.width / 240));

        modalCard.style.setProperty('--modal-origin-x', originX);
        modalCard.style.setProperty('--modal-origin-y', originY);
        modalCard.style.setProperty('--modal-start-x', `${deltaX}px`);
        modalCard.style.setProperty('--modal-start-y', `${deltaY}px`);
        modalCard.style.setProperty('--modal-start-scale', triggerScale.toFixed(3));
    }

    function openAnchoredModal(modalOverlay, trigger, beforeOpen) {
        if (!modalOverlay) return;
        if (typeof beforeOpen === 'function') beforeOpen();
        applyModalTriggerOrigin(modalOverlay, trigger);
        modalOverlay.classList.remove('closing');
        modalOverlay.classList.remove('open');
        void modalOverlay.offsetWidth;
        modalOverlay.classList.add('open');
    }

    function closeAnchoredModal(modalOverlay) {
        if (!modalOverlay) return;
        if (!modalOverlay.classList.contains('open')) return;
        modalOverlay.classList.remove('open');
        modalOverlay.classList.add('closing');
        window.setTimeout(() => modalOverlay.classList.remove('closing'), 260);
    }

    function applyFloatingPanelOrigin(panel, trigger) {
        if (!panel) return;
        if (!trigger || typeof trigger.getBoundingClientRect !== 'function') {
            panel.style.setProperty('--panel-origin-x', '100%');
            panel.style.setProperty('--panel-origin-y', '0%');
            panel.style.setProperty('--panel-start-x', '0px');
            panel.style.setProperty('--panel-start-y', '-8px');
            panel.style.setProperty('--panel-start-scale', '0.94');
            return;
        }

        const rect = trigger.getBoundingClientRect();
        const triggerCenterX = rect.left + (rect.width / 2);
        const triggerCenterY = rect.top + (rect.height / 2);
        panel.style.setProperty('--panel-origin-x', `${((triggerCenterX / window.innerWidth) * 100).toFixed(2)}%`);
        panel.style.setProperty('--panel-origin-y', `${((triggerCenterY / window.innerHeight) * 100).toFixed(2)}%`);
        panel.style.setProperty('--panel-start-x', '0px');
        panel.style.setProperty('--panel-start-y', '-10px');
        panel.style.setProperty('--panel-start-scale', '0.94');
    }

    function openFloatingPanel(panel, trigger) {
        if (!panel) return;
        applyFloatingPanelOrigin(panel, trigger);
        panel.classList.remove('closing');
        panel.classList.remove('open');
        void panel.offsetWidth;
        panel.classList.add('open');
    }

    function closeFloatingPanel(panel) {
        if (!panel || !panel.classList.contains('open')) return;
        panel.classList.remove('open');
        panel.classList.add('closing');
        window.setTimeout(() => panel.classList.remove('closing'), 240);
    }

    function hasActiveAnchoredModal() {
        return Boolean(document.querySelector('.modal-overlay.open, .modal-overlay.closing'));
    }

    async function init() {
        setActiveUserScope(null);
        await initializeBackendRuntime();
        await initializeUpdaterRuntime();

        // Load saved settings
        const savedSociety = storageGet(SOCIETY_KEY);
        const savedGate = storageGet(GATE_KEY);
        const savedDeployment = sanitizeArea(storageGet(DEPLOYMENT_KEY));
        if (savedSociety) societyInput.value = savedSociety;
        if (savedGate) gateSelect.value = savedGate;
        if (savedDeployment && deploymentAreaSelect) deploymentAreaSelect.value = savedDeployment;
        if (googleClientIdInput) googleClientIdInput.value = localStorage.getItem(GOOGLE_CLIENT_ID_KEY) || '';

        // Render existing log
        renderTable();

        initProfile();
        initAuth();

        // Load saved theme
        initTheme();
        finishStartupSplash();
        initCloudSync();
        initSyncStatus();
        updateScanButton();
        setupButtonMotion();

        // Event listeners
        registerBackendSettingsListeners();
        if (backendApiKeyToggle) backendApiKeyToggle.addEventListener('click', () => {
            togglePasswordFieldVisibility(
                backendApiKeyInput,
                document.getElementById('backendEyeIconOpen'),
                document.getElementById('backendEyeIconCrossed')
            );
        });
        if (btnRestartBackendConnection) btnRestartBackendConnection.addEventListener('click', handleRestartBackendConnection);
        if (btnTestBackendConnection) btnTestBackendConnection.addEventListener('click', handleTestBackendConnection);
        if (btnCheckForUpdates) btnCheckForUpdates.addEventListener('click', handleCheckForUpdates);
        if (btnInstallUpdate) btnInstallUpdate.addEventListener('click', handleInstallUpdate);
        themeToggle.addEventListener('click', handleThemeToggle);
        if (btnFirstRunLater) btnFirstRunLater.addEventListener('click', closeFirstRunSetup);
        if (btnFirstRunOpenSettings) {
            btnFirstRunOpenSettings.addEventListener('click', (event) => {
                closeFirstRunSetup();
                openAnchoredModal(settingsModal, event.currentTarget, applyAccessPolicy);
            });
        }
        if (btnFirstRunSave) btnFirstRunSave.addEventListener('click', handleFirstRunSetupSave);
        if (firstRunSetupModal) {
            firstRunSetupModal.addEventListener('click', (e) => {
                if (e.target === firstRunSetupModal) closeFirstRunSetup();
            });
        }
        if (btnProfileMenu) {
            btnProfileMenu.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleProfileMenu(null, e.currentTarget);
            });
        }
        if (btnLogout) {
            btnLogout.addEventListener('click', (event) => handleLogout(event.currentTarget));
        }
        if (btnOpenProfile) {
            btnOpenProfile.addEventListener('click', (event) => openProfileModal(event.currentTarget));
        }
        societyInput.addEventListener('change', () => storageSet(SOCIETY_KEY, societyInput.value));
        gateSelect.addEventListener('change', () => storageSet(GATE_KEY, gateSelect.value));
        if (deploymentAreaSelect) {
            deploymentAreaSelect.addEventListener('change', () => {
                const area = deploymentAreaSelect.value;
                if (!enforceAreaAccess(area, 'Deployment area switch')) {
                    applyAccessPolicy();
                    return;
                }
                storageSet(DEPLOYMENT_KEY, area);
                updateDeploymentUI(area);
                updateFacilityLabel(area);
                renderQuickAccessResults();
            });
        }

    function handleCameraSourceChange() {
        const source = cameraSourceSelect?.value;
        if (cctvUrlGroup) cctvUrlGroup.style.display = source === 'cctv' ? 'block' : 'none';
        updateScanButton();
    }

        if (cameraSourceSelect) cameraSourceSelect.addEventListener('change', handleCameraSourceChange);

        btnStartCamera.addEventListener('click', handleStartCamera);
        imageUpload.addEventListener('change', handleImageUpload);
        btnScanPlate.addEventListener('click', handleScan);
        btnAddManual.addEventListener('click', handleManualAdd);

        if (btnExportPDF) {
            btnExportPDF.addEventListener('click', handleExportPDF);
        }
        if (btnQuickAccess) {
            btnQuickAccess.addEventListener('click', () => {
                if (quickDrawer) quickDrawer.classList.add('open');
                if (quickDrawerBackdrop) quickDrawerBackdrop.classList.add('open');
                ensureQuickAccessSnapshot(getActiveArea());
                syncQuickAreaFilterOptions();
                renderQuickAccessResults();
            });
        }
        if (btnHeaderHome) {
            btnHeaderHome.addEventListener('click', () => {
                showHomeDashboard();
                closeQuickDrawer();
                closeFloatingPanel(notificationPanel);
                closeProfileMenu();
            });
        }
        if (btnOpenWorkspace) btnOpenWorkspace.addEventListener('click', showWorkspace);
        if (btnDashboardQuickAccess) btnDashboardQuickAccess.addEventListener('click', () => {
            if (quickDrawer) quickDrawer.classList.add('open');
            if (quickDrawerBackdrop) quickDrawerBackdrop.classList.add('open');
            ensureQuickAccessSnapshot(getActiveArea());
            syncQuickAreaFilterOptions();
            renderQuickAccessResults();
        });
        if (btnDashStartCamera) btnDashStartCamera.addEventListener('click', () => {
            showWorkspace();
            btnStartCamera?.click();
        });
        if (btnDashManualEntry) btnDashManualEntry.addEventListener('click', () => {
            showWorkspace();
            manualVehicle?.focus();
            manualVehicle?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
        if (btnDashOpenSettings) btnDashOpenSettings.addEventListener('click', (event) => {
            openAnchoredModal(settingsModal, event.currentTarget, applyAccessPolicy);
        });
        if (btnDashOpenNotifications) btnDashOpenNotifications.addEventListener('click', (e) => {
            e.stopPropagation();
            openNotificationsPanel(e.currentTarget);
        });
        if (btnNotifications) {
            btnNotifications.addEventListener('click', (e) => {
                e.stopPropagation();
                toggleNotificationsPanel(null, e.currentTarget);
            });
        }
        if (btnClearNotifications) {
            btnClearNotifications.addEventListener('click', () => {
                notifications = [];
                unreadNotificationCount = 0;
                renderNotifications();
            });
        }
        if (btnHelpShortcuts && helpModal) {
            btnHelpShortcuts.addEventListener('click', (event) => openAnchoredModal(helpModal, event.currentTarget));
        }
        if (btnCloseHelp && helpModal) {
            btnCloseHelp.addEventListener('click', () => closeAnchoredModal(helpModal));
            helpModal.addEventListener('click', (e) => {
                if (e.target === helpModal) closeAnchoredModal(helpModal);
            });
        }
        if (btnEmergencyAlert) {
            btnEmergencyAlert.addEventListener('click', (event) => handleEmergencyAlert(event.currentTarget));
        }
        if (btnCancelEmergencyAlert) {
            btnCancelEmergencyAlert.addEventListener('click', closeEmergencyConfirmModal);
        }
        if (btnConfirmEmergencyAlert) {
            btnConfirmEmergencyAlert.addEventListener('click', confirmEmergencyAlert);
        }
        if (emergencyConfirmModal) {
            emergencyConfirmModal.addEventListener('click', (e) => {
                if (e.target === emergencyConfirmModal) closeEmergencyConfirmModal();
            });
        }
        if (btnCancelLogout) {
            btnCancelLogout.addEventListener('click', closeLogoutConfirmModal);
        }
        if (btnConfirmLogout) {
            btnConfirmLogout.addEventListener('click', confirmLogout);
        }
        if (logoutConfirmModal) {
            logoutConfirmModal.addEventListener('click', (e) => {
                if (e.target === logoutConfirmModal) closeLogoutConfirmModal();
            });
        }
        document.addEventListener('click', (e) => {
            if (hasActiveAnchoredModal()) return;
            if (notificationPanel && btnNotifications && !notificationPanel.contains(e.target) && !btnNotifications.contains(e.target)) {
                closeFloatingPanel(notificationPanel);
            }
            if (profileMenu && btnProfileMenu && !profileMenu.contains(e.target) && !btnProfileMenu.contains(e.target)) {
                closeProfileMenu();
            }
        });
        document.addEventListener('keydown', handleHeaderShortcuts);
        if (btnQuickBack) btnQuickBack.addEventListener('click', closeQuickDrawer);
        if (quickDrawerBackdrop) quickDrawerBackdrop.addEventListener('click', closeQuickDrawer);
        if (btnCloseQuickViewer) btnCloseQuickViewer.addEventListener('click', closeQuickViewer);
        if (quickViewerModal) {
            quickViewerModal.addEventListener('click', (e) => {
                if (e.target === quickViewerModal) closeQuickViewer();
            });
        }
        if (btnQuickExportSelected) {
            btnQuickExportSelected.addEventListener('click', handleExportSelectedReports);
        }
        [quickAccessSearch].forEach(el => {
            if (el) el.addEventListener('input', renderQuickAccessResults);
        });
        if (quickViewerSearch) {
            quickViewerSearch.addEventListener('input', () => {
                quickViewerSearchTerm = quickViewerSearch.value || '';
                quickViewerMatchIndex = 0;
                renderQuickViewer(true);
            });
        }
        if (btnQuickViewerPrev) btnQuickViewerPrev.addEventListener('click', () => navigateQuickViewerMatch(-1));
        if (btnQuickViewerNext) btnQuickViewerNext.addEventListener('click', () => navigateQuickViewerMatch(1));
        if (btnQuickViewerZoomOut) btnQuickViewerZoomOut.addEventListener('click', () => setQuickViewerZoom(quickViewerZoom - QUICK_VIEWER_ZOOM_STEP));
        if (btnQuickViewerZoomIn) btnQuickViewerZoomIn.addEventListener('click', () => setQuickViewerZoom(quickViewerZoom + QUICK_VIEWER_ZOOM_STEP));
        if (btnQuickViewerZoomReset) btnQuickViewerZoomReset.addEventListener('click', () => setQuickViewerZoom(1));
        if (btnQuickViewerDownload) btnQuickViewerDownload.addEventListener('click', handleQuickViewerDownload);
        if (btnQuickViewerOpenTab) btnQuickViewerOpenTab.addEventListener('click', handleQuickViewerOpenInNewTab);
        if (btnQuickViewerShare) btnQuickViewerShare.addEventListener('click', handleQuickViewerShare);
        if (quickAreaFilter) {
            quickAreaFilter.addEventListener('change', () => {
                if (!enforceAreaAccess(quickAreaFilter.value || getActiveArea(), 'Quick access filter')) {
                    syncQuickAreaFilterOptions();
                    renderQuickAccessResults();
                    return;
                }
                quickSelectedArea = quickAreaFilter.value;
                renderQuickAccessResults();
            });
        }
        if (quickChipMonth) {
            quickChipMonth.addEventListener('click', () => {
                quickGroupMode = 'month';
                quickChipMonth.classList.add('active');
                if (quickChipYear) quickChipYear.classList.remove('active');
                renderQuickAccessResults();
            });
        }
        if (quickChipYear) {
            quickChipYear.addEventListener('click', () => {
                quickGroupMode = 'year';
                quickChipYear.classList.add('active');
                if (quickChipMonth) quickChipMonth.classList.remove('active');
                renderQuickAccessResults();
            });
        }
        if (quickCloudSyncToggle) {
            quickCloudSyncToggle.addEventListener('click', handleCloudSyncToggle);
        }
        applyAccessPolicy();
        renderQuickAccessResults();
        renderNotifications();
        renderDashboard();
        if (getAuthSession()?.userId) {
            restoreInitialView();
        }

        btnSaveEdit.addEventListener('click', handleSaveEdit);
        btnCancelEdit.addEventListener('click', () => closeModal());
        editModal.addEventListener('click', (e) => {
            if (e.target === editModal) closeModal();
        });

        if (btnCloseProfile) btnCloseProfile.addEventListener('click', closeProfileModal);
        if (btnSaveProfile) btnSaveProfile.addEventListener('click', handleSaveProfile);
        if (btnUpgradePlan) btnUpgradePlan.addEventListener('click', handleUpgradePlan);
        if (profileAccessRole) {
            profileAccessRole.addEventListener('change', () => {
                const nextRole = sanitizeAccessRole(profileAccessRole.value);
                const allowedAreas = nextRole === SUPER_ADMIN_ROLE ? getAllAreas() : [sanitizeArea(profileAssignedArea?.value)];
                if (profileAssignedArea && nextRole !== SUPER_ADMIN_ROLE) {
                    profileAssignedArea.value = sanitizeArea(profileAssignedArea.value);
                }
                if (profileAssignedArea) {
                    profileAssignedArea.disabled = nextRole !== SUPER_ADMIN_ROLE;
                    setDeploymentAreaOptions(profileAssignedArea, allowedAreas);
                }
                if (profileAccessNote) {
                    profileAccessNote.textContent = nextRole === SUPER_ADMIN_ROLE
                        ? 'Super admins can switch deployment areas and assign area scope from this profile.'
                        : `Operator access is locked to ${sanitizeArea(profileAssignedArea?.value)}. Change requests should go through a super admin.`;
                }
            });
        }
        if (profileAssignedArea) {
            profileAssignedArea.addEventListener('change', () => {
                if (profileAccessNote && sanitizeAccessRole(profileAccessRole?.value) !== SUPER_ADMIN_ROLE) {
                    profileAccessNote.textContent = `Operator access is locked to ${sanitizeArea(profileAssignedArea.value)}. Change requests should go through a super admin.`;
                }
            });
        }
        if (profileModal) {
            profileModal.addEventListener('click', (e) => {
                if (e.target === profileModal) closeProfileModal();
            });
        }

        // Settings Modal
        btnSettings.addEventListener('click', (event) => {
            openAnchoredModal(settingsModal, event.currentTarget, applyAccessPolicy);
        });
        btnCloseSettings.addEventListener('click', () => closeAnchoredModal(settingsModal));
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) closeAnchoredModal(settingsModal);
        });

        // Whitelist Modal
        btnManageResidents.addEventListener('click', (event) => {
            openAnchoredModal(whitelistModal, event.currentTarget, renderWhitelist);
        });
        btnCloseWhitelist.addEventListener('click', () => closeAnchoredModal(whitelistModal));
        whitelistModal.addEventListener('click', (e) => {
            if (e.target === whitelistModal) closeAnchoredModal(whitelistModal);
        });
        btnAddResident.addEventListener('click', handleAddResident);
    }

    function togglePasswordFieldVisibility(input, eyeOpen, eyeCrossed) {
        if (!input) return;
        const isPwd = input.type === 'password';
        input.type = isPwd ? 'text' : 'password';
        if (eyeOpen && eyeCrossed) {
            eyeOpen.style.display = isPwd ? 'none' : 'block';
            eyeCrossed.style.display = isPwd ? 'block' : 'none';
        }
    }

    async function initializeBackendRuntime() {
        if (desktopBridge?.secureConfig) {
            if (backendApiUrlInput) {
                backendApiUrlInput.readOnly = true;
                backendApiUrlInput.title = 'GATIQ Desktop manages the local backend URL automatically.';
            }

            const config = cacheManagedBackendConfig(await desktopBridge.secureConfig.loadBackendConfig());
            applyBackendConfigToInputs(config);
            updateBackendConnectionStatus('Starting managed desktop backend...', 'muted');

            if (backendConnectionStatus) {
                backendConnectionStatus.dataset.runtimeMode = 'desktop';
            }

            if (removeDesktopBackendListener) {
                removeDesktopBackendListener();
                removeDesktopBackendListener = null;
            }

            removeDesktopBackendListener = desktopBridge.backend.onStatusChange((status) => {
                applyDesktopBackendStatus(status);
            });

            const initialStatus = await desktopBridge.backend.getStatus();
            applyDesktopBackendStatus(initialStatus);
            return;
        }

        if (backendApiUrlInput) {
            backendApiUrlInput.value = storageGet(BACKEND_API_URL_KEY) || DEFAULT_BACKEND_URL;
        }
        if (backendApiKeyInput) {
            backendApiKeyInput.value = storageGet(BACKEND_API_KEY_KEY) || DEFAULT_BACKEND_API_KEY;
        }
        if (IS_BROWSER_FILE_PREVIEW) {
            updateBackendConnectionStatus('You opened GATIQ in a browser preview. Local backend auto-start works only in the installed desktop app.', 'error');
            if (backendConnectionStatus) {
                backendConnectionStatus.title = 'Open the installed GATIQ Desktop app or manually run your API server if you are using browser mode for testing.';
            }
            return;
        }
        updateBackendConnectionStatus('Configure your local GATIQ API before enabling cloud sync.', 'muted');
    }

    async function initializeUpdaterRuntime() {
        if (!systemVersion) return;

        if (desktopBridge?.updater) {
            if (removeDesktopUpdaterListener) {
                removeDesktopUpdaterListener();
                removeDesktopUpdaterListener = null;
            }

            removeDesktopUpdaterListener = desktopBridge.updater.onStatusChange((status) => {
                applyUpdaterStatus(status);
            });

            const initialStatus = await desktopBridge.updater.getStatus();
            applyUpdaterStatus(initialStatus, true);
            return;
        }

        applyUpdaterStatus({
            state: 'browser',
            message: IS_BROWSER_FILE_PREVIEW
                ? 'You are in browser preview mode. Auto-update and backend auto-start are available only in the installed desktop app.'
                : 'Auto-update is available only in the installed desktop app.',
            currentVersion: systemVersion.textContent.replace(/^GATIQ\s+v/i, '') || '1.0.0'
        }, true);
    }

    function updateAppVersionBadge(version) {
        if (!systemVersion || !version) return;
        systemVersion.textContent = `GATIQ v${version}`;
    }

    function getUpdaterTone(status = {}) {
        if (status.state === 'downloaded' || status.state === 'up_to_date') return 'success';
        if (status.state === 'error') return 'error';
        if (status.state === 'available' || status.state === 'checking' || status.state === 'downloading') return 'accent';
        return 'muted';
    }

    function applyUpdaterStatus(status = {}, silent = false) {
        const currentVersion = String(status.currentVersion || '1.0.0').trim();
        const tone = getUpdaterTone(status);
        const stateChanged = status.state && status.state !== lastUpdaterState;

        updateAppVersionBadge(currentVersion);

        if (appUpdateStatus) {
            appUpdateStatus.textContent = status.message || 'Auto-update status unavailable.';
            appUpdateStatus.style.color =
                tone === 'success' ? '#16a34a' :
                    tone === 'error' ? '#dc2626' :
                        tone === 'accent' ? 'var(--accent)' :
                            'var(--text-primary)';
        }

        if (appUpdateMeta) {
            const metaParts = [`Current version: v${currentVersion}`];
            if (status.downloadedVersion) metaParts.push(`Ready: v${status.downloadedVersion}`);
            else if (status.releaseName) metaParts.push(status.releaseName);
            if (status.state === 'downloading' && Number.isFinite(status.percent)) {
                metaParts.push(`Download ${Math.round(status.percent)}%`);
            }
            appUpdateMeta.textContent = metaParts.join(' • ');
        }

        if (btnCheckForUpdates) {
            btnCheckForUpdates.disabled = status.state === 'checking' || status.state === 'downloading';
        }
        if (btnInstallUpdate) {
            const readyToInstall = status.state === 'downloaded';
            btnInstallUpdate.hidden = !readyToInstall;
            btnInstallUpdate.disabled = !readyToInstall;
        }

        if (!silent && stateChanged) {
            if (status.state === 'available') {
                showToast(`Update ${status.downloadedVersion || status.releaseName || ''} found. Download started automatically.`.trim(), 'info');
            } else if (status.state === 'downloaded') {
                showToast(`Update v${status.downloadedVersion || currentVersion} is ready. Click "Install Update" in Settings.`, 'success');
            } else if (status.state === 'error' && status.error) {
                showToast(`Auto-update failed: ${status.error}`, 'error');
            }
        }

        lastUpdaterState = status.state || lastUpdaterState;
    }

    function registerBackendSettingsListeners() {
        if (!backendApiUrlInput && !backendApiKeyInput) return;
        const eventName = desktopBridge ? 'change' : 'input';
        if (backendApiUrlInput) backendApiUrlInput.addEventListener(eventName, handleBackendSettingsChange);
        if (backendApiKeyInput) backendApiKeyInput.addEventListener(eventName, handleBackendSettingsChange);
    }

    function cacheManagedBackendConfig(config = {}) {
        managedBackendConfig = {
            baseUrl: normalizeBackendBaseUrl(config.baseUrl || DEFAULT_BACKEND_URL),
            apiKey: String(config.apiKey || DEFAULT_BACKEND_API_KEY).trim()
        };
        return managedBackendConfig;
    }

    function applyBackendConfigToInputs(config = {}) {
        if (backendApiUrlInput) backendApiUrlInput.value = normalizeBackendBaseUrl(config.baseUrl || DEFAULT_BACKEND_URL);
        if (backendApiKeyInput) backendApiKeyInput.value = String(config.apiKey || DEFAULT_BACKEND_API_KEY).trim();
    }

    function applyDesktopBackendStatus(status) {
        if (!status) return;
        const tone = status.state === 'ready'
            ? 'success'
            : status.state === 'failed' || status.state === 'stopped'
                ? 'error'
                : 'muted';
        const mode = status.mode ? ` (${status.mode})` : '';
        let message = status.message || 'Desktop backend status unavailable.';

        if (status.state === 'starting') {
            message = 'Managed desktop backend is starting...';
        } else if (status.state === 'ai_loading') {
            message = `Managed backend connected. AI engine is still loading${mode}.`;
        } else if (status.state === 'ready') {
            message = `Managed backend connected and AI engine ready${mode}.`;
        } else if (status.state === 'failed') {
            message = status.error ? `Managed backend failed: ${status.error}` : 'Managed backend failed to start.';
        } else if (status.state === 'stopped') {
            message = 'Managed backend is stopped.';
        }

        updateBackendConnectionStatus(message, tone);
        if (firstRunBackendStatus) firstRunBackendStatus.textContent = message;
    }

    function syncBrandLogos(theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light') {
        const asset = theme === 'dark' ? BRAND_LOGO_LIGHT : BRAND_LOGO_DARK;
        document.querySelectorAll('[data-brand-logo="primary"]').forEach((img) => {
            img.setAttribute('src', asset);
        });
    }

    function maybeOpenFirstRunSetup() {
        if (!desktopBridge || !firstRunSetupModal) return;
        if (localStorage.getItem(FIRST_RUN_SETUP_KEY) === 'done') return;
        populateFirstRunSetup();
        firstRunSetupModal.classList.add('open');
    }

    function closeFirstRunSetup() {
        if (firstRunSetupModal) firstRunSetupModal.classList.remove('open');
    }

    function populateFirstRunSetup() {
        const profile = getProfile();
        if (firstRunOperatorName) firstRunOperatorName.value = profile.name || '';
        if (firstRunFacility) firstRunFacility.value = societyInput?.value || storageGet(SOCIETY_KEY) || 'Sky Heights';
        if (firstRunGate) firstRunGate.value = gateSelect?.value || storageGet(GATE_KEY) || 'Gate 1';
        if (firstRunArea) firstRunArea.value = sanitizeArea(storageGet(DEPLOYMENT_KEY) || deploymentAreaSelect?.value || profile.assignedArea);
        if (firstRunBackendStatus) firstRunBackendStatus.textContent = backendConnectionStatus?.textContent || 'Starting managed desktop backend...';
    }

    function handleFirstRunSetupSave() {
        const profile = getProfile();
        const updatedProfile = saveProfile({
            ...profile,
            name: String(firstRunOperatorName?.value || profile.name).trim() || profile.name,
            assignedArea: sanitizeArea(firstRunArea?.value || profile.assignedArea)
        });

        if (societyInput) {
            societyInput.value = String(firstRunFacility?.value || societyInput.value || '').trim() || societyInput.value;
            storageSet(SOCIETY_KEY, societyInput.value);
        }
        if (gateSelect) {
            gateSelect.value = firstRunGate?.value || gateSelect.value;
            storageSet(GATE_KEY, gateSelect.value);
        }
        if (deploymentAreaSelect) {
            deploymentAreaSelect.value = sanitizeArea(firstRunArea?.value || deploymentAreaSelect.value);
            storageSet(DEPLOYMENT_KEY, deploymentAreaSelect.value);
            updateDeploymentUI(deploymentAreaSelect.value);
            updateFacilityLabel(deploymentAreaSelect.value);
        }

        renderProfileDetails();
        updateProfileTrigger();
        applyAccessPolicy();
        renderTable();
        renderDashboard();
        localStorage.setItem(FIRST_RUN_SETUP_KEY, 'done');
        closeFirstRunSetup();
        showToast(`Desktop setup complete for ${updatedProfile.name}.`, 'success');
    }

    function normalizeBackendBaseUrl(rawValue) {
        const fallback = DEFAULT_BACKEND_URL;
        const trimmed = String(rawValue || '').trim();
        if (!trimmed) return fallback;
        return trimmed.replace(/\/+$/, '');
    }

    function getBackendConfig() {
        if (desktopBridge?.secureConfig && managedBackendConfig?.baseUrl && managedBackendConfig?.apiKey) {
            return {
                baseUrl: managedBackendConfig.baseUrl,
                apiKey: managedBackendConfig.apiKey,
                entryUrl: `${managedBackendConfig.baseUrl}/logs/entry`,
                healthUrl: `${managedBackendConfig.baseUrl}/health`
            };
        }

        const baseUrl = normalizeBackendBaseUrl(
            backendApiUrlInput?.value || storageGet(BACKEND_API_URL_KEY) || DEFAULT_BACKEND_URL
        );
        const apiKey = String(
            backendApiKeyInput?.value || storageGet(BACKEND_API_KEY_KEY) || DEFAULT_BACKEND_API_KEY
        ).trim();

        return {
            baseUrl,
            apiKey,
            entryUrl: `${baseUrl}/logs/entry`,
            healthUrl: `${baseUrl}/health`
        };
    }

    function updateBackendConnectionStatus(message, tone = 'muted') {
        if (!backendConnectionStatus) return;
        backendConnectionStatus.textContent = message;
        backendConnectionStatus.style.color =
            tone === 'success' ? '#16a34a' :
                tone === 'error' ? '#dc2626' :
                    'var(--text-tertiary)';
    }

    async function handleBackendSettingsChange() {
        const baseUrl = normalizeBackendBaseUrl(backendApiUrlInput?.value);
        const apiKey = String(backendApiKeyInput?.value || '').trim();

        const camSource = cameraSourceSelect?.value || 'webcam';
        storageSet(CAMERA_SOURCE_KEY, camSource);
        storageSet(CCTV_URL_KEY, cctvUrlInput?.value || '');
        if (cctvUrlGroup) cctvUrlGroup.style.display = camSource === 'cctv' ? 'block' : 'none';

        if (desktopBridge?.secureConfig) {
            const saved = cacheManagedBackendConfig(await desktopBridge.secureConfig.saveBackendConfig({ apiKey }));
            applyBackendConfigToInputs(saved);
            updateBackendConnectionStatus('Managed backend settings saved securely. Restarting local engine...', 'muted');
            updateHeaderLiveStatus();
            return;
        }

        if (backendApiUrlInput) backendApiUrlInput.value = baseUrl;

        if (baseUrl) storageSet(BACKEND_API_URL_KEY, baseUrl);
        else storageRemove(BACKEND_API_URL_KEY);

        if (apiKey) storageSet(BACKEND_API_KEY_KEY, apiKey);
        else storageRemove(BACKEND_API_KEY_KEY);

        updateBackendConnectionStatus('Backend settings saved locally. Use "Test Backend Connection" to verify.', 'muted');
        updateHeaderLiveStatus();
    }

    async function handleTestBackendConnection() {
        if (desktopBridge?.backend) {
            updateBackendConnectionStatus('Checking managed desktop backend...', 'muted');
            try {
                const status = await desktopBridge.backend.testConnection();
                applyDesktopBackendStatus(status);
                showToast(
                    status?.state === 'ready'
                        ? 'GATIQ managed backend connection successful.'
                        : status?.state === 'ai_loading'
                            ? 'Managed backend is up. AI engine is still loading.'
                            : 'Managed backend check finished.',
                    status?.state === 'failed' ? 'error' : status?.state === 'ready' ? 'success' : 'info'
                );
            } catch (err) {
                updateBackendConnectionStatus(`Managed backend check failed: ${err.message}`, 'error');
                showToast(`Managed backend check failed: ${err.message}`, 'error');
            }
            return;
        }

        const { healthUrl, apiKey } = getBackendConfig();
        updateBackendConnectionStatus('Testing backend connection...', 'muted');

        try {
            const response = await fetch(healthUrl, {
                method: 'GET',
                headers: {
                    'X-API-Key': apiKey
                }
            });

            if (!response.ok) {
                updateBackendConnectionStatus(`Backend test failed with status ${response.status}. Check URL/key.`, 'error');
                showToast(`Backend test failed with status ${response.status}.`, 'error');
                return;
            }

            const data = await response.json().catch(() => ({}));
            const localAiLoaded = data?.local_ai_loaded;
            const mode = data?.mode ? ` (${data.mode})` : '';

            if (localAiLoaded === false) {
                updateBackendConnectionStatus(`Backend connected but AI engine is still loading${mode}.`, 'muted');
                showToast('Backend connected. Local AI engine is still loading.', 'info');
                return;
            }

            updateBackendConnectionStatus(`Backend connected and AI engine ready${mode}.`, 'success');
            showToast('GATIQ backend connection successful.', 'success');
        } catch (err) {
            const browserHint = IS_BROWSER_FILE_PREVIEW
                ? ' Browser preview cannot auto-start the desktop backend. Open the installed GATIQ app for automatic local connection.'
                : '';
            updateBackendConnectionStatus(`Backend not reachable: ${err.message}.${browserHint}`.trim(), 'error');
            showToast(`Could not reach GATIQ backend: ${err.message}.${browserHint}`.trim(), 'error');
        }
    }

    async function handleRestartBackendConnection() {
        if (!desktopBridge?.backend) {
            showToast('Automatic backend restart is available only in the installed desktop app.', 'info');
            return;
        }

        updateBackendConnectionStatus('Restarting managed desktop backend...', 'muted');
        if (btnRestartBackendConnection) btnRestartBackendConnection.disabled = true;
        if (btnTestBackendConnection) btnTestBackendConnection.disabled = true;

        try {
            const status = await desktopBridge.backend.restart();
            applyDesktopBackendStatus(status);
            showToast(
                status?.state === 'ready'
                    ? 'Local backend restarted and connected successfully.'
                    : 'Local backend restart triggered. Waiting for engine readiness.',
                status?.state === 'ready' ? 'success' : 'info'
            );
        } catch (error) {
            updateBackendConnectionStatus(`Managed backend restart failed: ${error.message}`, 'error');
            showToast(`Managed backend restart failed: ${error.message}`, 'error');
        } finally {
            if (btnRestartBackendConnection) btnRestartBackendConnection.disabled = false;
            if (btnTestBackendConnection) btnTestBackendConnection.disabled = false;
        }
    }

    async function handleCheckForUpdates() {
        if (!desktopBridge?.updater) {
            showToast('Auto-update works only in the installed desktop app.', 'info');
            return;
        }

        try {
            applyUpdaterStatus({
                ...await desktopBridge.updater.getStatus(),
                state: 'checking',
                message: 'Checking GitHub Releases for a newer GATIQ build...'
            }, true);
            const status = await desktopBridge.updater.checkForUpdates();
            applyUpdaterStatus(status, true);
            if (status?.state === 'up_to_date') {
                showToast(`GATIQ v${status.currentVersion} is already up to date.`, 'success');
            }
        } catch (error) {
            showToast(`Update check failed: ${error.message}`, 'error');
        }
    }

    async function handleInstallUpdate() {
        if (!desktopBridge?.updater) {
            showToast('Install update is available only in the desktop app.', 'info');
            return;
        }

        try {
            const result = await desktopBridge.updater.installUpdate();
            if (result?.started) {
                showToast('Installing update now. GATIQ will restart automatically.', 'success');
                return;
            }
            showToast('No downloaded update is ready yet.', 'info');
        } catch (error) {
            showToast(`Could not start the update install: ${error.message}`, 'error');
        }
    }



    // ---- Camera ----
    async function handleStartCamera() {
        try {
            showWorkspace();
            await Camera.startCamera();
            btnStartCamera.querySelector('.btn-label').innerHTML = '<i data-lucide="video" style="width:16px;height:16px;"></i> Camera Active';
            lucide.createIcons();
            updateScanButton();
            updateHeaderLiveStatus();
            showToast('<i data-lucide="camera" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Camera started successfully!', 'success');
        } catch (err) {
            updateHeaderLiveStatus();
            showToast(`<i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> ${err.message}`, 'error');
        }
    }

    async function handleImageUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            showWorkspace();
            currentImageBase64 = await Camera.handleImageUpload(file);
            updateScanButton();
            updateHeaderLiveStatus();
            showToast('<i data-lucide="image" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Image loaded! Click "Scan & Add" to read the plate.', 'success');
        } catch (err) {
            updateHeaderLiveStatus();
            showToast(`<i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> ${err.message}`, 'error');
        }

        // Reset file input so same file can be re-uploaded
        e.target.value = '';
    }

    function updateScanButton() {
        if (!btnScanPlate) return;

        const readiness = getScanReadiness();
        btnScanPlate.disabled = isScanning || !readiness.ready;
        btnScanPlate.title = isScanning ? 'Scanner is busy.' : readiness.reason;
        updateHeaderLiveStatus();
    }

    function getScanReadiness() {
        const backendConfig = getBackendConfig();
        const hasBackendConfig = !!backendConfig.baseUrl && !!backendConfig.apiKey;
        const camSource = cameraSourceSelect?.value || 'webcam';
        let cameraReady = false;
        if (camSource === 'cctv') {
            cameraReady = !!cctvUrlInput?.value.trim();
        } else {
            cameraReady = typeof Camera !== 'undefined'
                && typeof Camera.isReady === 'function'
                && Camera.isReady();
        }

        if (!hasBackendConfig) {
            return { ready: false, reason: 'Enter your GATIQ backend URL and API key in Settings first.' };
        }

        if (!cameraReady) {
            return { ready: false, reason: 'Start the camera or upload an image first.' };
        }

        return { ready: true, reason: 'Ready to scan and add to log.' };
    }

    function normalizePlateKey(value) {
        return String(value || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    }

    function enrichDetectionWithWhitelist(detection) {
        const whitelist = getWhitelist();
        const normalizedPlate = normalizePlateKey(detection.plateNumber);
        const residentMatch = normalizedPlate
            ? whitelist.find(r => r.status === 'Active' && normalizePlateKey(r.vehicle) === normalizedPlate)
            : null;

        return {
            ...detection,
            finalTagging: residentMatch ? 'Resident' : detection.tagging,
            residentMatch
        };
    }

    function buildScanSummary(detections) {
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
                taggingLabel: `Tagging: ${item.finalTagging}${item.residentMatch ? ' (Whitelist)' : ''}`,
                vehicleTypeLabel: item.vehicleType || 'Vehicle'
            };
        }

        const distinctDirections = [...new Set(detections.map(item => item.direction))];
        const distinctTags = [...new Set(detections.map(item => item.finalTagging))];

        return {
            plateLabel: `${detections.length} VEHICLES DETECTED`,
            directionLabel: `Direction: ${distinctDirections.length === 1 ? distinctDirections[0] : 'Mixed'}`,
            taggingLabel: `Tagging: ${distinctTags.length === 1 ? distinctTags[0] : 'Mixed'}`,
            vehicleTypeLabel: 'Multiple'
        };
    }

    // ---- GATIQ Backend Sync ----
    async function syncToGatiqAPI(entry) {
        const cloudEnabled = quickCloudSyncToggle && quickCloudSyncToggle.classList.contains('on');
        if (!cloudEnabled) return;

        const { entryUrl, apiKey } = getBackendConfig();

        try {
            const response = await fetch(entryUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-API-Key': apiKey
                },
                body: JSON.stringify({
                    vehicle_no: entry.vehicleNo,
                    vehicle_type: entry.vehicleType || 'Unknown',
                    gate_no: entry.gateNo,
                    area: entry.area,
                    status: entry.status || 'IN',
                    driver_info: (entry.driverName !== '-' || entry.driverPhone !== '-') ? { name: entry.driverName, phone: entry.driverPhone } : null,
                    purpose: entry.purpose,
                    tagging: entry.tagging,
                    consignment_details: (entry.consignmentNo !== '-' || entry.dockNo !== '-') ? { consignment_no: entry.consignmentNo, dock_no: entry.dockNo } : null
                })
            });

            if (response.ok) {
                console.log('Successfully synced to GATIQ Backend');
                markSyncNow();
            } else {
                const errorText = await response.text();
                console.error('Failed to sync to GATIQ Backend:', errorText);
                updateBackendConnectionStatus(`Sync failed: ${errorText || `HTTP ${response.status}`}`, 'error');
            }
        } catch (err) {
            console.error('Network error syncing to GATIQ Backend:', err);
            updateBackendConnectionStatus(`Sync error: ${err.message}`, 'error');
        }
    }

    // ---- Scan Plate ----
    async function handleScan() {
        if (isScanning) return;
        showWorkspace();

        const readiness = getScanReadiness();
        if (!readiness.ready) {
            showToast(readiness.reason, 'error');
            return;
        }

        const backendConfig = getBackendConfig();

        // Set scanning state
        isScanning = true;
        btnScanPlate?.classList.add('loading');
        if (btnScanPlate) btnScanPlate.disabled = true;
        scanOverlay?.classList.add('active');
        plateResult?.classList.remove('visible');
        updateHeaderLiveStatus();

        try {
            const camSource = cameraSourceSelect?.value || 'webcam';
            let result;

            if (camSource === 'cctv') {
                const rtspUrl = cctvUrlInput?.value.trim();
                showToast('Connecting to CCTV stream...', 'info');
                result = await PlateScanner.scanCCTV(backendConfig, rtspUrl);
            } else {
                const imageBase64 = Camera.getCurrentImage();
                result = await PlateScanner.scanPlate(backendConfig, imageBase64);
            }
            const rawDetections = Array.isArray(result.detections) && result.detections.length
                ? result.detections
                : [result];
            const uniqueReadableDetections = [];
            const seenPlates = new Set();

            rawDetections.forEach((detection) => {
                const plateKey = normalizePlateKey(detection.plateNumber);
                if (!plateKey || plateKey === 'UNREADABLE' || seenPlates.has(plateKey)) return;
                seenPlates.add(plateKey);
                uniqueReadableDetections.push(enrichDetectionWithWhitelist(detection));
            });

            const summary = buildScanSummary(uniqueReadableDetections);

            if (plateNumber) plateNumber.textContent = summary.plateLabel;
            if (detectedDir) detectedDir.innerHTML = `Direction: <span class="num">${summary.directionLabel.replace('Direction: ', '')}</span>`;
            if (detectedType) detectedType.innerHTML = `Type: <span class="num">${summary.vehicleTypeLabel || 'Vehicle'}</span>`;
            if (detectedTag) detectedTag.innerHTML = `Tagging: <span class="num">${summary.taggingLabel.replace('Tagging: ', '')}</span>`;
            
            // Show Local AI Performance Info
            const scanTimePill = document.getElementById('scanTimeBadge');
            if (scanTimePill && result.detection_time) {
                scanTimePill.textContent = `Local AI Scan: ${parseFloat(result.detection_time).toFixed(2)}s`;
                scanTimePill.style.display = 'inline-block';
            }

            plateResult?.classList.add('visible');

            if (uniqueReadableDetections.length > 0) {
                const gateId = gateSelect.value;
                const activeArea = getActiveArea();

                uniqueReadableDetections.forEach(async (detection) => {
                    const purpose = detection.residentMatch ? 'Resident' : purposeSelect.value;

                    const newEntry = await LogManager.addEntry({
                        area: activeArea,
                        gateNo: gateId,
                        vehicleNo: detection.plateNumber,
                        entryExit: detection.direction,
                        purpose: purpose,
                        tagging: detection.finalTagging,
                        vehicleType: detection.vehicleType || (currentConfig.hasVehicleType ? document.getElementById('visitVehicleType').value : 'Car'),
                        vehicleCapacity: currentConfig.hasVehicleCapacity ? document.getElementById('logisticsCapacity').value : '',
                        dockNo: currentConfig.hasDockNo ? document.getElementById('logisticsDockNo').value : '',
                        consignmentNo: currentConfig.hasConsignmentNo ? document.getElementById('logisticsConsignment').value : '',
                        driverName: currentConfig.hasDriverInfo ? document.getElementById('visitDriverName').value : '',
                        driverPhone: currentConfig.hasDriverInfo ? document.getElementById('visitDriverPhone').value : '',
                        status: detection.direction
                    });
                });

                renderTable();
                await syncAutoPDFSnapshot(activeArea);
                showToast(
                    uniqueReadableDetections.length === 1
                        ? `${uniqueReadableDetections[0].plateNumber} - ${uniqueReadableDetections[0].direction} logged.`
                        : `${uniqueReadableDetections.length} vehicles logged from this image.`,
                    'success'
                );
            } else {
                showToast('Could not read any visible plate. Try a clearer or closer image.', 'error');
            }
        } catch (err) {
            console.error('Scan error:', err);
            const msg = String(err?.message || 'Scan failed.');
            if (msg.toLowerCase().includes('still loading models') || msg.toLowerCase().includes('engine is still loading')) {
                showToast('Local AI engine is still loading. Wait a moment and try again.', 'info');
            } else if (msg.toLowerCase().includes('rate limit')) {
                showToast('Backend scan rate limit reached. Check your provider quota and try again.', 'error');
            } else {
                showToast(msg, 'error');
            }
        } finally {
            isScanning = false;
            btnScanPlate?.classList.remove('loading');
            scanOverlay?.classList.remove('active');
            updateScanButton();
        }
    }

    // ---- Manual Add ----
    async function handleManualAdd() {
        showWorkspace();
        const vehicle = manualVehicle.value.trim().toUpperCase();
        if (!vehicle) {
            showToast('⚠️ Please enter a Vehicle Number.', 'error');
            return;
        }

        const dirValue = manualDirection.value;
        const tagValue = manualTagging.value;
        const purpose = purposeSelect.value;
        const gateId = gateSelect.value;
        const activeArea = getActiveArea();

        try {
            await LogManager.addEntry({
                area: activeArea,
                gateNo: gateId,
                vehicleNo: vehicle,
                entryExit: dirValue,
                purpose: purpose,
                tagging: tagValue,
                vehicleType: document.getElementById('visitVehicleType') ? document.getElementById('visitVehicleType').value : 'Car',
                vehicleCapacity: currentConfig.hasVehicleCapacity ? document.getElementById('logisticsCapacity').value : '',
                dockNo: currentConfig.hasDockNo ? document.getElementById('logisticsDockNo').value : '',
                consignmentNo: currentConfig.hasConsignmentNo ? document.getElementById('logisticsConsignment').value : '',
                driverName: currentConfig.hasDriverInfo ? document.getElementById('visitDriverName') ? document.getElementById('visitDriverName').value : '' : '',
                driverPhone: currentConfig.hasDriverInfo ? document.getElementById('visitDriverPhone') ? document.getElementById('visitDriverPhone').value : '' : '',
                status: dirValue
            });

            // Reset manual form
            manualVehicle.value = '';
            manualDirection.value = currentConfig.directionOptions[0];
            manualTagging.value = currentConfig.taggingOptions[0];

            renderTable();
            await syncAutoPDFSnapshot(activeArea);
            showToast(`<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Manual Entry: ${vehicle} — ${dirValue} logged!`, 'success');
        } catch (err) {
            showToast(`Manual add failed: ${err.message}`, 'error');
        }
    }

    // ---- Render Table ----
    function renderTable() {
        const entries = getScopedEntries();
        const stats = getEntryStats(entries);

        // Update stats
        totalEntries.textContent = stats.total;
        entryCount.textContent = stats.entries;
        exitCount.textContent = stats.exits;

        // Enable/disable export buttons
        if (btnExportPDF) {
            btnExportPDF.disabled = entries.length === 0;
        }

        // Toggle empty state
        emptyState.style.display = entries.length === 0 ? '' : 'none';
        document.getElementById('logTable').style.display = entries.length === 0 ? 'none' : '';

        // Render rows (reverse so newest is at the top)
        logTableBody.innerHTML = [...entries].reverse().map(entry => {
            let tr = `<tr data-id="${entry.id}">`;
            currentConfig.columns.forEach(col => {
                if (col.id === 'srNo') tr += `<td>${entry.srNo}</td>`;
                else if (col.id === 'srGate') tr += `<td>${entry.srNo}<br><small style="color:var(--text-tertiary)">${escapeHtml(entry.gateNo)}</small></td>`;
                else if (col.id === 'gateNo') tr += `<td>${escapeHtml(entry.gateNo)}</td>`;
                else if (col.id === 'vehicleNo') tr += `<td class="vehicle-no">${escapeHtml(entry.vehicleNo)}</td>`;
                else if (col.id === 'date') tr += `<td>${escapeHtml(entry.date)}</td>`;
                else if (col.id === 'entryExit') {
                    tr += `<td><span class="entry-badge ${entry.entryExit.toLowerCase()}">${entry.entryExit === 'Entry' ? '<i data-lucide="arrow-down-right" style="width:12px;height:12px;margin-bottom:-2px;"></i>' : '<i data-lucide="arrow-up-right" style="width:12px;height:12px;margin-bottom:-2px;"></i>'} ${escapeHtml(entry.entryExit)}</span></td>`;
                }
                else if (col.id === 'status') {
                    const st = entry.status ? entry.status.toLowerCase() : (entry.entryExit || '').toLowerCase();
                    const color = st.includes('inside') ? 'background:#dcfce7;color:#166534;' : 'background:#fee2e2;color:#991b1b;';
                    tr += `<td><span style="padding:4px 8px;border-radius:20px;font-size:0.7em;font-weight:600;${color}">${escapeHtml(entry.status || entry.entryExit || '')}</span></td>`;
                }
                else if (col.id === 'time') tr += `<td>${escapeHtml(entry.time)}</td>`;
                else if (col.id === 'entryExitTime') tr += `<td>${escapeHtml(entry.date)}<br><small style="color:var(--text-tertiary)">${escapeHtml(entry.time)}</small></td>`;
                else if (col.id === 'tat') tr += `<td>${escapeHtml(entry.tat || '-')}</td>`;
                else if (col.id === 'vehicleType') tr += `<td>${escapeHtml(entry.vehicleType || '-')}</td>`;
                else if (col.id === 'vehicleCapacity') tr += `<td>${escapeHtml(entry.vehicleCapacity || '-')}</td>`;
                else if (col.id === 'consignmentNo') tr += `<td>${escapeHtml(entry.consignmentNo || '-')}</td>`;
                else if (col.id === 'dockNo') tr += `<td>${escapeHtml(entry.dockNo || '-')}</td>`;
                else if (col.id === 'driverInfo') tr += `<td>${escapeHtml(entry.driverName || '-')}<br><small style="color:var(--text-tertiary)">${escapeHtml(entry.driverPhone || '-')}</small></td>`;
                else if (col.id === 'purpose') {
                    tr += `<td><div class="purpose-dropdown-wrap"><select class="purpose-select" onchange="app.updatePurpose('${entry.id}', this.value); this.blur();" onfocus="this.parentElement.classList.add('open')" onblur="this.parentElement.classList.remove('open')"><optgroup label="Select Purpose">`;
                    currentConfig.purposeOptions.forEach(p => { tr += `<option value="${p}" ${entry.purpose === p ? 'selected' : ''}>${p}</option>`; });
                    tr += `</optgroup></select><span class="purpose-arrow">▼</span></div></td>`;
                }
                else if (col.id === 'tagging') tr += `<td>${escapeHtml(entry.tagging)}</td>`;
            });

            tr += `</tr>`;
            return tr;
        }).join('');

        lucide.createIcons();
        renderDashboard();
    }

    // ---- Edit / Delete ----
    window.app = {
        updatePurpose(id, value) {
            const entry = LogManager.getAll().find(item => item.id === id);
            if (!entry || !enforceAreaAccess(entry.area || DEFAULT_AREA, 'Purpose update')) return;
            LogManager.updateEntry(id, { purpose: value });
            showToast('<i data-lucide="refresh-cw" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Purpose updated.', 'success');
            // Do not re-render table here immediately to avoid losing focus abruptly
            // if we wanted to change tagging based on purpose, we'd do it here.
        },

        editEntry(id) {
            const entries = getScopedEntries();
            const entry = entries.find(e => e.id === id);
            if (!entry) return;

            editingEntryId = id;
            editVehicle.value = entry.vehicleNo;
            editEntryExit.value = currentConfig.directionLabel === 'Status' ? entry.status : entry.entryExit;
            editPurpose.value = entry.purpose;
            editTagging.value = entry.tagging;
            document.getElementById('editVehicleType').value = entry.vehicleType || VEHICLE_TYPE_OPTIONS[0];
            if (document.getElementById('editLogisticsCapacity')) document.getElementById('editLogisticsCapacity').value = entry.vehicleCapacity || '';
            if (document.getElementById('editLogisticsDockNo')) document.getElementById('editLogisticsDockNo').value = entry.dockNo || '';
            if (document.getElementById('editLogisticsConsignment')) document.getElementById('editLogisticsConsignment').value = entry.consignmentNo || '';
            document.getElementById('editDriverName').value = entry.driverName || '';
            document.getElementById('editDriverPhone').value = entry.driverPhone || '';
            editModal.classList.add('open');
        },

        async deleteEntry(id) {
            const entry = LogManager.getAll().find(item => item.id === id);
            if (!entry || !enforceAreaAccess(entry.area || DEFAULT_AREA, 'Delete entry')) return;
            if (confirm('Delete this entry?')) {
                await LogManager.deleteEntry(id);
                renderTable();
                showToast('<i data-lucide="trash-2" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Entry deleted', 'success');
            }
        },

        async deleteResident(id) {
            if (confirm('Delete resident from whitelist?')) {
                await deleteWhitelistAPI(id);
                await renderWhitelist();
                showToast('<i data-lucide="trash-2" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Resident removed.', 'success');
            }
        }
    };

    function handleSaveEdit() {
        if (!editingEntryId) return;
        const entry = LogManager.getAll().find(item => item.id === editingEntryId);
        if (!entry || !enforceAreaAccess(entry.area || DEFAULT_AREA, 'Entry edit')) return;

        LogManager.updateEntry(editingEntryId, {
            vehicleNo: editVehicle.value.trim().toUpperCase(),
            entryExit: editEntryExit.value,
            purpose: editPurpose.value,
            tagging: editTagging.value,
            vehicleType: document.getElementById('editVehicleType').value,
            vehicleCapacity: document.getElementById('editLogisticsCapacity') ? document.getElementById('editLogisticsCapacity').value : '',
            dockNo: document.getElementById('editLogisticsDockNo') ? document.getElementById('editLogisticsDockNo').value : '',
            consignmentNo: document.getElementById('editLogisticsConsignment') ? document.getElementById('editLogisticsConsignment').value : '',
            driverName: document.getElementById('editDriverName').value,
            driverPhone: document.getElementById('editDriverPhone').value,
            status: editEntryExit.value
        });

        closeModal();
        renderTable();
        showToast('<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Entry updated.', 'success');
    }

    function closeModal() {
        editModal.classList.remove('open');
        editingEntryId = null;
    }

    // ---- Export PDF ----
    async function handleExportPDF() {
        const selectedArea = getActiveArea();
        const entries = getScopedEntries(selectedArea);
        if (entries.length === 0) {
            showToast('<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> No entries to export.', 'error');
            return;
        }

        try {
            const selectedSociety = societyInput.value.trim() || 'N/A';

            // Show loading spinner and change text to "Downloading"
            if (btnExportPDF) {
                btnExportPDF.disabled = true;
            }
            const pdfBtnText = document.getElementById('pdfBtnText');
            const pdfSpinner = document.getElementById('pdfSpinner');
            if (pdfBtnText) pdfBtnText.textContent = 'Downloading';
            if (pdfSpinner) pdfSpinner.style.display = 'inline-block';
            
            showToast('<i data-lucide="file-text" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Generating GATIQ PDF...', 'success');
            const pdfResult = await PDFExport.exportPDF({
                societyName: selectedSociety,
                gateId: gateSelect.value,
                entries: entries,
                area: selectedArea,
                outputMode: 'save' // Triggers browser download
            });

            // Cloud Sync if enabled
            if (isCloudSyncOn()) {
                const cloudStatus = await window.electron.invoke('cloud:get-status');
                if (cloudStatus.connected) {
                    showToast('<i data-lucide="cloud-upload" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Syncing to Google Cloud...', 'info');
                    
                    // Generate blob for upload
                    const blobPayload = await PDFExport.exportPDF({
                        societyName: selectedSociety,
                        gateId: gateSelect.value,
                        entries: entries,
                        area: selectedArea,
                        outputMode: 'blob'
                    });

                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64Content = reader.result.split(',')[1];
                        try {
                            await window.electron.invoke('cloud:upload-pdf', {
                                clientId: String(googleClientIdInput?.value || '').trim(),
                                fileName: blobPayload.filename,
                                mimeType: 'application/pdf',
                                bodyBase64: base64Content
                            });
                            showToast('<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Cloud Backup: Success!', 'success');
                            markSyncNow();
                        } catch (cloudErr) {
                            console.error('Cloud Sync failed:', cloudErr);
                            showToast(`Cloud Backup failed: ${cloudErr.message}`, 'error');
                        }
                    };
                    reader.readAsDataURL(blobPayload.blob);
                }
            }

            await addPDFSnapshot({
                societyName: selectedSociety,
                gateId: gateSelect.value,
                area: selectedArea,
                entries
            });
            syncQuickAreaFilterOptions();
            renderQuickAccessResults();
            showToast('<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> PDF downloaded successfully!', 'success');
        } catch (err) {
            showToast(`<i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> ${err.message}`, 'error');
        } finally {
            // Reset button to original state
            const pdfBtnText = document.getElementById('pdfBtnText');
            const pdfSpinner = document.getElementById('pdfSpinner');
            if (pdfBtnText) pdfBtnText.textContent = 'Export PDF';
            if (pdfSpinner) pdfSpinner.style.display = 'none';
            if (btnExportPDF) {
                btnExportPDF.disabled = entries.length === 0;
            }
        }
    }

    function isCloudSyncOn() {
        return storageGet(CLOUD_SYNC_KEY) === '1';
    }

    // ---- Whitelist Management ----
    async function loadWhitelist() {
        return fetchWhitelist();
    }

    async function handleAddResident() {
        const name = wlName.value.trim();
        const flat = wlFlat.value.trim();
        const vehicle = wlVehicle.value.trim().toUpperCase();
        const contact = wlContact.value.trim();
        const status = wlStatus.value;

        if (!name || (!vehicle && !flat)) {
            showToast('<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Please enter Resident Name and Vehicle No.', 'error');
            return;
        }

        try {
            await saveWhitelistAPI({ name, flat, vehicle, contact, status });
            wlName.value = '';
            wlFlat.value = '';
            wlVehicle.value = '';
            wlContact.value = '';
            await renderWhitelist();
            showToast('<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Resident added to whitelist', 'success');
        } catch (err) {
            showToast(`Whitelist error: ${err.message}`, 'error');
        }
    }

    async function renderWhitelist() {
        const list = await fetchWhitelist();
        wlEmptyState.style.display = list.length === 0 ? 'block' : 'none';
        whitelistTableBody.parentElement.style.display = list.length === 0 ? 'none' : '';

        whitelistTableBody.innerHTML = list.map((r, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${escapeHtml(r.name)}</td>
                <td>${escapeHtml(r.flat)}</td>
                <td style="font-family: var(--font-mono); font-weight: bold;">${escapeHtml(r.vehicle)}</td>
                <td>${escapeHtml(r.contact)}</td>
                <td>
                    <span style="display:inline-block; padding: 2px 8px; border-radius: 5px; font-size:0.7em; font-weight:bold; background: ${r.status === 'Active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'}; color: ${r.status === 'Active' ? '#15803d' : '#b91c1c'};">
                        ${escapeHtml(r.status)}
                    </span>
                </td>
                <td>
                    <button class="btn-tiny delete" onclick="app.deleteResident('${r.id}')" title="Delete"><i data-lucide="trash-2" style="width:14px;height:14px;"></i></button>
                </td>
            </tr>
        `).join('');
        lucide.createIcons();
    }


    // ---- Toast ----
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = message;
        toastContainer.appendChild(toast);
        addNotification(message, type);
        if (typeof lucide !== 'undefined') lucide.createIcons();

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(30px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // ---- Theme Toggle ----
    function initTheme() {
        const savedTheme = localStorage.getItem('gatiq_theme') || 'light';
        applyTheme(savedTheme);
    }

    function handleThemeToggle() {
        const current = document.documentElement.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        localStorage.setItem('gatiq_theme', next);
    }

    function applyTheme(theme) {
        if (theme === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
            themeKnob.innerHTML = '<i data-lucide="moon" style="width:14px;height:14px;stroke-width:3px;"></i>';
            document.querySelector('meta[name="theme-color"]').setAttribute('content', '#0b0d14');
        } else {
            document.documentElement.removeAttribute('data-theme');
            themeKnob.innerHTML = '<i data-lucide="sun" style="width:14px;height:14px;stroke-width:3px;"></i>';
            document.querySelector('meta[name="theme-color"]').setAttribute('content', '#f5f7fa');
        }
        syncBrandLogos(theme);
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // ---- Cloud Sync Toggle ----
    function initCloudSync() {
        const saved = storageGet(CLOUD_SYNC_KEY);
        applyCloudSyncState(saved === '1');
    }

    function initSyncStatus() {
        const lastSyncAt = storageGet(LAST_SYNC_KEY);
        updateSyncStatusText(lastSyncAt);
    }

    function handleCloudSyncToggle() {
        const isEnabled = quickCloudSyncToggle && quickCloudSyncToggle.classList.contains('on');
        const next = !isEnabled;
        applyCloudSyncState(next);
        storageSet(CLOUD_SYNC_KEY, next ? '1' : '0');
        showToast(next ? 'Cloud Sync enabled.' : 'Cloud Sync disabled.', 'success');
    }

    function applyCloudSyncState(enabled) {
        if (!quickCloudSyncToggle) return;
        const cloudConnected = !!storageGet('gatiq_cloud_token');

        if (enabled && !cloudConnected) {
            showToast('⚠️ No Google Account connected for Cloud Sync. Please connect via Settings.', 'info');
            enabled = false;
            storageSet(CLOUD_SYNC_KEY, '0');
        }

        quickCloudSyncToggle.classList.toggle('on', enabled);
        quickCloudSyncToggle.setAttribute('aria-pressed', String(enabled));
        if (quickCloudSyncState) {
            quickCloudSyncState.textContent = enabled ? 'ON' : 'OFF';
            quickCloudSyncState.classList.toggle('on', enabled);
        }
        updateHeaderLiveStatus();
        updateSyncStatusText(storageGet(LAST_SYNC_KEY));
    }

    function updateHeaderLiveStatus() {
        const cameraReady = typeof Camera !== 'undefined' && typeof Camera.isReady === 'function' && Camera.isReady();
        const cloudEnabled = quickCloudSyncToggle && quickCloudSyncToggle.classList.contains('on');
        const backendConfig = getBackendConfig();
        const scannerReady = !isScanning && cameraReady && !!backendConfig.baseUrl && !!backendConfig.apiKey;

        setStatusPill(cameraStatusPill, `Camera: ${cameraReady ? 'On' : 'Off'}`, cameraReady ? 'on' : 'off');
        setStatusPill(scannerStatusPill, `Scanner: ${isScanning ? 'Busy' : scannerReady ? 'Ready' : 'Idle'}`, isScanning ? 'busy' : scannerReady ? 'on' : 'off');
        setStatusPill(cloudStatusPill, `Cloud: ${cloudEnabled ? 'On' : 'Off'}`, cloudEnabled ? 'on' : 'off');
    }

    function setStatusPill(el, text, state) {
        if (!el) return;
        el.textContent = text;
        el.classList.remove('is-on', 'is-busy');
        if (state === 'on') el.classList.add('is-on');
        if (state === 'busy') el.classList.add('is-busy');
    }

    function markSyncNow() {
        const nowIso = new Date().toISOString();
        storageSet(LAST_SYNC_KEY, nowIso);
        updateSyncStatusText(nowIso);
    }

    function updateSyncStatusText(lastSyncAt) {
        if (!syncStatusText) return;
        const cloudEnabled = quickCloudSyncToggle && quickCloudSyncToggle.classList.contains('on');
        if (!cloudEnabled) {
            syncStatusText.textContent = 'Cloud sync is off';
            return;
        }
        if (!lastSyncAt) {
            syncStatusText.textContent = 'Waiting for first sync';
            return;
        }
        const d = new Date(lastSyncAt);
        syncStatusText.textContent = Number.isNaN(d.getTime())
            ? 'Synced recently'
            : `Last synced ${d.toLocaleString()}`;
    }

    function addNotification(message, type = 'info') {
        notifications.unshift({
            id: `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            message: String(message || '').replace(/<[^>]+>/g, '').trim(),
            type,
            createdAt: new Date().toISOString()
        });
        notifications = notifications.slice(0, 12);
        unreadNotificationCount += 1;
        renderNotifications();
    }

    function renderNotifications() {
        if (notificationCountBadge) {
            notificationCountBadge.textContent = String(unreadNotificationCount);
            notificationCountBadge.style.display = unreadNotificationCount > 0 ? 'inline-flex' : 'none';
        }
        if (!notificationList) return;
        if (!notifications.length) {
            notificationList.innerHTML = '<div class="header-notification-empty">No notifications yet.</div>';
            return;
        }
        notificationList.innerHTML = notifications.map(item => `
            <div class="header-notification-item">
                <strong>${escapeHtml(item.message)}</strong>
                <span>${escapeHtml(new Date(item.createdAt).toLocaleString())}</span>
            </div>
        `).join('');
    }

    function toggleNotificationsPanel(forceOpen = null, trigger = btnNotifications) {
        if (!notificationPanel) return;
        const isOpen = typeof forceOpen === 'boolean'
            ? forceOpen
            : !notificationPanel.classList.contains('open');
        if (isOpen) openFloatingPanel(notificationPanel, trigger);
        else closeFloatingPanel(notificationPanel);
        if (isOpen) markNotificationsRead();
    }

    function openNotificationsPanel(trigger = btnNotifications) {
        toggleNotificationsPanel(true, trigger);
    }

    function openProfileModal(trigger = btnOpenProfile) {
        renderProfileDetails();
        if (profileAccessRole && profileAssignedArea && profileAccessRole.value === SUPER_ADMIN_ROLE) {
            setDeploymentAreaOptions(profileAssignedArea, getAllAreas());
        }
        openAnchoredModal(profileModal, trigger);
    }

    function closeProfileModal() {
        closeAnchoredModal(profileModal);
    }

    function handleSaveProfile() {
        const currentProfile = getProfile();
        const currentPolicy = getAccessPolicy(currentProfile);
        const nextAccessRole = currentPolicy.isSuperAdmin
            ? sanitizeAccessRole(profileAccessRole?.value)
            : currentPolicy.accessRole;
        const nextAssignedArea = currentPolicy.isSuperAdmin
            ? sanitizeArea(profileAssignedArea?.value)
            : currentPolicy.assignedArea;
        const nextProfile = {
            ...currentProfile,
            name: profileName?.value.trim() || 'GATIQ Operator',
            accessRole: nextAccessRole,
            assignedArea: nextAssignedArea,
            role: getRoleLabel(nextAccessRole),
            email: profileEmail?.value.trim() || 'operator@gatiq.in',
            phone: profilePhone?.value.trim() || '+91 98765 43210'
        };

        saveProfile(nextProfile);
        renderProfileDetails();
        updateProfileTrigger();
        closeProfileModal();
        showToast('Profile updated.', 'success');
    }

    function handleUpgradePlan() {
        const nextProfile = {
            ...getProfile(),
            plan: 'Professional',
            renewal: 'Renews on 30 May 2026'
        };

        saveProfile(nextProfile);
        renderProfileDetails();
        updateProfileTrigger();
        showToast('Plan upgraded to Professional.', 'success');
    }

    function toggleProfileMenu(forceOpen = null, trigger = btnProfileMenu) {
        if (!profileMenu) return;
        const isOpen = typeof forceOpen === 'boolean'
            ? forceOpen
            : !profileMenu.classList.contains('open');
        if (isOpen) openFloatingPanel(profileMenu, trigger);
        else closeFloatingPanel(profileMenu);
        if (btnProfileMenu) {
            btnProfileMenu.classList.toggle('is-open', isOpen);
            btnProfileMenu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    }

    function closeProfileMenu() {
        if (!profileMenu) return;
        closeFloatingPanel(profileMenu);
        if (btnProfileMenu) {
            btnProfileMenu.classList.remove('is-open');
            btnProfileMenu.setAttribute('aria-expanded', 'false');
        }
    }

    function handleLogout(trigger = btnLogout) {
        if (logoutConfirmModal) {
            openAnchoredModal(logoutConfirmModal, trigger);
            return;
        }
        confirmLogout();
    }

    function closeLogoutConfirmModal() {
        closeAnchoredModal(logoutConfirmModal);
    }

    function confirmLogout() {
        closeLogoutConfirmModal();
        closeProfileMenu();
        if (typeof Camera !== 'undefined' && typeof Camera.stopCamera === 'function') {
            Camera.stopCamera();
        }

        const uploadedImage = document.getElementById('uploadedImage');
        const cameraFeed = document.getElementById('cameraFeed');
        const cameraPlaceholder = document.getElementById('cameraPlaceholder');
        const plateResultCard = document.getElementById('plateResult');
        const plateLabel = document.getElementById('plateNumber');
        const detectedDirectionBadge = document.getElementById('detectedDirection');
        const detectedTaggingBadge = document.getElementById('detectedTagging');

        if (uploadedImage) {
            uploadedImage.src = '';
            uploadedImage.style.display = 'none';
        }
        if (cameraFeed) {
            cameraFeed.style.display = 'none';
            cameraFeed.srcObject = null;
        }
        if (cameraPlaceholder) {
            cameraPlaceholder.classList.remove('hidden');
        }
        if (plateResultCard) {
            plateResultCard.classList.remove('visible');
        }
        if (plateLabel) plateLabel.textContent = '-';
        if (detectedDirectionBadge) detectedDirectionBadge.textContent = 'Direction: -';
        if (detectedType) detectedType.textContent = 'Type: -';
        if (detectedTaggingBadge) detectedTaggingBadge.textContent = 'Tagging: -';

        currentImageBase64 = null;
        closeProfileModal();
        clearAuthSession();
        setActiveUserScope(null);

        updateScanButton();
        showHomeDashboard();
        showAuthShell('login');
        showToast('Logged out. Session closed.', 'success');
    }

    function showHomeDashboard() {
        currentView = 'home';
        storageSet(APP_VIEW_KEY, currentView);
        if (homeDashboard) homeDashboard.classList.remove('app-view-hidden');
        if (workspaceView) workspaceView.classList.add('app-view-hidden');
        if (btnHeaderHome) btnHeaderHome.classList.add('active');
        renderDashboard();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function showWorkspace() {
        currentView = 'workspace';
        storageSet(APP_VIEW_KEY, currentView);
        if (homeDashboard) homeDashboard.classList.add('app-view-hidden');
        if (workspaceView) workspaceView.classList.remove('app-view-hidden');
        if (btnHeaderHome) btnHeaderHome.classList.remove('active');
    }

    function restoreInitialView() {
        const savedView = storageGet(APP_VIEW_KEY);
        if (savedView === 'workspace') {
            showWorkspace();
            return;
        }
        showHomeDashboard();
    }

    function renderDashboard() {
        const activeArea = getActiveArea();
        const entries = getScopedEntries(activeArea);
        const stats = getEntryStats(entries);
        const pdfHistory = getVisiblePDFHistory().filter(report => sanitizeArea(report.area || DEFAULT_AREA) === activeArea);
        const lastSyncAt = storageGet(LAST_SYNC_KEY);
        const cloudEnabled = quickCloudSyncToggle && quickCloudSyncToggle.classList.contains('on');
        const cameraReady = typeof Camera !== 'undefined' && typeof Camera.isReady === 'function' && Camera.isReady();

        if (dashboardTotalEntries) dashboardTotalEntries.textContent = String(stats.total);
        if (dashboardEntryCount) dashboardEntryCount.textContent = String(stats.entries);
        if (dashboardExitCount) dashboardExitCount.textContent = String(stats.exits);
        if (dashboardPdfCount) dashboardPdfCount.textContent = String(pdfHistory.length);
        if (dashboardCameraState) dashboardCameraState.textContent = cameraReady ? 'Online' : 'Offline';
        if (dashboardScannerState) dashboardScannerState.textContent = isScanning ? 'Scanning' : cameraReady ? 'Ready' : 'Idle';
        if (dashboardCloudState) dashboardCloudState.textContent = cloudEnabled ? 'On' : 'Off';
        if (dashboardLastSync) dashboardLastSync.textContent = syncStatusText ? syncStatusText.textContent : 'Not synced yet';
        renderDashboardTrend(entries, cloudEnabled, cameraReady, activeArea);

        if (!dashboardRecentActivity) return;
        if (!entries.length) {
            dashboardRecentActivity.innerHTML = '<div class="dashboard-empty">No recent activity yet.</div>';
            if (typeof lucide !== 'undefined') lucide.createIcons();
            return;
        }

        const recent = [...entries].slice(-5).reverse();
        dashboardRecentActivity.innerHTML = recent.map(entry => `
            <div class="dashboard-activity-item">
                <div class="dashboard-activity-icon">
                    <i data-lucide="${entry.entryExit === 'Exit' ? 'arrow-up-right' : 'arrow-down-right'}" style="width:16px;height:16px;"></i>
                </div>
                <div class="dashboard-activity-copy">
                    <strong>${escapeHtml(entry.vehicleNo)}</strong>
                    <span>${escapeHtml(entry.purpose || 'General')} at ${escapeHtml(entry.gateNo || 'Gate')} | ${escapeHtml(activeArea)}</span>
                </div>
                <div class="dashboard-activity-meta">
                    <div>${escapeHtml(entry.entryExit || '-')}</div>
                    <div>${escapeHtml(entry.time || '')}</div>
                </div>
            </div>
        `).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function renderDashboardTrend(entries, cloudEnabled, cameraReady, activeArea) {
        if (!dashboardTrendLine || !dashboardTrendArea) return;

        const recent = [...entries].slice(-12);
        const baseSeries = recent.length
            ? recent.map((entry, index) => {
                const base = entry.entryExit === 'Exit' ? 34 : 54;
                const purposeBoost = normalizeText(entry.purpose).includes('resident') ? 8 : 0;
                return Math.max(10, Math.min(95, base + purposeBoost + (index % 3) * 4));
            })
            : [12, 13, 12, 14, 16, 22, 19, 24, 28, 33, 31, 56];

        if (cloudEnabled) {
            baseSeries[baseSeries.length - 1] = Math.min(98, baseSeries[baseSeries.length - 1] + 10);
        }
        if (cameraReady) {
            baseSeries[baseSeries.length - 2] = Math.min(92, baseSeries[Math.max(0, baseSeries.length - 2)] + 6);
        }

        const width = 320;
        const height = 150;
        const topPad = 12;
        const bottomPad = 14;
        const usableHeight = height - topPad - bottomPad;
        const maxValue = Math.max(...baseSeries, 100);
        const minX = 0;
        const maxX = width;
        const stepX = baseSeries.length > 1 ? (maxX - minX) / (baseSeries.length - 1) : width;

        const points = baseSeries.map((value, index) => {
            const x = minX + index * stepX;
            const y = topPad + usableHeight - (value / maxValue) * usableHeight;
            return [Number(x.toFixed(2)), Number(y.toFixed(2))];
        });

        const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point[0]} ${point[1]}`).join(' ');
        const areaPath = `${linePath} L ${maxX} ${height} L ${minX} ${height} Z`;

        dashboardTrendLine.setAttribute('d', linePath);
        dashboardTrendArea.setAttribute('d', areaPath);

        const latest = baseSeries[baseSeries.length - 1];
        const earlier = baseSeries[Math.max(0, baseSeries.length - 4)] || latest;
        const isUp = latest >= earlier;
        if (dashboardTrendTitle) {
            dashboardTrendTitle.textContent = isUp
                ? `${activeArea} activity rising`
                : `${activeArea} activity stable`;
        }
        if (dashboardTrendChip) {
            dashboardTrendChip.textContent = cloudEnabled ? 'Synced Live' : 'Monitoring';
        }
    }

    function markNotificationsRead() {
        unreadNotificationCount = 0;
        renderNotifications();
    }

    function handleEmergencyAlert(trigger = btnEmergencyAlert) {
        if (emergencyConfirmModal) {
            openAnchoredModal(emergencyConfirmModal, trigger);
            return;
        }
        confirmEmergencyAlert();
    }

    function closeEmergencyConfirmModal() {
        if (emergencyConfirmModal) emergencyConfirmModal.classList.remove('open');
    }

    function confirmEmergencyAlert() {
        closeEmergencyConfirmModal();
        showToast('<i data-lucide="shield-alert" style="width:14px;height:14px;vertical-align:middle;margin-right:6px"></i> Emergency alert triggered. Notify on-site security team immediately.', 'error');
    }

    function handleHeaderShortcuts(e) {
        if (e.key === 'Escape' && quickViewerModal?.classList.contains('open')) {
            closeQuickViewer();
            return;
        }
        if (!e.altKey) return;
        const key = e.key.toLowerCase();
        if (key === 'c') btnStartCamera?.click();
        if (key === 's') btnScanPlate?.click();
        if (key === 'q') btnQuickAccess?.click();
        if (key === ',') btnSettings?.click();
        if (key === 'h') btnHeaderHome?.click();
    }

    // ---- Helper ----
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    function closeQuickDrawer() {
        if (quickDrawer) quickDrawer.classList.remove('open');
        if (quickDrawerBackdrop) quickDrawerBackdrop.classList.remove('open');
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function escapeRegExp(str) {
        return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    function getQuickViewerReport() {
        return getVisiblePDFHistory().find(item => item.id === quickViewerReportId) || null;
    }

    function getReportConfig(area) {
        return DeploymentConfig[sanitizeArea(area)] || DeploymentConfig[DEFAULT_AREA];
    }

    function getFacilityLabel(area) {
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

    function formatViewerTimestamp(value) {
        const d = new Date(value);
        if (Number.isNaN(d.getTime())) return 'Unknown';
        return d.toLocaleString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    function getViewerReportPeriod(report) {
        const dates = (report.entries || []).map(entry => entry.date).filter(Boolean);
        if (!dates.length) return 'No date range';
        const unique = Array.from(new Set(dates));
        return unique.length === 1 ? unique[0] : `${unique[0]} to ${unique[unique.length - 1]}`;
    }

    function getViewerCellText(entry, column) {
        switch (column.id) {
            case 'srNo':
                return String(entry.srNo || '-');
            case 'srGate':
                return `${entry.srNo || '-'} ${entry.gateNo || '-'}`;
            case 'gateNo':
                return entry.gateNo || '-';
            case 'vehicleNo':
                return entry.vehicleNo || '-';
            case 'date':
                return entry.date || '-';
            case 'entryExit':
                return entry.entryExit || '-';
            case 'status':
                return entry.status || entry.entryExit || '-';
            case 'time':
                return entry.time || '-';
            case 'entryExitTime':
                return `${entry.date || '-'} ${entry.time || '-'}`;
            case 'tat':
                return entry.tat || '-';
            case 'vehicleType':
                return entry.vehicleType || '-';
            case 'vehicleCapacity':
                return entry.vehicleCapacity || '-';
            case 'consignmentNo':
                return entry.consignmentNo || '-';
            case 'dockNo':
                return entry.dockNo || '-';
            case 'driverInfo':
                return `${entry.driverName || '-'} ${entry.driverPhone || '-'}`;
            case 'purpose':
                return entry.purpose || '-';
            case 'tagging':
                return entry.tagging || '-';
            default:
                return entry[column.id] || '-';
        }
    }

    function highlightViewerText(value, query, tracker) {
        const text = String(value || '-');
        if (!query) return escapeHtml(text);
        const pattern = new RegExp(escapeRegExp(query), 'ig');
        let lastIndex = 0;
        let html = '';
        let matched = false;
        text.replace(pattern, (match, offset) => {
            matched = true;
            html += escapeHtml(text.slice(lastIndex, offset));
            html += `<mark class="quick-viewer-highlight" data-match-index="${tracker.count}">${escapeHtml(match)}</mark>`;
            tracker.count += 1;
            lastIndex = offset + match.length;
            return match;
        });
        if (!matched) return escapeHtml(text);
        html += escapeHtml(text.slice(lastIndex));
        return html;
    }

    function getQuickViewerChipTone(value) {
        const text = normalizeText(value);
        if (text.includes('entry') || text.includes('inside') || text.includes('docked')) return 'entry';
        if (text.includes('exit') || text.includes('out')) return 'exit';
        return 'neutral';
    }

    function renderViewerCell(entry, column, query, tracker) {
        if (column.id === 'srGate') {
            return `<strong>${highlightViewerText(entry.srNo || '-', query, tracker)}</strong><br><span>${highlightViewerText(entry.gateNo || '-', query, tracker)}</span>`;
        }
        if (column.id === 'entryExit' || column.id === 'status') {
            const chipText = getViewerCellText(entry, column);
            return `<span class="quick-viewer-chip ${getQuickViewerChipTone(chipText)}">${highlightViewerText(chipText, query, tracker)}</span>`;
        }
        if (column.id === 'entryExitTime') {
            return `${highlightViewerText(entry.date || '-', query, tracker)}<br><span>${highlightViewerText(entry.time || '-', query, tracker)}</span>`;
        }
        if (column.id === 'driverInfo') {
            return `${highlightViewerText(entry.driverName || '-', query, tracker)}<br><span>${highlightViewerText(entry.driverPhone || '-', query, tracker)}</span>`;
        }
        return highlightViewerText(getViewerCellText(entry, column), query, tracker);
    }

    function updateQuickViewerZoomUI() {
        if (quickViewerPaperShell) {
            quickViewerPaperShell.style.transform = `scale(${quickViewerZoom})`;
        }
        if (quickViewerZoomLabel) {
            quickViewerZoomLabel.textContent = `${Math.round(quickViewerZoom * 100)}%`;
        }
        if (btnQuickViewerZoomOut) btnQuickViewerZoomOut.disabled = quickViewerZoom <= QUICK_VIEWER_MIN_ZOOM;
        if (btnQuickViewerZoomIn) btnQuickViewerZoomIn.disabled = quickViewerZoom >= QUICK_VIEWER_MAX_ZOOM;
    }

    function setQuickViewerZoom(nextZoom) {
        quickViewerZoom = clamp(Math.round(nextZoom * 100) / 100, QUICK_VIEWER_MIN_ZOOM, QUICK_VIEWER_MAX_ZOOM);
        updateQuickViewerZoomUI();
    }

    function syncQuickViewerMatchUI(shouldScroll = false) {
        const matches = quickViewerContent ? Array.from(quickViewerContent.querySelectorAll('.quick-viewer-highlight')) : [];
        quickViewerMatchCount = matches.length;
        if (!matches.length) {
            quickViewerMatchIndex = 0;
            if (quickViewerMatchStatus) {
                quickViewerMatchStatus.textContent = quickViewerSearchTerm ? '0 matches' : 'No search';
            }
            if (quickViewerSearchEmpty) {
                quickViewerSearchEmpty.hidden = !quickViewerSearchTerm;
                if (quickViewerSearchTerm) {
                    quickViewerSearchEmpty.textContent = `No matches found for "${quickViewerSearchTerm}".`;
                }
            }
            if (btnQuickViewerPrev) btnQuickViewerPrev.disabled = true;
            if (btnQuickViewerNext) btnQuickViewerNext.disabled = true;
            return;
        }

        quickViewerMatchIndex = clamp(quickViewerMatchIndex, 0, matches.length - 1);
        matches.forEach(match => match.classList.remove('active'));
        const activeMatch = matches[quickViewerMatchIndex];
        activeMatch?.classList.add('active');
        if (quickViewerMatchStatus) {
            quickViewerMatchStatus.textContent = `${quickViewerMatchIndex + 1} / ${matches.length} matches`;
        }
        if (quickViewerSearchEmpty) quickViewerSearchEmpty.hidden = true;
        if (btnQuickViewerPrev) btnQuickViewerPrev.disabled = matches.length < 2;
        if (btnQuickViewerNext) btnQuickViewerNext.disabled = matches.length < 2;
        if (shouldScroll && activeMatch) {
            activeMatch.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
    }

    function renderQuickViewer(shouldScrollToMatch = false) {
        const report = getQuickViewerReport();
        if (!report || !quickViewerContent) return;

        const query = quickViewerSearchTerm.trim();
        const tracker = { count: 0 };
        const config = getReportConfig(report.area || DEFAULT_AREA);
        const entries = Array.isArray(report.entries) ? report.entries : [];
        const title = report.societyName || report.area || 'Vehicle Entry Audit Report';
        const subtitle = `${sanitizeArea(report.area || DEFAULT_AREA)} | ${report.gateId || 'Gate 1'} | ${entries.length} entries`;
        const rows = entries.length
            ? entries.map(entry => `
                <tr>
                    ${config.columns.map(column => `<td>${renderViewerCell(entry, column, query, tracker)}</td>`).join('')}
                </tr>
            `).join('')
            : `<tr class="quick-viewer-empty-row"><td colspan="${config.columns.length}">No entries recorded for this report.</td></tr>`;

        const metadata = [
            { label: getFacilityLabel(report.area), value: report.societyName || 'N/A' },
            { label: 'Deployment Area', value: sanitizeArea(report.area || DEFAULT_AREA) },
            { label: 'Gate ID', value: report.gateId || 'Gate 1' },
            { label: 'Generated On', value: formatViewerTimestamp(report.generatedAt) },
            { label: 'Record Period', value: getViewerReportPeriod(report) },
            { label: 'Entries Logged', value: String(report.totalEntries || entries.length || 0) },
            { label: 'Search Scope', value: query ? `Filtered for "${query}"` : 'Full report content' },
            { label: 'Retention', value: 'Internal Use Only' }
        ];

        if (quickViewerTitle) quickViewerTitle.textContent = title;
        if (quickViewerSubtitle) quickViewerSubtitle.textContent = subtitle;
        if (quickViewerSearch) quickViewerSearch.value = quickViewerSearchTerm;

        quickViewerContent.innerHTML = `
            <div class="quick-viewer-report-header">
                <div class="quick-viewer-brand">
                    <img src="${escapeHtml(BRAND_LOGO_DARK)}" alt="GATIQ Logo" class="quick-viewer-brand-mark">
                    <div class="quick-viewer-brand-copy">
                        <h4>GATIQ Vehicle Entry Audit Log</h4>
                        <p>Abiliqt Technologies Pvt. Ltd. secure report preview</p>
                    </div>
                </div>
                <div class="quick-viewer-stamp">
                    <div class="quick-viewer-stamp-title">Confidential</div>
                    <div class="quick-viewer-stamp-sub">${escapeHtml(subtitle)}</div>
                </div>
            </div>
            <div class="quick-viewer-meta-grid">
                ${metadata.map(item => `
                    <div class="quick-viewer-meta-card">
                        <div class="quick-viewer-meta-label">${escapeHtml(item.label)}</div>
                        <div class="quick-viewer-meta-value">${highlightViewerText(item.value, query, tracker)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="quick-viewer-table-wrap">
                <table class="quick-viewer-table">
                    <thead>
                        <tr>
                            ${config.columns.map(column => `<th>${escapeHtml(column.label)}</th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
            <div class="quick-viewer-note">
                <span>Search highlights visible report values and helps jump between matching rows quickly.</span>
                <span>Use Download for the real PDF output.</span>
            </div>
        `;

        if (typeof lucide !== 'undefined') lucide.createIcons();
        syncQuickViewerMatchUI(shouldScrollToMatch);
        updateQuickViewerZoomUI();
    }

    function openQuickViewer(report) {
        if (!report) return;
        quickViewerReportId = report.id;
        quickViewerSearchTerm = '';
        quickViewerMatchIndex = 0;
        quickViewerZoom = 1;
        renderQuickViewer(false);
        if (quickViewerModal) quickViewerModal.classList.add('open');
        window.setTimeout(() => quickViewerSearch?.focus(), 30);
    }

    function closeQuickViewer() {
        if (quickViewerModal) quickViewerModal.classList.remove('open');
    }

    function navigateQuickViewerMatch(direction) {
        if (!quickViewerMatchCount) return;
        quickViewerMatchIndex = (quickViewerMatchIndex + direction + quickViewerMatchCount) % quickViewerMatchCount;
        syncQuickViewerMatchUI(true);
    }

    async function getQuickViewerPDFBlob(report) {
        return PDFExport.exportPDF({
            societyName: report.societyName || 'N/A',
            gateId: report.gateId || 'Gate 1',
            entries: report.entries || [],
            area: report.area || DEFAULT_AREA,
            outputMode: 'blob'
        });
    }

    function downloadBlobPayload(payload) {
        if (!payload?.blob || !payload?.filename) return;
        const blobUrl = URL.createObjectURL(payload.blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = payload.filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
    }

    async function handleQuickViewerDownload() {
        const report = getQuickViewerReport();
        if (!report) return;
        try {
            await PDFExport.exportPDF({
                societyName: report.societyName || 'N/A',
                gateId: report.gateId || 'Gate 1',
                entries: report.entries || [],
                area: report.area || DEFAULT_AREA
            });
            showToast('<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i> PDF downloaded successfully!', 'success');
        } catch (err) {
            showToast(`<i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i> ${err.message}`, 'error');
        }
    }

    async function handleQuickViewerOpenInNewTab() {
        const report = getQuickViewerReport();
        if (!report) return;
        try {
            const payload = await getQuickViewerPDFBlob(report);
            const blobUrl = URL.createObjectURL(payload.blob);
            const popup = window.open(blobUrl, '_blank', 'noopener');
            if (!popup) {
                downloadBlobPayload(payload);
                showToast('Popup blocked. PDF downloaded instead so you can print it manually.', 'info');
                return;
            }
            window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
        } catch (err) {
            showToast(`<i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i> ${err.message}`, 'error');
        }
    }

    async function handleQuickViewerShare() {
        const report = getQuickViewerReport();
        if (!report) return;
        try {
            const payload = await getQuickViewerPDFBlob(report);
            const canShareFiles = typeof navigator !== 'undefined'
                && typeof navigator.share === 'function'
                && typeof navigator.canShare === 'function'
                && typeof File !== 'undefined';

            if (canShareFiles) {
                const file = new File([payload.blob], payload.filename, { type: 'application/pdf' });
                if (navigator.canShare({ files: [file] })) {
                    await navigator.share({
                        title: `${report.societyName || 'GATIQ Report'}`,
                        text: `Vehicle entry audit report for ${report.societyName || report.area}.`,
                        files: [file]
                    });
                    showToast('Share sheet opened for this PDF.', 'success');
                    return;
                }
            }

            downloadBlobPayload(payload);
            showToast('Share is not supported in this browser. PDF downloaded instead.', 'info');
        } catch (err) {
            showToast(`<i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i> ${err.message}`, 'error');
        }
    }

    function getReportMonthStamp(report) {
        const d = new Date(report?.generatedAt);
        if (Number.isNaN(d.getTime())) return 'unknown-month';
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    }

    function getReportPageCount(report) {
        const entryCount = Array.isArray(report?.entries)
            ? report.entries.length
            : Number(report?.totalEntries) || 0;
        if (entryCount <= 0) return 1;
        const area = sanitizeArea(report?.area || DEFAULT_AREA);
        const rowsPerPage = area === 'Warehouses & Logistics Hubs' ? 34 : 26;
        return Math.max(1, Math.ceil(entryCount / rowsPerPage));
    }

    function buildMonthlyHistory(list) {
        const monthlyMap = new Map();

        (Array.isArray(list) ? list : []).forEach(rawReport => {
            if (!rawReport || typeof rawReport !== 'object') return;
            const report = {
                ...rawReport,
                area: sanitizeArea(rawReport.area || DEFAULT_AREA),
                societyName: rawReport.societyName || 'N/A',
                gateId: rawReport.gateId || 'Gate 1',
                generatedAt: rawReport.generatedAt || new Date().toISOString(),
                entries: Array.isArray(rawReport.entries) ? rawReport.entries : []
            };
            const monthStamp = getReportMonthStamp(report);
            const reportKey = monthStamp;

            if (!monthlyMap.has(reportKey)) {
                monthlyMap.set(reportKey, {
                    ...report,
                    id: report.id || `${monthStamp}_${Math.random().toString(36).slice(2, 8)}`,
                    totalEntries: report.entries.length,
                    pageCount: Number(report.pageCount) || getReportPageCount(report),
                    entries: report.entries.map((entry, index) => ({
                        ...entry,
                        srNo: index + 1
                    }))
                });
                return;
            }

            const existing = monthlyMap.get(reportKey);
            const existingTs = new Date(existing.generatedAt).getTime();
            const nextTs = new Date(report.generatedAt).getTime();
            if (!Number.isNaN(existingTs) && (Number.isNaN(nextTs) || existingTs >= nextTs)) return;

            monthlyMap.set(reportKey, {
                ...existing,
                ...report,
                id: existing.id,
                totalEntries: report.entries.length,
                pageCount: Number(report.pageCount) || getReportPageCount(report),
                entries: report.entries.map((entry, index) => ({
                    ...entry,
                    srNo: index + 1
                }))
            });
        });

        return Array.from(monthlyMap.values())
            .sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime())
            .slice(0, 60);
    }

    let localPDFHistory = []; // Cache

    async function getPDFHistory() {
        if (localPDFHistory.length > 0) return localPDFHistory;
        localPDFHistory = await fetchPDFHistoryFromAPI(null);
        return localPDFHistory;
    }

    async function getVisiblePDFHistory() {
        const policy = getAccessPolicy();
        const history = await getPDFHistory();
        if (policy.isSuperAdmin) return history;
        return history.filter(report => sanitizeArea(report.area || DEFAULT_AREA) === policy.assignedArea);
    }

    async function fetchPDFHistoryFromAPI(area) {
        localPDFHistory = await fetchPDFHistoryAPI(area);
        return localPDFHistory;
    }

    async function savePDFReportToAPI(report) {
        try {
            await savePDFReportAPI(report);
            localPDFHistory.unshift(report);
            return true;
        } catch (err) {
            console.error('Save PDF Report failed:', err);
            return false;
        }
    }

    async function addPDFSnapshot({ societyName, gateId, area, entries }) {
        const snapshot = {
            id: 'pdf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            generatedAt: new Date().toISOString(),
            area: area || getActiveArea(),
            societyName: societyName || 'N/A',
            gateId: gateId || 'Gate 1',
            totalEntries: entries.length,
            entries: entries
        };
        await savePDFReportToAPI(snapshot);
        return snapshot;
    }

    async function syncAutoPDFSnapshot(area = getActiveArea()) {
        const selectedArea = sanitizeArea(area || getActiveArea());
        const entries = getScopedEntries(selectedArea);
        if (!entries.length) return;

        await addPDFSnapshot({
            societyName: societyInput?.value.trim() || getFacilityLabel(selectedArea) || 'N/A',
            gateId: gateSelect?.value || 'Gate 1',
            area: selectedArea,
            entries
        });
        syncQuickAreaFilterOptions();
        renderQuickAccessResults();
        renderDashboard();
    }

    function ensureQuickAccessSnapshot(area = getActiveArea()) {
        const selectedArea = sanitizeArea(area || getActiveArea());
        const hasAreaReport = getPDFHistory().some(report => sanitizeArea(report.area || DEFAULT_AREA) === selectedArea);
        if (hasAreaReport) return;

        const entries = getScopedEntries(selectedArea);
        if (!entries.length) return;

        addPDFSnapshot({
            societyName: societyInput?.value.trim() || getFacilityLabel(selectedArea) || 'N/A',
            gateId: gateSelect?.value || 'Gate 1',
            area: selectedArea,
            entries
        });
    }

    function normalizeText(v) {
        return String(v || '').toLowerCase().trim();
    }

    function getMonthKeyForReport(report) {
        const d = new Date(report.generatedAt);
        if (Number.isNaN(d.getTime())) return quickGroupMode === 'year' ? 'Unknown Year' : 'Unknown Month';
        if (quickGroupMode === 'year') return String(d.getFullYear());
        return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    function getReportMonthLabel(report) {
        const d = new Date(report.generatedAt);
        if (Number.isNaN(d.getTime())) return 'Unknown Month';
        return d.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    }

    async function openQuickAccessReport(reportId) {
        const report = getVisiblePDFHistory().find(item => item.id === reportId);
        if (!report) {
            showToast('<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i> PDF record not found.', 'error');
            return;
        }
        if (!enforceAreaAccess(report.area || DEFAULT_AREA, 'Quick PDF preview')) return;
        openQuickViewer(report);
    }

    function doesReportMatchQuery(report, query) {
        if (!query) return true;
        const metaBlob = normalizeText(`${report.area} ${report.societyName} ${report.gateId}`);
        if (metaBlob.includes(query)) return true;
        return (report.entries || []).some(e => normalizeText([
            e.vehicleNo, e.date, e.time, e.gateNo, e.purpose, e.tagging, e.entryExit, e.status,
            e.vehicleType, e.vehicleCapacity, e.consignmentNo, e.dockNo, e.driverName, e.driverPhone, e.tat
        ].join(' | ')).includes(query));
    }

    function syncQuickAreaFilterOptions() {
        if (!quickAreaFilter) return;
        const policy = getAccessPolicy();

        const areaSet = new Set(policy.isSuperAdmin ? getAllAreas() : [policy.assignedArea]);
        getVisiblePDFHistory().forEach(report => {
            if (report && report.area) areaSet.add(report.area);
        });

        const areas = Array.from(areaSet).sort((a, b) => a.localeCompare(b));
        quickAreaFilter.innerHTML = (policy.isSuperAdmin ? ['<option value="">All Areas</option>'] : [])
            .concat(areas.map(area => `<option value="${escapeHtml(area)}">${escapeHtml(area)}</option>`))
            .join('');

        if (!policy.isSuperAdmin) {
            quickSelectedArea = policy.assignedArea;
            quickAreaFilter.disabled = true;
        } else {
            quickAreaFilter.disabled = false;
            if (quickSelectedArea && !areas.includes(quickSelectedArea)) {
                quickSelectedArea = '';
            }
        }
        quickAreaFilter.value = quickSelectedArea;
    }

    function updateQuickExportSelectedText() {
        if (!btnQuickExportSelected) return;
        const count = selectedQuickReportIds.size;
        const text = document.getElementById('quickExportText');
        if (text) text.textContent = count > 0 ? `Export PDF (${count})` : 'Export PDF';
        btnQuickExportSelected.disabled = count === 0;
    }

    async function handleExportSelectedReports() {
        const history = getVisiblePDFHistory();
        const selectedReports = history.filter(r => selectedQuickReportIds.has(r.id));
        if (!selectedReports.length) {
            showToast('<i data-lucide="alert-triangle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i> Select at least one PDF record.', 'error');
            return;
        }

        try {
            btnQuickExportSelected.disabled = true;
            const quickExportText = document.getElementById('quickExportText');
            if (quickExportText) quickExportText.textContent = 'Exporting...';
            let exportedCount = 0;

            for (const report of selectedReports) {
                if (!enforceAreaAccess(report.area || DEFAULT_AREA, 'Quick PDF export')) continue;
                await PDFExport.exportPDF({
                    societyName: report.societyName || 'N/A',
                    gateId: report.gateId || 'Gate 1',
                    entries: report.entries || [],
                    area: report.area || DEFAULT_AREA
                });
                exportedCount += 1;
            }
            if (exportedCount === 0) {
                showAreaRestriction('No selected PDF records were available for your assigned area.');
                return;
            }
            markSyncNow();
            showToast('<i data-lucide="check-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i> Selected PDF records exported.', 'success');
        } catch (err) {
            showToast(`<i data-lucide="x-circle" style="width:14px;height:14px;vertical-align:middle;margin-right:6px;"></i> ${err.message}`, 'error');
        } finally {
            updateQuickExportSelectedText();
        }
    }

    function renderQuickAccessResults() {
        if (!quickAccessResults) return;
        ensureQuickAccessSnapshot(quickSelectedArea || getActiveArea());

        const query = normalizeText(quickAccessSearch ? quickAccessSearch.value : '');
        const reports = getVisiblePDFHistory()
            .filter(r => !quickSelectedArea || r.area === quickSelectedArea)
            .filter(r => doesReportMatchQuery(r, query))
            .slice(0, 40);
        const visibleIds = new Set(reports.map(report => report.id));
        Array.from(selectedQuickReportIds).forEach(id => {
            if (!visibleIds.has(id)) selectedQuickReportIds.delete(id);
        });

        if (!reports.length) {
            quickAccessResults.innerHTML = '<div class="quick-result-empty">No matching PDF records found.</div>';
            updateQuickExportSelectedText();
            return;
        }

        const grouped = reports.reduce((acc, report) => {
            const key = getMonthKeyForReport(report);
            if (!acc[key]) acc[key] = [];
            acc[key].push(report);
            return acc;
        }, {});

        const monthBlocks = Object.keys(grouped).map(monthKey => {
            const items = grouped[monthKey].map(report => {
                const checked = selectedQuickReportIds.has(report.id) ? 'checked' : '';
                const selectedClass = selectedQuickReportIds.has(report.id) ? ' selected' : '';
                const pageCount = getReportPageCount(report);
                return `
                    <div class="quick-pdf-item${selectedClass}" data-report-id="${escapeHtml(report.id)}">
                        <input type="checkbox" class="quick-pdf-checkbox" data-report-id="${escapeHtml(report.id)}" ${checked}>
                        <button type="button" class="quick-pdf-open" data-report-id="${escapeHtml(report.id)}" title="Open PDF">
                        <div class="quick-pdf-meta">
                            <div class="quick-doc-icon">PDF</div>
                            <div class="quick-pdf-name">${escapeHtml(report.societyName || report.area)}</div>
                            <div class="quick-pdf-sub">${escapeHtml(getReportMonthLabel(report))} | ${pageCount} page${pageCount > 1 ? 's' : ''}</div>
                        </div>
                        </button>
                    </div>
                `;
            }).join('');
            return `<div class="quick-month-group"><div class="quick-month-title">${quickGroupMode === 'year' ? 'Year: ' : 'Month: '}${escapeHtml(monthKey)}</div><div class="quick-pdf-grid">${items}</div></div>`;
        }).join('');

        quickAccessResults.innerHTML = monthBlocks;

        quickAccessResults.querySelectorAll('.quick-pdf-checkbox').forEach(cb => {
            cb.addEventListener('click', (e) => e.stopPropagation());
            cb.addEventListener('change', (e) => {
                const id = e.target.getAttribute('data-report-id');
                if (!id) return;
                const card = e.target.closest('.quick-pdf-item');
                if (e.target.checked) selectedQuickReportIds.add(id);
                else selectedQuickReportIds.delete(id);
                if (card) card.classList.toggle('selected', e.target.checked);
                updateQuickExportSelectedText();
            });
        });

        quickAccessResults.querySelectorAll('.quick-pdf-item').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.quick-pdf-checkbox')) return;
                const id = card.getAttribute('data-report-id');
                if (!id) return;
                window.clearTimeout(card.__quickClickTimer);
                card.__quickClickTimer = window.setTimeout(() => {
                    const checkbox = card.querySelector('.quick-pdf-checkbox');
                    if (!checkbox) return;
                    checkbox.checked = !checkbox.checked;
                    if (checkbox.checked) selectedQuickReportIds.add(id);
                    else selectedQuickReportIds.delete(id);
                    card.classList.toggle('selected', checkbox.checked);
                    updateQuickExportSelectedText();
                }, 220);
            });

            card.addEventListener('dblclick', (e) => {
                if (e.target.closest('.quick-pdf-checkbox')) return;
                const id = card.getAttribute('data-report-id');
                if (!id) return;
                window.clearTimeout(card.__quickClickTimer);
                openQuickAccessReport(id);
            });
        });

        updateQuickExportSelectedText();
    }

});

