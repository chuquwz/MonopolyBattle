import { TeamMetrics, PlayerInfo } from './game.types.js';

export interface TeamWithPlayers {
  team: TeamMetrics;
  players: PlayerInfo[];
}

export interface JoinGameResult {
  player: PlayerInfo;
  team: TeamMetrics;
  token: string;
}
