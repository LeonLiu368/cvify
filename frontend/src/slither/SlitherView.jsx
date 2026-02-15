import { useEffect, useRef, useState } from 'react'
import { PELLET_RADIUS, HEAD_RADIUS, BODY_RADIUS } from './slitherLogic.js'

/**
 * Canvas renderer for slither game state.
 * Camera follows the longest snake or the player snake; reports mouse position in world coords.
 * @param {{ state: { snakes: Array<{ segments: Array<{x,y}>, color: string, isPlayer?: boolean }>, pellets: Array<{x,y}>, bounds: { width, height } } }, onMouseMove?: (worldX: number, worldY: number) => void }} props
 */
export function SlitherView({ state, onMouseMove }) {
  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const cameraRef = useRef({ scale: 1, camX: 0, camY: 0 })
  const [resizeTick, setResizeTick] = useState(0)

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas) return
    const setSize = () => {
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        setResizeTick((t) => t + 1)
      }
    }
    setSize()
    const ResizeObserverCtor = typeof window !== 'undefined' ? window.ResizeObserver : null
    if (!ResizeObserverCtor) return
    const ro = new ResizeObserverCtor(setSize)
    ro.observe(wrap)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !state) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { snakes, pellets, bounds } = state

    const player = snakes.find((s) => s.isPlayer)
    const longest = snakes.reduce(
      (best, s) => (s.segments.length > (best?.segments.length ?? 0) ? s : best),
      null,
    )
    const focus = (player ?? longest)?.segments[0] ?? { x: bounds.width / 2, y: bounds.height / 2 }

    const scale = Math.min(
      canvas.width / (bounds.width * 0.6),
      canvas.height / (bounds.height * 0.6),
      1.5,
    )
    const camX = canvas.width / 2 - focus.x * scale
    const camY = canvas.height / 2 - focus.y * scale
    cameraRef.current = { scale, camX, camY }

    ctx.save()
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.translate(camX, camY)
    ctx.scale(scale, scale)

    const padding = 40
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 2 / scale
    ctx.strokeRect(padding, padding, bounds.width - padding * 2, bounds.height - padding * 2)

    for (const pellet of pellets) {
      ctx.fillStyle = 'rgba(255, 220, 100, 0.9)'
      ctx.beginPath()
      ctx.arc(pellet.x, pellet.y, PELLET_RADIUS, 0, Math.PI * 2)
      ctx.fill()
    }

    for (const snake of snakes) {
      const segs = snake.segments
      if (segs.length < 2) continue
      ctx.strokeStyle = snake.color
      ctx.lineWidth = (BODY_RADIUS * 2) / scale
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.beginPath()
      ctx.moveTo(segs[0].x, segs[0].y)
      for (let i = 1; i < segs.length; i++) {
        ctx.lineTo(segs[i].x, segs[i].y)
      }
      ctx.stroke()
      const head = segs[0]
      ctx.fillStyle = snake.color
      ctx.beginPath()
      ctx.arc(head.x, head.y, HEAD_RADIUS, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'
      ctx.lineWidth = 1 / scale
      ctx.stroke()
    }

    ctx.restore()
  }, [state, resizeTick])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !onMouseMove) return
    const handleMove = (e) => {
      const { scale, camX, camY } = cameraRef.current
      const worldX = (e.offsetX - camX) / scale
      const worldY = (e.offsetY - camY) / scale
      onMouseMove(worldX, worldY)
    }
    canvas.addEventListener('mousemove', handleMove)
    return () => canvas.removeEventListener('mousemove', handleMove)
  }, [onMouseMove])

  return (
    <div ref={wrapRef} className="slither-canvas-wrap">
      <canvas ref={canvasRef} className="slither-canvas" aria-label="Slither game view" />
    </div>
  )
}
