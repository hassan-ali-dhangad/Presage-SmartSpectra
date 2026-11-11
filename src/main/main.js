const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");

// Load private environment variables
process.loadEnvFile(path.join(__dirname, "../../.env"));

// Shared IPC channel names
const IPC_CHANNELS = require("../shared/ipcChannels");

// Local session storage
const {
  initializeSessionStore,
  getAllSessions,
  saveSession,
  deleteSession,
} = require("../storage/sessionStore");

// Presage SmartSpectra IPC bridge
const { bindSmartSpectraIpc } = require("@smartspectra/node-sdk/main");

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 550,
    minHeight: 650,
    title: "StageReady",
    backgroundColor: "#f8fafc",

    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Connect Presage SDK IPC bridge
  bindSmartSpectraIpc(mainWindow);

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

// Application information IPC handler
ipcMain.handle(IPC_CHANNELS.APP_GET_INFO, () => ({
  name: app.getName(),
  version: app.getVersion(),
}));

// Session storage IPC handlers
ipcMain.handle(IPC_CHANNELS.GET_SESSIONS, () => {
  return getAllSessions();
});

ipcMain.handle(IPC_CHANNELS.SAVE_SESSION, (_event, session) => {
  return saveSession(session);
});

ipcMain.handle(IPC_CHANNELS.DELETE_SESSION, (_event, sessionId) => {
  return deleteSession(sessionId);
});

app.whenReady().then(() => {
  // Initialize local session storage
  initializeSessionStore(app.getPath("userData"));

  // Presage SmartSpectra camera permission handler
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      const requestingUrl =
        (details && details.requestingUrl) ||
        (webContents && webContents.getURL()) ||
        "";

      const isBundledApp = requestingUrl.startsWith("file://");

      let isDevApp = false;

      if (process.env.VITE_DEV_SERVER_URL) {
        try {
          isDevApp =
            new URL(requestingUrl).origin ===
            new URL(process.env.VITE_DEV_SERVER_URL).origin;
        } catch {
          isDevApp = false;
        }
      }

      callback(permission === "media" && (isBundledApp || isDevApp));
    },
  );

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
