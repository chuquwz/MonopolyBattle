import express from 'express';
import { GAME_CONSTANTS } from '@monopoly/shared';

const app = express();
const port = process.env.PORT || 4000;

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'MonopolyBattle Server Scaffold Initialized',
    constants: {
      startingMoney: GAME_CONSTANTS.STARTING_MONEY,
      defaultDuration: GAME_CONSTANTS.DEFAULT_ROUND_DURATION_SEC,
    },
  });
});

app.listen(port, () => {
  console.log(`[Server] Scaffold running on port ${port}`);
});
