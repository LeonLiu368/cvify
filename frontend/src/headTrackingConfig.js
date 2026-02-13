/**
 * Head tracking constants and pure helpers.
 * Used by useHeadTracking and overlay drawing.
 */

export const NOSE_INDEX = 1
export const NOSE_THRESHOLD = 0.06
export const NOSE_SMOOTHING = 0.5
export const NOSE_CENTER = 0.5
export const NOSE_OFFSET_SCALE = 70
export const NOSE_OFFSET_CLAMP = 16
export const DIRECTION_COOLDOWN_MS = 120
export const UI_THROTTLE_MS = 120

export const HEAD_DIRECTIONS = {
  UP: { x: 0, y: -1 },
  DOWN: { x: 0, y: 1 },
  LEFT: { x: -1, y: 0 },
  RIGHT: { x: 1, y: 0 },
}

/**
 * Returns raw direction from normalized nose (0–1) relative to center.
 * @param {{ x: number, y: number }} normalizedNose - nose position, center = 0.5
 * @param {number} [threshold=NOSE_THRESHOLD] - dead zone
 * @returns {'UP'|'DOWN'|'LEFT'|'RIGHT'|null}
 */
export function getRawNoseDirection(normalizedNose, threshold = NOSE_THRESHOLD) {
  const dx = normalizedNose.x - NOSE_CENTER
  const dy = normalizedNose.y - NOSE_CENTER
  if (Math.abs(dx) < threshold && Math.abs(dy) < threshold) {
    return null
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx > 0 ? 'RIGHT' : 'LEFT'
  }
  return dy > 0 ? 'DOWN' : 'UP'
}

/**
 * Returns mirrored head direction for display/input (camera is mirrored).
 * @param {{ x: number, y: number }} normalizedNose
 * @param {number} [threshold=NOSE_THRESHOLD]
 * @returns {'UP'|'DOWN'|'LEFT'|'RIGHT'|null}
 */
export function getMirroredHeadDirection(normalizedNose, threshold = NOSE_THRESHOLD) {
  const raw = getRawNoseDirection(normalizedNose, threshold)
  if (!raw) return null
  if (raw === 'LEFT') return 'RIGHT'
  if (raw === 'RIGHT') return 'LEFT'
  return raw
}

/**
 * Compute nose offset for compass UI from normalized nose (clamped).
 */
export function noseOffsetFromNormalized(normalizedNose) {
  const x = Math.max(
    -NOSE_OFFSET_CLAMP,
    Math.min(NOSE_OFFSET_CLAMP, -(normalizedNose.x - NOSE_CENTER) * NOSE_OFFSET_SCALE)
  )
  const y = Math.max(
    -NOSE_OFFSET_CLAMP,
    Math.min(NOSE_OFFSET_CLAMP, (normalizedNose.y - NOSE_CENTER) * NOSE_OFFSET_SCALE)
  )
  return { x, y }
}
