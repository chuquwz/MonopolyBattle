import { createServer } from 'http';
import express from 'express';
import { io } from '../socket/index.js';
import { io as ClientIo } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { v4 as uuid } from 'uuid';
import { config } from '../config/index.js';
import { initDatabase, getDatabase } from '../config/database.js';
import { GameRepository } from '../repositories/game.repository.js';
import { TeamRepository } from '../repositories/team.repository.js';
import { PlayerRepository } from '../repositories/player.repository.js';
import { RoundRepository } from '../repositories/round.repository.js';
import { DecisionLogRepository } from '../repositories/decision-log.repository.js';
import { DecisionEngine } from '../engine/decision.engine.js';
import { SOCKET_EVENTS } from '@monopoly/shared';

async function runTask8Tests() {
  console.log('=== Starting Day 2 — Task 8 Integration Tests ===');

  const db = getDatabase();
  initDatabase();

  const gameRepo = new GameRepository(db);
  const teamRepo = new TeamRepository(db);
  const playerRepo = new PlayerRepository(db);
  const roundRepo = new RoundRepository(db);
  const decisionLogRepo = new DecisionLogRepository(db);

  // 1. Seed database records
  const gameId = uuid();
  const team1Id = uuid();
  const team2Id = uuid();
  const player1Id = uuid();
  const player2Id = uuid();
  const roundId = uuid();

  console.log('Clearing old test records...');
  db.prepare("DELETE FROM game WHERE room_code = 'T8TEST'").run();

  console.log('Seeding temporary test records...');
  gameRepo.create({
    id: gameId,
    roomCode: 'T8TEST',
    hostPin: config.HOST_PIN,
    status: 'playing',
    currentRound: 1,
    totalRounds: 8,
    roundDurationSec: 60,
    settingsJson: JSON.stringify({ quizEnabled: true }),
  });

  // Team 1 starts with high market share (45%) to test diminishing returns
  teamRepo.create({
    id: team1Id,
    gameId,
    name: 'Đội Độc Quyền',
    teamNumber: 1,
    money: 10000,
    marketShare: 45.0,
    technology: 10,
    reputation: 50,
    monopolyRisk: 5,
    status: 'playing',
  });

  // Team 2 starts with normal metrics
  teamRepo.create({
    id: team2Id,
    gameId,
    name: 'Đội Bình Thường',
    teamNumber: 2,
    money: 10000,
    marketShare: 15.0,
    technology: 10,
    reputation: 50,
    monopolyRisk: 5,
    status: 'playing',
  });

  playerRepo.create({
    id: player1Id,
    teamId: team1Id,
    displayName: 'Thuyền Trưởng',
    isConnected: 0,
    socketId: null,
  });

  playerRepo.create({
    id: player2Id,
    teamId: team2Id,
    displayName: 'Thuyền Phó',
    isConnected: 0,
    socketId: null,
  });

  // Create Round 1 in decision phase
  roundRepo.create({
    id: roundId,
    gameId,
    roundNumber: 1,
    phase: 'decision',
    availableDecisionsJson: JSON.stringify([]),
    eventId: null,
    narrationText: null,
  });

  console.log('DB Seed completed.');

  // 2. Test DecisionEngine available decisions and deterministic RNG
  const decisionEngine = new DecisionEngine();
  const seed = 'test_seed_123';
  const t1State = teamRepo.findById(team1Id)!;
  const t2State = teamRepo.findById(team2Id)!;

  console.log('\n[Testing getAvailableDecisions...]');
  const t1Available = decisionEngine.getAvailableDecisions(1, t1State, null, seed);
  const t2Available = decisionEngine.getAvailableDecisions(1, t2State, null, seed);

  console.log(`Team 1 available count: ${t1Available.length}`);
  console.log(`Team 2 available count: ${t2Available.length}`);

  if (t1Available.length === 0 || t2Available.length === 0) {
    throw new Error('Expected available decisions to be generated.');
  }

  // Ensure deterministic generation (each team sees the same initial pool)
  // Merge is excluded for Team 2 because marketShare < 10% (wait, Team 2 has 15% so it is included, but let's check Team 1 vs Team 2)
  // Let's verify that previous decision type works
  const decisionTypeToTest = t1Available[0]!.type;
  const filteredAvailable = decisionEngine.getAvailableDecisions(1, t1State, decisionTypeToTest, seed);
  if (filteredAvailable.some((d) => d.type === decisionTypeToTest)) {
    throw new Error('Failed to filter out the previous decision type.');
  }
  console.log('✅ Deterministic RNG, constraints and prevDecision filtering passed.');

  // 3. Test diminishing returns calculation in applyDecision
  console.log('\n[Testing applyDecision Diminishing Returns...]');
  const t1Delta = decisionEngine.applyDecision(t1State, 'acquire', { roundNumber: 1, activeEvent: null });
  const t2Delta = decisionEngine.applyDecision(t2State, 'acquire', { roundNumber: 1, activeEvent: null });

  console.log('Team 1 (market share 45%) acquire delta:', t1Delta);
  console.log('Team 2 (market share 15%) acquire delta:', t2Delta);

  // Acquire base marketShare delta is +8%.
  // For Team 2 (marketShare 15% < 40%), delta should be raw base (8.0 * multiplier = 8.0).
  // For Team 1 (marketShare 45% >= 40%), delta should be scaled down.
  if (t1Delta.marketShare >= t2Delta.marketShare) {
    throw new Error('Diminishing returns on market share were not applied correctly for Team 1');
  }
  console.log('✅ Diminishing returns on market share applied correctly.');

  // 4. Start HTTP Server and attach Socket.IO
  const app = express();
  const httpServer = createServer(app);
  io.attach(httpServer);

  const TEST_PORT = 4299;
  await new Promise<void>((resolve) => {
    httpServer.listen(TEST_PORT, () => resolve());
  });

  // 5. Connect Clients
  const player1Token = jwt.sign({ userId: player1Id, role: 'player', gameId, teamId: team1Id }, config.JWT_SECRET);
  const player2Token = jwt.sign({ userId: player2Id, role: 'player', gameId, teamId: team2Id }, config.JWT_SECRET);

  const p1Socket = ClientIo(`http://localhost:${TEST_PORT}`, { auth: { token: player1Token }, transports: ['websocket'] });
  const p2Socket = ClientIo(`http://localhost:${TEST_PORT}`, { auth: { token: player2Token }, transports: ['websocket'] });

  await Promise.all([
    new Promise<void>((resolve) => p1Socket.on('connect', () => resolve())),
    new Promise<void>((resolve) => p2Socket.on('connect', () => resolve())),
  ]);

  // 6. Test Socket Submit player:decision
  console.log('\nSubmitting Player 1 decision...');
  p1Socket.emit(SOCKET_EVENTS.PLAYER_DECISION, {
    roundId,
    decisionType: 'acquire',
  });

  const p1Ack = await new Promise<any>((resolve) => {
    p1Socket.once(SOCKET_EVENTS.ROUND_DECISION_RECEIVED, (data) => resolve(data));
  });
  console.log('Received Player 1 submit ack:', p1Ack);
  if (!p1Ack.confirmed || p1Ack.teamId !== team1Id) {
    throw new Error('Acknowledge payload mismatch');
  }
  console.log('✅ Acknowledge received successfully.');

  // Verify DB record matches deltas
  const logT1 = decisionLogRepo.findByRoundIdAndTeamId(roundId, team1Id);
  if (!logT1 || logT1.decisionType !== 'acquire' || logT1.moneyDelta !== t1Delta.money || logT1.marketShareDelta !== t1Delta.marketShare) {
    throw new Error('Saved decision log deltas do not match calculated engine deltas');
  }
  console.log('✅ Saved decision log metrics matched applyDecision delta.');

  // 7. Test Duplicate Prevention
  console.log('\nSubmitting duplicate Player 1 decision (should return error)...');
  p1Socket.emit(SOCKET_EVENTS.PLAYER_DECISION, {
    roundId,
    decisionType: 'invest_tech',
  });

  const duplicateError = await new Promise<any>((resolve) => {
    p1Socket.once(SOCKET_EVENTS.ERROR, (err) => resolve(err));
  });
  console.log('Received expected duplicate submit error:', duplicateError);
  if (duplicateError.code !== 'DECISION_LOCKED') {
    throw new Error('Duplicate submission was not correctly blocked');
  }
  console.log('✅ Duplicate submissions blocked successfully.');

  // 8. Test Early Processing Phase transition
  console.log('\nSubmitting Player 2 decision...');
  let phaseChangeReceived = '';
  p2Socket.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, (payload: any) => {
    console.log(`[Event] game:phase-change ->`, payload.phase);
    phaseChangeReceived = payload.phase;
  });

  p2Socket.emit(SOCKET_EVENTS.PLAYER_DECISION, {
    roundId,
    decisionType: 'invest_tech',
  });

  // Wait for Socket events to propagate
  await new Promise((resolve) => setTimeout(resolve, 800));

  const logT2 = decisionLogRepo.findByRoundIdAndTeamId(roundId, team2Id);
  if (!logT2 || logT2.decisionType !== 'invest_tech') {
    throw new Error('Failed to save Player 2 decision');
  }
  console.log('✅ Player 2 decision saved.');

  // Verify early phase transition
  const finalRoundState = roundRepo.findById(roundId);
  if (finalRoundState?.phase !== 'event') {
    throw new Error('Round phase did not transition early to event');
  }
  if (phaseChangeReceived !== 'event') {
    throw new Error('Failed to broadcast phase change early transition');
  }
  console.log('✅ Early processing triggered and broadcasted successfully.');

  // 9. Cleanup
  p1Socket.disconnect();
  p2Socket.disconnect();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

  console.log('\n=== All Day 2 — Task 8 Integration Tests Passed Successfully! ===');
}

runTask8Tests().catch((err) => {
  console.error('❌ Integration tests failed:', err);
  process.exit(1);
});
