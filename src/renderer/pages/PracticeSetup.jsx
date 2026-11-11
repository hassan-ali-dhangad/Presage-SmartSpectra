import { useState } from "react";

function PracticeSetup({ onContinue, onBack }) {
  const [practiceType, setPracticeType] = useState("presentation");
  const [duration, setDuration] = useState(5);
  const [notes, setNotes] = useState("");

  function handleContinue() {
    onContinue({
      practiceType,
      duration,
      notes,
    });
  }

  return (
    <main className="setup-page">
      <header className="setup-header">
        <button className="back-button" onClick={onBack}>
          ← Dashboard
        </button>
        <span className="setup-brand">StageReady</span>
      </header>

      <section className="setup-content">
        <p className="setup-eyebrow">PREPARE YOUR SESSION</p>
        <h1>What would you like to practice?</h1>
        <p className="setup-description">
          Choose your practice type and customize your session.
        </p>

        <div className="setup-field">
          <h2>1. Choose practice type</h2>

          <div className="type-options">
            <button
              className={`type-option ${
                practiceType === "presentation" ? "selected" : ""
              }`}
              onClick={() => setPracticeType("presentation")}
            >
              <span className="type-icon">▤</span>
              <strong>Presentation</strong>
              <small>Speeches, talks and university presentations</small>
            </button>

            <button
              className={`type-option ${
                practiceType === "interview" ? "selected" : ""
              }`}
              onClick={() => setPracticeType("interview")}
            >
              <span className="type-icon">◉</span>
              <strong>Interview</strong>
              <small>Job interviews and professional conversations</small>
            </button>
          </div>
        </div>

        <div className="setup-field">
          <h2>2. Session duration</h2>

          <div className="duration-options">
            {[1, 3, 5, 10, 15].map((minutes) => (
              <button
                key={minutes}
                className={`duration-option ${
                  duration === minutes ? "selected" : ""
                }`}
                onClick={() => setDuration(minutes)}
              >
                {minutes} min
              </button>
            ))}
          </div>
        </div>

        <div className="setup-field">
          <h2>
            3. Session notes <span>(Optional)</span>
          </h2>

          <textarea
            className="setup-notes"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What would you like to focus on during this practice?"
            rows={4}
            maxLength={500}
          />

          <small className="character-count">
            {notes.length}/500 characters
          </small>
        </div>

        <div className="setup-actions">
          <button className="cancel-button" onClick={onBack}>
            Cancel
          </button>

          <button className="continue-button" onClick={handleContinue}>
            Continue →
          </button>
        </div>

        <p className="setup-privacy">
          🔒 Your practice notes stay on your device.
        </p>
      </section>
    </main>
  );
}

export default PracticeSetup;
