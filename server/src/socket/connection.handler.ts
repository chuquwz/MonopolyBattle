import { SOCKET_EVENTS } from '@monopoly/shared';
import { getDatabase } from '../config/database.js';
import { PlayerRepository } from '../repositories/player.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { logger } from '../utils/logger.js';
import { MonopolySocket, emitToRoom } from './index.js';

// Module-level map to track 30-second reconnect timers for disconnected players
const reconnectTimers = new Map<string, NodeJS.Timeout>();

/**
 * Handles initialization logic when a new socket connects, managing room joins,
 * db state syncs, and event bindings for players/projectors.
 */
export function handleConnection(socket: MonopolySocket): void {
  const { role, gameId, teamId, userId } = socket.data;

  // 1. Join core rooms automatically based on authenticated credentials
  if (gameId) {
    const gameRoom = `room:${gameId}`;
    socket.join(gameRoom);
    logger.info({ socketId: socket.id, room: gameRoom, role }, 'Socket automatically joined game room');
  }

  if (teamId) {
    const teamRoom = `team:${teamId}`;
    socket.join(teamRoom);
    logger.info({ socketId: socket.id, room: teamRoom, role }, 'Socket automatically joined team room');
  }

  if (role === 'host' && gameId) {
    const hostRoom = `host:${gameId}`;
    socket.join(hostRoom);
    logger.info({ socketId: socket.id, room: hostRoom }, 'Host socket automatically joined host control room');
  }

  // 2. Setup Player-specific connection attributes and state checks
  if (role === 'player' && userId && teamId && gameId) {
    const db = getDatabase();
    const playerRepo = new PlayerRepository(db);
    const teamRepo = new TeamRepository(db);

    // Cancel any active reconnect timer for this player (reconnection grace period)
    const existingTimer = reconnectTimers.get(userId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      reconnectTimers.delete(userId);
      logger.info({ userId }, 'Player reconnected within grace period; cleared reconnect timer.');
    }

    // Update player socket ID and status in SQLite DB
    playerRepo.update(userId, { socketId: socket.id, isConnected: 1 });
    logger.info({ userId, socketId: socket.id }, 'Player socket_id and connection status updated in database.');

    // Fetch team information and broadcast team:joined to the room
    const team = teamRepo.findById(teamId);
    if (team) {
      const teams = teamRepo.findByGameId(gameId);
      emitToRoom(`room:${gameId}`, SOCKET_EVENTS.TEAM_JOINED, {
        teamId,
        teamName: team.name,
        teamCount: teams.length,
      });
    }
  }

  // 3. Register disconnection handler
  socket.on('disconnect', (reason) => {
    logger.info({ socketId: socket.id, role, reason }, 'Socket disconnected from server.');

    if (role === 'player' && userId) {
      const db = getDatabase();
      const playerRepo = new PlayerRepository(db);

      // Mark player disconnected in SQLite database
      playerRepo.update(userId, { isConnected: 0 });
      logger.info({ userId }, 'Player marked as disconnected in database.');

      // Start the 30-second reconnect timer grace period
      const timer = setTimeout(() => {
        reconnectTimers.delete(userId);
        logger.info({ userId }, 'Player 30-second reconnect grace period expired.');
      }, 30000);
      reconnectTimers.set(userId, timer);
    }
  });

  // 4. Handle player:ready event
  socket.on(SOCKET_EVENTS.PLAYER_READY, () => {
    if (role === 'player' && teamId && gameId) {
      const db = getDatabase();
      const teamRepo = new TeamRepository(db);

      // Update team status in database to ready
      teamRepo.update(teamId, { status: 'ready' });
      logger.info({ teamId, gameId }, 'Team status marked as ready in database.');

      // Calculate ready teams metrics
      const teams = teamRepo.findByGameId(gameId);
      const totalCount = teams.length;
      const readyCount = teams.filter((t) => t.status === 'ready').length;

      // Broadcast team:ready to the game room
      emitToRoom(`room:${gameId}`, SOCKET_EVENTS.TEAM_READY, {
        teamId,
        readyCount,
        totalCount,
      });
    }
  });

  // 5. Handle projector:join event
  socket.on(SOCKET_EVENTS.PROJECTOR_JOIN, () => {
    if (role === 'projector' && gameId) {
      const projectorRoom = `projector:${gameId}`;
      socket.join(projectorRoom);
      logger.info({ socketId: socket.id, room: projectorRoom }, 'Projector socket registered and joined projector room.');
    }
  });
}
