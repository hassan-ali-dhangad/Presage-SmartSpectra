// Electron Preload
const { contextBridge, ipcRenderer } = require("electron");

// Shared IPC channel names
const IPC_CHANNELS = require("../shared/ipcChannels");

// Presage SmartSpectra SDK preload bridge
require("@smartspectra/node-sdk/preload");

// StageReady application API

contextBridge.exposeInMainWorld("stageReady", {
  getAppName: () => "StageReady",
  getAppVersion: () => "1.0.0",

  // Application information
  getAppInfo: () => ipcRenderer.invoke(IPC_CHANNELS.APP_GET_INFO),

  // Session storage
  getSessions: () => ipcRenderer.invoke(IPC_CHANNELS.GET_SESSIONS),

  saveSession: (session) =>
    ipcRenderer.invoke(IPC_CHANNELS.SAVE_SESSION, session),

  deleteSession: (sessionId) =>
    ipcRenderer.invoke(IPC_CHANNELS.DELETE_SESSION, sessionId),
});
