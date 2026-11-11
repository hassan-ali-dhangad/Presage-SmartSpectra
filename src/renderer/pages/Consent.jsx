import { useState } from "react";

function Consent({ onBack, onContinue }) {
  const [accepted, setAccepted] = useState(false);

  return (
    <main className="setup-page">
      <header className="setup-header">
        <button className="back-button" onClick={onBack}>
          ← Practice setup
        </button>

        <span className="setup-brand">StageReady</span>
      </header>

      <section className="consent-content">
        <p className="setup-eyebrow">PRIVACY FIRST</p>

        <h1>Your privacy matters.</h1>

        <p className="setup-description">
          Before starting your rehearsal, please understand how StageReady uses
          your camera and session data.
        </p>

        <div className="consent-card">
          <div className="consent-icon">📷</div>
          <div>
            <h3>Camera access</h3>
            <p>
              Your camera will be used during a practice session to provide
              available SmartSpectra measurements.
            </p>
          </div>
        </div>

        <div className="consent-card">
          <div className="consent-icon">🔒</div>
          <div>
            <h3>Video privacy</h3>
            <p>
              StageReady does not record or save raw video by default. Camera
              access is only requested when you explicitly start a session.
            </p>
          </div>
        </div>

        <div className="consent-card">
          <div className="consent-icon">📊</div>
          <div>
            <h3>Session measurements</h3>
            <p>
              Only signals actually provided and validated by the Presage SDK
              will be displayed. Measurements are not medical diagnoses.
            </p>
          </div>
        </div>

        <div className="consent-card">
          <div className="consent-icon">💻</div>
          <div>
            <h3>Local data storage</h3>
            <p>
              StageReady is designed to keep session summaries on your device.
              You choose whether to save them.
            </p>
          </div>
        </div>

        <label className="consent-checkbox">
          <input
            type="checkbox"
            checked={accepted}
            onChange={(event) => setAccepted(event.target.checked)}
          />

          <span>
            I understand and agree to camera use during my practice session.
          </span>
        </label>

        <div className="setup-actions">
          <button className="cancel-button" onClick={onBack}>
            Go back
          </button>

          <button
            className="continue-button"
            disabled={!accepted}
            onClick={onContinue}
          >
            I agree, continue →
          </button>
        </div>

        <p className="consent-disclaimer">
          StageReady is a practice tool, not a medical device. You can cancel
          before starting your camera session.
        </p>
      </section>
    </main>
  );
}

export default Consent;
