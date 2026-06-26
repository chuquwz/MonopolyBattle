export type GamePhase =
  | 'lobby'
  | 'countdown'
  | 'decision'
  | 'processing'
  | 'event'
  | 'narration'
  | 'quiz'
  | 'results'
  | 'finished';

export type UserRole = 'player' | 'host' | 'projector';

export interface TeamMetrics {
  id: string;
  name: string;
  money: number;
  marketShare: number;
  technology: number;
  reputation: number;
  monopolyRisk: number;
  totalScore: number;
  quizScore: number;
  status: 'waiting' | 'ready' | 'playing' | 'eliminated';
  teamNumber: number;
}

export interface PlayerInfo {
  id: string;
  teamId: string;
  displayName: string;
  isConnected: boolean;
  lastSeen?: string;
}

export interface Decision {
  id: string;
  type: string;
  nameVi: string;
  descriptionVi: string;
  cost: number;
  effects: {
    money: number;
    marketShare: number;
    technology: number;
    reputation: number;
    monopolyRisk: number;
  };
}

export interface GameEvent {
  id: string;
  type: string;
  titleVi: string;
  descriptionVi: string;
  effects: {
    money: number;
    marketShare: number;
    technology: number;
    reputation: number;
    monopolyRisk: number;
  };
  scope: 'all' | 'specific' | 'random';
}

export interface PublicTeamInfo {
  id: string;
  name: string;
  teamNumber: number;
  marketShare: number;
  monopolyRisk: number;
  totalScore: number;
  status: 'waiting' | 'ready' | 'playing' | 'eliminated';
}

export interface LeaderboardEntry {
  rank: number;
  teamId: string;
  teamName: string;
  teamNumber: number;
  totalScore: number;
  marketShare: number;
  monopolyRisk: number;
  rankChange: 'up' | 'down' | 'same';
}
