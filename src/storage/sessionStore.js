
const fs = require("fs");
const path = require("path");

let sessionsFilePath = null;
let backupFilePath = null;

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

function invalidSession(message) {
  throw new TypeError(`Invalid session: ${message}`);
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
    invalidSession("expected a plain object.");
  }

  if (
    !hasOwn(session, "id") ||
    typeof session.id !== "string" ||
    session.id.length === 0 ||
    session.id.length > MAX_ID_LENGTH ||
    !UUID_PATTERN.test(session.id)
  ) {
    invalidSession("invalid id.");
  }

  if (
    !hasOwn(session, "practiceType") ||
    typeof session.practiceType !== "string" ||
    session.practiceType.trim().length === 0 ||
    session.practiceType.length > MAX_PRACTICE_TYPE_LENGTH
  ) {
    invalidSession("invalid practiceType.");
  }

  if (
    !hasOwn(session, "duration") ||
    !Number.isInteger(session.duration) ||
    session.duration <= 0 ||
    session.duration > MAX_DURATION_MINUTES
  ) {
    invalidSession("invalid duration.");
  }

  if (
    !hasOwn(session, "actualDurationSeconds") ||
    !Number.isInteger(session.actualDurationSeconds) ||
    session.actualDurationSeconds < 0 ||
    session.actualDurationSeconds > MAX_ACTUAL_DURATION_SECONDS
  ) {
    invalidSession("invalid actualDurationSeconds.");
  }

  if (
    !hasOwn(session, "completedAt") ||
    typeof session.completedAt !== "string" ||
    session.completedAt.length === 0 ||
    session.completedAt.length > MAX_COMPLETED_AT_LENGTH ||
    Number.isNaN(Date.parse(session.completedAt))
  ) {
    invalidSession("invalid completedAt.");
  }

  if (
    hasOwn(session, "notes") &&
    session.notes !== null &&
    session.notes !== undefined &&
    (typeof session.notes !== "string" ||
      session.notes.length > MAX_NOTES_LENGTH)
  ) {
    invalidSession("invalid notes.");
  }

  for (const property of ["breathingRate", "pulseRate"]) {
    if (
      hasOwn(session, property) &&
      session[property] !== null &&
      (typeof session[property] !== "number" ||
        !Number.isFinite(session[property]))
    ) {
      invalidSession(`invalid ${property}.`);
    }
  }

  let serializedSession;

  try {
    serializedSession = JSON.stringify(session);
  } catch {
    invalidSession("payload cannot be serialized.");
  }

  if (serializedSession.length > MAX_SESSION_JSON_SIZE) {
    invalidSession("payload is too large.");
  }
}

function createSiblingPath(suffix) {
  return `${sessionsFilePath}.${process.pid}.${Date.now()}.${suffix}`;
}

function parseSessionsFile(filePath) {
  const data = fs.readFileSync(filePath, "utf8");
  const sessions = JSON.parse(data);

  if (!Array.isArray(sessions)) {
    throw new Error("Session data must be a JSON array.");
  }

  return sessions;
}

function preserveFile(filePath, label) {
  const preservedPath = createSiblingPath(label);
  fs.copyFileSync(filePath, preservedPath);
  return preservedPath;
}

function replaceFileAtomically(tempPath, targetPath) {
  const displacedPath = `${targetPath}.${process.pid}.${Date.now()}.previous`;
  let displaced = false;

  try {
    if (fs.existsSync(targetPath)) {
      fs.renameSync(targetPath, displacedPath);
      displaced = true;
    }

    fs.renameSync(tempPath, targetPath);

    if (displaced) {
      fs.rmSync(displacedPath, { force: true });
    }
  } catch (error) {
    try {
      if (
        displaced &&
        !fs.existsSync(targetPath) &&
        fs.existsSync(displacedPath)
      ) {
        fs.renameSync(displacedPath, targetPath);
      }
    } catch (restoreError) {
      throw new Error(
        `Unable to replace ${targetPath}; the previous file is preserved at ${displacedPath}.`,
        { cause: restoreError },
      );
    }

    throw error;
  }
}

function writeFileAtomically(filePath, data) {
  const tempPath = createSiblingPath("tmp");

  try {
    fs.writeFileSync(tempPath, data, "utf8");
    replaceFileAtomically(tempPath, filePath);
  } catch (error) {
    if (fs.existsSync(tempPath)) {
      console.error(
        `Unable to complete atomic write. Temporary session data was preserved at ${tempPath}.`,
      );
    }

    throw error;
  }
}

function createBackup() {
  const backupTempPath = createSiblingPath("backup-tmp");

  try {
    fs.copyFileSync(sessionsFilePath, backupTempPath);
    replaceFileAtomically(backupTempPath, backupFilePath);
  } catch (error) {
    if (fs.existsSync(backupTempPath)) {
      console.error(
        `Unable to update the session backup. Temporary backup data was preserved at ${backupTempPath}.`,
      );
    }

    throw error;
  }
}

function writeSessions(sessions, updateBackup = true) {
  const data = JSON.stringify(sessions, null, 2);

  writeFileAtomically(sessionsFilePath, data);

  if (updateBackup) {
    createBackup();
  }
}

function recoverSessionsFile() {
  let backupSessions;

  try {
    backupSessions = parseSessionsFile(backupFilePath);
  } catch (error) {
    throw new Error(
      `Session data is corrupted and backup recovery failed. Corrupted data was preserved alongside ${sessionsFilePath}; backup file: ${backupFilePath}.`,
      { cause: error },
    );
  }

  writeSessions(backupSessions, false);
  return backupSessions;
}

// Initialize local session storage
function initializeSessionStore(userDataPath) {
  const storageDirectory = path.join(userDataPath, "StageReady");

  if (!fs.existsSync(storageDirectory)) {
    fs.mkdirSync(storageDirectory, { recursive: true });
  }

  sessionsFilePath = path.join(storageDirectory, "sessions.json");
  backupFilePath = path.join(storageDirectory, "sessions.json.bak");

  if (!fs.existsSync(sessionsFilePath)) {
    if (fs.existsSync(backupFilePath)) {
      recoverSessionsFile();
    } else {
      writeSessions([]);
    }
    return;
  }

  try {
    parseSessionsFile(sessionsFilePath);
  } catch (error) {
    const preservedPath = preserveFile(sessionsFilePath, "corrupt");

    if (!fs.existsSync(backupFilePath)) {
      throw new Error(
        `Session data is corrupted and no backup is available. The damaged file was preserved at ${preservedPath}.`,
        { cause: error },
      );
    }

    try {
      recoverSessionsFile();
    } catch (recoveryError) {
      throw new Error(
        `Session data recovery failed. The damaged file was preserved at ${preservedPath}; backup remains at ${backupFilePath}.`,
        { cause: recoveryError },
      );
    }
  }

  if (!fs.existsSync(backupFilePath)) {
    createBackup();
  }
}

// Read all saved sessions
function getAllSessions() {
  if (!sessionsFilePath) {
    throw new Error("Session store has not been initialized.");
  }

  return parseSessionsFile(sessionsFilePath);
}

// Save a new session
function saveSession(session) {
  if (!sessionsFilePath) {
    throw new Error("Session store has not been initialized.");
  }

  validateSession(session);

  const sessions = getAllSessions();
  sessions.push(session);

  writeSessions(sessions);

  return session;
}

// Delete a session by ID
function deleteSession(sessionId) {
  if (!sessionsFilePath) {
    throw new Error("Session store has not been initialized.");
  }

  validateSessionId(sessionId);

  const sessions = getAllSessions();
  const updatedSessions = sessions.filter(
    (session) => session.id !== sessionId
  );

  writeSessions(updatedSessions);

  return updatedSessions;
}

module.exports = {
  initializeSessionStore,
  getAllSessions,
  saveSession,
  deleteSession,
};
