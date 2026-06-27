import { config } from '../config/index.js';

async function runTests() {
  const baseUrl = `http://localhost:4000/api`;
  console.log('=== Running Auth and Game Endpoint Tests ===');

  try {
    // 1. Host login with incorrect PIN
    console.log('\n[1] Testing POST /api/auth/host with invalid PIN...');
    const loginFailRes = await fetch(`${baseUrl}/auth/host`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostPin: '999999' }),
    });
    const loginFailData = await loginFailRes.json() as any;
    console.log(`Status: ${loginFailRes.status}`);
    console.log(`Response: ${JSON.stringify(loginFailData)}`);
    if (loginFailRes.status !== 401 || loginFailData.success !== false) {
      throw new Error('Host login fail assertion failed');
    }

    // 2. Host login with correct PIN
    console.log('\n[2] Testing POST /api/auth/host with valid PIN...');
    const loginSuccessRes = await fetch(`${baseUrl}/auth/host`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostPin: config.HOST_PIN }),
    });
    const loginSuccessData = await loginSuccessRes.json() as any;
    console.log(`Status: ${loginSuccessRes.status}`);
    console.log(`Token received: ${loginSuccessData.token ? 'YES' : 'NO'}`);
    if (loginSuccessRes.status !== 200 || !loginSuccessData.token) {
      throw new Error('Host login success assertion failed');
    }
    const initialHostToken = loginSuccessData.token;

    // 3. Create a new game
    console.log('\n[3] Testing POST /api/games with host auth...');
    const createGameRes = await fetch(`${baseUrl}/games`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${initialHostToken}`,
      },
      body: JSON.stringify({
        totalRounds: 8,
        roundDurationSec: 45,
        quizEnabled: true,
      }),
    });
    const createGameData = await createGameRes.json() as any;
    console.log(`Status: ${createGameRes.status}`);
    console.log(`Room Code: ${createGameData.game?.roomCode}`);
    console.log(`Game ID: ${createGameData.game?.id}`);
    console.log(`Game-scoped Token received: ${createGameData.token ? 'YES' : 'NO'}`);
    if (createGameRes.status !== 201 || !createGameData.game?.roomCode || !createGameData.token) {
      throw new Error('Game creation assertion failed');
    }
    const gameId = createGameData.game.id;
    const roomCode = createGameData.game.roomCode;
    const hostGameToken = createGameData.token;

    // 4. Player Join
    console.log('\n[4] Testing POST /api/auth/join...');
    const playerJoinRes = await fetch(`${baseUrl}/auth/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomCode,
        teamName: 'Mũ Rơm',
        playerName: 'Luffy',
      }),
    });
    const playerJoinData = await playerJoinRes.json() as any;
    console.log(`Status: ${playerJoinRes.status}`);
    console.log(`Player Name: ${playerJoinData.player?.displayName}`);
    console.log(`Team Name: ${playerJoinData.team?.name}`);
    console.log(`Player Token received: ${playerJoinData.token ? 'YES' : 'NO'}`);
    if (playerJoinRes.status !== 201 || !playerJoinData.token || playerJoinData.team?.name !== 'Mũ Rơm') {
      throw new Error('Player join assertion failed');
    }
    const playerToken = playerJoinData.token;
    const teamId = playerJoinData.team.id;

    // 5. Query state as Player (should be sanitized)
    console.log('\n[5] Testing GET /api/games/:id as Player...');
    const getGamePlayerRes = await fetch(`${baseUrl}/games/${gameId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${playerToken}`,
      },
    });
    const getGamePlayerData = await getGamePlayerRes.json() as any;
    console.log(`Status: ${getGamePlayerRes.status}`);
    console.log(`Role: ${getGamePlayerData.role}`);
    console.log(`My Team Name: ${getGamePlayerData.myTeam?.name}`);
    console.log(`All Teams length: ${getGamePlayerData.allTeams?.length}`);
    if (getGamePlayerRes.status !== 200 || getGamePlayerData.role !== 'player' || getGamePlayerData.myTeam?.id !== teamId) {
      throw new Error('Get game as player assertion failed');
    }

    // 6. Query state as Host (should be full state)
    console.log('\n[6] Testing GET /api/games/:id as Host...');
    const getGameHostRes = await fetch(`${baseUrl}/games/${gameId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${hostGameToken}`,
      },
    });
    const getGameHostData = await getGameHostRes.json() as any;
    console.log(`Status: ${getGameHostRes.status}`);
    console.log(`Role: ${getGameHostData.role}`);
    console.log(`Teams count: ${getGameHostData.teams?.length}`);
    console.log(`Players count: ${getGameHostData.players?.length}`);
    if (getGameHostRes.status !== 200 || getGameHostData.role !== 'host' || !getGameHostData.players) {
      throw new Error('Get game as host assertion failed');
    }

    // 7. Query state with unauthorized/forbidden access
    console.log('\n[7] Testing GET /api/games/:id with forbidden game access...');
    const getGameForbiddenRes = await fetch(`${baseUrl}/games/invalid-game-id-value`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${playerToken}`,
      },
    });
    const getGameForbiddenData = await getGameForbiddenRes.json() as any;
    console.log(`Status: ${getGameForbiddenRes.status}`);
    console.log(`Response: ${JSON.stringify(getGameForbiddenData)}`);
    if (getGameForbiddenRes.status !== 403 || getGameForbiddenData.success !== false) {
      throw new Error('Get game forbidden assertion failed');
    }

    console.log('\n=== All Tests Passed Successfully! ===');
  } catch (err) {
    console.error('Test run failed:', err);
    process.exit(1);
  }
}

runTests();
