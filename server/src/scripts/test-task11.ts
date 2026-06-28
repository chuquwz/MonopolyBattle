import { calculateRoundScore, calculateLeaderboard, calculateFinalRanking, SCORING_WEIGHTS } from '../engine/scoring.engine.js';
import { ServerGameState, GameEngineCallbacks } from '../engine/game.engine.js';
import { LeaderboardEntry } from '@monopoly/shared';
import { v4 as uuid } from 'uuid';
import Database from 'better-sqlite3';

export class LocalTeamRepository {
  constructor(private db: Database.Database) {}
  findById(id: string) {
    const row = this.db.prepare('SELECT * FROM team WHERE id = ?').get(id) as any;
    return row ? { id: row.id, totalScore: row.total_score } : null;
  }
}

async function runTask11Tests() {
  console.log('=== Starting Day 3 — Task 11 Scoring Engine Tests ===');

  const mockTeam = {
    id: 'team_1',
    name: 'Đội A',
    teamNumber: 1,
    money: 12000,
    marketShare: 35.0,
    technology: 20, // < 30
    reputation: 25, // < 30
    monopolyRisk: 60, // > 50 (triggers monopoly penalty)
    status: 'playing',
    totalScore: 100,
  };

  // Test 1: Subscore calculations
  // Expected values:
  // - moneyScore = 12000 * 0.001 = 12
  // - marketShareScore = 35 * 2 = 70
  // - technologyScore = 20 * 0.5 = 10
  // - reputationScore = 25 * 0.5 = 12.5
  // - monopolyPenalty = (60 - 50) * 0.2 = 2
  // Let's test with decision = 'invest_tech' (triggers +10 bonus for low tech)
  console.log('Testing subscore calculation and tech bonus...');
  const res1 = calculateRoundScore(mockTeam, 'invest_tech', { roundNumber: 1, activeEvent: null });
  if (res1.moneyScore !== 12 || res1.marketShareScore !== 70 || res1.technologyScore !== 10 || res1.reputationScore !== 12.5) {
    throw new Error(`Subscore calculation mismatch: ${JSON.stringify(res1)}`);
  }
  if (res1.monopolyPenalty !== 2) {
    throw new Error(`Monopoly penalty mismatch: expected 2, got ${res1.monopolyPenalty}`);
  }
  if (res1.bonusPoints !== 10) {
    throw new Error(`Bonus points mismatch: expected 10, got ${res1.bonusPoints}`);
  }
  // businessScore = 12 + 70 + 10 + 12.5 = 104.5
  // totalRoundScore = round(104.5 + 10 - 2) = round(112.5) = 113
  if (res1.totalRoundScore !== 113) {
    throw new Error(`Total round score mismatch: expected 113, got ${res1.totalRoundScore}`);
  }
  console.log('✅ Tech bonus and subscore calculations verified.');

  // Test 2: Economic crisis price reduce bonus
  console.log('Testing crisis price reduction bonus...');
  const res2 = calculateRoundScore(mockTeam, 'reduce_prices', { roundNumber: 1, activeEvent: { type: 'crisis' } });
  if (res2.bonusPoints !== 8) {
    throw new Error(`Crisis price reduction bonus mismatch: expected 8, got ${res2.bonusPoints}`);
  }
  console.log('✅ Crisis price reduction bonus verified.');

  // Test 3: Lobby low reputation penalty
  console.log('Testing lobby low reputation penalty...');
  const res3 = calculateRoundScore(mockTeam, 'lobby', { roundNumber: 1, activeEvent: null });
  if (res3.bonusPoints !== -5) {
    throw new Error(`Lobby penalty mismatch: expected -5, got ${res3.bonusPoints}`);
  }
  console.log('✅ Lobby penalty verified.');

  // Test 4: Leaderboard stable tie-breaking and rank changes
  console.log('Testing leaderboard ranking & tie-breakers...');
  const teams = [
    { ...mockTeam, id: 'team_a', name: 'Đội A', teamNumber: 1, totalScore: 150, marketShare: 30.0 },
    { ...mockTeam, id: 'team_b', name: 'Đội B', teamNumber: 2, totalScore: 150, marketShare: 30.0 }, // tied score & MS -> team_a should rank 1, team_b rank 2
    { ...mockTeam, id: 'team_c', name: 'Đội C', teamNumber: 3, totalScore: 150, marketShare: 35.0 }, // tied score, higher MS -> should rank 1
  ];

  const prevLeaderboard: LeaderboardEntry[] = [
    { rank: 3, teamId: 'team_c', teamName: 'Đội C', teamNumber: 3, totalScore: 100, marketShare: 30.0, monopolyRisk: 10, rankChange: 'same' },
    { rank: 1, teamId: 'team_b', teamName: 'Đội B', teamNumber: 2, totalScore: 100, marketShare: 30.0, monopolyRisk: 10, rankChange: 'same' },
    { rank: 2, teamId: 'team_a', teamName: 'Đội A', teamNumber: 1, totalScore: 100, marketShare: 30.0, monopolyRisk: 10, rankChange: 'same' },
  ];

  const currentLeaderboard = calculateLeaderboard(teams, prevLeaderboard);

  // Expected ranks:
  // 1: Team C (marketShare 35) - Rank went from 3 to 1 -> 'up'
  // 2: Team A (teamNumber 1)   - Rank went from 2 to 2 -> 'same'
  // 3: Team B (teamNumber 2)   - Rank went from 1 to 3 -> 'down'
  if (currentLeaderboard[0]?.teamId !== 'team_c' || currentLeaderboard[0].rankChange !== 'up') {
    throw new Error(`Team C ranking mismatch: ${JSON.stringify(currentLeaderboard[0])}`);
  }
  if (currentLeaderboard[1]?.teamId !== 'team_a' || currentLeaderboard[1].rankChange !== 'same') {
    throw new Error(`Team A ranking mismatch: ${JSON.stringify(currentLeaderboard[1])}`);
  }
  if (currentLeaderboard[2]?.teamId !== 'team_b' || currentLeaderboard[2].rankChange !== 'down') {
    throw new Error(`Team B ranking mismatch: ${JSON.stringify(currentLeaderboard[2])}`);
  }
  console.log('✅ Leaderboard stable tie-breaking and rank changes verified.');

  // Test 5: GameEngine Integration & Persistence
  console.log('Testing integration in GameEngine.processRound()...');
  const memDb = new Database(':memory:');
  memDb.exec(`
    CREATE TABLE game (
      id TEXT PRIMARY KEY,
      room_code TEXT UNIQUE,
      status TEXT,
      current_round INTEGER,
      total_rounds INTEGER,
      round_duration_sec INTEGER
    );
    CREATE TABLE team (
      id TEXT PRIMARY KEY,
      game_id TEXT,
      name TEXT,
      team_number INTEGER,
      money INTEGER,
      market_share REAL,
      technology INTEGER,
      reputation INTEGER,
      monopoly_risk INTEGER,
      total_score INTEGER,
      quiz_score INTEGER,
      status TEXT,
      created_at TEXT
    );
    CREATE TABLE round (
      id TEXT PRIMARY KEY,
      game_id TEXT,
      round_number INTEGER,
      phase TEXT,
      available_decisions_json TEXT,
      event_id TEXT,
      narration_text TEXT,
      started_at TEXT,
      ended_at TEXT
    );
    CREATE TABLE decision_log (
      id TEXT PRIMARY KEY,
      round_id TEXT,
      team_id TEXT,
      decision_type TEXT,
      decision_data_json TEXT,
      money_delta INTEGER,
      market_share_delta REAL,
      technology_delta INTEGER,
      reputation_delta INTEGER,
      monopoly_risk_delta INTEGER,
      score_earned INTEGER,
      created_at TEXT
    );
    CREATE TABLE round_event (
      id TEXT PRIMARY KEY,
      round_id TEXT,
      event_type TEXT,
      event_data_json TEXT,
      narration_text TEXT,
      created_at TEXT
    );
  `);

  const gameId = uuid();
  const roundId = uuid();
  const teamId = uuid();

  memDb.prepare('INSERT INTO game (id, room_code, status, current_round, total_rounds, round_duration_sec) VALUES (?, ?, ?, ?, ?, ?)')
    .run(gameId, 'SCORIN', 'playing', 1, 8, 60);

  memDb.prepare('INSERT INTO round (id, game_id, round_number, phase, available_decisions_json) VALUES (?, ?, ?, ?, ?)')
    .run(roundId, gameId, 1, 'decision', '[]');

  // Insert Team starting with totalScore = 100
  memDb.prepare('INSERT INTO team (id, game_id, name, team_number, money, market_share, technology, reputation, monopoly_risk, total_score, quiz_score, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(teamId, gameId, 'Đội Alpha', 1, 10000, 30.0, 10, 50, 20, 100, 0, 'playing');

  const callbacks: GameEngineCallbacks = {
    onRoundStart: () => {},
    onRoundTick: () => {},
    onPhaseChange: () => {},
    onGameOver: () => {},
  };

  const engine = new ServerGameState(gameId, 'scoring_test_seed_fixed', callbacks, memDb);
  engine.registerTeam({
    id: teamId,
    name: 'Đội Alpha',
    teamNumber: 1,
    money: 10000,
    marketShare: 30.0,
    technology: 10,
    reputation: 50,
    monopolyRisk: 20,
    status: 'playing',
    totalScore: 100, // Starts with 100 points
  });

  engine.currentRound = 1;
  engine.phase = 'decision';
  engine.submitDecision(teamId, 'invest_tech');

  // Trigger processing
  engine.processRound();

  // Verify that team.totalScore is updated in-memory and database
  const inMemoryTeam = engine.teams.get(teamId)!;
  console.log(`In-memory Team totalScore: ${inMemoryTeam.totalScore}`);
  if (inMemoryTeam.totalScore === 100) {
    throw new Error('In-memory team totalScore did not change after processRound!');
  }

  const teamRepo = new LocalTeamRepository(memDb);
  const dbTeam = teamRepo.findById(teamId)!;
  console.log(`Database Team totalScore: ${dbTeam.totalScore}`);
  if (dbTeam.totalScore !== inMemoryTeam.totalScore) {
    throw new Error(`DB team score (${dbTeam.totalScore}) does not match in-memory team score (${inMemoryTeam.totalScore})`);
  }

  console.log('✅ Integration inside processRound() and DB score persistence verified.');
  console.log('=== All Day 3 — Task 11 Scoring Engine Tests Passed Successfully! ===');
}

runTask11Tests().catch((err) => {
  console.error('❌ Verification failed:', err);
  process.exit(1);
});
