import { Sequelize } from 'sequelize';
import { config } from './env.js';
import { logger } from './logger.js';

const sequelize = new Sequelize(config.db.name, config.db.user, config.db.password, {
  host: config.db.host,
  port: config.db.port,
  dialect: 'mysql',
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  dialectOptions: {
    connectTimeout: 5000,
  },
});

const connectDatabase = async () => {
  await sequelize.authenticate();
  logger.info({ host: config.db.host, database: config.db.name }, 'Conexion a MySQL establecida');
  return sequelize;
};

const checkDatabaseHealth = async () => {
  try {
    await sequelize.query('SELECT 1', { timeout: 3000 });
    return { ok: true };
  } catch (error) {
    logger.warn({ err: error }, 'Verificacion de MySQL fallida');
    return { ok: false, error: error.message };
  }
};

const closeDatabase = async () => {
  await sequelize.close();
  logger.info('Conexion a MySQL cerrada');
};

export { sequelize, connectDatabase, checkDatabaseHealth, closeDatabase };
