import { SOCKET_EVENTS } from '@monopoly/shared';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../config/database.js';
import { GameRepository } from '../repositories/game.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { RoundRepository } from '../repositories/round.repository.js';
import { DecisionLogRepository } from '../repositories/decision-log.repository.js';
import { RoundEventRepository } from '../repositories/round-event.repository.js';
import { DecisionEngine, DECISION_TYPES } from '../engine/decision.engine.js';
import { logger } from '../utils/logger.js';
import { viErrors } from '../utils/errors.js';
import { MonopolySocket, emitToRoom } from './index.js';

// Zod schema for validating the incoming socket payload
const playerDecisionSchema = z.object({
  roundId: z.string().uuid('Mã vòng chơi không hợp lệ'),
  decisionType: z.string().min(1, 'Loại quyết định không hợp lệ'),
});

/**
 * Registers events triggered by players during the active game phases (e.g. decision inputs).
 */
export function registerGameEventHandlers(socket: MonopolySocket): void {
  const { role, gameId, teamId } = socket.data;

  // Handle player:decision event
  socket.on(SOCKET_EVENTS.PLAYER_DECISION, (payload: unknown) => {
    // 1. Validate credentials & permissions
    if (role !== 'player' || !teamId || !gameId) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'FORBIDDEN', message: viErrors.forbidden });
      return;
    }

    // 2. Validate payload structure
    const parsed = playerDecisionSchema.safeParse(payload);
    if (!parsed.success) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'INVALID_PAYLOAD',
        message: parsed.error.issues[0]?.message ?? viErrors.invalidInput,
      });
      return;
    }

    const { roundId, decisionType } = parsed.data;

    // Validate if decisionType is a valid base decision type
    const validDecisionTypes = Object.values(DECISION_TYPES) as string[];
    if (!validDecisionTypes.includes(decisionType)) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'INVALID_DECISION_TYPE',
        message: 'Loại quyết định không được hỗ trợ trong hệ thống.',
      });
      return;
    }

    const db = getDatabase();
    const gameRepo = new GameRepository(db);
    const roundRepo = new RoundRepository(db);
    const teamRepo = new TeamRepository(db);
    const decisionLogRepo = new DecisionLogRepository(db);
    const eventRepo = new RoundEventRepository(db);

    try {
      // 3. Retrieve round and verify active state constraints
      const round = roundRepo.findById(roundId);
      if (!round) {
        socket.emit(SOCKET_EVENTS.ERROR, { code: 'ROUND_NOT_FOUND', message: 'Không tìm thấy vòng chơi.' });
        return;
      }

      if (round.gameId !== gameId) {
        socket.emit(SOCKET_EVENTS.ERROR, { code: 'FORBIDDEN_ROUND_ACCESS', message: viErrors.forbidden });
        return;
      }

      if (round.phase !== 'decision') {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'INVALID_PHASE',
          message: 'Hiện tại không ở trong giai đoạn đưa ra quyết định.',
        });
        return;
      }

      // 4. Prevent duplicate submission per team per round
      const existingSubmission = decisionLogRepo.findByRoundIdAndTeamId(roundId, teamId);
      if (existingSubmission) {
        socket.emit(SOCKET_EVENTS.ERROR, {
          code: 'DECISION_LOCKED',
          message: viErrors.decisionLocked,
        });
        return;
      }

      const team = teamRepo.findById(teamId);
      if (!team) {
        socket.emit(SOCKET_EVENTS.ERROR, { code: 'TEAM_NOT_FOUND', message: viErrors.teamNotFound });
        return;
      }

      // 5. Apply Business Logic calculation using DecisionEngine
      const activeEvent = round.eventId ? eventRepo.findById(round.eventId) : null;
      const context = {
        roundNumber: round.roundNumber,
        activeEvent: activeEvent ? { type: activeEvent.eventType } : null,
      };

      const decisionEngine = new DecisionEngine();
      const delta = decisionEngine.applyDecision(team, decisionType, context);

      // 6. Save decision log entry
      decisionLogRepo.create({
        id: uuid(),
        roundId,
        teamId,
        decisionType,
        decisionDataJson: JSON.stringify({ cost: Math.abs(delta.money) }),
        moneyDelta: delta.money,
        marketShareDelta: delta.marketShare,
        technologyDelta: delta.technology,
        reputationDelta: delta.reputation,
        monopolyRiskDelta: delta.monopolyRisk,
        scoreEarned: 0,
        createdAt: new Date().toISOString(),
      });

      logger.info(
        { gameId, roundId, teamId, decisionType, delta },
        'Player decision submitted and processed successfully.'
      );

      // 7. Acknowledge the player and notify the host
      socket.emit(SOCKET_EVENTS.ROUND_DECISION_RECEIVED, { teamId, confirmed: true });
      emitToRoom(`host:${gameId}`, SOCKET_EVENTS.ROUND_DECISION_RECEIVED, { teamId, confirmed: true });

      // 8. Trigger early round phase processing if all active teams have submitted
      const allTeams = teamRepo.findByGameId(gameId);
      const activeTeams = allTeams.filter((t) => t.status === 'playing' || t.status === 'ready');
      const submissions = decisionLogRepo.findMany({ roundId });

      if (submissions.length === activeTeams.length && activeTeams.length > 0) {
        // Transition the round phase in DB
        roundRepo.update(roundId, { phase: 'event' });

        // Broadcast game phase update to all rooms
        emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_PHASE_CHANGE, {
          phase: 'event',
          roundNumber: round.roundNumber,
        });

        logger.info(
          { gameId, roundId },
          'All teams have submitted decisions. Early processing initiated: transitioned to event phase.'
        );
      }
    } catch (err) {
      logger.error({ gameId, roundId, teamId, err }, 'Failed to record decision submission.');
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'SERVER_ERROR', message: viErrors.serverError });
    }
  });
}
