const { app, BrowserWindow, dialog, ipcMain, safeStorage, session } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const http = require('http');
const { spawn } = require('child_process');
const { createLicenseService } = require('./licensing/license-service');

const BACKEND_HOST = '127.0.0.1';
const BACKEND_PORT = 8001;
const DEFAULT_BASE_URL = `http://${BACKEND_HOST}:${BACKEND_PORT}`;

let mainWindow = null;
let backendProcess = null;
let backendPollTimer = null;
let runtimePaths = null;
let updaterConfigured = false;
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

function getRuntimePaths() {
  if (runtimePaths) return runtimePaths;
  const userData = app.getPath('userData');
  runtimePaths = {
    userData,
    configDir: path.join(userData, 'config'),
    dataDir: path.join(userData, 'data'),
    logDir: path.join(userData, 'logs'),
    debugDir: path.join(userData, 'debug_scans'),
    configFile: path.join(userData, 'config', 'backend.json'),
    exportDir: path.join(app.getPath('desktop'), 'GATIQ Exports')
  };
  ensureDir(runtimePaths.configDir);
  ensureDir(runtimePaths.dataDir);
  ensureDir(runtimePaths.logDir);
  ensureDir(runtimePaths.debugDir);
  ensureDir(runtimePaths.exportDir);
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
    return 'Manual update checks work in installed desktop builds published through GitHub Releases.';
  }
  return `GATIQ ${app.getVersion()} is ready. Updates are checked only when you click "Check For Updates".`;
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

function getExportDirectory() {
  return getRuntimePaths().exportDir;
}

function saveExportFile({ filename, bodyBase64, subdirectory = '' } = {}) {
  const normalizedFilename = path.basename(String(filename || '').trim());
  if (!normalizedFilename) {
    throw new Error('Export file name is required.');
  }
  if (!bodyBase64) {
    throw new Error('Export payload was empty.');
  }

  const rootDir = getExportDirectory();
  const safeSubdirectory = String(subdirectory || '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim();
  const targetDir = safeSubdirectory ? path.join(rootDir, safeSubdirectory) : rootDir;
  ensureDir(targetDir);

  const targetPath = path.join(targetDir, normalizedFilename);
  fs.writeFileSync(targetPath, Buffer.from(bodyBase64, 'base64'));
  return {
    directory: targetDir,
    path: targetPath,
    filename: normalizedFilename
  };
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
  ipcMain.handle('exports:get-directory', async () => {
    await licenseService.assertLicensed();
    return {
      directory: getExportDirectory()
    };
  });
  ipcMain.handle('exports:save-file', async (_event, payload) => {
    await licenseService.assertLicensed();
    return saveExportFile(payload || {});
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
