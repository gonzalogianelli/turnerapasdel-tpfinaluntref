import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {
  app,
  cleanDatabase,
  closeTestEnvironment,
  User,
  Cancha,
  Turno,
  Reserva,
  Partido,
  Inscripcion,
} from '../test-support/setup.js';

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

const userData = (email, rol = 'jugador') => ({
  nombre: 'Usuario baja Demo',
  email,
  password: PASSWORD,
  categoria: 'sexta',
  posicionHabitual: 'drive',
  manoDominante: 'diestro',
  sexo: 'masculino',
  telefono: '123456789',
  rol,
});

const createUser = (email, rol = 'jugador') => User.create(userData(email, rol));

const cookieFor = async (email) => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email, password: PASSWORD })
    .expect(200);
  assert.ok(Array.isArray(response.headers['set-cookie']));
  return response.headers['set-cookie'][0].split(';')[0];
};

const createEscenarioReserva = async (usuarioId, estadoReserva = 'pendiente') => {
  const cancha = await Cancha.create({ nombre: `Cancha baja ${Date.now()}` });
  const inicio = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  const turno = await Turno.create({
    canchaId: cancha.id,
    fechaHoraInicio: inicio,
    fechaHoraFin: new Date(inicio.getTime() + 90 * 60 * 1000),
    estado: 'reservado',
  });
  const reserva = await Reserva.create({
    turnoId: turno.id,
    usuarioId,
    estado: estadoReserva,
    cuposOcupados: 1,
  });
  return { cancha, turno, reserva };
};

test('DELETE /api/users/:id da de baja al jugador y devuelve sus datos sin contraseña', async () => {
  const admin = await createUser('admin-baja-usuario-demo@example.com', 'administrador');
  const target = await createUser('target-baja-usuario-demo@example.com');

  const response = await request(app)
    .delete(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(admin.email))
    .expect(200);

  assert.equal(response.body.status, 'success');
  assert.equal(response.body.data.id, target.id);
  assert.equal(response.body.data.password, undefined);
  assert.equal(await User.count(), 1);
  const historical = await User.findByPk(target.id, { paranoid: false });
  assert.ok(historical.deletedAt instanceof Date);
});

test('DELETE /api/users/:id exige sesion y rol administrador', async () => {
  const target = await createUser('target-rbac-baja-demo@example.com');
  const jugador = await createUser('jugador-rbac-baja-demo@example.com');

  await request(app).delete(`/api/users/${target.id}`).expect(401);
  await request(app)
    .delete(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(jugador.email))
    .expect(403);

  assert.equal((await User.findByPk(target.id)).deletedAt, null);
});

test('DELETE /api/users/:id responde 400, 404 y 404 en una segunda baja', async () => {
  const admin = await createUser('admin-404-baja-demo@example.com', 'administrador');
  const target = await createUser('target-404-baja-demo@example.com');
  const cookie = await cookieFor(admin.email);

  await request(app).delete('/api/users/no-es-un-id').set('Cookie', cookie).expect(400);
  await request(app).delete('/api/users/999999').set('Cookie', cookie).expect(404);
  await request(app).delete(`/api/users/${target.id}`).set('Cookie', cookie).expect(200);
  await request(app).delete(`/api/users/${target.id}`).set('Cookie', cookie).expect(404);
});

test('no se puede dar de baja al ultimo administrador', async () => {
  const admin = await createUser('unico-admin-baja-demo@example.com', 'administrador');

  const response = await request(app)
    .delete(`/api/users/${admin.id}`)
    .set('Cookie', await cookieFor(admin.email))
    .expect(409);

  assert.match(response.body.message, /ultimo administrador/);
  assert.equal((await User.findByPk(admin.id)).deletedAt, null);
});

test('ante bajas concurrentes de los ultimos dos administradores solo una se concreta', async () => {
  const first = await createUser('admin-concurrente-baja-uno-demo@example.com', 'administrador');
  const second = await createUser('admin-concurrente-baja-dos-demo@example.com', 'administrador');
  const firstCookie = await cookieFor(first.email);
  const secondCookie = await cookieFor(second.email);

  const results = await Promise.allSettled([
    request(app).delete(`/api/users/${second.id}`).set('Cookie', firstCookie),
    request(app).delete(`/api/users/${first.id}`).set('Cookie', secondCookie),
  ]);

  const statuses = results.map((result) => result.value?.status ?? result.reason?.status).sort();
  assert.deepEqual(statuses, [200, 409]);
  assert.equal(await User.count({ where: { rol: 'administrador' } }), 1);
});

test('no se puede dar de baja un usuario con reserva activa', async () => {
  const admin = await createUser('admin-reserva-activa-demo@example.com', 'administrador');
  const target = await createUser('target-reserva-activa-demo@example.com');
  await createEscenarioReserva(target.id, 'pendiente');

  await request(app)
    .delete(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(admin.email))
    .expect(409);

  assert.equal((await User.findByPk(target.id)).deletedAt, null);
});

test('no se puede dar de baja un usuario con inscripcion activa', async () => {
  const admin = await createUser('admin-inscripcion-activa-demo@example.com', 'administrador');
  const target = await createUser('target-inscripcion-activa-demo@example.com');
  const { reserva } = await createEscenarioReserva(target.id, 'confirmada');
  const partido = await Partido.create({ reservaId: reserva.id, categoria: 'sexta' });
  await Inscripcion.create({ partidoId: partido.id, usuarioId: target.id });

  await request(app)
    .delete(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(admin.email))
    .expect(409);

  assert.equal((await User.findByPk(target.id)).deletedAt, null);
});

test('se puede dar de baja un usuario con historial terminal', async () => {
  const admin = await createUser('admin-historial-terminal-demo@example.com', 'administrador');
  const target = await createUser('target-historial-terminal-demo@example.com');
  const { reserva } = await createEscenarioReserva(target.id, 'rechazada');
  const partido = await Partido.create({ reservaId: reserva.id, categoria: 'sexta' });
  const inscripcion = await Inscripcion.create({ partidoId: partido.id, usuarioId: target.id });
  await inscripcion.destroy();

  await request(app)
    .delete(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(admin.email))
    .expect(200);

  assert.ok((await User.findByPk(target.id, { paranoid: false })).deletedAt);
});

test('el email de un usuario bajado sigue reservado para registro publico y alta administrativa', async () => {
  const admin = await createUser('admin-email-reservado-demo@example.com', 'administrador');
  const target = await createUser('email-reservado-demo@example.com');
  const cookie = await cookieFor(admin.email);
  await request(app).delete(`/api/users/${target.id}`).set('Cookie', cookie).expect(200);

  const { rol, ...publicData } = userData(target.email);
  await request(app)
    .post('/api/auth/register')
    .send(publicData)
    .expect(409);
  await request(app)
    .post('/api/users')
    .set('Cookie', cookie)
    .send(userData(target.email, 'jugador'))
    .expect(409);
});

test('un usuario bajado no puede iniciar sesion ni usar una cookie emitida antes de la baja', async () => {
  const admin = await createUser('admin-cookie-bajada-demo@example.com', 'administrador');
  const target = await createUser('cookie-bajada-demo@example.com');
  const targetCookie = await cookieFor(target.email);

  await request(app)
    .delete(`/api/users/${target.id}`)
    .set('Cookie', await cookieFor(admin.email))
    .expect(200);

  await request(app)
    .post('/api/auth/login')
    .send({ email: target.email, password: PASSWORD })
    .expect(401);
  await request(app).get('/api/users/me').set('Cookie', targetCookie).expect(401);
});
