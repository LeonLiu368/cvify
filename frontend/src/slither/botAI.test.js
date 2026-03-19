import { describe, it, expect } from 'vitest'
import { computeTargetAngles } from './botAI.js'
import { SEGMENT_SPACING, INITIAL_LENGTH } from './slitherLogic.js'

function makeSnake(id, headX, headY, angle, isPlayer = false) {
  const segments = []
  for (let i = 0; i < INITIAL_LENGTH; i++) {
    segments.push({
      x: headX - Math.cos(angle) * i * SEGMENT_SPACING,
      y: headY - Math.sin(angle) * i * SEGMENT_SPACING,
    })
  }
  return {
    id,
    segments,
    angle,
    isPlayer,
  }
}

describe('computeTargetAngles', () => {
  const bounds = { width: 2000, height: 2000 }

  it('bot aims toward single pellet', () => {
    const head = { x: 100, y: 100 }
    const pellet = { x: 250, y: 100, value: 2 }
    const expectedAngle = Math.atan2(
      pellet.y - head.y,
      pellet.x - head.x,
    )
    const state = {
      snakes: [
        makeSnake('player', 50, 50, 0, true),
        makeSnake('snake-1', head.x, head.y, 0, false),
      ],
      pellets: [pellet],
      bounds,
    }
    state.snakes[1].segments[0] = { ...head }
    const result = computeTargetAngles(state)
    expect(result['snake-1']).toBeDefined()
    const diff = Math.abs(result['snake-1'] - expectedAngle)
    const normalizedDiff = Math.min(diff, Math.abs(diff - 2 * Math.PI))
    expect(normalizedDiff).toBeLessThan(0.5)
  })

  it('skips player snake', () => {
    const state = {
      snakes: [
        makeSnake('player', 100, 100, 0, true),
      ],
      pellets: [{ x: 200, y: 100, value: 2 }],
      bounds,
    }
    const result = computeTargetAngles(state)
    expect(result.player).toBeUndefined()
  })

  it('bot with two pellets aims toward nearer one', () => {
    const head = { x: 100, y: 100 }
    const near = { x: 150, y: 100, value: 2 }
    const far = { x: 500, y: 100, value: 2 }
    const state = {
      snakes: [
        makeSnake('player', 0, 0, 0, true),
        makeSnake('snake-1', head.x, head.y, 0, false),
      ],
      pellets: [near, far],
      bounds,
    }
    state.snakes[1].segments[0] = { ...head }
    const result = computeTargetAngles(state)
    const angleToNear = Math.atan2(near.y - head.y, near.x - head.x)
    const angleToFar = Math.atan2(far.y - head.y, far.x - head.x)
    const got = result['snake-1']
    const diffNear = Math.abs(got - angleToNear)
    const diffFar = Math.abs(got - angleToFar)
    const norm = (d) => Math.min(d, Math.abs(d - 2 * Math.PI))
    expect(norm(diffNear)).toBeLessThanOrEqual(norm(diffFar))
  })
})
