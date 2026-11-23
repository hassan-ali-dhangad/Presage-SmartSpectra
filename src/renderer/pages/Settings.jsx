
function Settings({ appInfo, sessions, onBack }) {
  return (
    <main className="setup-page">
      <header className="setup-header">
        <button className="back-button" onClick={onBack}>
          ← Dashboard
        </button>
        <span className="setup-brand">StageReady</span>
      </header>

      <section className="consent-content">
        <p className="setup-eyebrow">WORKSPACE / SETTINGS</p>

        <h1>Settings</h1>

        <p className="setup-description">
          Manage your application preferences and privacy information.
        </p>

        <h2 className="settings-section-title">Privacy</h2>

        <div className="settings-card">
          <div>
            <h3>Local data storage</h3>
            <p>
              Your practice sessions are stored locally on this device.
              They are not automatically uploaded to a cloud account.
            </p>
            <span className="camera-status">
              Private workspace
            </span>
          </div>
        </div>

        <h2 className="settings-section-title">Camera and sensors</h2>

        <div className="settings-card">
          <div>
            <h3>Camera status</h3>
            <p>
              Your camera is currently inactive. No camera feed or
              sensor measurements are being collected.
            </p>
            <span className="camera-status">
              Camera inactive
            </span>
          </div>
        </div>

        <h2 className="settings-section-title">Application information</h2>

        <div className="settings-card">
          <div>
            <h3>Application name</h3>
            <p>{appInfo?.name || "StageReady"}</p>
          </div>
        </div>

        <div className="settings-card">
          <div>
            <h3>Version</h3>
            <p>{appInfo?.version || "1.0.0"}</p>
          </div>
        </div>

        <div className="settings-card">
          <div>
            <h3>Saved practice sessions</h3>

         <p>
  {sessions.length}{" "}
  {sessions.length === 1 ? "session" : "sessions"} stored on this device
</p>

          </div>
        </div>

        <p className="consent-disclaimer">
          StageReady is designed to help you practise privately
          and improve with confidence.
        </p>
      </section>
    </main>
  );
}

export default Settings;
