/**
 * Canvas overlay for face tracking: nose dot, direction arrow, optional face grid.
 * All coordinates for nose/landmarks are normalized 0–1; mirror flips x for camera view.
 */

const NOSE_DOT_RADIUS = 6
const ARROW_LENGTH = 120
const NOSE_FILL = 'rgba(126, 240, 193, 0.9)'
const ARROW_STROKE = 'rgba(255, 211, 106, 0.95)'
const OVERLAY_FONT = '18px Manrope, sans-serif'
const FACE_GRID_FILL = 'rgba(31, 42, 68, 0.06)'
const FACE_GRID_STROKE = 'rgba(31, 42, 68, 0.18)'
const FACE_GRID_RINGS = 'rgba(31, 42, 68, 0.2)'

/**
 * Draw the full tracking overlay (clears canvas first).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width - canvas width
 * @param {number} height - canvas height
 * @param {{ nose: { x: number, y: number }, direction: string | null, faceLandmarks: Array<{x,y,z}> | null, mirror: boolean }} options
 */
export function drawTrackingOverlay(ctx, width, height, options) {
  const { nose, direction, faceLandmarks, mirror } = options
  ctx.clearRect(0, 0, width, height)

  if (faceLandmarks && faceLandmarks.length) {
    drawFaceGrid(ctx, width, height, faceLandmarks, mirror)
  }

  const cx = (mirror ? 1 - nose.x : nose.x) * width
  const cy = nose.y * height

  ctx.fillStyle = NOSE_FILL
  ctx.beginPath()
  ctx.arc(cx, cy, NOSE_DOT_RADIUS, 0, Math.PI * 2)
  ctx.fill()

  if (direction) {
    let ex = cx
    let ey = cy
    if (direction === 'RIGHT') ex += ARROW_LENGTH
    if (direction === 'LEFT') ex -= ARROW_LENGTH
    if (direction === 'UP') ey -= ARROW_LENGTH
    if (direction === 'DOWN') ey += ARROW_LENGTH
    ctx.strokeStyle = ARROW_STROKE
    ctx.lineWidth = 4
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
    ctx.fillStyle = ARROW_STROKE
    ctx.font = OVERLAY_FONT
    ctx.fillText(direction, cx - 24, cy + 28)
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 * @param {Array<{ x: number, y: number }>} landmarks
 * @param {boolean} mirror
 */
function drawFaceGrid(ctx, width, height, landmarks, mirror) {
  if (!landmarks || !landmarks.length) return
  let minX = 1
  let minY = 1
  let maxX = 0
  let maxY = 0
  for (const point of landmarks) {
    const x = mirror ? 1 - point.x : point.x
    minX = Math.min(minX, x)
    minY = Math.min(minY, point.y)
    maxX = Math.max(maxX, x)
    maxY = Math.max(maxY, point.y)
  }
  const pad = 0.05
  const left = Math.max(0, (minX - pad) * width)
  const right = Math.min(width, (maxX + pad) * width)
  const top = Math.max(0, (minY - pad) * height)
  const bottom = Math.min(height, (maxY + pad) * height)
  const step = Math.max(14, Math.floor((right - left) / 10))
  const cx = (left + right) / 2
  const cy = (top + bottom) / 2
  const rx = (right - left) / 2
  const ry = (bottom - top) / 2
  ctx.save()
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.clip()
  ctx.fillStyle = FACE_GRID_FILL
  ctx.fillRect(left, top, right - left, bottom - top)
  ctx.strokeStyle = FACE_GRID_STROKE
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = left; x <= right; x += step) {
    ctx.moveTo(x, top)
    ctx.lineTo(x, bottom)
  }
  for (let y = top; y <= bottom; y += step) {
    ctx.moveTo(left, y)
    ctx.lineTo(right, y)
  }
  ctx.stroke()
  ctx.strokeStyle = FACE_GRID_RINGS
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i < 3; i += 1) {
    ctx.ellipse(cx, cy, rx * (0.35 + i * 0.2), ry * (0.35 + i * 0.2), 0, 0, Math.PI * 2)
  }
  ctx.stroke()
  ctx.restore()
}
