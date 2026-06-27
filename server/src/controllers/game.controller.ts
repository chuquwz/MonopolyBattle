import type { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { GameService } from '../services/game.service.js';
import { TeamService } from '../services/team.service.js';
import { PlayerRepository } from '../repositories/player.repository.js';
import { AuthRequest } from '../middleware/auth.middleware.js';
import { AppError, viErrors } from '../utils/errors.js';

// Input validation schema
export const createGameSchema = z.object({
  totalRounds: z.number().int().min(1).max(20).default(8),
  roundDurationSec: z.number().int().min(10).max(300).default(60),
  quizEnabled: z.boolean().default(true),
});

export class GameController {
  constructor(
    private readonly gameService: GameService,
    private readonly teamService: TeamService,
    private readonly playerRepo: PlayerRepository
  ) {}

  /**
   * POST /api/games
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

      // Generate a new JWT for the host including this game ID
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

  /**
   * GET /api/games/:id
   * Fetch game state. Accessible by players, host, or projector.
   */
  getGame = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.user) {
        throw new AppError(viErrors.unauthorized, 401, 'UNAUTHORIZED');
      }

      // Check if user is authorized for this specific game
      if (req.user.gameId !== id) {
        throw new AppError(viErrors.forbidden, 403, 'FORBIDDEN_GAME_ACCESS');
      }

      const game = await this.gameService.getGameById(id);
      const teams = await this.teamService.getTeamsByGameId(id);

      if (req.user.role === 'player') {
        const teamId = req.user.teamId;
        const myTeam = teams.find((t) => t.id === teamId);

        // Sanitize other teams' metrics for public/competitor display
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
        // Gather players list inside the game
        const playersList: any[] = [];
        teams.forEach((t) => {
          const players = this.playerRepo.findByTeamId(t.id);
          playersList.push(...players);
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
            settings: JSON.parse(game.settingsJson),
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
          players: playersList.map((p) => ({
            id: p.id,
            teamId: p.teamId,
            displayName: p.displayName,
            isConnected: p.isConnected === 1,
            lastSeen: p.lastSeen,
          })),
        });
      }
    } catch (error) {
      next(error);
    }
  };
}
