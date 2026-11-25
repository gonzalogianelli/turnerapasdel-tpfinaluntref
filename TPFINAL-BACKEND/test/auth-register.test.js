import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, cleanDatabase, closeTestEnvironment, User } from '../test-support/setup.js';

before(async () => {
  await cleanDatabase();
});

after(async () => {
  await closeTestEnvironment();
});

const validPayload = {
  nombre: 'Registro Demo',
  email: 'registro-demo@example.com',
  password: 'DemoTestPass!2026',
  categoria: 'sexta',
  posicionHabitual: 'drive',
  manoDominante: 'diestro',
  sexo: 'masculino',
  telefono: '123456789',
};

test('registro publico crea jugador y devuelve cookie HTTPOnly', async () => {
  const response = await request(app).post('/api/auth/register').send(validPayload).expect(201);

  assert.equal(response.body.status, 'success');
  assert.equal(response.body.data.rol, 'jugador');
  assert.equal(response.body.data.email, validPayload.email);
  assert.equal(response.body.data.password, undefined);
  assert.ok(Array.isArray(response.headers['set-cookie']));
  assert.match(response.headers['set-cookie'][0], /HttpOnly/i);
});

test('registro publico rechaza rol elevado sin crear usuario', async () => {
  const email = 'registro-elevado-demo@example.com';
  const response = await request(app)
    .post('/api/auth/register')
    .send({ ...validPayload, email, rol: 'administrador' })
    .expect(400);

  assert.match(response.body.message, /rol/);
  assert.equal(await User.count({ where: { email } }), 0);
});
