import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { createInitialState, tick, getSnakeLength } from '../slither/slitherLogic.js'
import { computeTargetAngles } from '../slither/botAI.js'
import { SlitherView } from '../slither/SlitherView.jsx'
import { useHeadTracking } from '../useHeadTracking.js'

const FIXED_DT = 1 / 60
const PLAYER_TURN_RATE = 3

function normalizeAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI
  while (a < -Math.PI) a += 2 * Math.PI
  return a
}

export function SlitherPage() {
  const [state, setState] = useState(() => createInitialState())
  const stateRef = useRef(state)
  stateRef.current = state
  const [running, setRunning] = useState(true)
  const lastTime = useRef(performance.now() / 1000)
  const playerMouseWorld = useRef(null)
  const playerTurn = useRef(0)
  const playerCVAngleRef = useRef(null)
  const [faceEnabled, setFaceEnabled] = useState(true)
  const [sensitivity, setSensitivity] = useState(1)

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
    sensitivity,
  })

  useEffect(() => {
    if (!faceEnabled) playerCVAngleRef.current = null
  }, [faceEnabled])

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
      const { state: nextState } = tick(current, dt, targetAngles)
      stateRef.current = nextState
      setState(nextState)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [running, faceEnabled])

  const handleRestart = useCallback(() => {
    setState(createInitialState())
    lastTime.current = performance.now() / 1000
  }, [])

  const leaderboard = [...state.snakes]
    .sort((a, b) => getSnakeLength(b) - getSnakeLength(a))
    .slice(0, 10)

  return (
    <div className="app slither-page">
      <nav className="game-nav" aria-label="Breadcrumb">
        <Link to="/" className="game-nav-back">
          Back to CVified
        </Link>
      </nav>
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
              onChange={(e) => setFaceEnabled(e.target.checked)}
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
      <div className="slither-arena">
        <SlitherView state={state} onMouseMove={handleMouseMove} />
      </div>
      <div className="slither-camera-panel">
        <div className="camera-frame">
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
      </div>
      <p className="slither-controls-hint">
        Move mouse or use your face to steer. Arrow keys to turn. Avoid other snakes and walls.
      </p>
      <aside className="slither-leaderboard" aria-label="Leaderboard">
        <h2 className="slither-leaderboard-title">Length</h2>
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
    </div>
  )
}
