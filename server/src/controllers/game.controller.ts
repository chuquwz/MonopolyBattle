import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { GameService } from '../services/game.service.js';
import { TeamService } from '../services/team.service.js';
import { PlayerRepository } from '../repositories/player.repository.js';
import { RoundRepository } from '../repositories/round.repository.js';
import { DecisionLogRepository } from '../repositories/decision-log.repository.js';
import { QuizAnswerRepository } from '../repositories/quiz-answer.repository.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AppError, GameNotFoundError, viErrors } from '../utils/errors.js';
import { getDatabase } from '../config/database.js';
import { generateEducationalSummary } from '../education/education.engine.js';
import { getEngine } from '../engine/game-engine.registry.js';
import { calculateFinalRanking } from '../engine/scoring.engine.js';
import type { InMemoryTeamState } from '../engine/game.engine.js';

// ---------------------------------------------------------------------------
// Input validation schemas
// ---------------------------------------------------------------------------

export const createGameSchema = z.object({
  totalRounds: z.number().int().min(1).max(20).default(8),
  roundDurationSec: z.number().int().min(10).max(300).default(60),
  quizEnabled: z.boolean().default(true),
});

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------

export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly teamService: TeamService,
    private readonly playerRepo: PlayerRepository
  ) {}

  // -------------------------------------------------------------------------
  // POST /api/games
  // -------------------------------------------------------------------------

  /**
   * Host creates a new game session.
   */
  create = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { totalRounds, roundDurationSec, quizEnabled } = createGameSchema.parse(req.body);

      const settingsJson = JSON.stringify({ quizEnabled });
      const game = await this.gameService.createGame({
        totalRounds,
        roundDurationSec,
        settingsJson,
      });

      const token = jwt.sign(
        {
          userId: 'host',
          role: 'host',
          gameId: game.id,
        },
        config.JWT_SECRET
      );

      res.status(201).json({
        success: true,
        token,
        game: {
          id: game.id,
          roomCode: game.roomCode,
          status: game.status,
          currentRound: game.currentRound,
          totalRounds: game.totalRounds,
          roundDurationSec: game.roundDurationSec,
          createdAt: game.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // -------------------------------------------------------------------------
  // GET /api/games/:id
  // -------------------------------------------------------------------------

  /**
   * Fetch game state. Accessible by players, host, or projector.
   */
  getGame = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };

      if (!req.user) {
        throw new AppError(viErrors.unauthorized, 401, 'UNAUTHORIZED');
      }

      if (req.user.gameId !== id) {
        throw new AppError(viErrors.forbidden, 403, 'FORBIDDEN_GAME_ACCESS');
      }

      const game = await this.gameService.getGameById(id);
      const teams = await this.teamService.getTeamsByGameId(id);

      if (req.user.role === 'player') {
        const teamId = req.user.teamId;
        const myTeam = teams.find((t) => t.id === teamId);

        const publicTeams = teams.map((t) => ({
          id: t.id,
          name: t.name,
          teamNumber: t.teamNumber,
          marketShare: t.marketShare,
          monopolyRisk: t.monopolyRisk,
          totalScore: t.totalScore,
          status: t.status,
        }));

        res.status(200).json({
          success: true,
          role: 'player',
          game: {
            id: game.id,
            roomCode: game.roomCode,
            status: game.status,
            currentRound: game.currentRound,
            totalRounds: game.totalRounds,
            roundDurationSec: game.roundDurationSec,
          },
          myTeam: myTeam
            ? {
                id: myTeam.id,
                name: myTeam.name,
                teamNumber: myTeam.teamNumber,
                money: myTeam.money,
                marketShare: myTeam.marketShare,
                technology: myTeam.technology,
                reputation: myTeam.reputation,
                monopolyRisk: myTeam.monopolyRisk,
                totalScore: myTeam.totalScore,
                quizScore: myTeam.quizScore,
                status: myTeam.status,
              }
            : null,
          allTeams: publicTeams,
        });
      } else {
        // Host or Projector receives all info (unsanitized)
        const playersList: Array<{
          id: string;
          teamId: string;
          displayName: string;
          isConnected: boolean;
          lastSeen: string;
        }> = [];

        teams.forEach((t) => {
          const players = this.playerRepo.findByTeamId(t.id);
          players.forEach((p) => {
            playersList.push({
              id: p.id,
              teamId: p.teamId,
              displayName: p.displayName,
              isConnected: p.isConnected === 1,
              lastSeen: p.lastSeen,
            });
          });
        });

        res.status(200).json({
          success: true,
          role: req.user.role,
          game: {
            id: game.id,
            roomCode: game.roomCode,
            status: game.status,
            currentRound: game.currentRound,
            totalRounds: game.totalRounds,
            roundDurationSec: game.roundDurationSec,
            settings: JSON.parse(game.settingsJson) as unknown,
            createdAt: game.createdAt,
            updatedAt: game.updatedAt,
          },
          teams: teams.map((t) => ({
            id: t.id,
            name: t.name,
            teamNumber: t.teamNumber,
            money: t.money,
            marketShare: t.marketShare,
            technology: t.technology,
            reputation: t.reputation,
            monopolyRisk: t.monopolyRisk,
            totalScore: t.totalScore,
            quizScore: t.quizScore,
            status: t.status,
            createdAt: t.createdAt,
          })),
          players: playersList,
        });
      }
    } catch (error) {
      next(error);
    }
  };

  // -------------------------------------------------------------------------
  // GET /api/games/:id/results
  // -------------------------------------------------------------------------

  /**
   * Returns the final game results:
   *  - leaderboard (all teams ranked)
   *  - statistics (aggregate metrics)
   *  - educationalSummary (concepts covered, quiz accuracy, highlights)
   *
   * Accessible by any authenticated user belonging to the game.
   * The game must be in 'finished' status; in-progress games return 409.
   */
  getResults = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params as { id: string };

      if (!req.user) {
        throw new AppError(viErrors.unauthorized, 401, 'UNAUTHORIZED');
      }

      if (req.user.gameId !== id) {
        throw new AppError(viErrors.forbidden, 403, 'FORBIDDEN_GAME_ACCESS');
      }

      const game = await this.gameService.getGameById(id);
      if (!game) {
        throw new GameNotFoundError();
      }

      if (game.status !== 'finished') {
        throw new AppError(
          'Trò chơi chưa kết thúc. Kết quả chỉ có thể xem sau khi trò chơi hoàn thành.',
          409,
          'GAME_NOT_FINISHED'
        );
      }

      const db = getDatabase();
      const teams = await this.teamService.getTeamsByGameId(id);
      const roundRepo = new RoundRepository(db);
      const decisionLogRepo = new DecisionLogRepository(db);
      const quizAnswerRepo = new QuizAnswerRepository(db);

      // -----------------------------------------------------------------------
      // 1. Final leaderboard
      // -----------------------------------------------------------------------

      const teamStates: InMemoryTeamState[] = teams.map((t) => ({
        id: t.id,
        name: t.name,
        teamNumber: t.teamNumber,
        money: t.money,
        marketShare: t.marketShare,
        technology: t.technology,
        reputation: t.reputation,
        monopolyRisk: t.monopolyRisk,
        status: t.status,
        totalScore: t.totalScore,
        quizScore: t.quizScore,
      }));

      // Check if the in-memory engine still has a final leaderboard (just finished)
      const engine = getEngine(id);
      const leaderboard = engine?.leaderboard.length
        ? engine.leaderboard
        : calculateFinalRanking(teamStates);

      // -----------------------------------------------------------------------
      // 2. Statistics
      // -----------------------------------------------------------------------

      const rounds = roundRepo.findMany({ gameId: id });
      const allDecisionLogs = rounds.flatMap((r) =>
        decisionLogRepo.findMany({ roundId: r.id })
      );

      // Most-chosen decision type
      const decisionCounts = new Map<string, number>();
      for (const log of allDecisionLogs) {
        decisionCounts.set(log.decisionType, (decisionCounts.get(log.decisionType) ?? 0) + 1);
      }
      const topDecision = [...decisionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      // Quiz accuracy across all teams
      const allQuizAnswers = rounds.flatMap((r) =>
        quizAnswerRepo.findMany({ roundId: r.id })
      );
      const totalQuizAnswers = allQuizAnswers.length;
      const correctQuizAnswers = allQuizAnswers.filter((a) => a.isCorrect === 1).length;
      const quizAccuracyPercent =
        totalQuizAnswers > 0
          ? Math.round((correctQuizAnswers / totalQuizAnswers) * 100)
          : 0;

      const avgScore =
        teams.length > 0
          ? Math.round(teams.reduce((sum, t) => sum + t.totalScore, 0) / teams.length)
          : 0;

      const statistics = {
        totalTeams: teams.length,
        roundsPlayed: game.currentRound,
        avgScore,
        topDecision,
        quizAccuracyPercent,
        totalQuizAnswers,
        correctQuizAnswers,
      };

      // -----------------------------------------------------------------------
      // 3. Educational summary
      //    Pull quiz records from DB (engine may already be removed from registry)
      // -----------------------------------------------------------------------

      const QUIZ_ROUNDS = [3, 5, 7];
      const quizRecords = rounds
        .filter((r) => QUIZ_ROUNDS.includes(r.roundNumber))
        .map((r) => {
          const answers = quizAnswerRepo.findMany({ roundId: r.id });
          const firstAnswer = answers[0];
          const conceptId = firstAnswer ? deriveConceptFromDifficulty(r.roundNumber) : 'MONOPOLY_DEFINITION';

          return {
            round: r.roundNumber,
            conceptId,
            result: {
              questionId: firstAnswer?.questionId ?? '',
              correctAnswer: -1, // Not stored in DB; correct answer is in the quiz bank
              explanation: '',
              teamResults: answers.map((a) => ({
                teamId: a.teamId,
                isCorrect: a.isCorrect === 1,
                scoreEarned: a.scoreEarned,
                timeTakenMs: a.timeTakenMs,
              })),
            },
          };
        });

      const educationalSummary = generateEducationalSummary(game.currentRound, quizRecords);

      res.status(200).json({
        success: true,
        gameId: id,
        leaderboard,
        statistics,
        educationalSummary,
      });
    } catch (error) {
      next(error);
    }
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Maps quiz round numbers to their concept IDs for the educational summary
 * when pulling data from DB (engine may be gone at query time).
 */
function deriveConceptFromDifficulty(round: number): string {
  if (round === 3) return 'MONOPOLY_DEFINITION';
  if (round === 5) return 'STATE_MONOPOLY_CAPITALISM';
  if (round === 7) return 'VIETNAM_CONTEXT';
  return 'MONOPOLY_DEFINITION';
}
