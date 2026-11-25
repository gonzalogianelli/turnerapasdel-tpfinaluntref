import 'dotenv/config';
import mysql from 'mysql2/promise';

const baseDbName = process.env.DB_NAME;
if (!baseDbName) {
  throw new Error('DB_NAME es requerido para ejecutar los tests');
}

const testDbName = process.env.TEST_DB_NAME || (baseDbName.endsWith('_test') ? baseDbName : `${baseDbName}_test`);
if (!/^[A-Za-z0-9_]+$/.test(testDbName)) {
  throw new Error('TEST_DB_NAME contiene caracteres no permitidos');
}

process.env.DB_NAME = testDbName;
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-no-produccion';
process.env.SMTP_HOST = '';
process.env.SMTP_FROM = '';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';

const connection = await mysql.createConnection({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD || '',
});
await connection.query(`CREATE DATABASE IF NOT EXISTS \`${testDbName}\``);
await connection.end();

const { app } = await import('../src/app.js');
const {
  sequelize,
  initModels,
  User,
  Cancha,
  Turno,
  Reserva,
  Partido,
  Inscripcion,
} = await import('../src/models/index.js');

await initModels();

const cleanDatabase = async () => {
  await Inscripcion.destroy({ where: {}, force: true });
  await Partido.destroy({ where: {}, force: true });
  await Reserva.destroy({ where: {}, force: true });
  await Turno.destroy({ where: {}, force: true });
  await Cancha.destroy({ where: {}, force: true });
  await User.destroy({ where: {}, force: true });
};

const closeTestEnvironment = async () => {
  await cleanDatabase();
  await sequelize.close();
};

export {
  app,
  sequelize,
  User,
  Cancha,
  Turno,
  Reserva,
  Partido,
  Inscripcion,
  testDbName,
  cleanDatabase,
  closeTestEnvironment,
};
