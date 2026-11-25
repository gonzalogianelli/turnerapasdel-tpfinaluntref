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

const createUser = (email, rol = 'jugador') =>
  User.create({
    nombre: 'Usuario reservas baja Demo',
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

const adminCookie = async () => {
  const admin = await createUser('admin-reservas-baja-demo@example.com', 'administrador');
  return cookieFor(admin.email);
};

const createEscenario = async (
  estadoTurno = 'cancelado',
  estadoReserva = 'rechazada',
  emailJugador = 'jugador-reserva-baja-demo@example.com',
) => {
  const cancha = await Cancha.create({ nombre: `Cancha reserva baja ${Date.now()}` });
  const inicio = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const turno = await Turno.create({
    canchaId: cancha.id,
    fechaHoraInicio: inicio,
    fechaHoraFin: new Date(inicio.getTime() + 90 * 60 * 1000),
    estado: estadoTurno,
  });
  const jugador = await createUser(emailJugador);
  const reserva = await Reserva.create({
    turnoId: turno.id,
    usuarioId: jugador.id,
    estado: estadoReserva,
    cuposOcupados: 1,
  });
  return { turno, jugador, reserva };
};

test('DELETE /api/reservas/:id da de baja una reserva terminal y la oculta sin tocar el turno', async () => {
  const cookie = await adminCookie();
  const { turno, reserva } = await createEscenario('cancelado', 'cancelada');

  const response = await request(app)
    .delete(`/api/reservas/${reserva.id}`)
    .set('Cookie', cookie)
    .expect(200);

  assert.equal(response.body.data.id, reserva.id);
  assert.ok((await Reserva.findByPk(reserva.id, { paranoid: false })).deletedAt);
  assert.equal((await Turno.findByPk(turno.id)).estado, 'cancelado');
  assert.equal(await Reserva.count(), 0);
  await request(app).get(`/api/reservas/${reserva.id}`).set('Cookie', cookie).expect(404);
  const list = await request(app).get('/api/reservas').set('Cookie', cookie).expect(200);
  assert.ok(!list.body.data.some((item) => item.id === reserva.id));
});

test('la baja de una reserva rechazada no republica un turno disponible', async () => {
  const cookie = await adminCookie();
  const { turno, reserva } = await createEscenario('disponible', 'rechazada');
  const jugadorCookie = await cookieFor('jugador-reserva-baja-demo@example.com');

  await request(app).delete(`/api/reservas/${reserva.id}`).set('Cookie', cookie).expect(200);

  assert.equal((await Turno.findByPk(turno.id)).estado, 'disponible');
  const disponibles = await request(app)
    .get('/api/turnos?estado=disponible')
    .set('Cookie', jugadorCookie)
    .expect(200);
  assert.ok(disponibles.body.data.some((item) => item.id === turno.id));
});

test('DELETE /api/reservas/:id rechaza reservas pendientes o confirmadas', async () => {
  let cookie = await adminCookie();

  for (const estado of ['pendiente', 'confirmada']) {
    const { reserva } = await createEscenario('reservado', estado);

    await request(app).delete(`/api/reservas/${reserva.id}`).set('Cookie', cookie).expect(409);

    assert.equal((await Reserva.findByPk(reserva.id)).deletedAt, null);
    await cleanDatabase();
    cookie = await adminCookie();
  }
});

test('DELETE /api/reservas/:id rechaza una reserva terminal con partido vigente', async () => {
  const cookie = await adminCookie();
  const { reserva } = await createEscenario('cancelado', 'cancelada');

  for (const estado of ['incompleto', 'completo']) {
    await Partido.create({ reservaId: reserva.id, categoria: 'sexta', estado });
    await request(app).delete(`/api/reservas/${reserva.id}`).set('Cookie', cookie).expect(409);
    await Partido.destroy({ where: { reservaId: reserva.id }, force: true });
  }

  assert.equal((await Reserva.findByPk(reserva.id)).deletedAt, null);
});

test('DELETE /api/reservas/:id permite una reserva terminal con partido cerrado o bajado', async () => {
  const cookie = await adminCookie();
  const { reserva } = await createEscenario('jugado', 'cancelada');
  const partido = await Partido.create({ reservaId: reserva.id, categoria: 'sexta', estado: 'jugado' });

  await request(app).delete(`/api/reservas/${reserva.id}`).set('Cookie', cookie).expect(200);
  assert.equal((await Partido.findByPk(partido.id)).estado, 'jugado');

  await cleanDatabase();
  const nuevaCookie = await adminCookie();
  const segundo = await createEscenario('cancelado', 'rechazada');
  const bajado = await Partido.create({
    reservaId: segundo.reserva.id,
    categoria: 'sexta',
    estado: 'cancelado',
  });
  await bajado.destroy();

  await request(app)
    .delete(`/api/reservas/${segundo.reserva.id}`)
    .set('Cookie', nuevaCookie)
    .expect(200);
  assert.ok((await Partido.findByPk(bajado.id, { paranoid: false })).deletedAt);
});

test('DELETE /api/reservas/:id valida sesion, rol, identificador y existencia', async () => {
  const admin = await createUser('admin-rbac-reserva-demo@example.com', 'administrador');
  const jugador = await createUser('jugador-rbac-reserva-demo@example.com');
  const { reserva } = await createEscenario(
    'cancelado',
    'rechazada',
    'tercer-jugador-reserva-demo@example.com',
  );

  await request(app).delete(`/api/reservas/${reserva.id}`).expect(401);
  const jugadorCookie = await cookieFor(jugador.email);
  await request(app)
    .delete(`/api/reservas/${reserva.id}`)
    .set('Cookie', jugadorCookie)
    .expect(403);

  const cookie = await cookieFor(admin.email);
  await request(app).delete('/api/reservas/abc').set('Cookie', cookie).expect(400);
  await request(app).delete('/api/reservas/999999').set('Cookie', cookie).expect(404);
  await request(app).delete(`/api/reservas/${reserva.id}`).set('Cookie', cookie).expect(200);
  await request(app).delete(`/api/reservas/${reserva.id}`).set('Cookie', cookie).expect(404);
});
