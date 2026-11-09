const { app, BrowserWindow, dialog, ipcMain, Menu, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const settingsPath = () => path.join(app.getPath('userData'), 'settings.json');
let configuredSiteUrl = '';
let mainWindow;
let setupWindow;

function normalizeSiteUrl(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return { error: 'Informe o endereço do sistema web.' };
  }

  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    return { error: 'Informe um endereço válido, como https://sistema.suaempresa.com.br.' };
  }

  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    return { error: 'Use um endereço HTTP ou HTTPS sem usuário ou senha na URL.' };
  }

  if (parsed.search || parsed.hash) {
    return { error: 'Informe somente o endereço do sistema, sem parâmetros ou fragmentos.' };
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  return { url: parsed.toString().replace(/\/$/, '') };
}

function readConfiguredSiteUrl() {
  if (!fs.existsSync(settingsPath())) {
    return '';
  }

  const settings = JSON.parse(fs.readFileSync(settingsPath(), 'utf8'));
  const result = normalizeSiteUrl(settings.siteUrl);
  return result.url ?? '';
}

function createSetupWindow() {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.focus();
    return;
  }

  setupWindow = new BrowserWindow({
    width: 560,
    height: 520,
    minWidth: 480,
    minHeight: 460,
    title: 'Configurar BrewMaster',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  void setupWindow.loadFile(path.join(__dirname, 'setup.html')).catch((error) => {
    dialog.showErrorBox(
      'Não foi possível abrir a configuração',
      `Falha ao carregar a tela de configuração do BrewMaster.\n\n${error.message}`,
    );
  });
  setupWindow.on('closed', () => {
    setupWindow = undefined;
  });
}

function isAllowedSiteNavigation(target) {
  try {
    const parsed = new URL(target);
    return ['http:', 'https:'].includes(parsed.protocol)
      && parsed.origin === new URL(configuredSiteUrl).origin;
  } catch {
    return false;
  }
}

function openExternalWebUrl(target) {
  if (target.startsWith('https://') || target.startsWith('http://')) {
    void shell.openExternal(target);
  }
}

function loadConfiguredSite(window) {
  void window.loadURL(configuredSiteUrl).catch((error) => {
    if (!window.isDestroyed()) {
      dialog.showMessageBox(window, {
        type: 'error',
        title: 'Não foi possível conectar',
        message: 'Não foi possível abrir o sistema web do BrewMaster.',
        detail: `${configuredSiteUrl}\n\n${error.message}`,
      });
    }
  });
}

function createSiteWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    loadConfiguredSite(mainWindow);
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: 'BrewMaster',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.on('will-navigate', (event, target) => {
    if (!isAllowedSiteNavigation(target)) {
      event.preventDefault();
      openExternalWebUrl(target);
    }
  });

  mainWindow.webContents.on('will-redirect', (event, target) => {
    if (!isAllowedSiteNavigation(target)) {
      event.preventDefault();
      openExternalWebUrl(target);
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    openExternalWebUrl(url);
    return { action: 'deny' };
  });

  loadConfiguredSite(mainWindow);
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });
}

ipcMain.handle('settings:get-site-url', () => configuredSiteUrl);
ipcMain.handle('settings:save-site-url', (_event, value) => {
  const result = normalizeSiteUrl(value);
  if (result.error) {
    return { success: false, message: result.error };
  }

  configuredSiteUrl = result.url;
  fs.mkdirSync(app.getPath('userData'), { recursive: true });
  fs.writeFileSync(settingsPath(), JSON.stringify({ siteUrl: configuredSiteUrl }, null, 2), 'utf8');
  createSiteWindow();
  setupWindow?.close();
  return { success: true };
});

function createApplicationMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {
      label: 'BrewMaster',
      submenu: [
        { label: 'Configurar endereço do sistema', click: createSetupWindow },
        { type: 'separator' },
        { role: 'quit', label: 'Sair' },
      ],
    },
    {
      label: 'Exibir',
      submenu: [
        { role: 'reload', label: 'Recarregar' },
        { role: 'toggleDevTools', label: 'Ferramentas de desenvolvedor' },
      ],
    },
  ]));
}

app.whenReady().then(() => {
  try {
    configuredSiteUrl = readConfiguredSiteUrl()
      || (app.isPackaged ? '' : 'http://localhost:5173');
  } catch (error) {
    dialog.showErrorBox(
      'Configuração inválida',
      `Não foi possível ler a configuração do BrewMaster.\n\n${error.message}`,
    );
    app.quit();
    return;
  }

  createApplicationMenu();
  if (configuredSiteUrl) {
    createSiteWindow();
  } else {
    createSetupWindow();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    configuredSiteUrl ? createSiteWindow() : createSetupWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
