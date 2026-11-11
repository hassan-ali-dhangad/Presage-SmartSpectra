
const fs = require("fs");
const path = require("path");

let sessionsFilePath = null;

// Initialize local session storage
function initializeSessionStore(userDataPath) {
  const storageDirectory = path.join(userDataPath, "StageReady");

  if (!fs.existsSync(storageDirectory)) {
    fs.mkdirSync(storageDirectory, { recursive: true });
  }

  sessionsFilePath = path.join(storageDirectory, "sessions.json");

  if (!fs.existsSync(sessionsFilePath)) {
    fs.writeFileSync(sessionsFilePath, "[]", "utf8");
  }
}

// Read all saved sessions
function getAllSessions() {
  if (!sessionsFilePath) {
    throw new Error("Session store has not been initialized.");
  }

  const data = fs.readFileSync(sessionsFilePath, "utf8");
  return JSON.parse(data);
}

// Save a new session
function saveSession(session) {
  if (!sessionsFilePath) {
    throw new Error("Session store has not been initialized.");
  }

  const sessions = getAllSessions();
  sessions.push(session);

  fs.writeFileSync(
    sessionsFilePath,
    JSON.stringify(sessions, null, 2),
    "utf8"
  );

  return session;
}

// Delete a session by ID
function deleteSession(sessionId) {
  if (!sessionsFilePath) {
    throw new Error("Session store has not been initialized.");
  }

  const sessions = getAllSessions();
  const updatedSessions = sessions.filter(
    (session) => session.id !== sessionId
  );

  fs.writeFileSync(
    sessionsFilePath,
    JSON.stringify(updatedSessions, null, 2),
    "utf8"
  );

  return updatedSessions;
}

module.exports = {
  initializeSessionStore,
  getAllSessions,
  saveSession,
  deleteSession,
};
