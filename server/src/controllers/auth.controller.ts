import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { config } from '../config/index.js';
import { GameService } from '../services/game.service.js';
import { AppError, viErrors } from '../utils/errors.js';

// Input validation schemas
export const hostAuthSchema = z.object({
  hostPin: z.string().length(6, 'Mã PIN host phải gồm đúng 6 ký tự'),
});

export const joinGameSchema = z.object({
  roomCode: z.string().length(6, 'Mã phòng phải gồm đúng 6 ký tự').toUpperCase(),
  teamName: z.string().min(2, 'Tên đội phải từ 2 đến 30 ký tự').max(30, 'Tên đội phải từ 2 đến 30 ký tự'),
  playerName: z.string().min(2, 'Tên người chơi phải từ 2 đến 30 ký tự').max(30, 'Tên người chơi phải từ 2 đến 30 ký tự'),
});

export class AuthController {
  constructor(private readonly gameService: GameService) {}

  /**
   * POST /api/auth/host
   * Authenticate host with PIN.
   */
  hostLogin = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { hostPin } = hostAuthSchema.parse(req.body);

      if (hostPin !== config.HOST_PIN) {
        throw new AppError(viErrors.unauthorized, 401, 'INVALID_HOST_PIN');
      }

      // Generate host JWT (no game ID associated yet)
      const token = jwt.sign(
        {
          userId: 'host',
          role: 'host',
          gameId: '',
        },
        config.JWT_SECRET
      );

      res.status(200).json({
        success: true,
        token,
        role: 'host',
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /api/auth/join
   * Player joins game with room code, team name, player name.
   */
  join = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsedData = joinGameSchema.parse(req.body);
      const result = await this.gameService.joinGame(parsedData);

      res.status(201).json({
        success: true,
        token: result.token,
        player: {
          id: result.player.id,
          displayName: result.player.displayName,
          isConnected: result.player.isConnected === 1,
        },
        team: {
          id: result.team.id,
          name: result.team.name,
          teamNumber: result.team.teamNumber,
          money: result.team.money,
          marketShare: result.team.marketShare,
          technology: result.team.technology,
          reputation: result.team.reputation,
          monopolyRisk: result.team.monopolyRisk,
          totalScore: result.team.totalScore,
          quizScore: result.team.quizScore,
          status: result.team.status,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}
