import { createServer } from 'http';
import express from 'express';
import { io } from '../socket/index.js';
import { io as ClientIo } from 'socket.io-client';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { initDatabase } from '../config/database.js';

async function runSocketTest() {
  console.log('=== Running Socket.IO Foundation Tests ===');

  // Initialize DB connection so database.ts initialized modules don't complain
  initDatabase();

  const app = express();
  const httpServer = createServer(app);

  // Attach the initialized io instance to httpServer
  io.attach(httpServer);

  // Listen on a test port
  const TEST_PORT = 4099;
  await new Promise<void>((resolve) => {
    httpServer.listen(TEST_PORT, () => resolve());
  });
  console.log(`Test server listening on port ${TEST_PORT}`);

  // 2. Generate a valid mock player token
  const mockPayload = {
    userId: 'test-user-id-123',
    role: 'player' as const,
    gameId: 'test-game-id-456',
    teamId: 'test-team-id-789',
  };

  const token = jwt.sign(mockPayload, config.JWT_SECRET);
  console.log('Generated mock JWT token for player');

  // 3. Connect Socket.IO Client with token
  const clientSocket = ClientIo(`http://localhost:${TEST_PORT}`, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
  });

  await new Promise<void>((resolve, reject) => {
    clientSocket.on('connect', () => {
      console.log('Client connected successfully!');
      resolve();
    });
    clientSocket.on('connect_error', (error) => {
      console.error('Client connection error:', error.message);
      reject(error);
    });
  });

  // 4. Verify server-side socket state
  const serverSockets = await io.fetchSockets();
  console.log(`Active server-side sockets count: ${serverSockets.length}`);

  if (serverSockets.length !== 1) {
    throw new Error('Expected exactly 1 socket on the server');
  }

  // Get local socket to inspect joined rooms
  const socketId = clientSocket.id;
  if (!socketId) {
    throw new Error('Client socket ID is undefined');
  }
  const localSocket = io.sockets.sockets.get(socketId);
  if (!localSocket) {
    throw new Error('Could not find local socket instance');
  }

  console.log('Server-side socket data:', JSON.stringify(localSocket.data));

  // Assert socket data values
  if (
    localSocket.data.role !== mockPayload.role ||
    localSocket.data.gameId !== mockPayload.gameId ||
    localSocket.data.teamId !== mockPayload.teamId
  ) {
    throw new Error('Socket.data values do not match token payload');
  }
  console.log('✅ socket.data matches JWT payload!');

  // Verify rooms
  const joinedRooms = Array.from(localSocket.rooms);
  console.log('Joined rooms:', joinedRooms);

  const expectedRoom = `room:${mockPayload.gameId}`;
  const expectedTeamRoom = `team:${mockPayload.teamId}`;

  if (!joinedRooms.includes(expectedRoom)) {
    throw new Error(`Socket did not join expected game room: ${expectedRoom}`);
  }
  if (!joinedRooms.includes(expectedTeamRoom)) {
    throw new Error(`Socket did not join expected team room: ${expectedTeamRoom}`);
  }

  console.log('✅ Socket automatically joined both the game room and the team room!');

  // Test invalid token rejection
  console.log('\nTesting connection rejection with invalid token...');
  const badClientSocket = ClientIo(`http://localhost:${TEST_PORT}`, {
    auth: { token: 'invalid-token-value' },
    transports: ['websocket'],
    forceNew: true,
  });

  await new Promise<void>((resolve, reject) => {
    badClientSocket.on('connect', () => {
      reject(new Error('Bad client connected successfully but should have been rejected'));
    });
    badClientSocket.on('connect_error', (error) => {
      console.log('✅ Connection successfully rejected with error:', error.message);
      resolve();
    });
  });

  // Cleanup
  clientSocket.disconnect();
  badClientSocket.disconnect();
  await new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

  console.log('\n=== All Socket.IO Foundation Tests Passed Successfully! ===');
}

runSocketTest().catch((err) => {
  console.error('❌ Tests failed:', err);
  process.exit(1);
});
