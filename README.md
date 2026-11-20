# StageReady

StageReady is a private, local-first practice desktop application for preparing presentations and interview responses. It gives speakers a structured rehearsal space, live camera-based feedback, and a saved summary of completed practice sessions.

The project addresses a simple problem: people often rehearse important presentations or interviews without immediate, objective feedback on both their delivery time and basic physiological signals. StageReady combines practice setup, camera consent, live presentation, and post-session reporting in one focused Windows application.

StageReady is a practice tool, not a medical device.

## Main features

- Choose presentation or interview practice.
- Set a target duration of 1, 3, 5, 10, or 15 minutes.
- Add optional session notes.
- Explicitly consent to camera use before starting a rehearsal.
- Start, pause, resume, and finish a live rehearsal.
- View live camera status, camera FPS, SmartSpectra processing status, breathing rate, and pulse rate when available.
- Save completed sessions locally.
- Review dashboard totals and recent sessions.
- Open detailed Session Reports.
- Delete sessions through a confirmation dialog.
- Preserve a session backup and attempt recovery after corrupted storage.

## Technology stack

- Electron
- React 19
- Vite
- JavaScript
- Presage SmartSpectra Node SDK 3.5.0
- Node.js and npm
- Windows desktop development

## Presage SmartSpectra SDK integration

The application uses `@smartspectra/node-sdk` in both the main and renderer processes:

- `src/main/main.js` registers the SDK main-process IPC bridge with `bindSmartSpectraIpc`.
- `src/preload/preload.js` loads the SDK preload bridge.
- `src/renderer/pages/LiveRehearsal.jsx` creates `SmartSpectraSDK` and requests both breathing and cardio metric groups.
- `decodeMetrics` converts SDK metric buffers from the renderer into display values.
- `breathingMetrics` and `cardioMetrics` determine the requested live measurements.
- The latest breathing rate and pulse rate are retained for the completed session.

The current renderer SDK configuration requests live breathing and cardio metrics and disables SDK telemetry:

```js
new SmartSpectraSDK({
  requestedMetrics: [...breathingMetrics, ...cardioMetrics],
  enableTelemetry: false,
})
```

A local SDK patch supplies `PRESAGE_API_KEY` to the SDK main-process connection from `process.env.PRESAGE_API_KEY`. The key is supplied by the developer environment and is not hard-coded into StageReady source or committed to Git.

The SDK implementation is also responsible for camera stream, processing, validation status, and metric delivery. StageReady does not record or save raw video.

## Windows development setup

Requirements:

- Windows 10 or Windows 11
- Node.js 22.12 or newer
- npm
- A Presage SmartSpectra API key available for local development

From PowerShell:

```powershell
git clone <YOUR_PUBLIC_REPOSITORY_URL>
cd Presage-SmartSpectra
npm install
```

Create a `.env` file in the project root and set the SDK variable:

```text
PRESAGE_API_KEY=<your-local-Presage-API-key>
```

Keep the real key out of source control. `.env` and `.env.*` are excluded by `.gitignore`; never paste or commit the actual key.

Start the Vite and Electron development processes:

```powershell
npm start
```

Build the production renderer bundle:

```powershell
npm run build
```

The Vite build writes the renderer to `dist/`. This repository currently has no configured Windows installer or distributable packaging.

## Camera consent

StageReady does not activate the camera automatically.

Before rehearsal, the user must:

1. Complete practice setup.
2. Read the in-app camera and privacy consent.
3. Select the consent checkbox.
4. Continue to the rehearsal preparation screen.
5. Explicitly start or resume the camera session.

Camera permission is granted only for the actual StageReady Electron window. In development, the permission origin must match the configured Vite development server origin. In production, it must match the packaged local `dist/index.html` origin.

Camera pause and finish actions stop the SDK stream and clear the preview. Unmount cleanup also destroys the SDK instance.

## Data handling

### Local storage location

StageReady initializes storage under Electron's `app.getPath("userData")` directory. Session files are kept in a `StageReady` subdirectory:

- Session data: `[Electron userData]/StageReady/sessions.json`
- Backup: `[Electron userData]/StageReady/sessions.json.bak`

On Windows, Electron's user-data directory is typically rooted under the current user's application-data directory. The application resolves it through the Electron API rather than an arbitrary hard-coded path.

### Saved measurements

A completed practice session may contain:

- A UUID session ID
- Practice type
- Target duration in minutes
- Actual elapsed duration in seconds
- Latest breathing rate, if the SDK provided a finite number
- Latest pulse rate, if the SDK provided a finite number
- Optional notes
- ISO completion timestamp

The SDK metric fields may be `null` or unavailable when no valid measurement was received. Session reports show "Not available" in those cases.

### Upload behavior

StageReady does not send session summaries to a StageReady cloud service or account. It uses local JSON files for session storage. The SDK configuration disables SDK telemetry, and StageReady does not implement a separate cloud upload path.

The Presage SDK is responsible for camera and metric processing according to the SDK integration. StageReady itself does not save raw camera video.

### Session deletion

The History screen opens a confirmation dialog before deletion. The confirmation names the practice type and warns that the action cannot be undone.

After confirmation, StageReady sends the session UUID through its validated IPC handler and rewrites the local session array without the selected session. The updated session list is then shown immediately.

### Backup and recovery

Session writes use a temporary sibling file and atomic file replacement. After a successful primary-file write, StageReady creates or replaces `sessions.json.bak`.

At startup, StageReady:

- Creates a new empty session file and backup if neither file exists.
- Restores `sessions.json` from the backup if only the backup exists.
- Preserves a corrupted primary file with a timestamped `.corrupt` sibling name.
- Uses the backup to recover a valid JSON session array when the primary file is corrupted.
- Reports recovery failure without silently replacing unrecoverable session data.

Invalid session objects and UUID deletion IDs are rejected by validation before storage operations.

### SDK telemetry configuration

The active live rehearsal SDK instance sets `enableTelemetry: false`. The `presageService.js` helper also explicitly sets SDK telemetry to `false` and `enableAccumulatedOutput: true`, although the active live rehearsal page currently constructs its own SDK instance.

SDK telemetry is therefore disabled in the active rehearsal implementation rather than enabled or merely omitted.

## Privacy and disclaimer

StageReady is designed around local session storage and explicit camera consent. It does not provide account-based storage or background raw-video recording.

Breathing and pulse measurements are practice feedback only. They are not medical diagnoses, and StageReady does not provide medical advice or emergency monitoring. Use qualified medical professionals for health concerns.

## Demo video

**Demo video placeholder:** [Add public demo video URL]

## Screenshots

- **Dashboard placeholder:** [Add screenshot]
- **Practice setup placeholder:** [Add screenshot]
- **Camera consent placeholder:** [Add screenshot]
- **Live rehearsal placeholder:** [Add screenshot]
- **Session report placeholder:** [Add screenshot]
- **Session history placeholder:** [Add screenshot]
