import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanDatabase, closeTestEnvironment, User } from '../test-support/setup.js';
import { updateUser } from '../src/services/user.service.js';

before(async () => {
  await cleanDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

after(async () => {
  await closeTestEnvironment();
});

const createUser = (email, rol) =>
  User.create({
    nombre: 'Admin Demo',
    email,
    password: 'DemoTestPass!2026',
    categoria: 'sexta',
    posicionHabitual: 'drive',
    manoDominante: 'diestro',
    sexo: 'masculino',
    telefono: '123456789',
    rol,
  });

test('rechaza degradar al unico administrador sin aplicar cambios', async () => {
  const admin = await createUser('unico-admin-demo@example.com', 'administrador');

  await assert.rejects(
    updateUser(admin.id, { rol: 'jugador' }),
    (error) => error.name === 'AppError' && error.statusCode === 409,
  );

  const fresh = await User.findByPk(admin.id);
  assert.equal(fresh.rol, 'administrador');
});

test('permite degradar un administrador cuando queda otro', async () => {
  const first = await createUser('admin-uno-demo@example.com', 'administrador');
  const second = await createUser('admin-dos-demo@example.com', 'administrador');

  const updated = await updateUser(first.id, { rol: 'jugador' });

  assert.equal(updated.rol, 'jugador');
  assert.equal(await User.count({ where: { rol: 'administrador' } }), 1);
  assert.equal((await User.findByPk(second.id)).rol, 'administrador');
});

test('ante degradaciones concurrentes solo una se confirma', async () => {
  const first = await createUser('admin-concurrente-uno-demo@example.com', 'administrador');
  const second = await createUser('admin-concurrente-dos-demo@example.com', 'administrador');

  const results = await Promise.allSettled([
    updateUser(first.id, { rol: 'jugador' }),
    updateUser(second.id, { rol: 'jugador' }),
  ]);

  const accepted = results.filter((result) => result.status === 'fulfilled');
  const rejected = results.filter((result) => result.status === 'rejected');

  assert.equal(accepted.length, 1);
  assert.equal(rejected.length, 1);
  assert.equal(rejected[0].reason.statusCode, 409);
  assert.equal(await User.count({ where: { rol: 'administrador' } }), 1);
});
