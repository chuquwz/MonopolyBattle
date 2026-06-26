# MonopolyBattle — Coding Rules

> **Version:** 1.0
> **Áp dụng cho:** Toàn bộ codebase (`client/`, `server/`, `shared/`, `content/`)
> **Nguyên tắc cốt lõi:** Code bằng tiếng Anh. Hiển thị bằng tiếng Việt.

---

## Mục lục

1. [Nguyên tắc ngôn ngữ](#1-nguyên-tắc-ngôn-ngữ)
2. [Quy tắc TypeScript](#2-quy-tắc-typescript)
3. [Quy tắc React & Frontend](#3-quy-tắc-react--frontend)
4. [Quy tắc Backend & API](#4-quy-tắc-backend--api)
5. [Quy tắc Socket.IO](#5-quy-tắc-socketio)
6. [Quy tắc Database](#6-quy-tắc-database)
7. [Quy tắc Game Engine](#7-quy-tắc-game-engine)
8. [Quy tắc Content JSON](#8-quy-tắc-content-json)
9. [Quy tắc đặt tên file & thư mục](#9-quy-tắc-đặt-tên-file--thư-mục)
10. [Quy tắc Git](#10-quy-tắc-git)
11. [Quy tắc kiểm thử](#11-quy-tắc-kiểm-thử)
12. [Danh sách cấm](#12-danh-sách-cấm)

---

## 1. Nguyên tắc ngôn ngữ

### 1.1 Quy tắc vàng

> **Mọi ký tự hiển thị cho người dùng PHẢI là tiếng Việt.**
> **Mọi định danh trong source code PHẢI là tiếng Anh.**

```
✅ ĐÚNG
  variable:     marketShare
  function:     calculateMonopolyRisk()
  db column:    monopoly_risk
  api route:    /api/games/:id
  displayed:    "Rủi ro độc quyền"

❌ SAI
  variable:     thiPhan           // tiếng Việt trong code
  displayed:    "Market Share"    // tiếng Anh hiển thị cho user
```

### 1.2 Nguồn văn bản tiếng Việt

Văn bản tiếng Việt chỉ được lấy từ **3 nguồn hợp lệ**:

| Nguồn | Vị trí | Dùng cho |
|---|---|---|
| UI String Registry | `client/src/i18n/vi.ts` | Nhãn, nút bấm, lỗi, tooltip |
| Content JSON | `content/` directory | Quiz, narrator, events, decisions |
| Database seed | Từ JSON, không hardcode | Dữ liệu game |

### 1.3 Cấm hardcode chuỗi tiếng Việt

```typescript
// ❌ TUYỆT ĐỐI CẤM — hardcode trong component
export function Timer() {
  return <span>Còn lại: {seconds}s</span>;
}

// ❌ TUYỆT ĐỐI CẤM — hardcode trong business logic
throw new Error('Mã phòng không hợp lệ');

// ✅ ĐÚNG — dùng vi.ts registry
import { vi } from '@/i18n/vi';
import { t } from '@/lib/utils';

export function Timer({ seconds }: { seconds: number }) {
  return <span>{t(vi.game.timeLeft, { seconds })}</span>;
}

throw new AppError(vi.errors.invalidInput, 400);
```

### 1.4 Thuật ngữ kinh tế bắt buộc

Khi viết content JSON hoặc bình luận có đề cập khái niệm kinh tế, **bắt buộc** dùng thuật ngữ chuẩn:

| Khái niệm | Thuật ngữ bắt buộc | Không dùng |
|---|---|---|
| Monopoly | Độc quyền | "monopoly" trong text |
| Acquisition | Thâu tóm | "mua lại", "acquire" |
| Merger | Sáp nhập | "hợp nhất" |
| Market share | Thị phần | "phần thị trường" |
| Capital accumulation | Tích tụ tư bản | "tích lũy vốn" |
| Capital concentration | Tập trung tư bản | "tập trung vốn" |
| State regulation | Điều tiết của Nhà nước | "kiểm soát nhà nước" |
| State monopoly capitalism | CNTB độc quyền nhà nước | Viết tắt CNTB ĐQNN |
| Natural monopoly | Độc quyền tự nhiên | "độc quyền bình thường" |

---

## 2. Quy tắc TypeScript

### 2.1 Cấu hình bắt buộc

Mọi `tsconfig.json` trong project **phải** bật:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 2.2 Cấm `any`

```typescript
// ❌ CẤM
function processData(data: any) { ... }
const result = response as any;

// ✅ ĐÚNG — dùng unknown + type guard
function processData(data: unknown) {
  if (!isTeamState(data)) throw new Error('Invalid data');
  // data giờ được typed đúng
}

// ✅ ĐÚNG — dùng generic
function processData<T extends TeamState>(data: T): ProcessedData<T> { ... }
```

### 2.3 `type` vs `interface`

```typescript
// Dùng `type` cho:
// - Union types
type GamePhase = 'lobby' | 'countdown' | 'decision' | 'processing' |
                 'event' | 'narration' | 'quiz' | 'results' | 'finished';

// - Intersection types
type AdminTeam = TeamState & AdminPrivileges;

// - Mapped types
type TeamStatsUpdate = Partial<Pick<TeamState, 'money' | 'marketShare' | 'technology'>>;

// Dùng `interface` cho:
// - Object shapes có thể extend
interface TeamState {
  id: string;
  name: string;
  money: number;
  marketShare: number;
  technology: number;
  reputation: number;
  monopolyRisk: number;
  totalScore: number;
}

interface AdminTeamState extends TeamState {
  isHost: boolean;
}
```

### 2.4 Không dùng non-null assertion (`!`)

```typescript
// ❌ CẤM
const team = teams.get(teamId)!;
const socket = this.socket!;

// ✅ ĐÚNG — xử lý null rõ ràng
const team = teams.get(teamId);
if (!team) throw new TeamNotFoundError(teamId);

const team = teams.get(teamId) ?? defaultTeam;
```

### 2.5 Luôn type return value cho public function

```typescript
// ❌ CẤM — thiếu return type
function calculateScore(team: TeamState, decision: Decision) {
  return team.marketShare * 2 + ...;
}

// ✅ ĐÚNG
function calculateScore(team: TeamState, decision: Decision): number {
  return team.marketShare * 2 + ...;
}

// ✅ ĐÚNG — async
async function findGame(id: string): Promise<Game | null> {
  return db.prepare('SELECT * FROM game WHERE id = ?').get(id) ?? null;
}
```

### 2.6 Enum — dùng string literal union

```typescript
// ❌ TRÁNH — TypeScript enum có nhiều vấn đề
enum GamePhase {
  LOBBY = 'lobby',
  DECISION = 'decision',
}

// ✅ ĐÚNG — string literal union
type GamePhase = 'lobby' | 'countdown' | 'decision' | 'processing' |
                 'event' | 'narration' | 'quiz' | 'results' | 'finished';

// ✅ ĐÚNG — const object cho lookup table
const GAME_PHASES = {
  LOBBY: 'lobby',
  COUNTDOWN: 'countdown',
  DECISION: 'decision',
} as const;

type GamePhase = typeof GAME_PHASES[keyof typeof GAME_PHASES];
```

### 2.7 Custom Error classes

```typescript
// ❌ CẤM — throw raw string/object
throw 'Mã phòng không hợp lệ';
throw { message: 'error', code: 400 };

// ✅ ĐÚNG — custom error class
export class AppError extends Error {
  constructor(
    public readonly messageVi: string,   // Hiển thị cho user
    public readonly statusCode: number,
    public readonly code?: string,
  ) {
    super(messageVi);
    this.name = 'AppError';
  }
}

export class GameNotFoundError extends AppError {
  constructor(gameId: string) {
    super(vi.errors.serverError, 404, 'GAME_NOT_FOUND');
  }
}

export class TeamNotFoundError extends AppError {
  constructor(teamId: string) {
    super(vi.errors.serverError, 404, 'TEAM_NOT_FOUND');
  }
}
```

### 2.8 Kiểu dữ liệu số

```typescript
// Tiền tệ — KHÔNG dùng float, dùng integer (đơn vị: triệu VNĐ)
interface TeamState {
  money: number;         // integer, đơn vị: tỷ VNĐ × 1000 (để tránh float)
  marketShare: number;   // float 0.0 – 100.0, giữ 1 chữ số thập phân
  technology: number;    // integer 0 – 100
  reputation: number;    // integer 0 – 100
  monopolyRisk: number;  // integer 0 – 100
}

// Format hiển thị — luôn dùng helper
import { formatMoney, formatPercent } from '@/lib/format';
// KHÔNG dùng .toFixed() trực tiếp trong JSX
```

---

## 3. Quy tắc React & Frontend

### 3.1 Cấu trúc component

```typescript
// Thứ tự bắt buộc trong mỗi file component:
// 1. Imports
// 2. Types/Interfaces
// 3. Constants (nếu có)
// 4. Component function
// 5. Sub-components (nếu nhỏ và chỉ dùng trong file này)

// ✅ Ví dụ chuẩn
import { motion } from 'framer-motion';
import { vi } from '@/i18n/vi';
import { t } from '@/lib/utils';
import type { Decision } from '@/types/game.types';

interface DecisionCardProps {
  decision: Decision;
  isSelected: boolean;
  isDisabled: boolean;
  onSelect: (decisionType: string) => void;
}

export function DecisionCard({
  decision,
  isSelected,
  isDisabled,
  onSelect,
}: DecisionCardProps) {
  // ...
}
```

### 3.2 Named exports — không dùng default export

```typescript
// ❌ CẤM
export default function DecisionCard() { ... }

// ✅ ĐÚNG
export function DecisionCard() { ... }
```

### 3.3 Không hardcode className màu sắc

```typescript
// ❌ CẤM — màu sắc tùy tiện
<div className="bg-red-500 text-white">

// ✅ ĐÚNG — dùng design token đã định nghĩa trong tailwind.config.ts
<div className="bg-danger text-danger-foreground">
<div className="bg-monopoly-risk text-white">

// ✅ ĐÚNG — dùng variant pattern
<Badge variant="warning">
<Button variant="destructive">
```

### 3.4 Zustand — không mutate state trực tiếp

```typescript
// ❌ CẤM — mutate trực tiếp
const updateTeam = () => {
  state.myTeam.money += 1000; // KHÔNG được
};

// ✅ ĐÚNG — immer-style hoặc replace
const updateMyTeam = (delta: Partial<TeamStats>) =>
  set((state) => ({
    myTeam: { ...state.myTeam, ...delta },
  }));
```

### 3.5 Selector-based subscription — tránh re-render không cần thiết

```typescript
// ❌ CẤM — subscribe toàn bộ store, re-render mọi thay đổi
const gameState = useGameStore();

// ✅ ĐÚNG — chỉ subscribe field cần thiết
const money = useGameStore((s) => s.myTeam.money);
const phase = useGameStore((s) => s.phase);
const leaderboard = useGameStore((s) => s.leaderboard);
```

### 3.6 Framer Motion — không block interaction

```typescript
// ❌ CẤM — animation block user input
<motion.button
  animate={{ scale: [1, 0.9, 1] }}
  transition={{ duration: 2, repeat: Infinity }} // Block interaction 2 giây
>

// ✅ ĐÚNG — pointer-events vẫn hoạt động trong animation
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ duration: 0.15 }}
>

// ✅ ĐÚNG — dùng useReducedMotion để tôn trọng accessibility
const prefersReduced = useReducedMotion();
<motion.div
  animate={prefersReduced ? {} : { y: [0, -10, 0] }}
>
```

### 3.7 Không dùng `useEffect` để sync state với state khác

```typescript
// ❌ CẤM — useEffect để derive state
const [displayMoney, setDisplayMoney] = useState(0);
useEffect(() => {
  setDisplayMoney(money * 1000);
}, [money]);

// ✅ ĐÚNG — tính toán trực tiếp (derived value)
const displayMoney = money * 1000;

// ✅ ĐÚNG — useMemo nếu tính toán nặng
const sortedTeams = useMemo(
  () => [...allTeams].sort((a, b) => b.totalScore - a.totalScore),
  [allTeams]
);
```

### 3.8 Format số tiếng Việt

```typescript
// Luôn dùng các helper này, KHÔNG dùng thẳng .toLocaleString() trong JSX

// lib/format.ts
export const formatMoney = (amount: number): string =>
  `${amount.toLocaleString('vi-VN')} ${vi.stats.moneyUnit}`;

export const formatPercent = (value: number): string =>
  `${value.toFixed(1).replace('.', ',')}%`;

export const formatScore = (score: number): string =>
  score.toLocaleString('vi-VN');

// Trong component:
<span>{formatMoney(team.money)}</span>       // "15.000 tỷ VNĐ"
<span>{formatPercent(team.marketShare)}</span> // "42,5%"
```

---

## 4. Quy tắc Backend & API

### 4.1 Controller — chỉ nhận, validate, và gọi service

```typescript
// ❌ CẤM — business logic trong controller
export const joinGame = async (req: Request, res: Response) => {
  const game = db.prepare('SELECT * FROM game WHERE room_code = ?').get(req.body.roomCode);
  if (!game) return res.status(404).json({ error: 'Not found' });
  const team = { id: uuid(), gameId: game.id, name: req.body.teamName };
  db.prepare('INSERT INTO team ...').run(team);
  const token = jwt.sign({ teamId: team.id }, process.env.JWT_SECRET!);
  res.json({ token });
};

// ✅ ĐÚNG — controller chỉ orchestrate
export const joinGame = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { roomCode, teamName, playerName } = joinGameSchema.parse(req.body);
    const result = await gameService.joinGame({ roomCode, teamName, playerName });
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
```

### 4.2 Service — không truy cập DB trực tiếp

```typescript
// ❌ CẤM — service dùng DB trực tiếp
export class GameService {
  joinGame(data: JoinGameDto) {
    const game = db.prepare('SELECT ...').get(data.roomCode); // KHÔNG
  }
}

// ✅ ĐÚNG — service dùng repository
export class GameService {
  constructor(
    private readonly gameRepo: GameRepository,
    private readonly teamRepo: TeamRepository,
  ) {}

  async joinGame(data: JoinGameDto): Promise<JoinGameResult> {
    const game = this.gameRepo.findByRoomCode(data.roomCode);
    if (!game) throw new GameNotFoundError(data.roomCode);
    if (game.status !== 'lobby') throw new AppError(vi.join.gameStarted, 400);
    // ...
  }
}
```

### 4.3 Repository — chỉ CRUD, không business logic

```typescript
// ❌ CẤM — business logic trong repository
export class TeamRepository {
  registerTeam(data: CreateTeamDto) {
    if (data.name.length < 3) throw new Error('...'); // KHÔNG — đây là business rule
    return db.prepare('INSERT INTO team ...').run(data);
  }
}

// ✅ ĐÚNG — repository chỉ data access
export class TeamRepository {
  create(data: CreateTeamDto): Team {
    const stmt = db.prepare(`
      INSERT INTO team (id, game_id, name, team_number, money, market_share, ...)
      VALUES (@id, @gameId, @name, @teamNumber, @money, @marketShare, ...)
    `);
    stmt.run(data);
    return this.findById(data.id)!;
  }

  findById(id: string): Team | null {
    return db.prepare('SELECT * FROM team WHERE id = ?').get(id) ?? null;
  }

  findByGameId(gameId: string): Team[] {
    return db.prepare('SELECT * FROM team WHERE game_id = ?').all(gameId);
  }
}
```

### 4.4 Validation — Zod schema ở boundary

```typescript
// Validate tất cả input ở tầng controller/socket handler
import { z } from 'zod';

export const joinGameSchema = z.object({
  roomCode: z.string().length(6).toUpperCase(),
  teamName: z.string().min(2).max(30),
  playerName: z.string().min(2).max(30),
});

export type JoinGameDto = z.infer<typeof joinGameSchema>;

// Trong controller:
const data = joinGameSchema.parse(req.body); // Throw ZodError nếu invalid
// Error middleware bắt ZodError và trả về 400
```

### 4.5 Logging — dùng pino, không dùng console.log

```typescript
// ❌ CẤM
console.log('Game started:', gameId);
console.error('Error:', err);

// ✅ ĐÚNG
import { logger } from '@/utils/logger';

logger.info({ gameId, teamCount }, 'Game started');
logger.error({ err, gameId }, 'Failed to process round');
logger.debug({ decision, teamId }, 'Decision received');
```

---

## 5. Quy tắc Socket.IO

### 5.1 Mọi socket event phải được validate

```typescript
// ❌ CẤM — dùng data thẳng từ client
socket.on('player:decision', (data) => {
  gameEngine.applyDecision(data.teamId, data.decisionType); // KHÔNG
});

// ✅ ĐÚNG — validate trước khi xử lý
socket.on('player:decision', (payload: unknown) => {
  const result = playerDecisionSchema.safeParse(payload);
  if (!result.success) {
    socket.emit('error', { code: 'INVALID_PAYLOAD', message: vi.errors.invalidInput });
    return;
  }
  const { decisionType } = result.data;
  // Verify teamId từ socket.data (JWT), KHÔNG từ payload
  const teamId = socket.data.teamId;
  gameEngine.applyDecision(teamId, decisionType);
});
```

### 5.2 teamId luôn lấy từ socket.data, không từ payload

```typescript
// ❌ NGUY HIỂM — client có thể giả mạo teamId
socket.on('player:decision', ({ teamId, decisionType }) => {
  applyDecision(teamId, decisionType);
});

// ✅ ĐÚNG — teamId từ JWT đã được verify
socket.on('player:decision', ({ decisionType }: PlayerDecisionPayload) => {
  const teamId = socket.data.teamId; // Từ JWT middleware
  const gameId = socket.data.gameId;
  applyDecision(gameId, teamId, decisionType);
});
```

### 5.3 Event names phải là constant

```typescript
// ❌ CẤM — magic strings
socket.emit('round:start', data);
socket.on('player:decision', handler);

// ✅ ĐÚNG — dùng constant từ shared/
// shared/types/socket-events.ts
export const SOCKET_EVENTS = {
  // Client → Server
  PLAYER_DECISION: 'player:decision',
  PLAYER_READY: 'player:ready',
  PLAYER_QUIZ_ANSWER: 'player:quiz-answer',
  HOST_START_GAME: 'host:start-game',
  HOST_PAUSE: 'host:pause',
  HOST_RESUME: 'host:resume',
  PROJECTOR_JOIN: 'projector:join',

  // Server → Client
  ROUND_START: 'round:start',
  ROUND_TICK: 'round:tick',
  ROUND_RESULTS: 'round:results',
  EVENT_TRIGGERED: 'event:triggered',
  NARRATOR_MESSAGE: 'narrator:message',
  QUIZ_START: 'quiz:start',
  QUIZ_RESULTS: 'quiz:results',
  TEAM_JOINED: 'team:joined',
  TEAM_STATS_UPDATE: 'team:stats-update',
  MONOPOLY_DETECTED: 'monopoly:detected',
  GAME_OVER: 'game:over',
  GAME_PHASE_CHANGE: 'game:phase-change',
  ERROR: 'error',
} as const;

// Dùng:
socket.emit(SOCKET_EVENTS.ROUND_START, data);
socket.on(SOCKET_EVENTS.PLAYER_DECISION, handler);
```

### 5.4 Broadcast đúng room

```typescript
// Luôn emit đến đúng target:

// Toàn bộ game (players + host + projector):
io.to(`room:${gameId}`).emit(SOCKET_EVENTS.ROUND_START, data);

// Riêng một team (private stats):
io.to(`team:${teamId}`).emit(SOCKET_EVENTS.TEAM_STATS_UPDATE, privateStats);

// Chỉ host:
io.to(`host:${gameId}`).emit(SOCKET_EVENTS.TEAM_JOINED, teamInfo);

// Ack cho sender:
socket.emit(SOCKET_EVENTS.ROUND_RESULTS, data); // chỉ người gửi

// ❌ CẤM — broadcast toàn server (ảnh hưởng game khác)
io.emit(SOCKET_EVENTS.ROUND_START, data);
```

---

## 6. Quy tắc Database

### 6.1 Prepared statements bắt buộc

```typescript
// ❌ TUYỆT ĐỐI CẤM — SQL injection
db.exec(`SELECT * FROM team WHERE id = '${teamId}'`);

// ✅ ĐÚNG — prepared statement
const stmt = db.prepare('SELECT * FROM team WHERE id = ?');
const team = stmt.get(teamId);

// ✅ ĐÚNG — named parameters
const stmt = db.prepare(`
  UPDATE team
  SET money = @money, market_share = @marketShare
  WHERE id = @id
`);
stmt.run({ money: 15000, marketShare: 42.5, id: teamId });
```

### 6.2 Transaction cho multi-table writes

```typescript
// ❌ CẤM — nhiều write riêng lẻ (không atomic)
teamRepo.updateStats(teamId, delta);
roundRepo.saveDecisionLog(roundId, teamId, decision);
// Nếu dòng 2 fail → dữ liệu không nhất quán

// ✅ ĐÚNG — transaction
const saveRoundResult = db.transaction((params: RoundResultParams) => {
  teamRepo.updateStats(params.teamId, params.delta);
  roundRepo.saveDecisionLog(params.roundId, params.teamId, params.decision);
  roundRepo.saveEvent(params.roundId, params.event);
});

saveRoundResult({ teamId, delta, roundId, decision, event });
```

### 6.3 Không expose internal DB errors cho client

```typescript
// ❌ CẤM
} catch (err) {
  res.status(500).json({ error: err.message }); // Lộ DB error
}

// ✅ ĐÚNG
} catch (err) {
  logger.error({ err }, 'Database error');
  next(new AppError(vi.errors.serverError, 500));
}
```

### 6.4 Index mọi foreign key và cột query thường xuyên

```sql
-- Bắt buộc có index cho:
CREATE INDEX idx_team_game_id ON team(game_id);
CREATE INDEX idx_player_team_id ON player(team_id);
CREATE INDEX idx_decision_log_round_team ON decision_log(round_id, team_id);
CREATE INDEX idx_round_game_number ON round(game_id, round_number);
CREATE UNIQUE INDEX idx_game_room_code ON game(room_code);
```

---

## 7. Quy tắc Game Engine

### 7.1 Game Engine là server-authoritative

```typescript
// ❌ CẤM — client tự tính toán game state
// (trong client code)
const newMarketShare = myTeam.marketShare + decision.marketShareGain;
setMyTeam({ ...myTeam, marketShare: newMarketShare });

// ✅ ĐÚNG — client nhận state từ server
socket.on(SOCKET_EVENTS.TEAM_STATS_UPDATE, (stats: TeamStatsUpdate) => {
  gameStore.getState().updateMyTeam(stats);
});
```

### 7.2 Game Engine là pure function nơi có thể

```typescript
// ❌ CẤM — side effects bên trong engine
class DecisionEngine {
  applyDecision(team: TeamState, decision: Decision): StatsDelta {
    const delta = this.calculate(team, decision);
    db.prepare('INSERT INTO decision_log...').run(delta); // KHÔNG — side effect
    io.emit('stats:update', delta);                       // KHÔNG — side effect
    return delta;
  }
}

// ✅ ĐÚNG — engine trả về result, caller xử lý side effects
class DecisionEngine {
  applyDecision(team: TeamState, decision: Decision): StatsDelta {
    return this.calculate(team, decision); // Pure
  }
}

// Trong GameEngine.processRound():
const delta = this.decisionEngine.applyDecision(team, decision);
this.roundRepo.saveDecisionLog(roundId, teamId, delta); // Side effect ở đây
io.to(`team:${teamId}`).emit(SOCKET_EVENTS.TEAM_STATS_UPDATE, delta);
```

### 7.3 Random phải dùng seeded RNG

```typescript
// ❌ CẤM — Math.random() không reproducible
const eventIndex = Math.floor(Math.random() * events.length);

// ✅ ĐÚNG — seeded RNG
import { SeededRNG } from '@/utils/random';

// Khởi tạo một lần với seed từ game record
const rng = new SeededRNG(game.seed);

// Dùng suốt game
const eventIndex = Math.floor(rng.next() * events.length);
const shouldEvent = rng.next() < 0.6; // 60% chance
```

### 7.4 In-memory game state phải sync với DB sau mỗi round

```typescript
// Sau processRound(), bắt buộc persist:
async processRound(): Promise<void> {
  // 1. Tính toán
  const results = this.calculateResults();

  // 2. Persist (transaction)
  this.persistRoundResults(results); // Ghi vào DB

  // 3. Update in-memory state
  this.updateInMemoryState(results);

  // 4. Broadcast
  this.broadcastResults(results);
}
```

---

## 8. Quy tắc Content JSON

### 8.1 Không có chuỗi tiếng Anh trong content JSON

```json
// ❌ CẤM — English placeholder
{
  "question": "What is monopoly?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "explanation": "Explanation here"
}

// ✅ ĐÚNG — Vietnamese từ đầu
{
  "question": "Độc quyền là gì trong kinh tế chính trị Mác-Lênin?",
  "options": [
    "Trạng thái một hoặc một nhóm nhỏ doanh nghiệp kiểm soát toàn bộ thị trường",
    "Trạng thái có nhiều doanh nghiệp cùng cạnh tranh",
    "Khi nhà nước sở hữu toàn bộ doanh nghiệp",
    "Khi giá cả do người tiêu dùng quyết định"
  ],
  "explanation": "Theo kinh tế chính trị Mác-Lênin, độc quyền hình thành khi..."
}
```

### 8.2 Mọi template phải có id duy nhất

```json
// ❌ CẤM — không có id hoặc id trùng
{ "text": "Công ty vừa thâu tóm đối thủ..." }

// ✅ ĐÚNG — id theo pattern: category_subcategory_number
{ "id": "acq_001", "text": "{teamName} vừa thâu tóm..." }
{ "id": "acq_002", "text": "Một đối thủ nữa bị..." }
{ "id": "event_crisis_001", "text": "Khủng hoảng kinh tế..." }
{ "id": "quiz_mb_001", "text": "Độc quyền là gì?" }
```

### 8.3 Template variables phải dùng `{camelCase}`

```json
// ❌ CẤM
"text": "{{team_name}} đã đạt {{market_share}}%"
"text": "%teamName% đã đạt %marketShare%"

// ✅ ĐÚNG
"text": "{teamName} vừa thâu tóm đối thủ. Thị phần: {marketShare}%"
```

### 8.4 Danh sách variables hợp lệ

Chỉ được dùng các variable này trong template JSON:

```
{teamName}      - Tên đội (string)
{marketShare}   - Thị phần % (number, 1 chữ số thập phân)
{money}         - Vốn (number, format vi-VN)
{technology}    - Chỉ số công nghệ (integer 0-100)
{reputation}    - Uy tín (integer 0-100)
{monopolyRisk}  - Rủi ro độc quyền (integer 0-100)
{round}         - Số vòng hiện tại (integer)
{totalRounds}   - Tổng số vòng (integer)
{topTeam}       - Tên đội dẫn đầu (string)
{eventName}     - Tên sự kiện (string, từ content/game/events.json)
{count}         - Số lượng (integer, dùng trong multi-team template)
```

### 8.5 Mỗi category phải có ít nhất 3 templates

```
Lý do: Game có 8 vòng. Nếu chỉ có 1-2 template cho một category,
narrator sẽ lặp lại trong cùng một game → trải nghiệm kém.

Minimum per decision type: 3 templates
Minimum per event type: 3 templates
Minimum for monopoly: 4 templates
```

### 8.6 Quiz — correctIndex phải trong range options

```json
// ❌ SAI — correctIndex = 4 nhưng chỉ có 4 options (index 0-3)
{
  "options": ["A", "B", "C", "D"],
  "correctIndex": 4
}

// ✅ ĐÚNG
{
  "options": [
    "Khi công ty chiếm hơn 50% thị phần",
    "Khi công ty có lợi nhuận cao nhất",
    "Khi công ty nhận hỗ trợ nhà nước",
    "Khi công ty xuất khẩu được"
  ],
  "correctIndex": 0
}
```

---

## 9. Quy tắc đặt tên file & thư mục

### 9.1 Bảng quy tắc

| Loại | Convention | Ví dụ |
|---|---|---|
| React component | `kebab-case.tsx` | `decision-card.tsx` |
| Page (Next.js) | `page.tsx` trong folder | `app/play/game/page.tsx` |
| Zustand store | `kebab-case.store.ts` | `game.store.ts` |
| Custom hook | `use-kebab-case.ts` | `use-socket.ts` |
| Service | `kebab-case.service.ts` | `game.service.ts` |
| Controller | `kebab-case.controller.ts` | `game.controller.ts` |
| Repository | `kebab-case.repository.ts` | `game.repository.ts` |
| Engine | `kebab-case.engine.ts` | `decision.engine.ts` |
| Type file | `kebab-case.types.ts` | `game.types.ts` |
| Utility | `kebab-case.ts` | `room-code.ts`, `format.ts` |
| Middleware | `kebab-case.middleware.ts` | `auth.middleware.ts` |
| Handler | `kebab-case.handler.ts` | `game-event.handler.ts` |
| Content JSON | `kebab-case.json` | `monopoly-basics.json` |
| Test file | `kebab-case.test.ts` | `game.engine.test.ts` |
| Thư mục | `kebab-case/` | `game-event/`, `narrator/` |

### 9.2 Class và interface — PascalCase

```typescript
// Classes
class GameEngine { }
class DecisionEngine { }
class TeamRepository { }

// Interfaces
interface TeamState { }
interface JoinGameDto { }
interface NarrationResult { }

// Type aliases
type GamePhase = ...;
type StatsDelta = ...;
```

### 9.3 Functions và variables — camelCase

```typescript
// Functions
function calculateScore() { }
const applyDecision = () => { };

// Variables
const teamId = '...';
const marketShare = 42.5;
const isMonopolyDetected = false;
```

### 9.4 Constants — SCREAMING_SNAKE_CASE

```typescript
// Module-level constants chỉ
const MAX_TEAMS = 9;
const DEFAULT_ROUND_DURATION = 60;
const MONOPOLY_THRESHOLD_MARKET_SHARE = 50;
const MONOPOLY_RISK_CEILING = 80;
```

### 9.5 Socket events — `namespace:action` lowercase

```
player:decision
player:ready
player:quiz-answer
host:start-game
host:pause
round:start
round:tick
team:stats-update
monopoly:detected
game:phase-change
```

---

## 10. Quy tắc Git

### 10.1 Commit message — Conventional Commits

```
Format: <type>(<scope>): <description>

Types:
  feat      Tính năng mới
  fix       Sửa bug
  refactor  Refactor code (không thêm feature, không fix bug)
  docs      Thay đổi documentation
  content   Thêm/sửa content JSON (quiz, narrator, events)
  style     Format code (whitespace, semicolon...)
  test      Thêm/sửa tests
  chore     Build, config, dependencies

Scopes (tùy chọn):
  engine    Game engine
  narrator  Narrator system
  quiz      Quiz engine
  socket    Socket.IO
  ui        Frontend UI
  db        Database
  auth      Authentication
  deploy    Deployment

Ví dụ:
  feat(engine): add monopoly detection with government intervention
  fix(socket): prevent duplicate decision submissions per round
  content(narrator): add 5 Vietnamese templates for acquire decision
  content(quiz): add quiz pack for Vietnam electricity context
  refactor(engine): extract scoring logic into ScoringEngine class
  docs: update architecture with Vietnamese language section
  chore(deps): upgrade socket.io to v4.7
```

### 10.2 Branch naming

```
feature/game-engine-core
feature/quiz-system
feature/projector-view
fix/socket-reconnection
fix/decision-timer-desync
content/narrator-templates-v2
refactor/scoring-engine
chore/pm2-config
```

### 10.3 Không commit trực tiếp vào `main`

- Mọi thay đổi phải qua branch + merge
- Ngoại lệ: hotfix production với phạm vi nhỏ, commit message rõ ràng

### 10.4 Không commit file nhạy cảm

```
# .gitignore phải có:
.env
.env.local
.env.production
*.db
*.db-wal
*.db-shm
data/
```

---

## 11. Quy tắc kiểm thử

### 11.1 Những gì phải có test

| Module | Test type | Priority |
|---|---|---|
| `GameEngine.processRound()` | Unit test | 🔴 Bắt buộc |
| `DecisionEngine.applyDecision()` | Unit test | 🔴 Bắt buộc |
| `EventEngine.applyEvent()` | Unit test | 🔴 Bắt buộc |
| `MonopolyDetector.check()` | Unit test | 🔴 Bắt buộc |
| `ScoringEngine.calculateRoundScore()` | Unit test | 🔴 Bắt buộc |
| `NarratorEngine.generate()` | Unit test | 🟡 Nên có |
| `QuizEngine.scoreAnswer()` | Unit test | 🟡 Nên có |
| Auth endpoints | Integration test | 🟡 Nên có |
| Full game round | E2E test | 🟢 Tùy chọn |

### 11.2 Test structure — AAA pattern

```typescript
describe('DecisionEngine', () => {
  describe('applyDecision', () => {
    it('should increase market share when acquiring competitor', () => {
      // Arrange
      const team = buildTeamState({ money: 10000, marketShare: 20 });
      const decision = buildDecision({ type: 'acquire_competitor' });
      const engine = new DecisionEngine();

      // Act
      const delta = engine.applyDecision(team, decision, mockContext);

      // Assert
      expect(delta.marketShare).toBeGreaterThan(0);
      expect(delta.money).toBeLessThan(0); // Tốn tiền
      expect(delta.monopolyRisk).toBeGreaterThan(0); // Tăng rủi ro
    });

    it('should apply diminishing returns when market share is high', () => {
      // Arrange
      const highShareTeam = buildTeamState({ money: 10000, marketShare: 80 });
      const lowShareTeam = buildTeamState({ money: 10000, marketShare: 20 });

      // Act
      const highDelta = engine.applyDecision(highShareTeam, decision, mockContext);
      const lowDelta = engine.applyDecision(lowShareTeam, decision, mockContext);

      // Assert
      expect(highDelta.marketShare).toBeLessThan(lowDelta.marketShare);
    });
  });
});
```

### 11.3 Test data builders

```typescript
// Dùng builder function thay vì object literal lặp lại
// tests/builders.ts

export const buildTeamState = (overrides?: Partial<TeamState>): TeamState => ({
  id: 'test-team-id',
  name: 'Công ty Test',
  money: 10000,
  marketShare: 11.11,
  technology: 50,
  reputation: 50,
  monopolyRisk: 10,
  totalScore: 0,
  quizScore: 0,
  ...overrides,
});

export const buildDecision = (overrides?: Partial<Decision>): Decision => ({
  type: 'invest_tech',
  ...overrides,
});
```

### 11.4 Không test implementation, test behavior

```typescript
// ❌ CẤM — test implementation detail
it('should call effectsTable.get()', () => {
  const spy = jest.spyOn(engine['effectsTable'], 'get');
  engine.applyDecision(team, decision, ctx);
  expect(spy).toHaveBeenCalled(); // Brittle — vỡ khi refactor
});

// ✅ ĐÚNG — test behavior/output
it('should reduce money when investing in technology', () => {
  const before = team.money;
  const delta = engine.applyDecision(team, decision, ctx);
  expect(delta.money).toBeLessThan(0);
});
```

---

## 12. Danh sách cấm

Những điều này **KHÔNG BAO GIỜ** được làm trong codebase:

### Cấm tuyệt đối

| Cấm | Thay bằng |
|---|---|
| Hardcode chuỗi tiếng Việt trong `.tsx`/`.ts` | `vi.key.subkey` từ `i18n/vi.ts` |
| Hardcode chuỗi tiếng Việt trong `.ts` backend | JSON content hoặc `vi.errors.*` |
| Dùng `any` type | `unknown` + type guard hoặc generic |
| Dùng `Math.random()` trong game engine | `SeededRNG` |
| SQL string interpolation | Prepared statements |
| `console.log` trong production code | `pino` logger |
| `default export` cho React component | Named export |
| Hardcode màu sắc arbitrary | Design token từ Tailwind config |
| Throw raw string/object | Custom Error class |
| Business logic trong controller | Service layer |
| DB access trong service | Repository layer |
| Game state tính toán ở client | Server-authoritative, nhận từ socket |
| `socket.emit` đến tất cả (`io.emit`) | Emit đúng room (`io.to(room).emit`) |
| teamId từ client payload | `socket.data.teamId` từ JWT |
| `!` non-null assertion | Optional chaining + null check |
| English text trong content JSON | Vietnamese từ đầu |

### Cảnh báo (Warning)

| Cần cẩn thận | Lý do |
|---|---|
| `useEffect` với nhiều dependencies | Dễ gây infinite loop |
| Subscribe toàn bộ Zustand store | Re-render không cần thiết |
| Framer Motion `repeat: Infinity` | Ảnh hưởng performance |
| `db.exec()` cho nhiều câu lệnh | Dùng transaction thay thế |
| Gọi `io.to(room).emit` bên trong repository | Phá vỡ separation of concerns |
| Import từ `server/` trong `client/` | Dùng `shared/` cho types chung |

---

> **Ghi nhớ cuối:**
> Code này sẽ chạy trước mặt sinh viên và giảng viên trong lớp học.
> Chất lượng code = chất lượng giáo dục.
