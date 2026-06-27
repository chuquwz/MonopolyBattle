import { v4 as uuid } from 'uuid';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { GameRepository } from '../repositories/game.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { PlayerRepository } from '../repositories/player.repository.js';
import { TeamService } from './team.service.js';
import { generateRoomCode } from '../utils/room-code.js';
import { GameEntity, TeamEntity, PlayerEntity } from '../types/database.types.js';
import { AppError, GameNotFoundError, viErrors } from '../utils/errors.js';

export interface JoinGameResult {
  player: PlayerEntity;
  team: TeamEntity;
  token: string;
}

export class GameService {
  constructor(
    private readonly gameRepo: GameRepository,
    private readonly teamRepo: TeamRepository,
    private readonly playerRepo: PlayerRepository,
    private readonly teamService: TeamService
  ) {}

  /**
   * Creates a new game session with a unique room code.
   */
  async createGame(params: {
    totalRounds?: number;
    roundDurationSec?: number;
    settingsJson?: string;
  }): Promise<GameEntity> {
    // Generate a unique room code
    let roomCode = generateRoomCode();
    let collisionCheck = this.gameRepo.findByRoomCode(roomCode);
    let attempts = 0;
    while (collisionCheck && attempts < 10) {
      roomCode = generateRoomCode();
      collisionCheck = this.gameRepo.findByRoomCode(roomCode);
      attempts++;
    }

    const game = this.gameRepo.create({
      id: uuid(),
      roomCode,
      hostPin: config.HOST_PIN, // PIN from central config
      status: 'lobby',
      currentRound: 0,
      totalRounds: params.totalRounds ?? 8,
      roundDurationSec: params.roundDurationSec ?? 60,
      settingsJson: params.settingsJson ?? JSON.stringify({ quizEnabled: true }),
    });

    return game;
  }

  /**
   * Registers a team and player to a game lobby using the room code.
   */
  async joinGame(params: {
    roomCode: string;
    teamName: string;
    playerName: string;
  }): Promise<JoinGameResult> {
    const normalizedRoomCode = params.roomCode.trim().toUpperCase();
    const game = this.gameRepo.findByRoomCode(normalizedRoomCode);
    if (!game) {
      throw new GameNotFoundError();
    }

    if (game.status !== 'lobby') {
      throw new AppError(viErrors.gameStarted, 400, 'GAME_ALREADY_STARTED');
    }

    const currentTeams = this.teamRepo.findByGameId(game.id);
    if (currentTeams.length >= 9) {
      throw new AppError(viErrors.lobbyFull, 400, 'LOBBY_FULL');
    }

    const teamNumber = currentTeams.length + 1;

    // Register team (validates name collision internally)
    const team = await this.teamService.registerTeam({
      gameId: game.id,
      teamName: params.teamName,
      teamNumber,
    });

    // Create player
    const player = this.playerRepo.create({
      id: uuid(),
      teamId: team.id,
      displayName: params.playerName.trim(),
      socketId: null,
      isConnected: 1,
    });

    // Generate JWT for the player
    const token = jwt.sign(
      {
        userId: player.id,
        role: 'player',
        gameId: game.id,
        teamId: team.id,
      },
      config.JWT_SECRET
    );

    return {
      player,
      team,
      token,
    };
  }

  /**
   * Fetches a game session by ID.
   */
  async getGameById(id: string): Promise<GameEntity> {
    const game = this.gameRepo.findById(id);
    if (!game) {
      throw new GameNotFoundError();
    }
    return game;
  }
}
