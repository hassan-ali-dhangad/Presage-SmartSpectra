const { app, BrowserWindow, ipcMain, session } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

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

let stageReadyWindow = null;

const MAX_SESSION_JSON_SIZE = 64 * 1024;
const MAX_ID_LENGTH = 128;
const MAX_PRACTICE_TYPE_LENGTH = 100;
const MAX_NOTES_LENGTH = 500;
const MAX_COMPLETED_AT_LENGTH = 64;
const MAX_DURATION_MINUTES = 24 * 60;
const MAX_ACTUAL_DURATION_SECONDS = 7 * 24 * 60 * 60;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value, property) {
  return Object.prototype.hasOwnProperty.call(value, property);
}

function validateSessionId(sessionId) {
  if (
    typeof sessionId !== "string" ||
    sessionId.length === 0 ||
    sessionId.length > MAX_ID_LENGTH ||
    !UUID_PATTERN.test(sessionId)
  ) {
    throw new TypeError("Invalid session ID.");
  }
}

function validateSession(session) {
  if (!isPlainObject(session)) {
    throw new TypeError("Invalid session data.");
  }

  if (
    !hasOwn(session, "id") ||
    typeof session.id !== "string" ||
    session.id.length === 0 ||
    session.id.length > MAX_ID_LENGTH ||
    !UUID_PATTERN.test(session.id)
  ) {
    throw new TypeError("Invalid session data.");
  }

  if (
    !hasOwn(session, "practiceType") ||
    typeof session.practiceType !== "string" ||
    session.practiceType.trim().length === 0 ||
    session.practiceType.length > MAX_PRACTICE_TYPE_LENGTH
  ) {
    throw new TypeError("Invalid session data.");
  }

  if (
    !hasOwn(session, "duration") ||
    !Number.isInteger(session.duration) ||
    session.duration <= 0 ||
    session.duration > MAX_DURATION_MINUTES
  ) {
    throw new TypeError("Invalid session data.");
  }

  if (
    !hasOwn(session, "actualDurationSeconds") ||
    !Number.isInteger(session.actualDurationSeconds) ||
    session.actualDurationSeconds < 0 ||
    session.actualDurationSeconds > MAX_ACTUAL_DURATION_SECONDS
  ) {
    throw new TypeError("Invalid session data.");
  }

  if (
    !hasOwn(session, "completedAt") ||
    typeof session.completedAt !== "string" ||
    session.completedAt.length === 0 ||
    session.completedAt.length > MAX_COMPLETED_AT_LENGTH ||
    Number.isNaN(Date.parse(session.completedAt))
  ) {
    throw new TypeError("Invalid session data.");
  }

  if (
    hasOwn(session, "notes") &&
    session.notes !== null &&
    session.notes !== undefined &&
    (typeof session.notes !== "string" ||
      session.notes.length > MAX_NOTES_LENGTH)
  ) {
    throw new TypeError("Invalid session data.");
  }

  for (const property of ["breathingRate", "pulseRate"]) {
    if (
      hasOwn(session, property) &&
      session[property] !== null &&
      (typeof session[property] !== "number" ||
        !Number.isFinite(session[property]))
    ) {
      throw new TypeError("Invalid session data.");
    }
  }

  let serializedSession;

  try {
    serializedSession = JSON.stringify(session);
  } catch {
    throw new TypeError("Invalid session data.");
  }

  if (serializedSession.length > MAX_SESSION_JSON_SIZE) {
    throw new TypeError("Invalid session data.");
  }
}

function assertTrustedStageReadySender(event) {
  if (
    !stageReadyWindow ||
    stageReadyWindow.isDestroyed() ||
    event.sender !== stageReadyWindow.webContents
  ) {
    throw new Error("Unauthorized IPC request.");
  }
}

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

  stageReadyWindow = mainWindow;
  mainWindow.once("closed", () => {
    if (stageReadyWindow === mainWindow) {
      stageReadyWindow = null;
    }
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
ipcMain.handle(IPC_CHANNELS.GET_SESSIONS, (event) => {
  assertTrustedStageReadySender(event);

  try {
    return getAllSessions();
  } catch (error) {
    console.error("Session load failed.");
    throw new Error("Unable to load sessions.");
  }
});

ipcMain.handle(IPC_CHANNELS.SAVE_SESSION, (event, session) => {
  assertTrustedStageReadySender(event);

  try {
    validateSession(session);
  } catch (error) {
    throw new Error("Invalid session data.");
  }

  try {
    return saveSession(session);
  } catch (error) {
    console.error("Session save failed.");
    throw new Error("Unable to save session.");
  }
});

ipcMain.handle(IPC_CHANNELS.DELETE_SESSION, (event, sessionId) => {
  assertTrustedStageReadySender(event);

  try {
    validateSessionId(sessionId);
  } catch (error) {
    throw new Error("Invalid session ID.");
  }

  try {
    return deleteSession(sessionId);
  } catch (error) {
    console.error("Session deletion failed.");
    throw new Error("Unable to delete session.");
  }
});

app.whenReady().then(() => {
  // Initialize local session storage
  initializeSessionStore(app.getPath("userData"));

  // Presage SmartSpectra camera permission handler
  session.defaultSession.setPermissionRequestHandler(
    (webContents, permission, callback, details) => {
      if (
        !stageReadyWindow ||
        stageReadyWindow.isDestroyed() ||
        webContents !== stageReadyWindow.webContents ||
        permission !== "media"
      ) {
        callback(false);
        return;
      }

      const actualWindowUrl = webContents.getURL();
      const requestingUrl =
        (details && details.requestingUrl) ||
        actualWindowUrl ||
        "";

      let isAllowedOrigin = false;

      if (process.env.VITE_DEV_SERVER_URL) {
        try {
          isAllowedOrigin =
            new URL(actualWindowUrl).origin ===
              new URL(process.env.VITE_DEV_SERVER_URL).origin &&
            new URL(requestingUrl).origin ===
              new URL(process.env.VITE_DEV_SERVER_URL).origin;
        } catch {
          isAllowedOrigin = false;
        }
      } else {
        const packagedAppUrl = pathToFileURL(
          path.join(__dirname, "../../dist/index.html"),
        ).href;
        isAllowedOrigin =
          actualWindowUrl === packagedAppUrl &&
          requestingUrl === packagedAppUrl;
      }

      callback(isAllowedOrigin);
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
