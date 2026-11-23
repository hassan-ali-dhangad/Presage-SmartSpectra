
function SessionReport({ session, onBack }) {
  if (!session) {
    return (
      <main className="setup-page">
        <section className="consent-content">
          <h1>Session not found</h1>
          <p className="setup-description">
            We could not find this practice session.
          </p>
          <button className="continue-button" onClick={onBack}>
            Back to History
          </button>
        </section>
      </main>
    );
  }

  const minutes = Math.floor(session.actualDurationSeconds / 60);
  const seconds = session.actualDurationSeconds % 60;

  const completedDate = new Date(
    session.completedAt
  ).toLocaleString();

  const targetSeconds = session.duration * 60;

  const targetReached =
    session.actualDurationSeconds >= targetSeconds;

  return (
    <main className="setup-page">
      <header className="setup-header">
        <button className="back-button" onClick={onBack}>
          ← Session History
        </button>
        <span className="setup-brand">StageReady</span>
      </header>

      <section className="consent-content">
        <p className="setup-eyebrow">WORKSPACE / SESSION REPORT</p>

        <h1>Practice report</h1>

        <p className="setup-description">
          Review your completed practice session.
        </p>

        <div className="report-summary">
          <div>
            <span>Practice type</span>
            <strong>{session.practiceType}</strong>
          </div>
          <div>
            <span>Actual practice time</span>
            <strong>{minutes} min {seconds} sec</strong>
          </div>
          <div>
            <span>Session status</span>
            <strong>{targetReached ? "Target reached" : "Completed"}</strong>
          </div>
        </div>

        <div className="report-metrics">
          <article className="report-metric breathing">
            <span>Breathing rate</span>
            <strong>
              {session.breathingRate == null
                ? "Not available"
                : `${Number(session.breathingRate).toFixed(1)} bpm`}
            </strong>
          </article>
          <article className="report-metric pulse">
            <span>Pulse rate</span>
            <strong>
              {session.pulseRate == null
                ? "Not available"
                : `${Number(session.pulseRate).toFixed(1)} bpm`}
            </strong>
          </article>
        </div>

        <div className="report-details">
          <div>
            <h3>Target duration</h3>
            <p>{session.duration} minutes</p>
          </div>
          <div>
            <h3>Completed on</h3>
            <p>{completedDate}</p>
          </div>
          <div>
            <h3>Practice notes</h3>
            <p>{session.notes || "No notes added for this session."}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default SessionReport;
