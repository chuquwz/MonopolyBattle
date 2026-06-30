import type { ServerGameState } from './game.engine.js';

/**
 * Module-level registry that maps active gameId → ServerGameState instances.
 *
 * This allows socket handlers (which don't hold a reference to the engine
 * directly) to look up the running engine for a specific game in O(1) time.
 *
 * Engines are registered when a game starts (host:start-game countdown
 * completes) and removed when the game finishes or the server restarts.
 */
const activeEngines = new Map<string, ServerGameState>();

/**
 * Registers a ServerGameState under the given gameId.
 * If an engine is already registered for that gameId, it is replaced.
 */
export function registerEngine(gameId: string, engine: ServerGameState): void {
  activeEngines.set(gameId, engine);
}

/**
 * Returns the active ServerGameState for the given gameId, or undefined
 * if no engine has been registered.
 */
export function getEngine(gameId: string): ServerGameState | undefined {
  return activeEngines.get(gameId);
}

/**
 * Removes the engine registration for the given gameId.
 * Should be called when a game session finishes to avoid memory leaks.
 */
export function removeEngine(gameId: string): void {
  activeEngines.delete(gameId);
}
