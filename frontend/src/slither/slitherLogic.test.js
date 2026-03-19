import { describe, it, expect } from 'vitest'
import {
  toroidalDistSq,
  wrapPoint,
  createInitialState,
  tick,
  PELLET_VALUE,
  SEGMENT_SPACING,
  INITIAL_LENGTH,
} from './slitherLogic.js'

describe('toroidalDistSq', () => {
  const bounds = { width: 100, height: 100 }

  it('returns 0 for same point', () => {
    const a = { x: 50, y: 50 }
    expect(toroidalDistSq(a, a, bounds)).toBe(0)
  })

  it('wraps across horizontal edge', () => {
    const a = { x: 2, y: 50 }
    const b = { x: 98, y: 50 }
    const d = toroidalDistSq(a, b, bounds)
    expect(d).toBeLessThan(25)
    expect(d).toBe(16)
  })

  it('wraps across vertical edge', () => {
    const a = { x: 50, y: 2 }
    const b = { x: 50, y: 98 }
    const d = toroidalDistSq(a, b, bounds)
    expect(d).toBeLessThan(25)
    expect(d).toBe(16)
  })

  it('opposite corners use wrapped shortest path', () => {
    const a = { x: 0, y: 0 }
    const b = { x: 99, y: 99 }
    const d = toroidalDistSq(a, b, bounds)
    expect(d).toBeLessThan(4)
  })
})

describe('wrapPoint', () => {
  const bounds = { width: 100, height: 80 }

  it('leaves in-bounds point unchanged', () => {
    const p = { x: 50, y: 40 }
    expect(wrapPoint(p, bounds)).toEqual({ x: 50, y: 40 })
  })

  it('wraps negative x', () => {
    const p = { x: -10, y: 40 }
    expect(wrapPoint(p, bounds)).toEqual({ x: 90, y: 40 })
  })

  it('wraps negative y', () => {
    const p = { x: 50, y: -5 }
    expect(wrapPoint(p, bounds)).toEqual({ x: 50, y: 75 })
  })

  it('wraps x >= width', () => {
    const p = { x: 150, y: 40 }
    expect(wrapPoint(p, bounds)).toEqual({ x: 50, y: 40 })
  })

  it('wraps y >= height', () => {
    const p = { x: 50, y: 100 }
    expect(wrapPoint(p, bounds)).toEqual({ x: 50, y: 20 })
  })
})

describe('tick', () => {
  const bounds = { width: 1000, height: 1000 }

  it('snake eats pellet and grows', () => {
    const head = { x: 200, y: 200 }
    const segments = [head]
    for (let i = 1; i < 10; i++) {
      segments.push({
        x: head.x - i * SEGMENT_SPACING,
        y: head.y,
      })
    }
    const state = {
      snakes: [
        {
          id: 'player',
          segments,
          angle: 0,
          speed: 1000,
          turnSpeed: 6,
          color: '#00ff88',
          isPlayer: true,
          shield: false,
          ghostUntil: 0,
          magnetUntil: 0,
        },
      ],
      pellets: [{ x: 205, y: 200, value: PELLET_VALUE, type: 'normal' }],
      bounds,
      nextSnakeId: 1,
      nextPelletSpawn: 2,
      gameTime: 0,
    }
    const { state: nextState, deadIds } = tick(
      state,
      0.02,
      { player: 0 },
    )
    expect(deadIds).toHaveLength(0)
    expect(nextState.pellets).toHaveLength(0)
    expect(nextState.snakes[0].segments.length).toBe(10 + PELLET_VALUE)
  })

})

describe('createInitialState', () => {
  it('creates state with requested bounds and counts', () => {
    const state = createInitialState({
      bounds: { width: 400, height: 300 },
      numBots: 2,
      numPellets: 5,
    })
    expect(state.bounds).toEqual({ width: 400, height: 300 })
    expect(state.snakes).toHaveLength(2)
    expect(state.pellets).toHaveLength(5)
    expect(state.snakes[0].segments).toHaveLength(INITIAL_LENGTH)
  })
})
