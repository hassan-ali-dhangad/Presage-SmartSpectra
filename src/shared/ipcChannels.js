
// StageReady IPC Channel Names

const IPC_CHANNELS = {
  // Application information
  APP_GET_INFO: "app:get-info",

  // Session storage
  GET_SESSIONS: "sessions:get-all",
  SAVE_SESSION: "sessions:save",
  DELETE_SESSION: "sessions:delete",
};

module.exports = IPC_CHANNELS;
