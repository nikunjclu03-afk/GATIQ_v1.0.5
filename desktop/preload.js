const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});

contextBridge.exposeInMainWorld('gatiqDesktop', {
  isDesktop: true,
  licensing: {
    getState: () => ipcRenderer.invoke('license:get-state'),
    selectLicenseFile: () => ipcRenderer.invoke('license:select-file'),
    activate: (payload) => ipcRenderer.invoke('license:activate', payload),
    clearActivation: () => ipcRenderer.invoke('license:clear')
  },
  backend: {
    getStatus: () => ipcRenderer.invoke('backend:get-status'),
    testConnection: () => ipcRenderer.invoke('backend:test-connection'),
    restart: () => ipcRenderer.invoke('backend:restart'),
    onStatusChange: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('backend:status', listener);
      return () => ipcRenderer.removeListener('backend:status', listener);
    }
  },
  secureConfig: {
    loadBackendConfig: () => ipcRenderer.invoke('secure-config:load-backend'),
    saveBackendConfig: (config) => ipcRenderer.invoke('secure-config:save-backend', config)
  },
  exports: {
    getDirectory: () => ipcRenderer.invoke('exports:get-directory'),
    saveFile: (payload) => ipcRenderer.invoke('exports:save-file', payload)
  },
  updater: {
    getStatus: () => ipcRenderer.invoke('updater:get-status'),
    checkForUpdates: () => ipcRenderer.invoke('updater:check'),
    installUpdate: () => ipcRenderer.invoke('updater:install'),
    onStatusChange: (callback) => {
      if (typeof callback !== 'function') return () => {};
      const listener = (_event, payload) => callback(payload);
      ipcRenderer.on('updater:status', listener);
      return () => ipcRenderer.removeListener('updater:status', listener);
    }
  }
});
