
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

        <div className="consent-card">
          <div>
            <h3>Total completed sessions</h3>

           <p>
  {sessions.length}{" "}
  {sessions.length === 1 ? "session" : "sessions"} saved on this device
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
              <article className="consent-card" key={session.id}>
                <div>
                  <h3>{session.practiceType}</h3>
                  <p>
                    Target: {session.duration} minutes
                  </p>
                  <p>
                    Actual time:{" "}
                    {Math.floor(session.actualDurationSeconds / 60)} min{" "}
                    {session.actualDurationSeconds % 60} sec
                  </p>
                  <p>
                    {new Date(session.completedAt).toLocaleString()}
                  </p>
                  {session.notes && (
                    <p>Notes: {session.notes}</p>
                  )}

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
                    Delete session
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {sessionToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-session-title"
          style={{
            position: "fixed",
            inset: 0,
            display: "grid",
            placeItems: "center",
            padding: "24px",
            background: "rgba(15, 23, 42, 0.45)",
            zIndex: 10,
          }}
        >
          <div
            className="consent-card"
            style={{ width: "min(100%, 440px)", margin: 0 }}
          >
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
