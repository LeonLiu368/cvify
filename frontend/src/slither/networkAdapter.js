/**
 * Multiplayer network adapter stub.
 * Game loop and slitherLogic consume/update state only; later state can come from server.
 * joinSession / sendInput / onStateUpdate are no-ops; isConnected returns false.
 */

let stateCallback = null

/**
 * Join a game session. No-op in bot-only mode.
 * @returns {Promise<{ joined: boolean }>}
 */
export function joinSession() {
  return Promise.resolve({ joined: false })
}

/**
 * Send player input to server. No-op in bot-only mode.
 * @param {{ angle?: number, boost?: boolean }} input
 */
export function sendInput(input) {
  void input
}

/**
 * Register callback for state updates from server. Never called in stub.
 * @param {(state: unknown) => void} callback
 */
export function onStateUpdate(callback) {
  stateCallback = callback
}

/**
 * Unregister state update callback.
 */
export function offStateUpdate() {
  stateCallback = null
}

/**
 * Whether client is connected to a multiplayer server.
 * @returns {boolean}
 */
export function isConnected() {
  return false
}
