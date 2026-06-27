import { v4 as uuid } from 'uuid';
import { TeamRepository } from '../repositories/team.repository.js';
import { PlayerRepository } from '../repositories/player.repository.js';
import { TeamEntity, PlayerEntity } from '../types/database.types.js';
import { AppError, viErrors } from '../utils/errors.js';

export class TeamService {
  constructor(
    private readonly teamRepo: TeamRepository,
    private readonly playerRepo: PlayerRepository
  ) {}

  /**
   * Checks if a team name is already taken in a specific game session.
   */
  async checkNameTaken(gameId: string, name: string): Promise<boolean> {
    const teams = this.teamRepo.findByGameId(gameId);
    // Case-insensitive check for team names
    const normalizedName = name.trim().toLowerCase();
    return teams.some((t) => t.name.trim().toLowerCase() === normalizedName);
  }

  /**
   * Registers a new team and its first player.
   */
  async registerTeam(params: {
    gameId: string;
    teamName: string;
    teamNumber: number;
  }): Promise<TeamEntity> {
    const isTaken = await this.checkNameTaken(params.gameId, params.teamName);
    if (isTaken) {
      throw new AppError(viErrors.teamNameTaken, 400, 'TEAM_NAME_TAKEN');
    }

    const team = this.teamRepo.create({
      id: uuid(),
      gameId: params.gameId,
      name: params.teamName.trim(),
      teamNumber: params.teamNumber,
      money: 10000,
      marketShare: 0.0,
      technology: 0,
      reputation: 0,
      monopolyRisk: 0,
      totalScore: 0,
      quizScore: 0,
      status: 'waiting',
    });

    return team;
  }

  /**
   * Lists all teams inside a game.
   */
  async getTeamsByGameId(gameId: string): Promise<TeamEntity[]> {
    return this.teamRepo.findByGameId(gameId);
  }
}
