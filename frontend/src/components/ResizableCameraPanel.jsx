import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_WIDTH = 280
const DEFAULT_HEIGHT = 220
const MIN_WIDTH = 200
const MIN_HEIGHT = 150
const MAX_WIDTH = 480
const MAX_HEIGHT = 360
const GAP = 16

function loadSaved(storageKey) {
  if (!storageKey || typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (
      typeof data.width === 'number' &&
      typeof data.height === 'number' &&
      data.width >= MIN_WIDTH &&
      data.height <= MAX_WIDTH &&
      data.height >= MIN_HEIGHT &&
      data.height <= MAX_HEIGHT
    ) {
      return {
        width: Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, data.width)),
        height: Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, data.height)),
        x: typeof data.x === 'number' ? data.x : null,
        y: typeof data.y === 'number' ? data.y : null,
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

function getDefaultPosition(width, height) {
  if (typeof window === 'undefined') return { x: GAP, y: GAP }
  return {
    x: window.innerWidth - width - GAP,
    y: window.innerHeight - height - GAP,
  }
}

function clampPosition(x, y, width, height) {
  if (typeof window === 'undefined') return { x, y }
  const maxX = window.innerWidth - width
  const maxY = window.innerHeight - height
  return {
    x: Math.max(0, Math.min(maxX, x)),
    y: Math.max(0, Math.min(maxY, y)),
  }
}

export function ResizableCameraPanel({
  children,
  defaultWidth = DEFAULT_WIDTH,
  defaultHeight = DEFAULT_HEIGHT,
  storageKey,
}) {
  const saved = storageKey ? loadSaved(storageKey) : null
  const [width, setWidth] = useState(saved?.width ?? defaultWidth)
  const [height, setHeight] = useState(saved?.height ?? defaultHeight)
  const [x, setX] = useState(saved?.x ?? null)
  const [y, setY] = useState(saved?.y ?? null)
  const dragStart = useRef(null)
  const resizeStart = useRef(null)

  const effectivePos =
    x != null && y != null
      ? clampPosition(x, y, width, height)
      : getDefaultPosition(width, height)

  const save = useCallback(() => {
    if (!storageKey || typeof window === 'undefined') return
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          x: effectivePos.x,
          y: effectivePos.y,
          width,
          height,
        }),
      )
    } catch {
      /* ignore */
    }
  }, [storageKey, effectivePos.x, effectivePos.y, width, height])

  useEffect(() => {
    save()
  }, [save])

  const handleDragStart = useCallback(
    (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      dragStart.current = {
        startX: e.clientX - effectivePos.x,
        startY: e.clientY - effectivePos.y,
      }
      const onMove = (e2) => {
        if (!dragStart.current) return
        const nx = e2.clientX - dragStart.current.startX
        const ny = e2.clientY - dragStart.current.startY
        const clamped = clampPosition(nx, ny, width, height)
        setX(clamped.x)
        setY(clamped.y)
      }
      const onUp = () => {
        dragStart.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        document.body.style.userSelect = ''
      }
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [effectivePos.x, effectivePos.y, width, height],
  )

  const handleResizeStart = useCallback(
    (e) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      resizeStart.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: width,
        startH: height,
      }
      const onMove = (e2) => {
        if (!resizeStart.current) return
        const dw = e2.clientX - resizeStart.current.startX
        const dh = e2.clientY - resizeStart.current.startY
        const nw = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, resizeStart.current.startW + dw),
        )
        const nh = Math.min(
          MAX_HEIGHT,
          Math.max(MIN_HEIGHT, resizeStart.current.startH + dh),
        )
        setWidth(nw)
        setHeight(nh)
      }
      const onUp = () => {
        resizeStart.current = null
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        document.body.style.userSelect = ''
      }
      document.body.style.userSelect = 'none'
      window.addEventListener('mousemove', onMove)
      window.addEventListener('mouseup', onUp)
    },
    [width, height],
  )

  return (
    <div
      className="resizable-camera-panel"
      style={{
        position: 'fixed',
        left: effectivePos.x,
        top: effectivePos.y,
        width,
        height,
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--panel)',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 'var(--radius-md)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
        overflow: 'hidden',
      }}
    >
      <div
        className="resizable-camera-panel-drag-handle"
        onMouseDown={handleDragStart}
        role="button"
        tabIndex={0}
        aria-label="Drag to move camera panel"
        style={{
          flexShrink: 0,
          padding: '6px 10px',
          cursor: 'grab',
          fontSize: '0.75rem',
          fontWeight: 600,
          letterSpacing: '0.05em',
          color: 'var(--muted)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        }}
      >
        Camera
      </div>
      <div
        className="resizable-camera-panel-content"
        style={{ flex: 1, minHeight: 0, position: 'relative' }}
      >
        {children}
      </div>
      <div
        className="resizable-camera-panel-resize-handle"
        onMouseDown={handleResizeStart}
        role="button"
        tabIndex={0}
        aria-label="Drag to resize camera panel"
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 20,
          height: 20,
          cursor: 'nwse-resize',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            right: 4,
            bottom: 4,
            width: 8,
            height: 8,
            borderRight: '2px solid rgba(255,255,255,0.4)',
            borderBottom: '2px solid rgba(255,255,255,0.4)',
          }}
        />
      </div>
    </div>
  )
}
