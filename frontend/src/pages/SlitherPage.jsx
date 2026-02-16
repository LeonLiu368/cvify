import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createInitialState, tick, getSnakeLength } from '../slither/slitherLogic.js'
import { computeTargetAngles } from '../slither/botAI.js'
import { SlitherView } from '../slither/SlitherView.jsx'
import { useHeadTracking } from '../useHeadTracking.js'
import { ResizableCameraPanel } from '../components/ResizableCameraPanel.jsx'

const FIXED_DT = 1 / 60
const PLAYER_TURN_RATE = 3
const BOOST_BASE_DURATION_MS = 2000
const BOOST_DURATION_PER_SCORE_MS = 50
const BOOST_SPEED_MULTIPLIER = 1.5
const BOOST_COOLDOWN_MS = 5000
const CALIBRATION_DELAY_SEC = 2

function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

export function SlitherPage() {
  const [state, setState] = useState(() => createInitialState())
  const stateRef = useRef(state)
  stateRef.current = state
  const [running, setRunning] = useState(false)
  const [calibrationCountdown, setCalibrationCountdown] = useState(CALIBRATION_DELAY_SEC)
  const lastTime = useRef(performance.now() / 1000)
  const playerMouseWorld = useRef(null)
  const playerTurn = useRef(0)
  const playerCVAngleRef = useRef(null)
  const [faceEnabled, setFaceEnabled] = useState(true)
  const [sensitivity, setSensitivity] = useState(1)
  const [gameOver, setGameOver] = useState(false)
  const [playerDeadSnake, setPlayerDeadSnake] = useState(null)
  const [deathAnimationProgress, setDeathAnimationProgress] = useState(null)
  const deathStartTimeRef = useRef(null)
  const [showWinOverlay, setShowWinOverlay] = useState(false)
  const [speedBoostEndTime, setSpeedBoostEndTime] = useState(null)
  const [speedBoostStartTime, setSpeedBoostStartTime] = useState(null)
  const [speedBoostCooldownEndTime, setSpeedBoostCooldownEndTime] = useState(null)
  const speedBoostEndTimeRef = useRef(null)
  const speedBoostStartTimeRef = useRef(null)
  const speedBoostCooldownEndTimeRef = useRef(null)
  speedBoostCooldownEndTimeRef.current = speedBoostCooldownEndTime
  const [cooldownRemainingSec, setCooldownRemainingSec] = useState(null)

  const handleAngleChange = useCallback((angle) => {
    playerCVAngleRef.current = angle
  }, [])

  const {
    videoRef,
    canvasRef,
    cameraStatus,
    noseOffset,
    fps,
    trackingStatus,
    isCalibrating,
    calibrationProgress,
    calibrationMessage,
    recalibrate: headRecalibrate,
    retry: headRetry,
  } = useHeadTracking({
    faceEnabled,
    onAngleChange: handleAngleChange,
    onMouthOpen: useCallback(() => {
      const now = Date.now()
      if (speedBoostCooldownEndTimeRef.current != null && now < speedBoostCooldownEndTimeRef.current) return
      if (speedBoostEndTimeRef.current != null && now < speedBoostEndTimeRef.current) return
      // No stacking: do not extend or replace an active boost
      const playerSnake = stateRef.current.snakes.find((s) => s.isPlayer)
      if (!playerSnake) return
      const scoreDuration = playerSnake.segments.length * BOOST_DURATION_PER_SCORE_MS
      const duration = BOOST_BASE_DURATION_MS + scoreDuration
      const start = now
      const end = now + duration
      speedBoostStartTimeRef.current = start
      speedBoostEndTimeRef.current = end
      setSpeedBoostStartTime(start)
      setSpeedBoostEndTime(end)
    }, []),
    sensitivity,
  })

  useEffect(() => {
    if (!faceEnabled) playerCVAngleRef.current = null
  }, [faceEnabled])

  useEffect(() => {
    headRecalibrate()
  }, [headRecalibrate])

  useEffect(() => {
    if (calibrationCountdown == null || calibrationCountdown <= 0) return
    const id = setInterval(() => {
      setCalibrationCountdown((prev) => {
        if (prev == null || prev <= 1) {
          setRunning(true)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(id)
  }, [calibrationCountdown])

  const handleMouseMove = useCallback((worldX, worldY) => {
    playerMouseWorld.current = { x: worldX, y: worldY }
  }, [])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') {
        if (e.type === 'keydown') playerTurn.current = -1
        else if (playerTurn.current === -1) playerTurn.current = 0
      } else if (e.key === 'ArrowRight') {
        if (e.type === 'keydown') playerTurn.current = 1
        else if (playerTurn.current === 1) playerTurn.current = 0
      }
    }
    window.addEventListener('keydown', handleKey)
    window.addEventListener('keyup', handleKey)
    return () => {
      window.removeEventListener('keydown', handleKey)
      window.removeEventListener('keyup', handleKey)
    }
  }, [])

  useEffect(() => {
    if (!running) return
    let raf = 0
    const loop = () => {
      const now = performance.now() / 1000
      let dt = now - lastTime.current
      lastTime.current = now
      if (dt > 0.2) dt = FIXED_DT
      const current = stateRef.current
      let targetAngles = computeTargetAngles(current)
      const playerSnake = current.snakes.find((s) => s.isPlayer)
      if (playerSnake) {
        const head = playerSnake.segments[0]
        let target
        if (faceEnabled && playerCVAngleRef.current != null) {
          target = normalizeAngle(playerCVAngleRef.current)
        } else if (playerMouseWorld.current) {
          target = Math.atan2(
            playerMouseWorld.current.y - head.y,
            playerMouseWorld.current.x - head.x,
          )
          target = normalizeAngle(target)
        } else if (playerTurn.current !== 0) {
          target = normalizeAngle(
            playerSnake.angle + playerTurn.current * PLAYER_TURN_RATE * dt,
          )
        } else {
          target = playerSnake.angle
        }
        targetAngles = { ...targetAngles, player: target }
      }
      const nowMs = Date.now()
      if (speedBoostEndTimeRef.current != null && nowMs >= speedBoostEndTimeRef.current) {
        speedBoostEndTimeRef.current = null
        speedBoostStartTimeRef.current = null
        speedBoostCooldownEndTimeRef.current = nowMs + BOOST_COOLDOWN_MS
        setSpeedBoostCooldownEndTime(nowMs + BOOST_COOLDOWN_MS)
        setSpeedBoostEndTime(null)
        setSpeedBoostStartTime(null)
      }
      const playerSpeedMultiplier =
        speedBoostEndTimeRef.current != null && nowMs < speedBoostEndTimeRef.current
          ? BOOST_SPEED_MULTIPLIER
          : 1
      const { state: nextState, deadIds } = tick(current, dt, targetAngles, {
        playerSpeedMultiplier,
      })
      const playerWasAlive = current.snakes.some((s) => s.isPlayer)
      const playerAliveNow = nextState.snakes.some((s) => s.isPlayer)
      const playerDied = playerWasAlive && deadIds.includes('player')
      if (playerDied) {
        const copy = current.snakes.find((s) => s.isPlayer)
        if (copy) {
          deathStartTimeRef.current = performance.now()
          setPlayerDeadSnake({
            ...copy,
            segments: copy.segments.map((p) => ({ ...p })),
          })
        }
        setRunning(false)
        stateRef.current = nextState
        setState(nextState)
        return
      }
      const onlyPlayerLeft =
        nextState.snakes.length === 1 && nextState.snakes[0].isPlayer
      if (onlyPlayerLeft) {
        setRunning(false)
        stateRef.current = nextState
        setState(nextState)
        setTimeout(() => setShowWinOverlay(true), 1000)
        return
      }
      stateRef.current = nextState
      setState(nextState)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, faceEnabled])

  useEffect(() => {
    if (!playerDeadSnake) return
    let raf = 0
    const start = deathStartTimeRef.current ?? performance.now()
    const animate = () => {
      const elapsed = performance.now() - start
      const progress = Math.min(1, elapsed / 1000)
      setDeathAnimationProgress(progress)
      if (progress >= 1) {
        setGameOver(true)
        setPlayerDeadSnake(null)
        setDeathAnimationProgress(null)
        return
      }
      raf = requestAnimationFrame(animate)
    }
    raf = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(raf)
  }, [playerDeadSnake])

  useEffect(() => {
    if (speedBoostCooldownEndTime == null) {
      setCooldownRemainingSec(null)
      return
    }
    const update = () => {
      const now = Date.now()
      if (now >= speedBoostCooldownEndTime) {
        setCooldownRemainingSec(null)
        setSpeedBoostCooldownEndTime(null)
        return
      }
      setCooldownRemainingSec(Math.ceil((speedBoostCooldownEndTime - now) / 1000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [speedBoostCooldownEndTime])

  const handleRestart = useCallback(() => {
    setGameOver(false)
    setShowWinOverlay(false)
    setPlayerDeadSnake(null)
    setDeathAnimationProgress(null)
    speedBoostEndTimeRef.current = null
    speedBoostStartTimeRef.current = null
    setSpeedBoostEndTime(null)
    setSpeedBoostStartTime(null)
    setSpeedBoostCooldownEndTime(null)
    setState(createInitialState())
    lastTime.current = performance.now() / 1000
    headRecalibrate()
    setRunning(false)
    setCalibrationCountdown(CALIBRATION_DELAY_SEC)
  }, [headRecalibrate])

  const leaderboard = [...state.snakes]
    .sort((a, b) => getSnakeLength(b) - getSnakeLength(a))
    .slice(0, 10)

  const nowMs = Date.now()
  const speedBoostActive =
    speedBoostEndTime != null &&
    speedBoostStartTime != null &&
    nowMs >= speedBoostStartTime &&
    nowMs < speedBoostEndTime
  const speedBoostProgress = speedBoostActive
    ? Math.min(
        1,
        Math.max(
          0,
          (nowMs - speedBoostStartTime) / (speedBoostEndTime - speedBoostStartTime),
        ),
      )
    : 0

  return (
    <div className="app slither-page">
      <nav className="game-nav" aria-label="Breadcrumb">
        <Link to="/" className="game-nav-back">
          Back to CVified
        </Link>
      </nav>
      <div className="slither-arena slither-arena-wrap">
        <SlitherView
          state={state}
          onMouseMove={handleMouseMove}
          playerDeadSnake={playerDeadSnake}
          deathAnimationProgress={deathAnimationProgress}
          speedBoostActive={speedBoostActive}
          speedBoostProgress={speedBoostProgress}
        />
        <header className="slither-header">
          <h1 className="slither-title">Slither</h1>
          <div className="slither-actions">
            <button type="button" className="primary" onClick={handleRestart}>
              Restart
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setRunning((r) => !r)}
              aria-pressed={!running}
            >
              {running ? 'Pause' : 'Resume'}
            </button>
            <button type="button" className="ghost" onClick={headRecalibrate}>
              Recalibrate
            </button>
            <label className="toggle">
              <input
                type="checkbox"
                checked={faceEnabled}
                onChange={(e) => {
                  const next = e.target.checked
                  setFaceEnabled(next)
                  if (next) headRecalibrate()
                }}
              />
              <span className="toggle-track" />
              <span className="toggle-knob" />
              <span className="toggle-label">Face</span>
            </label>
            <label className="sensitivity-label">
              <span className="sensitivity-text">Sensitivity</span>
              <input
                type="range"
                min="0.5"
                max="2"
                step="0.25"
                value={sensitivity}
                onChange={(e) => setSensitivity(parseFloat(e.target.value, 10))}
                aria-label="Head tracking sensitivity"
              />
            </label>
          </div>
        </header>
        <aside className="slither-leaderboard" aria-label="Leaderboard">
          <h2 className="slither-leaderboard-title">Length</h2>
          <p className="slither-speed-boost-cooldown" aria-live="polite">
            {cooldownRemainingSec != null
              ? `Speed boost: ${cooldownRemainingSec}s`
              : 'Speed boost: Ready'}
          </p>
          <ol className="slither-leaderboard-list">
            {leaderboard.map((snake, i) => (
              <li
                key={snake.id}
                className={`slither-leaderboard-item ${snake.isPlayer ? 'slither-leaderboard-you' : ''}`}
              >
                <span className="slither-leaderboard-rank">{i + 1}.</span>
                <span
                  className="slither-leaderboard-color"
                  style={{ backgroundColor: snake.color }}
                  aria-hidden
                />
                <span className="slither-leaderboard-length">
                  {snake.isPlayer ? `You (${getSnakeLength(snake)})` : getSnakeLength(snake)}
                </span>
              </li>
            ))}
          </ol>
        </aside>
        {calibrationCountdown != null && calibrationCountdown > 0 ? (
          <div
            className="slither-calibration-overlay"
            role="status"
            aria-live="polite"
            aria-label="Calibrating"
          >
            <div className="slither-calibration-content">
              <p className="slither-calibration-text">Calibrating…</p>
              <p className="slither-calibration-countdown">
                Game starts in {calibrationCountdown}s
              </p>
            </div>
          </div>
        ) : null}
        {gameOver ? (
          <div
            className="slither-game-over-overlay"
            role="dialog"
            aria-label="Game Over"
          >
            <div className="slither-game-over-content">
              <h2 className="slither-game-over-title">Game Over</h2>
              <p className="slither-game-over-sub">You were eliminated.</p>
              <div className="slither-game-over-actions">
                <button
                  type="button"
                  className="primary slither-game-over-cta"
                  onClick={handleRestart}
                >
                  Restart
                </button>
                <Link
                  to="/"
                  className="ghost slither-game-over-cta slither-game-over-home"
                >
                  Return to home
                </Link>
              </div>
            </div>
          </div>
        ) : null}
        {showWinOverlay ? (
          <div
            className="slither-game-over-overlay slither-win-overlay"
            role="dialog"
            aria-label="You win"
          >
            <div className="slither-game-over-content">
              <h2 className="slither-game-over-title slither-win-title">You win!</h2>
              <p className="slither-game-over-sub">All other snakes eliminated.</p>
              <div className="slither-game-over-actions">
                <button
                  type="button"
                  className="primary slither-game-over-cta"
                  onClick={handleRestart}
                >
                  Restart
                </button>
                <Link
                  to="/"
                  className="ghost slither-game-over-cta slither-game-over-home"
                >
                  Return to home
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
      <ResizableCameraPanel storageKey="cvified_camera_slither">
        <div className="camera-frame camera-frame-floating">
          <video ref={videoRef} muted playsInline />
          <canvas ref={canvasRef} />
          {trackingStatus === 'error' ? (
            <div className="camera-error-overlay">
              <p className="camera-error-text">Camera access failed</p>
              <button type="button" className="primary" onClick={headRetry}>
                Retry
              </button>
            </div>
          ) : null}
          {isCalibrating ? (
            <div
              className="camera-calibration-overlay"
              role="status"
              aria-live="polite"
              aria-label="Calibrating head tracking"
            >
              <p className="camera-calibration-text">{calibrationMessage}</p>
              <div className="camera-calibration-bar" aria-hidden="true">
                <div
                  className="camera-calibration-fill"
                  style={{ width: `${calibrationProgress * 100}%` }}
                />
              </div>
            </div>
          ) : null}
          <div className="camera-badges">
            <p className="fps-badge">{fps} fps</p>
          </div>
          <p className="camera-status">{cameraStatus}</p>
          <div className="nose-compass" aria-hidden="true">
            <span
              className="nose-dot"
              style={{
                transform: `translate(${noseOffset.x}px, ${noseOffset.y}px)`,
              }}
            />
            <span className="nose-ring" />
          </div>
        </div>
      </ResizableCameraPanel>
      <p className="slither-controls-hint">
        Move mouse or use your face to steer. Arrow keys to turn. Avoid other snakes and walls.
      </p>
    </div>
  )
}
