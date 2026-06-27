process.on('uncaughtException', (err) => {
  console.error('🔥 Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmetModule from 'helmet';
import rateLimitModule from 'express-rate-limit';
import { GAME_CONSTANTS } from '@monopoly/shared';

import { config } from './config/index.js';
import { initDatabase, getDatabase } from './config/database.js';
import { logger } from './utils/logger.js';
import { errorHandler } from './middleware/error.middleware.js';

// Repositories
import { GameRepository } from './repositories/game.repository.js';
import { TeamRepository } from './repositories/team.repository.js';
import { PlayerRepository } from './repositories/player.repository.js';

// Services
import { TeamService } from './services/team.service.js';
import { GameService } from './services/game.service.js';

// Controllers & Middleware
import { AuthController } from './controllers/auth.controller.js';
import { GameController } from './controllers/game.controller.js';
import { requireAuth, requireRole } from './middleware/auth.middleware.js';

const helmet = helmetModule as any;
const rateLimit = rateLimitModule as any;

const app = express();
const httpServer = createServer(app);

// Configure helmet with default security policies
app.use(helmet());

// Configure CORS to match client domain
app.use(
  cors({
    origin: config.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  })
);

// Parse JSON bodies
app.use(express.json());

// API Rate limiter (max 100 requests per minute per IP)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Quá nhiều yêu cầu từ địa chỉ IP này, vui lòng thử lại sau.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', limiter);

// GET /api/health endpoint
app.get('/api/health', (req, res, next) => {
  try {
    const db = getDatabase();
    // Verify database responsiveness with a simple query
    const result = db.prepare('SELECT 1 as val').get() as { val: number } | undefined;
    
    if (!result || result.val !== 1) {
      throw new Error('Database check failed: SELECT 1 did not return 1');
    }

    res.json({
      status: 'ok',
      message: 'MonopolyBattle Server Scaffold Initialized',
      database: 'connected',
      constants: {
        startingMoney: GAME_CONSTANTS.STARTING_MONEY,
        defaultDuration: GAME_CONSTANTS.DEFAULT_ROUND_DURATION_SEC,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Initialize Repositories, Services and Controllers
const db = getDatabase();
const gameRepo = new GameRepository(db);
const teamRepo = new TeamRepository(db);
const playerRepo = new PlayerRepository(db);

const teamService = new TeamService(teamRepo, playerRepo);
const gameService = new GameService(gameRepo, teamRepo, playerRepo, teamService);

const authController = new AuthController(gameService);
const gameController = new GameController(gameService, teamService, playerRepo);

// API Routes
app.post('/api/auth/host', authController.hostLogin);
app.post('/api/auth/join', authController.join);

app.post('/api/games', requireAuth, requireRole(['host']), gameController.create);
app.get('/api/games/:id', requireAuth, gameController.getGame);

// Attach global error middleware
app.use(errorHandler);

// Socket.IO server initialization
const io = new Server(httpServer, {
  cors: {
    origin: config.CLIENT_URL,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Socket.IO connection event placeholder (handlers to be wired in Day 2)
io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'New client connected via Socket.IO');

  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected from Socket.IO');
  });
});

// Initialize database and start listening
try {
  initDatabase();
  httpServer.listen(config.PORT, () => {
    logger.info(`[Server] Bootstrap completed. Server running on port ${config.PORT}`);
  });
} catch (error) {
  logger.fatal({ err: error }, 'Failed to start server');
  process.exit(1);
}
