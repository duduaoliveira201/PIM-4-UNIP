const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('brewMasterDesktop', {
  getSiteUrl: () => ipcRenderer.invoke('settings:get-site-url'),
  saveSiteUrl: (siteUrl) => ipcRenderer.invoke('settings:save-site-url', siteUrl),
});
