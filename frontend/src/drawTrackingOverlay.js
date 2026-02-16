/**
 * Canvas overlay for face tracking: nose dot, direction arrow, full face mesh + contours.
 * Nose dot uses raw landmark position; arrow scales with head-turn distance.
 */

import { FaceLandmarker } from '@mediapipe/tasks-vision'
import { NOSE_INDEX, NOSE_THRESHOLD } from './headTrackingConfig'
import { FACE_LANDMARKS_CONTOURS } from './faceLandmarkConnections'

const NOSE_DOT_RADIUS = 6
const ARROW_LENGTH_MIN = 28
const ARROW_LENGTH_MAX = 130
const ARROW_HEAD_LEN = 16
const NOSE_FILL = 'rgba(126, 240, 193, 0.95)'
const NOSE_STROKE = 'rgba(255, 255, 255, 0.5)'
const ARROW_STROKE = 'rgba(255, 211, 106, 0.95)'
const ARROW_FILL = 'rgba(255, 220, 130, 0.92)'
const FACE_TESSELATION_STROKE = 'rgba(255, 255, 255, 0.28)'
const FACE_TESSELATION_LINE_WIDTH = 1
const FACE_CONTOUR_STROKE = 'rgba(255, 255, 255, 0.5)'
const FACE_CONTOUR_LINE_WIDTH = 1
/** Scale mesh horizontally so it appears wider (1 = no scale, 1.2 = 20% wider). */
const FACE_MESH_SCALE_X = 1.7
const FACE_MESH_CENTER = 0.5
const NOSE_CENTER = 0.5
/** Fixed size of the face mesh in display pixels so it doesn't scale when the camera panel is resized. */
const FACE_MESH_FIXED_DISPLAY_SIZE = 200
const DISTANCE_FOR_MAX_ARROW = 0.18

/**
 * Arrow length from normalized distance from center (0.5, 0.5).
 * @param {number} distance - hypot(dx, dy) in 0–1 space
 * @returns {number} pixel length
 */
export function getArrowLength(distance) {
  const t = Math.min(
    1,
    Math.max(
      0,
      (distance - NOSE_THRESHOLD) / (DISTANCE_FOR_MAX_ARROW - NOSE_THRESHOLD),
    ),
  )
  return ARROW_LENGTH_MIN + t * (ARROW_LENGTH_MAX - ARROW_LENGTH_MIN)
}

/**
 * Nose position in screen pixels from raw landmark (normalized 0–1).
 * @param {{ x: number, y: number }} noseRaw
 * @param {number} width
 * @param {number} height
 * @param {boolean} mirror
 * @returns {{ x: number, y: number }}
 */
export function getNoseScreenPosition(noseRaw, width, height, mirror) {
  return {
    x: (mirror ? 1 - noseRaw.x : noseRaw.x) * width,
    y: noseRaw.y * height,
  }
}

/**
 * Draw the full tracking overlay (clears canvas first).
 * Supports direction (4-way) or angle (omnidirectional). When angle is provided it takes precedence.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width - canvas width
 * @param {number} height - canvas height
 * @param {{ nose: { x: number, y: number }, direction?: string | null, angle?: number | null, faceLandmarks: Array<{x,y,z}> | null, mirror: boolean, displayWidth?: number, displayHeight?: number }} options
 */
export function drawTrackingOverlay(ctx, width, height, options) {
  const {
    nose,
    direction,
    angle: optionsAngle,
    faceLandmarks,
    mirror,
    displayWidth,
    displayHeight,
  } = options
  ctx.clearRect(0, 0, width, height)

  // Face mesh temporarily disabled
  // if (faceLandmarks && faceLandmarks.length) {
  //   drawFaceMesh(ctx, width, height, faceLandmarks, mirror, {
  //     displayWidth,
  //     displayHeight,
  //   })
  // }

  const noseRaw =
    faceLandmarks && faceLandmarks[NOSE_INDEX]
      ? faceLandmarks[NOSE_INDEX]
      : nose
  const { x: cx, y: cy } = getNoseScreenPosition(noseRaw, width, height, mirror)

  ctx.fillStyle = NOSE_FILL
  ctx.strokeStyle = NOSE_STROKE
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.arc(cx, cy, NOSE_DOT_RADIUS, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()

  const distance = Math.hypot(nose.x - NOSE_CENTER, nose.y - NOSE_CENTER)
  const arrowLength = getArrowLength(distance)

  let drawAngle = null
  if (optionsAngle != null) {
    drawAngle = optionsAngle
  } else if (direction) {
    drawAngle =
      direction === 'RIGHT'
        ? 0
        : direction === 'LEFT'
          ? Math.PI
          : direction === 'UP'
            ? -Math.PI / 2
            : Math.PI / 2
  }

  if (drawAngle != null) {
    const ex = cx + arrowLength * Math.cos(drawAngle)
    const ey = cy + arrowLength * Math.sin(drawAngle)
    ctx.strokeStyle = ARROW_STROKE
    ctx.fillStyle = ARROW_FILL
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(ex, ey)
    ctx.stroke()

    const hx = ex - ARROW_HEAD_LEN * Math.cos(drawAngle)
    const hy = ey - ARROW_HEAD_LEN * Math.sin(drawAngle)
    const lx = hx + ARROW_HEAD_LEN * 0.45 * Math.cos(drawAngle + Math.PI / 2)
    const ly = hy + ARROW_HEAD_LEN * 0.45 * Math.sin(drawAngle + Math.PI / 2)
    const rx = hx + ARROW_HEAD_LEN * 0.45 * Math.cos(drawAngle - Math.PI / 2)
    const ry = hy + ARROW_HEAD_LEN * 0.45 * Math.sin(drawAngle - Math.PI / 2)
    ctx.beginPath()
    ctx.moveTo(ex, ey)
    ctx.lineTo(lx, ly)
    ctx.lineTo(rx, ry)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

/**
 * Map normalized landmark to pixel coords (full canvas / video space).
 */
function landmarkToPixel(nx, ny, width, height, mirror) {
  const x = mirror ? 1 - nx : nx
  const scaledX =
    (FACE_MESH_CENTER + (x - FACE_MESH_CENTER) * FACE_MESH_SCALE_X) * width
  const y = ny * height
  return { x: scaledX, y }
}

/**
 * Map normalized landmark to pixel coords inside a fixed display-size box in buffer space.
 * Keeps the mesh the same on-screen size when the camera panel is resized.
 */
function landmarkToPixelFixedSize(
  nx,
  ny,
  centerX,
  centerY,
  boxWidthBuf,
  boxHeightBuf,
  mirror,
) {
  const x = mirror ? 1 - nx : nx
  const scaledX =
    centerX +
    (FACE_MESH_CENTER + (x - FACE_MESH_CENTER) * FACE_MESH_SCALE_X - 0.5) *
      boxWidthBuf
  const y = centerY + (ny - 0.5) * boxHeightBuf
  return { x: scaledX, y }
}

/**
 * Draw full face mesh (tesselation) then contours on top so the face is fully covered.
 * When displayWidth/displayHeight are provided, the mesh is drawn in a fixed display-size
 * box (centered on the face) so it keeps the same on-screen size when the camera is resized.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width - buffer width
 * @param {number} height - buffer height
 * @param {Array<{ x: number, y: number }>} landmarks
 * @param {boolean} mirror
 * @param {{ displayWidth?: number, displayHeight?: number }} [displaySize]
 */
function drawFaceMesh(ctx, width, height, landmarks, mirror, displaySize) {
  if (!landmarks || !landmarks.length) return
  const useFixedSize =
    displaySize &&
    displaySize.displayWidth > 0 &&
    displaySize.displayHeight > 0
  let centerX = width / 2
  let centerY = height / 2
  let boxWidthBuf = width
  let boxHeightBuf = height
  if (useFixedSize) {
    let sumX = 0
    let sumY = 0
    for (let k = 0; k < landmarks.length; k++) {
      sumX += landmarks[k].x
      sumY += landmarks[k].y
    }
    const n = landmarks.length
    const cxNorm = sumX / n
    const cyNorm = sumY / n
    const centerPixel = landmarkToPixel(cxNorm, cyNorm, width, height, mirror)
    centerX = centerPixel.x
    centerY = centerPixel.y
    boxWidthBuf =
      FACE_MESH_FIXED_DISPLAY_SIZE * (width / displaySize.displayWidth)
    boxHeightBuf =
      FACE_MESH_FIXED_DISPLAY_SIZE * (height / displaySize.displayHeight)
  }

  const toPixel = useFixedSize
    ? (nx, ny) =>
        landmarkToPixelFixedSize(
          nx,
          ny,
          centerX,
          centerY,
          boxWidthBuf,
          boxHeightBuf,
          mirror,
        )
    : (nx, ny) => landmarkToPixel(nx, ny, width, height, mirror)

  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const tesselation = FaceLandmarker.FACE_LANDMARKS_TESSELATION
  if (tesselation && tesselation.length) {
    ctx.strokeStyle = FACE_TESSELATION_STROKE
    ctx.lineWidth = FACE_TESSELATION_LINE_WIDTH
    ctx.beginPath()
    for (const conn of tesselation) {
      const i = conn.start
      const j = conn.end
      if (i >= landmarks.length || j >= landmarks.length) continue
      const a = landmarks[i]
      const b = landmarks[j]
      const p1 = toPixel(a.x, a.y)
      const p2 = toPixel(b.x, b.y)
      ctx.moveTo(p1.x, p1.y)
      ctx.lineTo(p2.x, p2.y)
    }
    ctx.stroke()
  }

  ctx.strokeStyle = FACE_CONTOUR_STROKE
  ctx.lineWidth = FACE_CONTOUR_LINE_WIDTH
  ctx.beginPath()
  for (const [i, j] of FACE_LANDMARKS_CONTOURS) {
    if (i >= landmarks.length || j >= landmarks.length) continue
    const a = landmarks[i]
    const b = landmarks[j]
    const p1 = toPixel(a.x, a.y)
    const p2 = toPixel(b.x, b.y)
    ctx.moveTo(p1.x, p1.y)
    ctx.lineTo(p2.x, p2.y)
  }
  ctx.stroke()
  ctx.restore()
}
