import type { GamePhase, PublicTeamInfo, LeaderboardEntry, Decision, GameEvent } from './game.types.js';

export const SOCKET_EVENTS = {
  // Client → Server
  PLAYER_JOIN: 'player:join',
  PLAYER_READY: 'player:ready',
  PLAYER_DECISION: 'player:decision',
  PLAYER_QUIZ_ANSWER: 'player:quiz-answer',
  HOST_CREATE_GAME: 'host:create-game',
  HOST_START_GAME: 'host:start-game',
  HOST_NEXT_PHASE: 'host:next-phase',
  HOST_TRIGGER_EVENT: 'host:trigger-event',
  HOST_PAUSE: 'host:pause',
  HOST_RESUME: 'host:resume',
  HOST_END_GAME: 'host:end-game',
  HOST_KICK_TEAM: 'host:kick-team',
  PROJECTOR_JOIN: 'projector:join',

  // Server → Client
  GAME_STATE_SYNC: 'game:state-sync',
  GAME_PHASE_CHANGE: 'game:phase-change',
  GAME_COUNTDOWN: 'game:countdown',
  ROUND_START: 'round:start',
  ROUND_TICK: 'round:tick',
  ROUND_DECISION_RECEIVED: 'round:decision-received',
  ROUND_RESULTS: 'round:results',
  EVENT_TRIGGERED: 'event:triggered',
  NARRATOR_MESSAGE: 'narrator:message',
  QUIZ_START: 'quiz:start',
  QUIZ_RESULTS: 'quiz:results',
  TEAM_JOINED: 'team:joined',
  TEAM_READY: 'team:ready',
  TEAM_STATS_UPDATE: 'team:stats-update',
  MONOPOLY_DETECTED: 'monopoly:detected',
  GAME_OVER: 'game:over',
  ERROR: 'error',
} as const;

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS];

// Payload interfaces
export interface PlayerJoinPayload {
  roomCode: string;
  teamName: string;
  playerName: string;
}

export interface PlayerReadyPayload {
  teamId: string;
}

export interface PlayerDecisionPayload {
  roundId: string;
  teamId: string;
  decisionType: string;
}

export interface PlayerQuizAnswerPayload {
  roundId: string;
  teamId: string;
  questionId: string;
  selectedOption: number;
  timeTakenMs: number;
}

export interface HostCreateGamePayload {
  totalRounds: number;
  roundDuration: number;
  quizEnabled: boolean;
}

export interface HostStartGamePayload {
  gameId: string;
}

export interface ProjectorJoinPayload {
  roomCode: string;
}

export interface GameStateSyncPayload {
  roomCode: string;
  connected: boolean;
  role: 'player' | 'host' | 'projector';
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  roundTimeLeft: number;
  myTeam: {
    id: string;
    name: string;
    money: number;
    marketShare: number;
    technology: number;
    reputation: number;
    monopolyRisk: number;
    totalScore: number;
  } | null;
  availableDecisions: Decision[];
  selectedDecision: string | null;
  currentEvent: GameEvent | null;
  narration: {
    text: string;
    isVisible: boolean;
    type: 'info' | 'warning' | 'education';
  };
  activeQuiz: {
    question: string;
    options: string[];
    timeLimit: number;
    answered: boolean;
  } | null;
  allTeams: PublicTeamInfo[];
  leaderboard: LeaderboardEntry[];
}
