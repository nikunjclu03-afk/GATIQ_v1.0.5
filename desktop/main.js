const { app, BrowserWindow, dialog, ipcMain, safeStorage, session, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { spawn } = require('child_process');
const { createLicenseService } = require('./licensing/license-service');

const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 8001;
const OAUTH_REDIRECT_PORT = 58000;
const DEFAULT_BASE_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;
const AUTO_UPDATE_CHECK_DELAY_MS = 10000;

let mainWindow = null;
let backendProcess = null;
let backendPollTimer = null;
let runtimePaths = null;
let updaterConfigured = false;
let pendingGoogleAuth = null;
let licenseService = null;
let backendStatus = {
  state: 'stopped',
  message: 'Desktop backend is not running yet.',
  baseUrl: DEFAULT_BASE_URL,
  healthy: false,
  localAiLoaded: false,
  aiEngineLoading: false,
  error: null,
  updatedAt: null
};
let updaterStatus = {
  state: 'idle',
  message: 'Auto-update is available after the packaged app is installed.',
  currentVersion: app.getVersion(),
  updateAvailable: false,
  downloadedVersion: null,
  releaseName: null,
  releaseDate: null,
  percent: 0,
  bytesPerSecond: 0,
  transferred: 0,
  total: 0,
  error: null,
  updatedAt: null
};

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function base64UrlEncode(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createPkceChallenge(verifier) {
  return base64UrlEncode(crypto.createHash('sha256').update(verifier).digest());
}

function decodeJwtPayload(token) {
  const parts = String(token || '').split('.');
  if (parts.length < 2) {
    throw new Error('Google ID token was missing a payload.');
  }
  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4);
  return JSON.parse(Buffer.from(padded, 'base64').toString('utf8'));
}

function requestJson(urlString, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(urlString, options, (response) => {
      let data = '';
      response.on('data', (chunk) => {
        data += chunk;
      });
      response.on('end', () => {
        let parsed = {};
        try {
          parsed = JSON.parse(data || '{}');
        } catch {
          parsed = {};
        }

        if (response.statusCode >= 200 && response.statusCode < 300) {
          resolve(parsed);
          return;
        }

        reject(new Error(parsed.error_description || parsed.error || `HTTP ${response.statusCode}`));
      });
    });

    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function exchangeGoogleAuthCode({ clientId, code, codeVerifier, redirectUri }) {
  const body = new URLSearchParams({
    client_id: clientId,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: redirectUri
  }).toString();

  return requestJson(
    'https://oauth2.googleapis.com/token',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    },
    body
  );
}

async function fetchGoogleUserInfo(accessToken) {
  return requestJson('https://openidconnect.googleapis.com/v1/userinfo', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

function focusMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

function finishPendingGoogleAuth(error, payload = null) {
  if (!pendingGoogleAuth) return;

  const current = pendingGoogleAuth;
  pendingGoogleAuth = null;

  if (current.timeout) clearTimeout(current.timeout);
  if (current.server) {
    try {
      current.server.close();
    } catch {
      // Ignore close errors.
    }
  }

  focusMainWindow();

  if (error) {
    current.reject(error);
    return;
  }

  // If we have an access token, we can perform cloud actions in main process
  if (payload && payload.tokens) {
    saveCloudCredentials(payload.tokens);
  }

  current.resolve(payload);
}

async function startGoogleDesktopAuth({ clientId, action }) {
  const normalizedClientId = String(clientId || '').trim();
  const normalizedAction = ['signup', 'login', 'cloud_connect'].includes(action) ? action : 'login';

  if (!normalizedClientId) {
    throw new Error('Google OAuth Client ID is required.');
  }

  if (pendingGoogleAuth) {
    throw new Error('A Google sign-in flow is already in progress.');
  }

  return new Promise((resolve, reject) => {
    const server = http.createServer(async (request, response) => {
      try {
        const requestUrl = new URL(request.url || '/', 'http://127.0.0.1');
        const code = requestUrl.searchParams.get('code');
        const state = requestUrl.searchParams.get('state');
        const error = requestUrl.searchParams.get('error');

        if (error) {
          response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end('<html><body style="font-family:Segoe UI, sans-serif;padding:32px;"><h2>Google sign-in cancelled</h2><p>You can close this tab and return to GATIQ Desktop.</p></body></html>');
          finishPendingGoogleAuth(new Error(`Google authorization failed: ${error}`));
          return;
        }

        if (!code || !state || !pendingGoogleAuth || state !== pendingGoogleAuth.state) {
          response.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
          response.end('<html><body style="font-family:Segoe UI, sans-serif;padding:32px;"><h2>Invalid sign-in response</h2><p>Please return to GATIQ Desktop and try again.</p></body></html>');
          finishPendingGoogleAuth(new Error('Google authorization response was invalid or expired.'));
          return;
        }

        const tokenPayload = await exchangeGoogleAuthCode({
          clientId: pendingGoogleAuth.clientId,
          code,
          codeVerifier: pendingGoogleAuth.codeVerifier,
          redirectUri: pendingGoogleAuth.redirectUri
        });

        const profile = tokenPayload.id_token
          ? decodeJwtPayload(tokenPayload.id_token)
          : await fetchGoogleUserInfo(tokenPayload.access_token);

        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<html><body style="font-family:Segoe UI, sans-serif;padding:32px;"><h2>Google sign-in complete</h2><p>You can close this tab. GATIQ Desktop will continue automatically.</p></body></html>');

        finishPendingGoogleAuth(null, {
          action: pendingGoogleAuth.action,
          profile,
          tokens: {
            access_token: tokenPayload.access_token,
            refresh_token: tokenPayload.refresh_token
          }
        });
      } catch (error) {
        response.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<html><body style="font-family:Segoe UI, sans-serif;padding:32px;"><h2>Google sign-in failed</h2><p>Return to GATIQ Desktop and try again.</p></body></html>');
        finishPendingGoogleAuth(error);
      }
    });

    server.listen(OAUTH_REDIRECT_PORT, '127.0.0.1', async () => {
      const redirectUri = `http://127.0.0.1:${OAUTH_REDIRECT_PORT}/oauth2callback`;
      const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
      const state = base64UrlEncode(crypto.randomBytes(24));
      const codeChallenge = createPkceChallenge(codeVerifier);
      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

      authUrl.searchParams.set('client_id', normalizedClientId);
      authUrl.searchParams.set('redirect_uri', redirectUri);
      authUrl.searchParams.set('response_type', 'code');
      const baseScope = 'openid email profile';
      const cloudScope = ' https://www.googleapis.com/auth/drive.file';
      
      // Request access_type=offline to get a refresh token for cloud sync
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('scope', normalizedAction === 'cloud_connect' ? baseScope + cloudScope : baseScope);
      authUrl.searchParams.set('prompt', 'consent select_account');
      authUrl.searchParams.set('code_challenge', codeChallenge);
      authUrl.searchParams.set('code_challenge_method', 'S256');
      authUrl.searchParams.set('state', state);

      pendingGoogleAuth = {
        action: normalizedAction,
        clientId: normalizedClientId,
        codeVerifier,
        redirectUri,
        resolve,
        reject,
        server,
        state,
        timeout: setTimeout(() => {
          finishPendingGoogleAuth(new Error('Google sign-in timed out. Please try again.'));
        }, 5 * 60 * 1000)
      };

      try {
        await shell.openExternal(authUrl.toString(), { activate: true });
      } catch (error) {
        finishPendingGoogleAuth(new Error(`Could not open browser for Google sign-in: ${error.message}`));
      }
    });

    server.on('error', (error) => {
      reject(new Error(`Could not start Google sign-in callback server: ${error.message}`));
    });
  });
}

function getCloudCredsFile() {
  return path.join(getRuntimePaths().configDir, 'cloud.json');
}

function saveCloudCredentials(tokens) {
  try {
    const payload = {};
    if (safeStorage.isEncryptionAvailable()) {
      payload.rt = safeStorage.encryptString(tokens.refresh_token || '').toString('base64');
      payload.at = safeStorage.encryptString(tokens.access_token || '').toString('base64');
    } else {
      payload.rt = tokens.refresh_token;
      payload.at = tokens.access_token;
    }
    fs.writeFileSync(getCloudCredsFile(), JSON.stringify(payload));
  } catch (e) {
    console.error('Failed to save cloud credentials:', e);
  }
}

function loadCloudCredentials() {
  try {
    const file = getCloudCredsFile();
    if (!fs.existsSync(file)) return null;
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    let rt = '', at = '';
    if (safeStorage.isEncryptionAvailable()) {
      if (raw.rt) rt = safeStorage.decryptString(Buffer.from(raw.rt, 'base64'));
      if (raw.at) at = safeStorage.decryptString(Buffer.from(raw.at, 'base64'));
    } else {
      rt = raw.rt;
      at = raw.at;
    }
    return { refresh_token: rt, access_token: at };
  } catch (e) {
    return null;
  }
}

async function refreshCloudAccessToken(clientId) {
  const creds = loadCloudCredentials();
  if (!creds || !creds.refresh_token) throw new Error('No refresh token available');

  const body = new URLSearchParams({
    client_id: clientId,
    refresh_token: creds.refresh_token,
    grant_type: 'refresh_token'
  }).toString();

  const tokens = await requestJson('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }, body);

  saveCloudCredentials({ ...creds, access_token: tokens.access_token });
  return tokens.access_token;
}

async function uploadToDrive({ clientId, fileName, mimeType, bodyBase64 }) {
  let at = (loadCloudCredentials() || {}).access_token;
  if (!at) throw new Error('Not connected to Google Cloud');

  // Try metadata fetch to check token validity
  try {
    await requestJson('https://www.googleapis.com/drive/v3/about?fields=user', {
      headers: { Authorization: `Bearer ${at}` }
    });
  } catch {
    at = await refreshCloudAccessToken(clientId);
  }

  // 1. Ensure GATIQ_Backups folder exists
  const folderSearch = await requestJson('https://www.googleapis.com/drive/v3/files?q=' + encodeURIComponent("name = 'GATIQ_Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"), {
    headers: { Authorization: `Bearer ${at}` }
  });

  let folderId = folderSearch.files?.[0]?.id;
  if (!folderId) {
    const folder = await requestJson('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { Authorization: `Bearer ${at}`, 'Content-Type': 'application/json' },
    }, JSON.stringify({ name: 'GATIQ_Backups', mimeType: 'application/vnd.google-apps.folder' }));
    folderId = folder.id;
  }

  // 2. Upload file
  const metadata = {
    name: fileName,
    parents: [folderId]
  };

  const boundary = '-------GATIQ_BOUNDARY';
  const delimiter = "\r\n--" + boundary + "\r\n";
  const closeDelimiter = "\r\n--" + boundary + "--";

  const body = Buffer.concat([
    Buffer.from(delimiter + 'Content-Type: application/json\r\n\r\n' + JSON.stringify(metadata) + delimiter + 'Content-Type: ' + mimeType + '\r\n\r\n'),
    Buffer.from(bodyBase64, 'base64'),
    Buffer.from(closeDelimiter)
  ]);

  return requestJson('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${at}`,
      'Content-Type': 'multipart/related; boundary=' + boundary,
      'Content-Length': body.length
    }
  }, body);
}

function getRuntimePaths() {
  if (runtimePaths) return runtimePaths;
  const userData = app.getPath('userData');
  runtimePaths = {
    userData,
    configDir: path.join(userData, 'config'),
    dataDir: path.join(userData, 'data'),
    logDir: path.join(userData, 'logs'),
    debugDir: path.join(userData, 'debug_scans'),
    configFile: path.join(userData, 'config', 'backend.json')
  };
  ensureDir(runtimePaths.configDir);
  ensureDir(runtimePaths.dataDir);
  ensureDir(runtimePaths.logDir);
  ensureDir(runtimePaths.debugDir);
  return runtimePaths;
}

function generateApiKey() {
  return `GATIQ-${crypto.randomBytes(18).toString('hex').toUpperCase()}`;
}

function encodeConfigForDisk(config) {
  const payload = { baseUrl: DEFAULT_BASE_URL };
  if (safeStorage.isEncryptionAvailable()) {
    payload.apiKeyEncrypted = safeStorage.encryptString(config.apiKey).toString('base64');
  } else {
    payload.apiKey = config.apiKey;
  }
  return payload;
}

function sanitizeBackendConfig(config = {}) {
  return {
    baseUrl: DEFAULT_BASE_URL,
    apiKey: String(config.apiKey || '').trim() || generateApiKey()
  };
}

function parseBackendConfig(rawConfig = {}) {
  let apiKey = '';
  if (rawConfig.apiKeyEncrypted && safeStorage.isEncryptionAvailable()) {
    try {
      apiKey = safeStorage.decryptString(Buffer.from(rawConfig.apiKeyEncrypted, 'base64'));
    } catch (error) {
      console.warn('Failed to decrypt backend API key, generating a new one.', error);
    }
  }
  if (!apiKey) {
    apiKey = String(rawConfig.apiKey || '').trim();
  }
  return sanitizeBackendConfig({ baseUrl: rawConfig.baseUrl, apiKey });
}

function loadSecureBackendConfig() {
  const { configFile } = getRuntimePaths();
  try {
    if (fs.existsSync(configFile)) {
      const parsed = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      const sanitized = parseBackendConfig(parsed);
      const normalizedForDisk = encodeConfigForDisk(sanitized);
      if (JSON.stringify(parsed) !== JSON.stringify(normalizedForDisk)) {
        fs.writeFileSync(configFile, JSON.stringify(normalizedForDisk, null, 2), 'utf8');
      }
      return sanitized;
    }
  } catch (error) {
    console.error('Failed to load backend config:', error);
  }

  const created = sanitizeBackendConfig();
  fs.writeFileSync(configFile, JSON.stringify(encodeConfigForDisk(created), null, 2), 'utf8');
  return created;
}

function saveSecureBackendConfig(nextConfig = {}) {
  const current = loadSecureBackendConfig();
  const merged = sanitizeBackendConfig({ ...current, ...nextConfig });
  fs.writeFileSync(getRuntimePaths().configFile, JSON.stringify(encodeConfigForDisk(merged), null, 2), 'utf8');
  return merged;
}

function setBackendStatus(patch) {
  backendStatus = {
    ...backendStatus,
    ...patch,
    baseUrl: DEFAULT_BASE_URL,
    updatedAt: new Date().toISOString()
  };
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('backend:status', backendStatus);
  }
}

function getDefaultUpdaterMessage() {
  if (!app.isPackaged) {
    return 'Auto-update works in installed desktop builds published through GitHub Releases.';
  }
  return `GATIQ ${app.getVersion()} is ready. Check for updates anytime.`;
}

function setUpdaterStatus(patch) {
  updaterStatus = {
    ...updaterStatus,
    ...patch,
    currentVersion: app.getVersion(),
    updatedAt: new Date().toISOString()
  };

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updater:status', updaterStatus);
  }
}

function configureAutoUpdater() {
  if (updaterConfigured) return;
  updaterConfigured = true;

  if (!app.isPackaged) {
    setUpdaterStatus({
      state: 'disabled',
      message: getDefaultUpdaterMessage(),
      updateAvailable: false,
      downloadedVersion: null,
      percent: 0,
      error: null
    });
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.disableWebInstaller = false;

  autoUpdater.on('checking-for-update', () => {
    setUpdaterStatus({
      state: 'checking',
      message: 'Checking GitHub Releases for a newer GATIQ build...',
      updateAvailable: false,
      downloadedVersion: null,
      percent: 0,
      error: null
    });
  });

  autoUpdater.on('update-available', (info) => {
    const version = info?.version || 'new';
    setUpdaterStatus({
      state: 'available',
      message: `Update ${version} found. Downloading in the background...`,
      updateAvailable: true,
      downloadedVersion: null,
      releaseName: info?.releaseName || null,
      releaseDate: info?.releaseDate || null,
      percent: 0,
      error: null
    });
  });

  autoUpdater.on('update-not-available', () => {
    setUpdaterStatus({
      state: 'up_to_date',
      message: `You are already on the latest published build (${app.getVersion()}).`,
      updateAvailable: false,
      downloadedVersion: null,
      percent: 100,
      error: null
    });
  });

  autoUpdater.on('download-progress', (progress) => {
    setUpdaterStatus({
      state: 'downloading',
      message: `Downloading update... ${Math.round(progress.percent || 0)}%`,
      updateAvailable: true,
      percent: progress.percent || 0,
      bytesPerSecond: progress.bytesPerSecond || 0,
      transferred: progress.transferred || 0,
      total: progress.total || 0,
      error: null
    });
  });

  autoUpdater.on('update-downloaded', (info) => {
    const version = info?.version || 'new';
    setUpdaterStatus({
      state: 'downloaded',
      message: `Update ${version} is ready. Click "Install Update" to restart and finish.`,
      updateAvailable: true,
      downloadedVersion: version,
      releaseName: info?.releaseName || null,
      releaseDate: info?.releaseDate || null,
      percent: 100,
      error: null
    });
  });

  autoUpdater.on('error', (error) => {
    setUpdaterStatus({
      state: 'error',
      message: `Auto-update failed: ${error.message}`,
      error: error.message,
      percent: 0
    });
  });

  setUpdaterStatus({
    state: 'idle',
    message: getDefaultUpdaterMessage(),
    error: null
  });
}

async function checkForAppUpdates() {
  if (!app.isPackaged) {
    setUpdaterStatus({
      state: 'disabled',
      message: getDefaultUpdaterMessage(),
      error: null
    });
    return updaterStatus;
  }

  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    setUpdaterStatus({
      state: 'error',
      message: `Auto-update failed: ${error.message}`,
      error: error.message,
      percent: 0
    });
  }

  return updaterStatus;
}

function installDownloadedUpdate() {
  if (!app.isPackaged || updaterStatus.state !== 'downloaded') {
    return false;
  }
  autoUpdater.quitAndInstall(false, true);
  return true;
}

function createLogStream(fileName) {
  return fs.createWriteStream(path.join(getRuntimePaths().logDir, fileName), { flags: 'a' });
}

function resolveDevPython() {
  const repoRoot = path.resolve(__dirname, '..');
  const embeddedPython = path.join(repoRoot, 'GATIQ API', 'venv', 'Scripts', 'python.exe');
  return fs.existsSync(embeddedPython) ? embeddedPython : 'python';
}

function resolveBackendLaunchSpec() {
  if (app.isPackaged) {
    const packagedExe = path.join(process.resourcesPath, 'backend', 'GATIQBackend.exe');
    if (!fs.existsSync(packagedExe)) {
      throw new Error(`Bundled backend executable not found at ${packagedExe}`);
    }
    return {
      command: packagedExe,
      args: [],
      cwd: path.dirname(packagedExe),
      modelDir: path.dirname(packagedExe)
    };
  }

  const repoRoot = path.resolve(__dirname, '..');
  return {
    command: resolveDevPython(),
    args: [path.join(repoRoot, 'GATIQ API', 'run_backend.py')],
    cwd: path.join(repoRoot, 'GATIQ API'),
    modelDir: path.join(repoRoot, 'GATIQ API')
  };
}

function healthCheckRequest(apiKey) {
  return new Promise((resolve) => {
    const req = http.request(
      `${DEFAULT_BASE_URL}/health`,
      {
        method: 'GET',
        headers: { 'X-API-Key': apiKey },
        timeout: 3500
      },
      (response) => {
        let data = '';
        response.on('data', (chunk) => {
          data += chunk;
        });
        response.on('end', () => {
          let parsed = {};
          try {
            parsed = JSON.parse(data || '{}');
          } catch {
            parsed = {};
          }
          resolve({
            ok: response.statusCode >= 200 && response.statusCode < 300,
            status: response.statusCode,
            data: parsed
          });
        });
      }
    );

    req.on('error', (error) => {
      resolve({
        ok: false,
        status: 0,
        data: {},
        error
      });
    });

    req.on('timeout', () => {
      req.destroy(new Error('Health check timed out'));
    });

    req.end();
  });
}

async function pollBackendHealth() {
  const { apiKey } = loadSecureBackendConfig();
  const result = await healthCheckRequest(apiKey);

  if (!result.ok) {
    const message = result.status
      ? `Managed backend returned HTTP ${result.status}.`
      : `Managed backend not reachable${result.error ? `: ${result.error.message}` : '.'}`;
    setBackendStatus({
      state: backendProcess ? 'starting' : 'failed',
      message,
      healthy: false,
      localAiLoaded: false,
      aiEngineLoading: false,
      error: result.error ? result.error.message : message
    });
    return backendStatus;
  }

  const localAiLoaded = result.data?.local_ai_loaded === true;
  const aiEngineLoading = result.data?.ai_engine_loading === true || localAiLoaded === false;
  const runtimeMessage = localAiLoaded
    ? 'Managed backend connected and AI engine ready.'
    : 'Managed backend connected. AI engine is still loading.';

  setBackendStatus({
    state: localAiLoaded ? 'ready' : 'ai_loading',
    message: runtimeMessage,
    healthy: true,
    localAiLoaded,
    aiEngineLoading,
    error: result.data?.ai_engine_error || null,
    mode: result.data?.mode || 'Desktop Managed'
  });
  return backendStatus;
}

function stopHealthPolling() {
  if (backendPollTimer) {
    clearInterval(backendPollTimer);
    backendPollTimer = null;
  }
}

function startHealthPolling() {
  stopHealthPolling();
  backendPollTimer = setInterval(() => {
    pollBackendHealth().catch((error) => {
      setBackendStatus({
        state: 'failed',
        healthy: false,
        error: error.message,
        message: `Managed backend polling failed: ${error.message}`
      });
    });
  }, 5000);
}

async function startBackend() {
  if (backendProcess && backendProcess.exitCode === null) {
    return backendProcess;
  }

  const backendConfig = loadSecureBackendConfig();
  const launchSpec = resolveBackendLaunchSpec();
  const stdoutLog = createLogStream('backend.stdout.log');
  const stderrLog = createLogStream('backend.stderr.log');

  setBackendStatus({
    state: 'starting',
    healthy: false,
    localAiLoaded: false,
    aiEngineLoading: true,
    error: null,
    message: 'Starting managed backend...'
  });

  backendProcess = spawn(launchSpec.command, launchSpec.args, {
    cwd: launchSpec.cwd,
    windowsHide: true,
    env: {
      ...process.env,
      GATIQ_HOST: BACKEND_HOST,
      GATIQ_PORT: String(BACKEND_PORT),
      GATIQ_API_KEY: backendConfig.apiKey,
      GATIQ_DATA_DIR: getRuntimePaths().dataDir,
      GATIQ_LOG_DIR: getRuntimePaths().logDir,
      GATIQ_DEBUG_DIR: getRuntimePaths().debugDir,
      GATIQ_MODEL_DIR: launchSpec.modelDir,
      GATIQ_CORS_ORIGIN_REGEX: '^(null|file://.*|app://.*|http://127\\.0\\.0\\.1(:\\\\d+)?|http://localhost(:\\\\d+)?)$'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  backendProcess.stdout.on('data', (chunk) => stdoutLog.write(chunk));
  backendProcess.stderr.on('data', (chunk) => stderrLog.write(chunk));
  backendProcess.on('error', (error) => {
    setBackendStatus({
      state: 'failed',
      healthy: false,
      aiEngineLoading: false,
      error: error.message,
      message: `Managed backend failed to start: ${error.message}`
    });
  });
  backendProcess.on('exit', (code, signal) => {
    stopHealthPolling();
    setBackendStatus({
      state: 'stopped',
      healthy: false,
      localAiLoaded: false,
      aiEngineLoading: false,
      error: code === 0 ? null : `Process exited with code ${code ?? 'unknown'}${signal ? ` (${signal})` : ''}`,
      message: code === 0 ? 'Managed backend stopped.' : 'Managed backend stopped unexpectedly.'
    });
    backendProcess = null;
    stdoutLog.end();
    stderrLog.end();
  });

  startHealthPolling();

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const status = await pollBackendHealth();
    if (status.healthy) break;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return backendProcess;
}

async function restartBackend() {
  await stopBackend();
  await startBackend();
  return backendStatus;
}

async function stopBackend() {
  stopHealthPolling();
  if (backendProcess && backendProcess.exitCode === null) {
    backendProcess.kill();
  }
}

function createMainWindow() {
  const windowIcon = path.join(__dirname, '..', 'build', 'icon.png');
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#f5f7fa',
    autoHideMenuBar: true,
    icon: fs.existsSync(windowIcon) ? windowIcon : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
    }
  });
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = String(input.key || '').toLowerCase();
    const blockedDevTools = key === 'f12' || ((input.control || input.meta) && input.shift && key === 'i');
    if (app.isPackaged && blockedDevTools) {
      event.preventDefault();
    }
  });

  mainWindow.loadFile(path.join(__dirname, '..', 'index.html'));
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function registerIpc() {
  ipcMain.handle('license:get-state', async () => licenseService.getActivationState(true));
  ipcMain.handle('license:select-file', async () => licenseService.selectLicenseFile(mainWindow));
  ipcMain.handle('license:activate', async (_event, payload) => {
    const state = await licenseService.activateFromFile(payload?.filePath);
    await startLicensedServicesIfNeeded();
    return state;
  });
  ipcMain.handle('license:clear', async () => {
    await stopBackend();
    return licenseService.clearActivation();
  });

  ipcMain.handle('secure-config:load-backend', async () => {
    await licenseService.assertLicensed();
    return loadSecureBackendConfig();
  });
  ipcMain.handle('secure-config:save-backend', async (_event, nextConfig) => {
    await licenseService.assertLicensed();
    const previous = loadSecureBackendConfig();
    const saved = saveSecureBackendConfig(nextConfig);
    if (saved.apiKey !== previous.apiKey) {
      await restartBackend();
    }
    return saved;
  });
  ipcMain.handle('backend:get-status', async () => {
    await licenseService.assertLicensed();
    return backendStatus;
  });
  ipcMain.handle('backend:test-connection', async () => {
    await licenseService.assertLicensed();
    if (!backendProcess || backendProcess.exitCode !== null) {
      await startBackend();
    }
    return pollBackendHealth();
  });
  ipcMain.handle('backend:restart', async () => {
    await licenseService.assertLicensed();
    await restartBackend();
    return backendStatus;
  });
  ipcMain.handle('updater:get-status', async () => {
    await licenseService.assertLicensed();
    return updaterStatus;
  });
  ipcMain.handle('updater:check', async () => {
    await licenseService.assertLicensed();
    return checkForAppUpdates();
  });
  ipcMain.handle('updater:install', async () => {
    await licenseService.assertLicensed();
    return { started: installDownloadedUpdate() };
  });
  ipcMain.handle('auth:start-google', async (_event, payload) => {
    await licenseService.assertLicensed();
    return startGoogleDesktopAuth(payload || {});
  });
  ipcMain.handle('cloud:upload-pdf', async (_event, payload) => {
    await licenseService.assertLicensed();
    return uploadToDrive(payload);
  });
  ipcMain.handle('cloud:get-status', async () => {
    await licenseService.assertLicensed();
    const creds = loadCloudCredentials();
    return (creds && creds.refresh_token) ? { connected: true } : { connected: false };
  });
  ipcMain.handle('cloud:disconnect', async () => {
    await licenseService.assertLicensed();
    const file = getCloudCredsFile();
    if (fs.existsSync(file)) fs.unlinkSync(file);
    return { success: true };
  });
}

async function startLicensedServicesIfNeeded() {
  const licenseState = await licenseService.getActivationState(true);
  if (!licenseState.isActivated) {
    await stopBackend();
    return licenseState;
  }

  if (!backendProcess || backendProcess.exitCode !== null) {
    await startBackend().catch((error) => {
      setBackendStatus({
        state: 'failed',
        healthy: false,
        error: error.message,
        message: `Managed backend startup failed: ${error.message}`
      });
    });
  }

  if (app.isPackaged) {
    setTimeout(() => {
      checkForAppUpdates().catch((error) => {
        setUpdaterStatus({
          state: 'error',
          message: `Auto-update failed: ${error.message}`,
          error: error.message,
          percent: 0
        });
      });
    }, AUTO_UPDATE_CHECK_DELAY_MS);
  }

  return licenseState;
}

app.on('web-contents-created', (_event, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});

const singleInstanceLock = app.requestSingleInstanceLock();
if (!singleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
      const allowed = ['media', 'mediaKeySystem', 'notifications'];
      callback(allowed.includes(permission));
    });
    session.defaultSession.setPermissionCheckHandler((_webContents, permission) => {
      const allowed = ['media', 'mediaKeySystem', 'notifications'];
      return allowed.includes(permission);
    });
    getRuntimePaths();
    licenseService = createLicenseService({ app, dialog, safeStorage });
    registerIpc();
    configureAutoUpdater();
    createMainWindow();
    await startLicensedServicesIfNeeded();
  });

  app.on('before-quit', () => {
    stopBackend();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
}
