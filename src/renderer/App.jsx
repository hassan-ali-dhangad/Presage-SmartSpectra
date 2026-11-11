import { useEffect, useState } from "react";
import PracticeSetup from "./pages/PracticeSetup";
import Consent from "./pages/Consent";
import LiveRehearsal from "./pages/LiveRehearsal";
import History from "./pages/History";
import SessionReport from "./pages/SessionReport";
import Settings from "./pages/Settings";

function App() {
  const [page, setPage] = useState("dashboard");
  const [sessionSetup, setSessionSetup] = useState(null);
  const [appInfo, setAppInfo] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const totalSessions = sessions.length;

  const totalPracticeSeconds = sessions.reduce(
    (total, session) => total + (session.actualDurationSeconds || 0),
    0,
  );

  const totalPracticeMinutes = Math.floor(totalPracticeSeconds / 60);

  const lastPractice = sessions.length
    ? new Date(
        sessions.reduce((latest, session) =>
          new Date(session.completedAt) > new Date(latest.completedAt)
            ? session
            : latest,
        ).completedAt,
      ).toLocaleDateString()
    : "Not yet";

  // Load application information
  useEffect(() => {
    if (!window.stageReady?.getAppInfo) {
      setAppInfo({
        name: "StageReady",
        version: "1.0.0",
      });
      return;
    }

    window.stageReady
      .getAppInfo()
      .then((info) => setAppInfo(info))
      .catch((error) => {
        console.error("Failed to load app information:", error);
      });
  }, []);

  // Load saved practice sessions
  useEffect(() => {
    if (!window.stageReady?.getSessions) {
      setSessions([]);
      setSessionsLoading(false);
      return;
    }

    window.stageReady
      .getSessions()
      .then((savedSessions) => {
        setSessions(savedSessions);
      })
      .catch((error) => {
        console.error("Failed to load sessions:", error);
      })
      .finally(() => {
        setSessionsLoading(false);
      });
  }, []);

  // Navigate and close the mobile menu
  const navigateTo = (destination) => {
    setPage(destination);
    setMobileMenuOpen(false);
  };

  // Close mobile menu with Escape key
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  if (page === "report") {
    return (
      <SessionReport
        session={selectedSession}
        onBack={() => navigateTo("history")}
      />
    );
  }

  if (page === "settings") {
    return (
      <Settings
        appInfo={appInfo}
        sessions={sessions}
        onBack={() => navigateTo("dashboard")}
      />
    );
  }

  if (page === "practice") {
    return (
      <PracticeSetup
        onBack={() => navigateTo("dashboard")}
        onContinue={(data) => {
          setSessionSetup(data);
          navigateTo("consent");
        }}
      />
    );
  }

  if (page === "history") {
    return (
      <History
        sessions={sessions}
        onBack={() => navigateTo("dashboard")}
        onViewReport={(session) => {
          setSelectedSession(session);
          navigateTo("report");
        }}
        onDelete={async (sessionId) => {
          try {
            if (window.stageReady?.deleteSession) {
              const updatedSessions =
                await window.stageReady.deleteSession(sessionId);

              setSessions(updatedSessions);
            } else {
              setSessions((previousSessions) =>
                previousSessions.filter((session) => session.id !== sessionId),
              );
            }
          } catch (error) {
            console.error("Failed to delete session:", error);
            alert("Unable to delete session. Please try again.");
          }
        }}
      />
    );
  }

  if (page === "consent") {
    return (
      <Consent
        onBack={() => navigateTo("practice")}
        onContinue={() => navigateTo("ready")}
      />
    );
  }

  if (page === "live") {
    return (
      <LiveRehearsal
        sessionSetup={sessionSetup}
        onBack={() => navigateTo("ready")}
        onFinish={async (session) => {
          try {
            let savedSession = session;

            if (window.stageReady?.saveSession) {
              savedSession = await window.stageReady.saveSession(session);
            }

            setSessions((previousSessions) => [
              ...previousSessions,
              savedSession,
            ]);

            navigateTo("dashboard");
          } catch (error) {
            console.error("Failed to save practice session:", error);
            alert("Unable to save your session. Please try again.");
          }
        }}
      />
    );
  }

  if (page === "ready") {
    return (
      <main className="setup-page">
        <section className="setup-content">
          <p className="setup-eyebrow">SESSION PREPARATION</p>
          <h1>You're ready to practice!</h1>

          <p className="setup-description">
            Your practice details and privacy confirmation are ready.
          </p>

          <div className="consent-card">
            <div>
              <h3>Practice type</h3>
              <p>{sessionSetup.practiceType}</p>
            </div>
          </div>

          <div className="consent-card">
            <div>
              <h3>Duration</h3>
              <p>{sessionSetup.duration} minutes</p>
            </div>
          </div>

          <div className="consent-card">
            <div>
              <h3>Session notes</h3>
              <p>{sessionSetup.notes || "No notes provided"}</p>
            </div>
          </div>

          <p className="consent-disclaimer">
            Your camera will remain off until you enter the rehearsal space and
            explicitly select Start session. You can return without activating
            your camera.
          </p>

          <div className="setup-actions">
            <button
              className="cancel-button"
              onClick={() => navigateTo("dashboard")}
            >
              Return to dashboard
            </button>

            <button
              className="continue-button"
              onClick={() => navigateTo("live")}
            >
              Open rehearsal space →
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="dashboard-layout">
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">S</div>
          <span>StageReady</span>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav className="navigation">
          <button
            className={`nav-item ${page === "dashboard" ? "active" : ""}`}
            onClick={() => navigateTo("dashboard")}
          >
            <span>▦</span> Dashboard
          </button>

          <button
            className={`nav-item ${page === "practice" ? "active" : ""}`}
            onClick={() => navigateTo("practice")}
          >
            <span>◉</span> Practice
          </button>

          <button
            className={`nav-item ${page === "history" ? "active" : ""}`}
            onClick={() => navigateTo("history")}
          >
            <span>▤</span> Session History
          </button>

          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigateTo("settings")}
          >
            <span>⚙</span> Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-status">
            <span className="status-dot"></span>
            <div>
              <strong>Private workspace</strong>
              <small>Your data stays on this device</small>
            </div>
          </div>

          <p>StageReady v1.0.0</p>
        </div>
      </aside>

      {/* Mobile menu backdrop */}
      {mobileMenuOpen && (
        <button
          className="mobile-menu-backdrop"
          aria-label="Close navigation menu"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile navigation drawer */}
      <aside
        className={`mobile-navigation ${
          mobileMenuOpen ? "mobile-navigation-open" : ""
        }`}
      >
        <div className="mobile-navigation-header">
          <div className="brand">
            <div className="brand-icon">S</div>
            <span>StageReady</span>
          </div>

          <button
            className="mobile-menu-close"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <p className="nav-label">WORKSPACE</p>

        <nav className="navigation">
          <button
            className={`nav-item ${page === "dashboard" ? "active" : ""}`}
            onClick={() => navigateTo("dashboard")}
          >
            <span>▦</span> Dashboard
          </button>

          <button className="nav-item" onClick={() => navigateTo("practice")}>
            <span>◉</span> Practice
          </button>

          <button className="nav-item" onClick={() => navigateTo("history")}>
            <span>▤</span> Session History
          </button>

          <button className="nav-item" onClick={() => navigateTo("settings")}>
            <span>⚙</span> Settings
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="privacy-status">
            <span className="status-dot"></span>
            <div>
              <strong>Private workspace</strong>
              <small>Your data stays on this device</small>
            </div>
          </div>
          <p>StageReady v1.0.0</p>
        </div>
      </aside>

      <section className="main-content">
        <header className="dashboard-header">
          <div className="dashboard-heading">
            <p className="breadcrumb">WORKSPACE / DASHBOARD</p>
            <h1>Good to see you.</h1>
            <p className="header-subtitle">
              Your personal space to prepare, practice and improve.
            </p>
          </div>

          <div className="profile-avatar">H</div>

          {/* Mobile hamburger button */}
          <button
            className="mobile-menu-button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label="Open navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            ☰
          </button>
        </header>

        <section className="welcome-banner">
          <div>
            <span className="banner-label">YOUR NEXT BIG MOMENT</span>
            <h2>
              Prepare with purpose.
              <br />
              Present with confidence.
            </h2>
            <p>
              Build your delivery skills through private, structured practice
              sessions.
            </p>

            <button
              className="primary-button"
              onClick={() => navigateTo("practice")}
            >
              Start a practice session
              <span>→</span>
            </button>
          </div>

          <div className="banner-decoration">
            <div className="decoration-circle">
              <span>✦</span>
            </div>
          </div>
        </section>

        <section className="stats-section">
          <div className="section-heading">
            <div>
              <h2>Your progress</h2>
              <p>Your saved practice activity will appear here.</p>
            </div>
          </div>

          <div className="stats-grid">
            <article className="stat-card">
              <span className="stat-icon blue">▣</span>
              <p>Practice sessions</p>
              <h3>{sessionsLoading ? "..." : totalSessions}</h3>
              <small>
                {totalSessions === 1
                  ? "1 completed session"
                  : `${totalSessions} completed sessions`}
              </small>
            </article>

            <article className="stat-card">
              <span className="stat-icon purple">◷</span>
              <p>Total practice time</p>
              <h3>
                {sessionsLoading
                  ? "..."
                  : totalPracticeMinutes > 0
                    ? `${totalPracticeMinutes} min`
                    : `${totalPracticeSeconds} sec`}
              </h3>
              <small>Total time spent practicing</small>
            </article>

            <article className="stat-card">
              <span className="stat-icon green">↗</span>
              <p>Last practice</p>
              <h3 className="stat-empty">
                {sessionsLoading ? "..." : lastPractice}
              </h3>
              <small>
                {sessions.length > 0
                  ? "Your most recent completed session"
                  : "Your first session is waiting"}
              </small>
            </article>
          </div>
        </section>

        <section className="practice-section">
          <div className="section-heading">
            <div>
              <h2>Choose your practice</h2>
              <p>What would you like to prepare for?</p>
            </div>
          </div>

          <div className="practice-grid">
            <article className="practice-card">
              <div className="practice-icon interview-icon">◉</div>
              <span className="card-tag">CAREER DEVELOPMENT</span>
              <h3>Interview practice</h3>
              <p>
                Prepare for job interviews and practise communicating your ideas
                clearly.
              </p>
              <button disabled className="text-button">
                Coming soon →
              </button>
            </article>

            <article className="practice-card">
              <div className="practice-icon presentation-icon">▤</div>
              <span className="card-tag">PUBLIC SPEAKING</span>
              <h3>Presentation practice</h3>
              <p>
                Rehearse university presentations, speeches and important talks.
              </p>
              <button disabled className="text-button">
                Coming soon →
              </button>
            </article>
          </div>
        </section>

        <section className="recent-section">
          <div className="section-heading">
            <div>
              <h2>Recent sessions</h2>
              <p>Review your previous practice activity.</p>
            </div>
          </div>

          {sessionsLoading ? (
            <div className="empty-state">
              <h3>Loading sessions...</h3>
            </div>
          ) : sessions.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">▤</div>
              <h3>No sessions yet</h3>
              <p>
                Your completed practice sessions and reports will appear here.
              </p>
            </div>
          ) : (
            <div className="sessions-list">
              {[...sessions]
                .sort(
                  (a, b) => new Date(b.completedAt) - new Date(a.completedAt),
                )
                .slice(0, 5)
                .map((session) => (
                  <article className="consent-card" key={session.id}>
                    <div>
                      <h3>{session.practiceType}</h3>
                      <p>
                        {Math.floor(session.actualDurationSeconds / 60)} min{" "}
                        {session.actualDurationSeconds % 60} sec ·{" "}
                        {new Date(session.completedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </article>
                ))}
            </div>
          )}
        </section>

        <footer className="dashboard-footer">
          <span>
            {appInfo ? `${appInfo.name} · v${appInfo.version}` : "StageReady"}
          </span>
          <span>Practice with confidence. Improve with understanding.</span>
        </footer>
      </section>
    </main>
  );
}

export default App;
