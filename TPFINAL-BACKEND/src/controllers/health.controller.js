import { checkDatabaseHealth } from '../config/database.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const getHealth = asyncHandler(async (req, res) => {
  const db = await checkDatabaseHealth();
  const statusCode = db.ok ? 200 : 503;

  return res.status(statusCode).json({
    status: db.ok ? 'ok' : 'degraded',
    server: 'up',
    database: db.ok ? 'up' : 'down',
    timestamp: new Date().toISOString(),
  });
});

export { getHealth };
