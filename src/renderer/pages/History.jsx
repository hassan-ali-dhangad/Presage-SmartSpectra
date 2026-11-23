
import { useState } from "react";

function History({ sessions, onBack, onDelete, onViewReport }) {
  const [sessionToDelete, setSessionToDelete] = useState(null);

  const sortedSessions = [...sessions].sort(
    (a, b) =>
      new Date(b.completedAt) - new Date(a.completedAt)
  );

  return (
    <main className="setup-page">
      <header className="setup-header">
        <button className="back-button" onClick={onBack}>
          ← Dashboard
        </button>
        <span className="setup-brand">StageReady</span>
      </header>

      <section className="consent-content">
        <p className="setup-eyebrow">WORKSPACE / HISTORY</p>
        <h1>Session History</h1>
        <p className="setup-description">
          Review your completed practice sessions.
        </p>

        <div className="history-summary">
          <div>
            <h3>Total completed sessions</h3>
            <p>
              {sessions.length}{" "}
              {sessions.length === 1 ? "session" : "sessions"} saved on this
              device
            </p>
          </div>
        </div>

        {sortedSessions.length === 0 ? (
          <div className="empty-state">
            <h3>No sessions yet</h3>
            <p>Your completed practice sessions will appear here.</p>
          </div>
        ) : (
          <div className="sessions-list">
            {sortedSessions.map((session) => (
              <article className="history-card" key={session.id}>
                <div className="history-card-main">
                  <span className="history-card-icon">▤</span>
                  <div>
                    <h3>{session.practiceType}</h3>
                    <p>{new Date(session.completedAt).toLocaleString()}</p>
                  </div>
                </div>
                <div className="history-card-details">
                  <div>
                    <span>Actual time</span>
                    <strong>
                      {Math.floor(session.actualDurationSeconds / 60)} min{" "}
                      {session.actualDurationSeconds % 60} sec
                    </strong>
                  </div>
                  <div>
                    <span>Target</span>
                    <strong>{session.duration} min</strong>
                  </div>
                </div>
                {session.notes && <p className="history-notes">Notes: {session.notes}</p>}
                <div className="history-card-actions">
                  <button
                    className="continue-button"
                    onClick={() => onViewReport(session)}
                  >
                    View report
                  </button>
                  <button
                    className="cancel-button"
                    onClick={() => setSessionToDelete(session)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {sessionToDelete && (
        <div
          className="delete-dialog-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-session-title"
        >
          <div className="delete-dialog">
            <h2 id="delete-session-title">Delete session?</h2>
            <p>
              Are you sure you want to delete this {sessionToDelete.practiceType}{" "}
              session? This action cannot be undone.
            </p>

            <div className="setup-actions">
              <button
                className="back-button"
                onClick={() => setSessionToDelete(null)}
              >
                Cancel
              </button>
              <button
                className="cancel-button"
                onClick={async () => {
                  const sessionId = sessionToDelete.id;
                  await onDelete(sessionId);
                  setSessionToDelete(null);
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

export default History;
