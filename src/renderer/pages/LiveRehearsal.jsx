import { useEffect, useRef, useState } from "react";
import { SmartSpectraSDK } from "@smartspectra/node-sdk/renderer";
import { decodeMetrics } from "@smartspectra/node-sdk/messages";

function LiveRehearsal({ sessionSetup, onBack, onFinish }) {
  const sdkRef = useRef(null);
  const videoRef = useRef(null);

  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);

  const [elapsed, setElapsed] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  const [cameraStatus, setCameraStatus] = useState("Camera inactive");
  const [processingStatus, setProcessingStatus] = useState("Not started");
  const [validationMessage, setValidationMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [breathingRate, setBreathingRate] = useState(null);
  const [pulseRate, setPulseRate] = useState(null);

  // Session timer
  useEffect(() => {
    if (!isRunning) return;

    const interval = setInterval(() => {
      setElapsed((previous) => previous + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // SDK cleanup when component unmounts
  useEffect(() => {
    return () => {
      if (sdkRef.current) {
        try {
          sdkRef.current.destroy();
        } catch (error) {
          console.error("SmartSpectra unmount cleanup error:", error);
        }

        sdkRef.current = null;
      }
    };
  }, []);

  // Start or resume rehearsal
  const startSession = async () => {
    if (isStarting || isRunning || isPausing || isFinishing || isFinished) {
      return;
    }

    setIsStarting(true);
    setErrorMessage("");
    setValidationMessage("");

    try {
      let sdk = sdkRef.current;

      if (!sdk) {
        sdk = new SmartSpectraSDK({
          requestedMetrics: [0, 1, 2],
          enableTelemetry: false,
        });

        sdkRef.current = sdk;

        sdk.on("streamAvailable", (stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          setCameraStatus("Camera connected");
        });

        sdk.on("processingStatus", (status) => {
          setProcessingStatus(String(status));
        });

        sdk.on("validationStatus", (code, timestampUs, hint) => {
          setValidationMessage(hint || `Validation code: ${code}`);
        });

        sdk.on("metrics", (buffer) => {
          try {
            const metrics = decodeMetrics(buffer);

            const latestBreathing = metrics.breathing?.rate?.at(-1);
            const latestPulse = metrics.cardio?.pulseRate?.at(-1);

            if (latestBreathing?.value != null) {
              setBreathingRate(latestBreathing.value);
            }

            if (latestPulse?.value != null) {
              setPulseRate(latestPulse.value);
            }
          } catch (error) {
            console.error("Unable to decode SmartSpectra metrics:", error);
          }
        });

        sdk.on("error", (code, message, retryable) => {
          console.error("SmartSpectra detailed error:", {
            code,
            message,
            retryable,
          });

          setErrorMessage(
            `${message || "SmartSpectra error"} (Code: ${code}, Retryable: ${retryable})`,
          );
        });
      }

      setCameraStatus("Connecting camera...");

      await sdk.start();

      setCameraStatus("Camera active");
      setIsRunning(true);
    } catch (error) {
      console.error("SmartSpectra start error:", error);

      const failedSdk = sdkRef.current;

      if (failedSdk) {
        try {
          failedSdk.destroy();
        } catch (destroyError) {
          console.error("SmartSpectra cleanup error:", destroyError);
        }

        sdkRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setCameraStatus("Camera unavailable");
      setErrorMessage(
        error?.message || "Unable to start the SmartSpectra session.",
      );

      setIsRunning(false);
    } finally {
      setIsStarting(false);
    }
  };

  // Pause rehearsal
  const pauseSession = async () => {
    if (isPausing || isFinishing || !isRunning) return;

    setIsPausing(true);
    setIsRunning(false);

    const sdk = sdkRef.current;

    try {
      if (sdk) {
        await sdk.stop();
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setCameraStatus("Camera paused");
    } catch (error) {
      console.error("SmartSpectra pause error:", error);

      try {
        sdk?.destroy();
      } catch (destroyError) {
        console.error("SmartSpectra destroy error:", destroyError);
      }

      sdkRef.current = null;

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setCameraStatus("Camera unavailable");
      setErrorMessage(error?.message || "Unable to pause the session.");
    } finally {
      setIsPausing(false);
    }
  };

  // Finish rehearsal and release camera resources
  const handleFinish = async () => {
    if (isFinishing || isStarting || isPausing || isFinished) {
      return;
    }

    setIsFinishing(true);
    setIsRunning(false);

    const sdk = sdkRef.current;

    try {
      if (sdk) {
        await sdk.stop();
      }
    } catch (error) {
      console.error("SmartSpectra stop error:", error);
    } finally {
      if (sdk) {
        try {
          sdk.destroy();
        } catch (error) {
          console.error("SmartSpectra destroy error:", error);
        }

        sdkRef.current = null;
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }

    setCameraStatus("Camera inactive");
    setIsFinished(true);
    setIsFinishing(false);

    if (onFinish) {
      onFinish({
        id: crypto.randomUUID(),
        practiceType: sessionSetup.practiceType,
        duration: sessionSetup.duration,
        actualDurationSeconds: elapsed,
        notes: sessionSetup.notes || "",
        completedAt: new Date().toISOString(),
      });
    }
  };

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");

  const seconds = String(elapsed % 60).padStart(2, "0");

  return (
    <main className="setup-page">
      <header className="setup-header">
        <button
          className="back-button"
          onClick={onBack}
          disabled={isStarting || isPausing || isFinishing}
        >
          ← Back
        </button>

        <span className="setup-brand">StageReady</span>
      </header>

      <section className="consent-content">
        <p className="setup-eyebrow">LIVE REHEARSAL</p>

        <h1>Your practice space</h1>

        <p className="setup-description">
          Practice at your own pace. Monitor your session as you rehearse.
        </p>

        <div className="consent-card">
          <div>
            <h3>Practice type</h3>
            <p>{sessionSetup.practiceType}</p>
          </div>

          <div>
            <h3>Target duration</h3>
            <p>{sessionSetup.duration} minutes</p>
          </div>
        </div>

        <div className="live-preview">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            style={{
              width: "100%",
              maxHeight: "360px",
              objectFit: "cover",
              borderRadius: "12px",
              background: "#0f172a",
            }}
          />

          <h2>Camera preview</h2>

          <p>{cameraStatus}</p>

          <span className="camera-status">{cameraStatus}</span>
        </div>

        <div className="timer-card">
          <p className="setup-eyebrow">SESSION TIMER</p>

          <div className="timer-display">
            {minutes}:{seconds}
          </div>

          <p>Target: {sessionSetup.duration} minutes</p>
        </div>

        <div className="consent-card">
          <div>
            <h3>Breathing rate</h3>
            <p>
              {breathingRate == null
                ? "Waiting for measurement"
                : breathingRate}
            </p>
          </div>

          <div>
            <h3>Pulse rate</h3>
            <p>{pulseRate == null ? "Waiting for measurement" : pulseRate}</p>
          </div>
        </div>

        {validationMessage && (
          <p className="consent-disclaimer">{validationMessage}</p>
        )}

        {errorMessage && <p className="consent-disclaimer">{errorMessage}</p>}

        <div className="setup-actions">
          {!isRunning && !isFinished && (
            <button
              className="continue-button"
              onClick={startSession}
              disabled={isStarting || isPausing || isFinishing}
            >
              {isStarting
                ? "Connecting camera..."
                : elapsed === 0
                  ? "Start session"
                  : "Resume session"}
            </button>
          )}

          {isRunning && (
            <button
              className="cancel-button"
              onClick={pauseSession}
              disabled={isPausing || isFinishing}
            >
              {isPausing ? "Pausing..." : "Pause session"}
            </button>
          )}

          {!isFinished && (
            <button
              className="continue-button"
              onClick={handleFinish}
              disabled={elapsed === 0 || isStarting || isPausing || isFinishing}
            >
              {isFinishing ? "Finishing..." : "Finish session"}
            </button>
          )}

          {isFinished && (
            <button className="continue-button" onClick={onBack}>
              Return
            </button>
          )}
        </div>

        <p className="consent-disclaimer">
          Processing status: {processingStatus}
        </p>

        <p className="consent-disclaimer">
          SmartSpectra measurements are for practice feedback and are not a
          medical diagnosis.
        </p>
      </section>
    </main>
  );
}

export default LiveRehearsal;
