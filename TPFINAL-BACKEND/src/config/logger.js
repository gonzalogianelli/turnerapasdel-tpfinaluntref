import pino from 'pino';
import { config } from './env.js';

const levelByEnv = {
  test: 'silent',
  production: 'info',
};

const level = levelByEnv[config.env] ?? 'debug';

const logger = pino({
  level,
  base: { service: 'padel-backend', env: config.env },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export { logger };
