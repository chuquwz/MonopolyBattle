import { SOCKET_EVENTS } from '@monopoly/shared';
import type { GamePhase, Decision, LeaderboardEntry } from '@monopoly/shared';
import { v4 as uuid } from 'uuid';
import { getDatabase } from '../config/database.js';
import { GameRepository } from '../repositories/game.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { RoundRepository } from '../repositories/round.repository.js';
import { logger } from '../utils/logger.js';
import { viErrors } from '../utils/errors.js';
import { MonopolySocket, emitToRoom } from './index.js';

// Module-level map to track active countdown timers (protects against duplicate starts)
const countdownIntervals = new Map<string, NodeJS.Timeout>();

// Default round decisions matching shared types Schema structure
const DEFAULT_DECISIONS: Decision[] = [
  {
    id: 'dec_1',
    type: 'invest_tech',
    nameVi: 'Đầu tư công nghệ',
    descriptionVi: 'Đầu tư vào nghiên cứu và phát triển để nâng cao trình độ công nghệ.',
    cost: 2000,
    effects: {
      money: -2000,
      marketShare: 1.0,
      technology: 15,
      reputation: 5,
      monopolyRisk: 2,
    },
  },
  {
    id: 'dec_2',
    type: 'acquire',
    nameVi: 'Thâu tóm đối thủ',
    descriptionVi: 'Thâu tóm một doanh nghiệp đối thủ nhỏ để nhanh chóng gia tăng thị phần.',
    cost: 5000,
    effects: {
      money: -5000,
      marketShare: 8.0,
      technology: 3,
      reputation: -10,
      monopolyRisk: 20,
    },
  },
];

/**
 * Registers events triggered by host actions during lobby or gameplay phases.
 */
export function registerHostHandlers(socket: MonopolySocket): void {
  const { role, gameId } = socket.data;

  // 1. Handle host:start-game
  socket.on(SOCKET_EVENTS.HOST_START_GAME, () => {
    if (role !== 'host' || !gameId) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'FORBIDDEN', message: viErrors.forbidden });
      return;
    }

    const db = getDatabase();
    const gameRepo = new GameRepository(db);
    const teamRepo = new TeamRepository(db);

    const game = gameRepo.findById(gameId);
    if (!game) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'GAME_NOT_FOUND', message: viErrors.gameNotFound });
      return;
    }

    if (game.status !== 'lobby') {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'INVALID_STATE', message: 'Trò chơi đã bắt đầu hoặc đã kết thúc.' });
      return;
    }

    // Verify at least 2 teams are marked 'ready'
    const teams = teamRepo.findByGameId(gameId);
    const readyTeams = teams.filter((t) => t.status === 'ready');
    if (readyTeams.length < 2) {
      socket.emit(SOCKET_EVENTS.ERROR, {
        code: 'MINIMUM_TEAMS_REQUIRED',
        message: 'Cần tối thiểu 2 đội sẵn sàng để bắt đầu trò chơi.',
      });
      return;
    }

    // Safely clear any previously running countdown for this session
    const existingInterval = countdownIntervals.get(gameId);
    if (existingInterval) {
      clearInterval(existingInterval);
      countdownIntervals.delete(gameId);
    }

    // Broadcast transition to countdown phase
    emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_PHASE_CHANGE, {
      phase: 'countdown',
      roundNumber: 0,
    });

    let secondsLeft = 5;
    logger.info({ gameId }, 'Host initiated game start. Starting 5-second countdown.');

    // Send initial second count
    emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_COUNTDOWN, { seconds: secondsLeft });

    const interval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_COUNTDOWN, { seconds: secondsLeft });
      } else {
        clearInterval(interval);
        countdownIntervals.delete(gameId);

        try {
          // Transition DB status to 'playing' and increment round to 1
          gameRepo.update(gameId, { status: 'playing', currentRound: 1 });

          // Seed round 1 info
          const roundRepo = new RoundRepository(db);
          roundRepo.create({
            id: uuid(),
            gameId,
            roundNumber: 1,
            phase: 'decision',
            availableDecisionsJson: JSON.stringify(DEFAULT_DECISIONS),
            eventId: null,
            narrationText: null,
          });

          logger.info({ gameId }, 'Countdown complete. Game session initialized to Round 1 (playing).');

          // Broadcast transition to decision phase
          emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_PHASE_CHANGE, {
            phase: 'decision',
            roundNumber: 1,
          });

          // Broadcast decision round starting variables
          emitToRoom(`room:${gameId}`, SOCKET_EVENTS.ROUND_START, {
            roundNumber: 1,
            decisions: DEFAULT_DECISIONS,
            timeLimit: game.roundDurationSec,
          });
        } catch (err) {
          logger.error({ gameId, err }, 'Failed to transition game to playing state after countdown.');
          socket.emit(SOCKET_EVENTS.ERROR, { code: 'SERVER_ERROR', message: viErrors.serverError });
        }
      }
    }, 1000);

    countdownIntervals.set(gameId, interval);
  });

  // 2. Handle host:pause
  socket.on(SOCKET_EVENTS.HOST_PAUSE, () => {
    if (role !== 'host' || !gameId) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'FORBIDDEN', message: viErrors.forbidden });
      return;
    }

    const db = getDatabase();
    const gameRepo = new GameRepository(db);
    const game = gameRepo.findById(gameId);
    if (!game) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'GAME_NOT_FOUND', message: viErrors.gameNotFound });
      return;
    }

    if (game.status !== 'playing') {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'INVALID_STATE', message: 'Trò chơi phải đang chạy để tạm dừng.' });
      return;
    }

    try {
      // Update session status to paused
      gameRepo.update(gameId, { status: 'paused' });
      logger.info({ gameId }, 'Host paused the game.');

      const roundRepo = new RoundRepository(db);
      const round = roundRepo.findByGameIdAndRoundNumber(gameId, game.currentRound);
      const currentPhase = round?.phase ?? 'decision';

      // Emit transition with paused metadata attached
      emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_PHASE_CHANGE, {
        phase: currentPhase,
        roundNumber: game.currentRound,
        data: { paused: true },
      });
    } catch (err) {
      logger.error({ gameId, err }, 'Failed to update game status to paused.');
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'SERVER_ERROR', message: viErrors.serverError });
    }
  });

  // 3. Handle host:resume
  socket.on(SOCKET_EVENTS.HOST_RESUME, () => {
    if (role !== 'host' || !gameId) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'FORBIDDEN', message: viErrors.forbidden });
      return;
    }

    const db = getDatabase();
    const gameRepo = new GameRepository(db);
    const game = gameRepo.findById(gameId);
    if (!game) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'GAME_NOT_FOUND', message: viErrors.gameNotFound });
      return;
    }

    if (game.status !== 'paused') {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'INVALID_STATE', message: 'Trò chơi phải đang tạm dừng để tiếp tục.' });
      return;
    }

    try {
      // Resume game session status in DB
      gameRepo.update(gameId, { status: 'playing' });
      logger.info({ gameId }, 'Host resumed the game.');

      const roundRepo = new RoundRepository(db);
      const round = roundRepo.findByGameIdAndRoundNumber(gameId, game.currentRound);
      const currentPhase = round?.phase ?? 'decision';

      // Emit phase update representing resumed status
      emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_PHASE_CHANGE, {
        phase: currentPhase,
        roundNumber: game.currentRound,
        data: { paused: false },
      });
    } catch (err) {
      logger.error({ gameId, err }, 'Failed to update game status to playing.');
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'SERVER_ERROR', message: viErrors.serverError });
    }
  });

  // 4. Handle host:next-phase
  socket.on(SOCKET_EVENTS.HOST_NEXT_PHASE, () => {
    if (role !== 'host' || !gameId) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'FORBIDDEN', message: viErrors.forbidden });
      return;
    }

    const db = getDatabase();
    const gameRepo = new GameRepository(db);
    const game = gameRepo.findById(gameId);
    if (!game) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'GAME_NOT_FOUND', message: viErrors.gameNotFound });
      return;
    }

    if (game.status !== 'playing') {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'INVALID_STATE', message: 'Trò chơi phải đang hoạt động để chuyển phase.' });
      return;
    }

    const roundRepo = new RoundRepository(db);
    const round = roundRepo.findByGameIdAndRoundNumber(gameId, game.currentRound);
    if (!round) {
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'ROUND_NOT_FOUND', message: 'Không tìm thấy thông tin vòng chơi hiện tại.' });
      return;
    }

    try {
      let nextPhase: GamePhase;
      let nextRoundNumber = game.currentRound;
      let isGameOver = false;

      // Determine next phase based on round sequence:
      // decision -> event -> narration -> quiz (rounds 3, 5, 7) or results -> decision (increment round) or finished
      if (round.phase === 'decision') {
        nextPhase = 'event';
      } else if (round.phase === 'event') {
        nextPhase = 'narration';
      } else if (round.phase === 'narration') {
        const hasQuiz = game.currentRound === 3 || game.currentRound === 5 || game.currentRound === 7;
        nextPhase = hasQuiz ? 'quiz' : 'results';
      } else if (round.phase === 'quiz') {
        nextPhase = 'results';
      } else if (round.phase === 'results') {
        if (game.currentRound < game.totalRounds) {
          nextRoundNumber = game.currentRound + 1;
          nextPhase = 'decision';
        } else {
          nextPhase = 'finished';
          isGameOver = true;
        }
      } else {
        socket.emit(SOCKET_EVENTS.ERROR, { code: 'INVALID_STATE', message: 'Vòng chơi hiện tại đang ở trạng thái không xác định.' });
        return;
      }

      logger.info({ gameId, fromPhase: round.phase, nextPhase, nextRoundNumber }, 'Advancing game phase.');

      if (isGameOver) {
        // Complete the game and calculate scoreboard ranking
        gameRepo.update(gameId, { status: 'finished' });

        emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_PHASE_CHANGE, {
          phase: 'finished',
          roundNumber: game.currentRound,
        });

        const teamRepo = new TeamRepository(db);
        const teams = teamRepo.findByGameId(gameId);
        const sortedTeams = [...teams].sort((a, b) => b.totalScore - a.totalScore);
        const finalLeaderboard: LeaderboardEntry[] = sortedTeams.map((t, idx) => ({
          rank: idx + 1,
          teamId: t.id,
          teamName: t.name,
          teamNumber: t.teamNumber,
          totalScore: t.totalScore,
          marketShare: t.marketShare,
          monopolyRisk: t.monopolyRisk,
          rankChange: 'same',
        }));

        emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_OVER, {
          finalLeaderboard,
          gameStats: { totalTeams: teams.length, roundsPlayed: game.totalRounds },
        });
      } else if (nextPhase === 'decision') {
        // Set new round info in DB
        gameRepo.update(gameId, { currentRound: nextRoundNumber });
        roundRepo.create({
          id: uuid(),
          gameId,
          roundNumber: nextRoundNumber,
          phase: 'decision',
          availableDecisionsJson: JSON.stringify(DEFAULT_DECISIONS),
          eventId: null,
          narrationText: null,
        });

        // Broadcast decision round starting variables
        emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_PHASE_CHANGE, {
          phase: 'decision',
          roundNumber: nextRoundNumber,
        });

        emitToRoom(`room:${gameId}`, SOCKET_EVENTS.ROUND_START, {
          roundNumber: nextRoundNumber,
          decisions: DEFAULT_DECISIONS,
          timeLimit: game.roundDurationSec,
        });
      } else {
        // Transition within the current round
        roundRepo.update(round.id, { phase: nextPhase as 'decision' | 'event' | 'quiz' | 'narration' | 'results' });

        emitToRoom(`room:${gameId}`, SOCKET_EVENTS.GAME_PHASE_CHANGE, {
          phase: nextPhase,
          roundNumber: game.currentRound,
        });
      }
    } catch (err) {
      logger.error({ gameId, err }, 'Failed to advance game phase.');
      socket.emit(SOCKET_EVENTS.ERROR, { code: 'SERVER_ERROR', message: viErrors.serverError });
    }
  });
}
