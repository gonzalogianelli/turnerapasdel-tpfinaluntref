import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  app,
  cleanDatabase,
  closeTestEnvironment,
  sequelize,
  User,
  Cancha,
  Turno,
  Reserva,
  Partido,
  Inscripcion,
} from '../test-support/setup.js';
import { initModels } from '../src/models/index.js';

before(async () => {
  await cleanDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

after(async () => {
  await closeTestEnvironment();
});

const PASSWORD = 'DemoTestPass!2026';

const createUser = (email, rol = 'jugador') =>
  User.create({
    nombre: 'Usuario baja logica Demo',
    email,
    password: PASSWORD,
    categoria: 'sexta',
    posicionHabitual: 'drive',
    manoDominante: 'diestro',
    sexo: 'masculino',
    telefono: '123456789',
    rol,
  });

const cookieFor = async (email) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  return response.headers['set-cookie'][0].split(';')[0];
};

test('las seis tablas tienen deletedAt nullable y la migracion repetida conserva filas', async () => {
  const user = await createUser('migracion-baja-demo@example.com');

  await initModels();
  await initModels();

  for (const model of [User, Cancha, Turno, Reserva, Partido, Inscripcion]) {
    assert.ok(model.rawAttributes.deletedAt, `falta deletedAt en ${model.tableName}`);
    const description = await sequelize.getQueryInterface().describeTable(model.tableName);
    assert.ok(description.deletedAt, `falta deletedAt en ${model.tableName}`);
    assert.match(String(description.deletedAt.allowNull).toUpperCase(), /^(YES|TRUE|1)$/);
  }

  assert.equal(await User.count(), 1);
  assert.equal((await User.findByPk(user.id)).email, user.email);
});

test('la baja logica oculta el registro por defecto y conserva su fila historica', async () => {
  const user = await createUser('ocultamiento-baja-demo@example.com');
  const visible = await User.findByPk(user.id);
  assert.equal(visible.toJSON().password, undefined);

  await visible.destroy();

  assert.equal(await User.count(), 0);
  assert.equal(await User.count({ paranoid: false }), 1);
  const historical = await User.findByPk(user.id, { paranoid: false });
  assert.ok(historical.deletedAt instanceof Date);
});

test('un usuario dado de baja no figura en detalle ni listados', async () => {
  const admin = await createUser('admin-ocultamiento-demo@example.com', 'administrador');
  const target = await createUser('target-ocultamiento-demo@example.com');
  const cookie = await cookieFor(admin.email);

  await target.destroy();

  await request(app).get(`/api/users/${target.id}`).set('Cookie', cookie).expect(404);
  const response = await request(app).get('/api/users').set('Cookie', cookie).expect(200);
  assert.ok(!response.body.data.some((item) => item.id === target.id));
});

test('un identificador de ruta no entero positivo responde 400', async () => {
  const admin = await createUser('admin-id-invalido-demo@example.com', 'administrador');

  await request(app)
    .get('/api/users/no-es-un-id')
    .set('Cookie', await cookieFor(admin.email))
    .expect(400);
});
