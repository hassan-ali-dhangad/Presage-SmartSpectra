import { useEffect, useRef, useState } from "react";
import {
  SmartSpectraSDK,
  breathingMetrics,
  cardioMetrics,
  ProcessingStatus,
} from "@smartspectra/node-sdk/renderer";
import { decodeMetrics } from "@smartspectra/node-sdk/messages";

function LiveRehearsal({ sessionSetup, onBack, onFinish }) {
  const sdkRef = useRef(null);
  const needsResetRef = useRef(false);
  const lifecycleInProgressRef = useRef(false);
  const lifecycleResolveRef = useRef(null);
  const lifecycleOperationPromiseRef = useRef(Promise.resolve());
  const cleanupEpochRef = useRef(0);
  const sdkDestroyedRef = useRef(false);
  const mountedRef = useRef(true);
  const videoRef = useRef(null);
  const fpsFrameRequestRef = useRef(null);
  const fpsAnimationRequestRef = useRef(null);
  const fpsModeRef = useRef(null);
  const fpsWindowStartRef = useRef(null);
  const fpsFrameCountRef = useRef(0);
  const fpsLastVideoTimeRef = useRef(null);
  const fpsLastRenderedAtRef = useRef(null);
  const fpsWatchdogRef = useRef(null);

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
  const [cameraFps, setCameraFps] = useState(null);

  const beginLifecycleOperation = () => {
    lifecycleInProgressRef.current = true;
    lifecycleOperationPromiseRef.current = new Promise((resolve) => {
      lifecycleResolveRef.current = resolve;
    });
  };

  const endLifecycleOperation = () => {
    lifecycleInProgressRef.current = false;

    const resolve = lifecycleResolveRef.current;
    lifecycleResolveRef.current = null;
    if (resolve) {
      resolve();
    }
  };

  const stopFpsMonitoring = (updateState = true) => {
    const video = videoRef.current;

    if (
      fpsModeRef.current === "video" &&
      video &&
      fpsFrameRequestRef.current !== null &&
      typeof video.cancelVideoFrameCallback === "function"
    ) {
      video.cancelVideoFrameCallback(fpsFrameRequestRef.current);
    }

    if (fpsAnimationRequestRef.current !== null) {
      cancelAnimationFrame(fpsAnimationRequestRef.current);
    }

    if (fpsWatchdogRef.current !== null) {
      clearInterval(fpsWatchdogRef.current);
    }

    fpsFrameRequestRef.current = null;
    fpsAnimationRequestRef.current = null;
    fpsWatchdogRef.current = null;
    fpsModeRef.current = null;
    fpsWindowStartRef.current = null;
    fpsFrameCountRef.current = 0;
    fpsLastVideoTimeRef.current = null;
    fpsLastRenderedAtRef.current = null;
    if (updateState && mountedRef.current) {
      setCameraFps(null);
    }
  };

  const recordFpsSample = (timestamp, renderedFrame) => {
    if (!mountedRef.current) return;

    if (fpsWindowStartRef.current === null) {
      fpsWindowStartRef.current = timestamp;
    }

    if (renderedFrame) {
      fpsFrameCountRef.current += 1;
      fpsLastRenderedAtRef.current = performance.now();
    }

    const windowDuration = timestamp - fpsWindowStartRef.current;

    if (windowDuration >= 1000) {
      setCameraFps(
        Math.round((fpsFrameCountRef.current * 1000) / windowDuration),
      );
      fpsWindowStartRef.current = timestamp;
      fpsFrameCountRef.current = 0;
    }
  };

  useEffect(() => {
    const video = videoRef.current;

    if (!isRunning || !video) {
      stopFpsMonitoring();
      return;
    }

    const hasVideoFrameCallback =
      typeof video.requestVideoFrameCallback === "function";

    if (hasVideoFrameCallback) {
      fpsModeRef.current = "video";

      const handleVideoFrame = (timestamp) => {
        recordFpsSample(timestamp, true);
        fpsFrameRequestRef.current = video.requestVideoFrameCallback(
          handleVideoFrame,
        );
      };

      fpsFrameRequestRef.current =
        video.requestVideoFrameCallback(handleVideoFrame);
    } else {
      fpsModeRef.current = "animation";

      const handleAnimationFrame = (timestamp) => {
        const isVideoReady = video.readyState >= 2;
        const currentVideoTime = video.currentTime;
        const renderedFrame =
          isVideoReady &&
          fpsLastVideoTimeRef.current !== null &&
          currentVideoTime !== fpsLastVideoTimeRef.current;

        if (isVideoReady) {
          fpsLastVideoTimeRef.current = currentVideoTime;
        }

        recordFpsSample(timestamp, renderedFrame);
        fpsAnimationRequestRef.current =
          requestAnimationFrame(handleAnimationFrame);
      };

      fpsAnimationRequestRef.current = requestAnimationFrame(handleAnimationFrame);
    }

    fpsWatchdogRef.current = setInterval(() => {
      if (!mountedRef.current) return;

      const lastRenderedAt = fpsLastRenderedAtRef.current;

      if (
        lastRenderedAt !== null &&
        performance.now() - lastRenderedAt > 1500
      ) {
        fpsWindowStartRef.current = null;
        fpsFrameCountRef.current = 0;
        fpsLastRenderedAtRef.current = null;
        setCameraFps(0);
      }
    }, 500);

    return stopFpsMonitoring;
  }, [isRunning]);

  // Session timer
  useEffect(() => {
    if (!isRunning || !mountedRef.current) return;

    const interval = setInterval(() => {
      if (mountedRef.current) {
        setElapsed((previous) => previous + 1);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning]);

  // SDK cleanup when component unmounts
  useEffect(() => {
    mountedRef.current = true;
    cleanupEpochRef.current += 1;

    return () => {
      mountedRef.current = false;
      stopFpsMonitoring(false);

      const cleanupEpoch = ++cleanupEpochRef.current;
      const lifecycleOperation =
        lifecycleInProgressRef.current
          ? lifecycleOperationPromiseRef.current
          : Promise.resolve();

      void (async () => {
        await lifecycleOperation;

        if (
          !mountedRef.current &&
          cleanupEpochRef.current === cleanupEpoch &&
          !sdkDestroyedRef.current
        ) {
          sdkDestroyedRef.current = true;

          const sdk = sdkRef.current;
          sdkRef.current = null;
          needsResetRef.current = false;

          if (sdk) {
            try {
              sdk.destroy();
            } catch (error) {
              console.error("SmartSpectra unmount cleanup error:", error);
            }
          }
        }
      })();
    };
  }, []);

  // Start or resume rehearsal
  const startSession = async () => {
    if (
      isStarting ||
      isRunning ||
      isPausing ||
      isFinishing ||
      isFinished ||
      lifecycleInProgressRef.current
    ) {
      return;
    }

    beginLifecycleOperation();
    if (mountedRef.current) {
      setIsStarting(true);
      setErrorMessage("");
      setValidationMessage("");
    }

    try {
      let sdk = sdkRef.current;

      if (!sdk) {
        sdk = new SmartSpectraSDK({
          requestedMetrics: [...breathingMetrics, ...cardioMetrics],
          enableTelemetry: false,
        });

        sdkRef.current = sdk;

        sdk.on("streamAvailable", (stream) => {
          if (!mountedRef.current) return;

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }

          setCameraStatus("Camera connected");
        });

        sdk.on("processingStatus", (status) => {
          if (!mountedRef.current) return;

          setProcessingStatus(String(status));

          if (status === ProcessingStatus.kError) {
            stopFpsMonitoring();
            setIsRunning(false);
            needsResetRef.current = true;
            setErrorMessage((current) =>
              current || "SmartSpectra processing failed. Reset is required.",
            );
          }
        });

        sdk.on("validationStatus", (code, timestampUs, hint) => {
          if (!mountedRef.current) return;

          setValidationMessage(hint || `Validation code: ${code}`);
        });

        sdk.on("metrics", (buffer) => {
          if (!mountedRef.current) return;

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
          if (!mountedRef.current) return;

          stopFpsMonitoring();
          setIsRunning(false);
          needsResetRef.current = true;

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

      if (needsResetRef.current) {
        try {
          await sdk.reset();
          needsResetRef.current = false;
        } catch (error) {
          console.error("SmartSpectra reset error:", error);

          try {
            sdk.destroy();
          } catch (destroyError) {
            console.error("SmartSpectra reset cleanup error:", destroyError);
          }

          if (sdkRef.current === sdk) {
            sdkRef.current = null;
          }
          needsResetRef.current = false;

          if (mountedRef.current) {
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }

            setCameraStatus("Camera unavailable");
            setErrorMessage(
              "Unable to reset SmartSpectra. The session was closed; please try starting a new session.",
            );
            setIsRunning(false);
          }
          return;
        }
      }

      await sdk.start();

      if (mountedRef.current) {
        setCameraStatus("Camera active");
        setIsRunning(true);
      }
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

      if (mountedRef.current) {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        setCameraStatus("Camera unavailable");
        setErrorMessage(
          error?.message || "Unable to start the SmartSpectra session.",
        );

        setIsRunning(false);
      }
    } finally {
      endLifecycleOperation();
      if (mountedRef.current) {
        setIsStarting(false);
      }
    }
  };

  // Pause rehearsal
  const pauseSession = async () => {
    if (
      isPausing ||
      isFinishing ||
      !isRunning ||
      lifecycleInProgressRef.current
    ) {
      return;
    }

    beginLifecycleOperation();
    if (mountedRef.current) {
      setIsPausing(true);
    }
    stopFpsMonitoring();
    if (mountedRef.current) {
      setIsRunning(false);
    }

    const sdk = sdkRef.current;

    try {
      if (sdk && !needsResetRef.current) {
        await sdk.stop();
      }

      if (mountedRef.current) {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        setCameraStatus("Camera paused");
      }
    } catch (error) {
      console.error("SmartSpectra pause error:", error);

      try {
        sdk?.destroy();
      } catch (destroyError) {
        console.error("SmartSpectra destroy error:", destroyError);
      }

      sdkRef.current = null;
      needsResetRef.current = false;

      if (mountedRef.current) {
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }

        setCameraStatus("Camera unavailable");
        setErrorMessage(error?.message || "Unable to pause the session.");
      }
    } finally {
      endLifecycleOperation();
      if (mountedRef.current) {
        setIsPausing(false);
      }
    }
  };

  // Finish rehearsal and release camera resources
  const handleFinish = async () => {
    if (
      isFinishing ||
      isStarting ||
      isPausing ||
      isFinished ||
      lifecycleInProgressRef.current
    ) {
      return;
    }

    beginLifecycleOperation();
    if (mountedRef.current) {
      setIsFinishing(true);
    }
    stopFpsMonitoring();
    if (mountedRef.current) {
      setIsRunning(false);
    }

    const sdk = sdkRef.current;

    try {
      if (sdk && !needsResetRef.current) {
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

      needsResetRef.current = false;

      if (mountedRef.current && videoRef.current) {
        videoRef.current.srcObject = null;
      }

      endLifecycleOperation();
    }

    if (mountedRef.current) {
      setCameraStatus("Camera inactive");
      setIsFinished(true);
      setIsFinishing(false);
    }

    if (onFinish) {
      onFinish({
        id: crypto.randomUUID(),
        practiceType: sessionSetup.practiceType,
        duration: sessionSetup.duration,
        actualDurationSeconds: elapsed,
        breathingRate,
        pulseRate,
        notes: sessionSetup.notes || "",
        completedAt: new Date().toISOString(),
      });
    }
  };

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, "0");

  const seconds = String(elapsed % 60).padStart(2, "0");
  const formatMetric = (value) =>
    value == null ? null : Number(value).toFixed(1);
  const breathingDisplay = formatMetric(breathingRate);
  const pulseDisplay = formatMetric(pulseRate);
  const fpsStatus =
    cameraFps == null ? "Waiting" : cameraFps >= 25 ? "Good" : "Low FPS";

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

      <section className="live-content">
        <p className="setup-eyebrow">LIVE REHEARSAL</p>

        <div className="live-heading">
          <div>
            <h1>Your practice space</h1>
            <p className="setup-description">
              Practice at your own pace. Monitor your session as you rehearse.
            </p>
          </div>
          <div className="live-session-meta">
            <span>{sessionSetup.practiceType}</span>
            <span>{sessionSetup.duration} min target</span>
          </div>
        </div>

        <div className="live-grid">
          <div className="live-preview-card">
            <div className="live-preview-header">
              <div>
                <p>Camera preview</p>
                <span
                  className={`live-status ${
                    isRunning ? "live-status-active" : ""
                  }`}
                >
                  <i />
                  {cameraStatus}
                </span>
              </div>
              {cameraFps != null && (
                <span className="live-fps">{cameraFps} FPS</span>
              )}
            </div>

            <div
              className={`live-preview ${
                isRunning ? "live-preview-active" : ""
              }`}
            >
              <video ref={videoRef} autoPlay muted playsInline />
              {!isRunning && (
                <div className="camera-placeholder">
                  <div className="camera-placeholder-icon">◉</div>
                  <strong>
                    {cameraStatus === "Camera paused"
                      ? "Camera paused"
                      : "Camera inactive"}
                  </strong>
                  <span>
                    {elapsed === 0
                      ? "Start the session when you are ready"
                      : "Resume to restore your camera preview"}
                  </span>
                </div>
              )}
            </div>

            {cameraFps != null && (
              <div
                className={`fps-bar ${
                  cameraFps < 25 ? "fps-bar-low" : "fps-bar-good"
                }`}
              >
                <span>
                  {fpsStatus === "Low FPS"
                    ? "Low camera FPS — position and lighting may affect measurements"
                    : "Camera feed quality is good"}
                </span>
                <strong>{fpsStatus}</strong>
              </div>
            )}
          </div>

          <aside className="live-metrics">
            <div className="timer-card">
              <p className="setup-eyebrow">SESSION TIMER</p>
              <div className="timer-display">{minutes}:{seconds}</div>
              <p>Target: {sessionSetup.duration} minutes</p>
            </div>

            <div className="metric-card metric-card-breathing">
              <div className="metric-label">
                <span className="metric-icon">↗</span>
                <h3>Breathing rate</h3>
              </div>
              <div className="metric-value">
                {breathingDisplay ?? "—"}
                {breathingDisplay != null && <small> bpm</small>}
              </div>
              <p>
                {breathingDisplay == null
                  ? "Waiting for measurement"
                  : "SmartSpectra measurement"}
              </p>
            </div>

            <div className="metric-card metric-card-pulse">
              <div className="metric-label">
                <span className="metric-icon">♥</span>
                <h3>Pulse rate</h3>
              </div>
              <div className="metric-value">
                {pulseDisplay ?? "—"}
                {pulseDisplay != null && <small> bpm</small>}
              </div>
              <p>
                {pulseDisplay == null
                  ? "Waiting for measurement"
                  : "SmartSpectra measurement"}
              </p>
            </div>

            <div className="processing-card">
              <span>Processing status</span>
              <strong>{processingStatus}</strong>
            </div>
          </aside>
        </div>

        {(validationMessage || errorMessage) && (
          <div className="live-alert" role="status">
            {errorMessage || validationMessage}
          </div>
        )}

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

        <p className="live-disclaimer">
          SmartSpectra measurements are for practice feedback and are not a
          medical diagnosis.
        </p>
      </section>
    </main>
  );
}

export default LiveRehearsal;
