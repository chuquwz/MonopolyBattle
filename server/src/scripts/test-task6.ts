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
import { SOCKET_EVENTS } from '@monopoly/shared';

async function runTask6Tests() {
  console.log('=== Starting Day 2 — Task 6 Integration Tests ===');

  const db = getDatabase();
  initDatabase();

  const gameRepo = new GameRepository(db);
  const teamRepo = new TeamRepository(db);
  const playerRepo = new PlayerRepository(db);
  const roundRepo = new RoundRepository(db);

  // 1. Seed necessary test database rows (Game, 2 Teams, 2 Players)
  const gameId = uuid();
  const team1Id = uuid();
  const team2Id = uuid();
  const player1Id = uuid();
  const player2Id = uuid();

  console.log('Clearing old test records...');
  db.prepare("DELETE FROM game WHERE room_code = 'T6TEST'").run();

  console.log('Seeding temporary test records...');
  gameRepo.create({
    id: gameId,
    roomCode: 'T6TEST',
    hostPin: config.HOST_PIN,
    status: 'lobby',
    currentRound: 0,
    totalRounds: 3, // Set to 3 rounds for faster testing
    roundDurationSec: 10,
    settingsJson: JSON.stringify({ quizEnabled: true }),
  });

  teamRepo.create({
    id: team1Id,
    gameId,
    name: 'Đội Test 1',
    teamNumber: 1,
    money: 10000,
    marketShare: 50.0,
    status: 'waiting',
  });

  teamRepo.create({
    id: team2Id,
    gameId,
    name: 'Đội Test 2',
    teamNumber: 2,
    money: 10000,
    marketShare: 50.0,
    status: 'waiting',
  });

  playerRepo.create({
    id: player1Id,
    teamId: team1Id,
    displayName: 'Người chơi 1',
    isConnected: 0,
    socketId: null,
  });

  playerRepo.create({
    id: player2Id,
    teamId: team2Id,
    displayName: 'Người chơi 2',
    isConnected: 0,
    socketId: null,
  });
  console.log('DB Seed completed.');

  // 2. Start HTTP Server and attach Socket.IO
  const app = express();
  const httpServer = createServer(app);
  io.attach(httpServer);

  const TEST_PORT = 4199;
  await new Promise<void>((resolve) => {
    httpServer.listen(TEST_PORT, () => resolve());
  });
  console.log(`Server started listening on port ${TEST_PORT}`);

  // 3. Generate tokens
  const hostToken = jwt.sign({ userId: 'host', role: 'host', gameId }, config.JWT_SECRET);
  const player1Token = jwt.sign({ userId: player1Id, role: 'player', gameId, teamId: team1Id }, config.JWT_SECRET);
  const player2Token = jwt.sign({ userId: player2Id, role: 'player', gameId, teamId: team2Id }, config.JWT_SECRET);
  const projectorToken = jwt.sign({ userId: 'proj', role: 'projector', gameId }, config.JWT_SECRET);

  // 4. Connect Clients
  console.log('Connecting clients...');
  const hostSocket = ClientIo(`http://localhost:${TEST_PORT}`, { auth: { token: hostToken }, transports: ['websocket'] });
  const p1Socket = ClientIo(`http://localhost:${TEST_PORT}`, { auth: { token: player1Token }, transports: ['websocket'] });
  const p2Socket = ClientIo(`http://localhost:${TEST_PORT}`, { auth: { token: player2Token }, transports: ['websocket'] });
  const projectorSocket = ClientIo(`http://localhost:${TEST_PORT}`, { auth: { token: projectorToken }, transports: ['websocket'] });

  await Promise.all([
    new Promise<void>((resolve) => hostSocket.on('connect', () => resolve())),
    new Promise<void>((resolve) => p1Socket.on('connect', () => resolve())),
    new Promise<void>((resolve) => p2Socket.on('connect', () => resolve())),
    new Promise<void>((resolve) => projectorSocket.on('connect', () => resolve())),
  ]);
  console.log('All 4 clients connected successfully.');

  // Verify Player 1 socket connection registered in DB
  const dbPlayer1 = playerRepo.findById(player1Id);
  if (!dbPlayer1 || dbPlayer1.isConnected !== 1 || !dbPlayer1.socketId) {
    throw new Error('Player 1 database connection record not updated correctly');
  }
  console.log('✅ Player 1 connection attributes saved in DB.');

  // 5. Test Projector Join
  projectorSocket.emit(SOCKET_EVENTS.PROJECTOR_JOIN);
  await new Promise((resolve) => setTimeout(resolve, 300)); // Wait for room join to complete
  const localProjectorSocket = io.sockets.sockets.get(projectorSocket.id || '');
  if (!localProjectorSocket || !Array.from(localProjectorSocket.rooms).includes(`projector:${gameId}`)) {
    throw new Error('Projector failed to join projector room');
  }
  console.log('✅ Projector room joined successfully.');

  // 6. Test player:ready status transitions
  const testState = { p1ReadyCountReceived: 0 };
  p1Socket.on(SOCKET_EVENTS.TEAM_READY, (payload: any) => {
    console.log(`Received team:ready event:`, payload);
    testState.p1ReadyCountReceived = payload.readyCount;
  });

  console.log('Emitting player:ready for Player 1...');
  p1Socket.emit(SOCKET_EVENTS.PLAYER_READY);
  await new Promise((resolve) => setTimeout(resolve, 500));
  if ((testState.p1ReadyCountReceived as number) !== 1) {
    throw new Error('Expected ready count to be 1 after Player 1 ready.');
  }

  // Attempt to start game with only 1 team ready (should return error)
  console.log('Testing host:start-game validation with only 1 team ready...');
  hostSocket.emit(SOCKET_EVENTS.HOST_START_GAME);
  const startError = await new Promise<any>((resolve) => {
    hostSocket.once(SOCKET_EVENTS.ERROR, (err) => resolve(err));
  });
  console.log('Host received expected error:', startError);
  if (startError.code !== 'MINIMUM_TEAMS_REQUIRED') {
    throw new Error('Failed validation: Game allowed to start with only 1 team ready');
  }
  console.log('✅ Host starts game validation blocks start.');

  // Mark Player 2 ready
  console.log('Emitting player:ready for Player 2...');
  p2Socket.emit(SOCKET_EVENTS.PLAYER_READY);
  await new Promise((resolve) => setTimeout(resolve, 500));
  if ((testState.p1ReadyCountReceived as number) !== 2) {
    throw new Error('Expected ready count to be 2 after Player 2 ready.');
  }
  console.log('✅ Both players/teams marked ready.');

  // 7. Test host:start-game and 5s countdown logic
  console.log('Emitting host:start-game with 2 teams ready...');
  let phaseChanges: string[] = [];
  let countdownSeconds: number[] = [];

  p1Socket.on(SOCKET_EVENTS.GAME_PHASE_CHANGE, (payload: any) => {
    console.log(`[Event] game:phase-change ->`, payload.phase);
    phaseChanges.push(payload.phase);
  });

  p1Socket.on(SOCKET_EVENTS.GAME_COUNTDOWN, (payload: any) => {
    console.log(`[Event] game:countdown ->`, payload.seconds);
    countdownSeconds.push(payload.seconds);
  });

  let roundStartedPayload: any = null;
  p1Socket.on(SOCKET_EVENTS.ROUND_START, (payload: any) => {
    console.log(`[Event] round:start -> Round`, payload.roundNumber);
    roundStartedPayload = payload;
  });

  hostSocket.emit(SOCKET_EVENTS.HOST_START_GAME);

  // Wait for 6 seconds (countdown takes 5 seconds)
  await new Promise((resolve) => setTimeout(resolve, 6000));

  if (!phaseChanges.includes('countdown') || !phaseChanges.includes('decision')) {
    throw new Error('Missing expected phase changes during game start sequence');
  }

  console.log('Received countdown seconds array:', countdownSeconds);
  if (countdownSeconds.length < 5 || countdownSeconds[0] !== 5 || countdownSeconds[4] !== 1) {
    throw new Error('Countdown countdown parameters or updates are incorrect');
  }
  console.log('✅ 5-second countdown implemented successfully.');

  if (!roundStartedPayload || roundStartedPayload.roundNumber !== 1 || roundStartedPayload.decisions.length !== 2) {
    throw new Error('round:start payload invalid or missing decisions');
  }
  console.log('✅ round:start broadcasted successfully.');

  const dbGame = gameRepo.findById(gameId);
  if (!dbGame || dbGame.status !== 'playing' || dbGame.currentRound !== 1) {
    throw new Error('Game status/round not updated in DB after countdown completion');
  }
  console.log('✅ Game playing status and round updated in DB.');

  // 8. Test host:pause & host:resume controls
  console.log('\nTesting host:pause...');
  phaseChanges = [];
  hostSocket.emit(SOCKET_EVENTS.HOST_PAUSE);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const dbGamePaused = gameRepo.findById(gameId);
  if (!dbGamePaused || dbGamePaused.status !== 'paused') {
    throw new Error('Expected DB game status to be paused');
  }
  console.log('✅ Game status in DB updated to paused.');

  console.log('\nTesting host:resume...');
  hostSocket.emit(SOCKET_EVENTS.HOST_RESUME);
  await new Promise((resolve) => setTimeout(resolve, 500));

  const dbGameResumed = gameRepo.findById(gameId);
  if (!dbGameResumed || dbGameResumed.status !== 'playing') {
    throw new Error('Expected DB game status to be playing (resumed)');
  }
  console.log('✅ Game status in DB resumed to playing.');

  // 9. Test host:next-phase state transitions
  console.log('\nTesting host:next-phase cycle...');

  // Phase transition: decision -> event
  console.log('Chuyển phase: decision -> event...');
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE);
  await new Promise((resolve) => setTimeout(resolve, 500));
  let round = roundRepo.findByGameIdAndRoundNumber(gameId, 1);
  if (round?.phase !== 'event') throw new Error('Expected round phase to transition to event');
  console.log('✅ Transited to event phase.');

  // Phase transition: event -> narration
  console.log('Chuyển phase: event -> narration...');
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE);
  await new Promise((resolve) => setTimeout(resolve, 500));
  round = roundRepo.findByGameIdAndRoundNumber(gameId, 1);
  if (round?.phase !== 'narration') throw new Error('Expected round phase to transition to narration');
  console.log('✅ Transited to narration phase.');

  // Phase transition: narration -> results (since round 1 has no quiz)
  console.log('Chuyển phase: narration -> results (no quiz)...');
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE);
  await new Promise((resolve) => setTimeout(resolve, 500));
  round = roundRepo.findByGameIdAndRoundNumber(gameId, 1);
  if (round?.phase !== 'results') throw new Error('Expected round phase to transition to results');
  console.log('✅ Transited to results phase.');

  // Phase transition: results -> decision (creates round 2)
  console.log('Chuyển phase: results (R1) -> decision (R2)...');
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE);
  await new Promise((resolve) => setTimeout(resolve, 500));
  const dbGameR2 = gameRepo.findById(gameId);
  if (dbGameR2?.currentRound !== 2) throw new Error('Expected current round to be 2');
  round = roundRepo.findByGameIdAndRoundNumber(gameId, 2);
  if (round?.phase !== 'decision') throw new Error('Expected round 2 phase to be decision');
  console.log('✅ Transited to Round 2 decision phase.');

  // Fast forward through Round 2 to check R3 (R3 has quiz: rounds 3, 5, 7)
  console.log('\nFast-forwarding Round 2 to test Round 3 Quiz transition...');
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE); // R2 decision -> event
  await new Promise((resolve) => setTimeout(resolve, 300));
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE); // R2 event -> narration
  await new Promise((resolve) => setTimeout(resolve, 300));
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE); // R2 narration -> results
  await new Promise((resolve) => setTimeout(resolve, 300));
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE); // R2 results -> R3 decision
  await new Promise((resolve) => setTimeout(resolve, 300));

  // R3 is decision phase now. Transition R3 decision -> event -> narration -> quiz (rounds 3, 5, 7 have quiz)
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE); // R3 decision -> event
  await new Promise((resolve) => setTimeout(resolve, 300));
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE); // R3 event -> narration
  await new Promise((resolve) => setTimeout(resolve, 300));

  console.log('Transitioning Round 3 narration -> quiz...');
  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE); // R3 narration -> quiz
  await new Promise((resolve) => setTimeout(resolve, 500));
  round = roundRepo.findByGameIdAndRoundNumber(gameId, 3);
  if (round?.phase !== 'quiz') throw new Error('Expected round 3 phase to transition to quiz');
  console.log('✅ Transited to quiz phase on round 3.');

  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE); // R3 quiz -> results
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Round 3 is the totalRounds limit. R3 results -> finished!
  console.log('Transitioning Round 3 results -> finished (game over)...');
  let gameOverReceived = false;
  p1Socket.on(SOCKET_EVENTS.GAME_OVER, (payload: any) => {
    console.log('Received game:over event:', payload);
    gameOverReceived = true;
  });

  hostSocket.emit(SOCKET_EVENTS.HOST_NEXT_PHASE); // R3 results -> finished
  await new Promise((resolve) => setTimeout(resolve, 500));

  const dbGameFinished = gameRepo.findById(gameId);
  if (dbGameFinished?.status !== 'finished') {
    throw new Error('Expected DB game status to be finished');
  }
  if (!gameOverReceived) {
    throw new Error('Expected to receive game:over event');
  }
  console.log('✅ Game successfully finished and leaderboard broadcasted.');

  // 10. Test disconnect grace period and cleanup
  console.log('\nTesting player disconnect grace period...');
  p1Socket.disconnect();
  await new Promise((resolve) => setTimeout(resolve, 500));

  const dbPlayer1Disconnected = playerRepo.findById(player1Id);
  if (!dbPlayer1Disconnected || dbPlayer1Disconnected.isConnected !== 0) {
    throw new Error('Expected player 1 isConnected to be 0 in DB after disconnect');
  }
  console.log('✅ Player 1 disconnected and database record updated.');

  // Disconnect remaining clients
  hostSocket.disconnect();
  p2Socket.disconnect();
  projectorSocket.disconnect();

  // Close test server
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

  console.log('\n=== All Day 2 — Task 6 Integration Tests Passed Successfully! ===');
}

runTask6Tests().catch((err) => {
  console.error('❌ Integration tests failed:', err);
  process.exit(1);
});
