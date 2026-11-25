import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, cleanDatabase, closeTestEnvironment, User } from '../test-support/setup.js';

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

const createUser = (email, rol) =>
  User.create({
    nombre: 'Usuario Demo',
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
  const cookies = response.headers['set-cookie'];
  assert.ok(Array.isArray(cookies) && cookies.length > 0);
  return cookies[0].split(';')[0];
};

const basePayload = {
  nombre: 'Alta por admin Demo',
  email: 'alta-por-admin-demo@example.com',
  password: PASSWORD,
  categoria: 'sexta',
  posicionHabitual: 'drive',
  manoDominante: 'diestro',
  sexo: 'masculino',
  telefono: '123456789',
};

test('GET /api/users/me sin sesion responde 401', async () => {
  await request(app).get('/api/users/me').expect(401);
});

test('GET /api/users/me permite a jugador y administrador sin exigir rol', async () => {
  const jugador = await createUser('me-jugador-demo@example.com', 'jugador');
  const admin = await createUser('me-admin-demo@example.com', 'administrador');

  const jugadorResponse = await request(app)
    .get('/api/users/me')
    .set('Cookie', await cookieFor(jugador.email))
    .expect(200);
  const adminResponse = await request(app)
    .get('/api/users/me')
    .set('Cookie', await cookieFor(admin.email))
    .expect(200);

  assert.equal(jugadorResponse.body.data.rol, 'jugador');
  assert.equal(adminResponse.body.data.rol, 'administrador');
  assert.equal(jugadorResponse.body.data.password, undefined);
});

test('PATCH /api/users/me rechaza cambio de rol', async () => {
  const jugador = await createUser('me-patch-demo@example.com', 'jugador');

  await request(app)
    .patch('/api/users/me')
    .set('Cookie', await cookieFor(jugador.email))
    .send({ rol: 'administrador' })
    .expect(400);

  assert.equal((await User.findByPk(jugador.id)).rol, 'jugador');
});

test('GET /api/users sin sesion responde 401', async () => {
  await request(app).get('/api/users').expect(401);
});

test('GET /api/users con jugador responde 403', async () => {
  const jugador = await createUser('listar-jugador-demo@example.com', 'jugador');

  await request(app)
    .get('/api/users')
    .set('Cookie', await cookieFor(jugador.email))
    .expect(403);
});

test('GET /api/users con administrador responde 200', async () => {
  const admin = await createUser('listar-admin-demo@example.com', 'administrador');

  const response = await request(app)
    .get('/api/users')
    .set('Cookie', await cookieFor(admin.email))
    .expect(200);

  assert.equal(response.body.status, 'success');
  assert.ok(Array.isArray(response.body.data));
  assert.equal(response.body.meta.total, 1);
});

test('POST /api/users sin sesion responde 401', async () => {
  await request(app).post('/api/users').send(basePayload).expect(401);
});

test('POST /api/users con jugador responde 403', async () => {
  const jugador = await createUser('alta-jugador-demo@example.com', 'jugador');

  await request(app)
    .post('/api/users')
    .set('Cookie', await cookieFor(jugador.email))
    .send(basePayload)
    .expect(403);
});

test('POST /api/users con administrador crea usuario', async () => {
  const admin = await createUser('alta-admin-demo@example.com', 'administrador');

  const response = await request(app)
    .post('/api/users')
    .set('Cookie', await cookieFor(admin.email))
    .send(basePayload)
    .expect(201);

  assert.equal(response.body.data.rol, 'jugador');
  assert.equal(response.body.data.email, basePayload.email);
});

test('GET /api/users/:id sin sesion responde 401', async () => {
  const user = await createUser('detalle-sin-sesion-demo@example.com', 'jugador');

  await request(app).get(`/api/users/${user.id}`).expect(401);
});

test('GET /api/users/:id con jugador responde 403', async () => {
  const jugador = await createUser('detalle-jugador-demo@example.com', 'jugador');
  const target = await createUser('detalle-target-demo@example.com', 'jugador');

  await request(app)
    .get(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(jugador.email))
    .expect(403);
});

test('GET /api/users/:id con administrador responde 200', async () => {
  const admin = await createUser('detalle-admin-demo@example.com', 'administrador');
  const target = await createUser('detalle-admin-target-demo@example.com', 'jugador');

  const response = await request(app)
    .get(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(admin.email))
    .expect(200);

  assert.equal(response.body.data.id, target.id);
});

test('PATCH /api/users/:id sin sesion responde 401', async () => {
  const user = await createUser('edicion-sin-sesion-demo@example.com', 'jugador');

  await request(app).patch(`/api/users/${user.id}`).send({ nombre: 'Cambio' }).expect(401);
});

test('PATCH /api/users/:id con jugador responde 403', async () => {
  const jugador = await createUser('edicion-jugador-demo@example.com', 'jugador');
  const target = await createUser('edicion-jugador-target-demo@example.com', 'jugador');

  await request(app)
    .patch(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(jugador.email))
    .send({ nombre: 'Cambio' })
    .expect(403);
});

test('PATCH /api/users/:id con administrador aplica cambios de rol', async () => {
  const admin = await createUser('edicion-admin-demo@example.com', 'administrador');
  const target = await createUser('edicion-admin-target-demo@example.com', 'administrador');

  const response = await request(app)
    .patch(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(admin.email))
    .send({ rol: 'jugador' })
    .expect(200);

  assert.equal(response.body.data.rol, 'jugador');
  assert.equal((await User.findByPk(target.id)).rol, 'jugador');
});

test('PATCH /api/users/:id devuelve 409 al degradar al ultimo administrador', async () => {
  const admin = await createUser('ultimo-admin-http-demo@example.com', 'administrador');
  const cookie = await cookieFor(admin.email);

  await request(app)
    .patch(`/api/users/${admin.id}`)
    .set('Cookie', cookie)
    .send({ rol: 'jugador' })
    .expect(409);

  assert.equal((await User.findByPk(admin.id)).rol, 'administrador');
});
