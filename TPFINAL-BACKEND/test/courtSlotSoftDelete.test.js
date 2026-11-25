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
    nombre: 'Usuario canchas y turnos Demo',
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
  const admin = await createUser('admin-canchas-turnos-demo@example.com', 'administrador');
  return cookieFor(admin.email);
};

const createCancha = () => Cancha.create({ nombre: `Cancha Demo ${Date.now()}` });

const createTurno = async (canchaId, estado = 'disponible', dias = 7) => {
  const inicio = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return Turno.create({
    canchaId,
    fechaHoraInicio: inicio,
    fechaHoraFin: new Date(inicio.getTime() + 90 * 60 * 1000),
    estado,
  });
};

const createReserva = async (turnoId, usuarioId, estado = 'pendiente') =>
  Reserva.create({ turnoId, usuarioId, estado, cuposOcupados: 1 });

test('DELETE /api/canchas/:id da de baja una cancha sin turnos activos y la oculta', async () => {
  const cookie = await adminCookie();
  const cancha = await createCancha();

  const response = await request(app)
    .delete(`/api/canchas/${cancha.id}`)
    .set('Cookie', cookie)
    .expect(200);

  assert.equal(response.body.data.id, cancha.id);
  assert.equal(await Cancha.count(), 0);
  assert.ok((await Cancha.findByPk(cancha.id, { paranoid: false })).deletedAt);
  await request(app).get(`/api/canchas/${cancha.id}`).set('Cookie', cookie).expect(404);
  const list = await request(app).get('/api/canchas?bloqueada=false').set('Cookie', cookie).expect(200);
  assert.ok(!list.body.data.some((item) => item.id === cancha.id));
});

test('DELETE /api/canchas/:id rechaza canchas con turnos activos', async () => {
  let cookie = await adminCookie();

  for (const [indice, estado] of ['disponible', 'reservado', 'bloqueado'].entries()) {
    const cancha = await createCancha();
    await createTurno(cancha.id, estado, 7 + indice);

    await request(app).delete(`/api/canchas/${cancha.id}`).set('Cookie', cookie).expect(409);

    assert.equal((await Cancha.findByPk(cancha.id)).deletedAt, null);
    await cleanDatabase();
    cookie = await adminCookie();
  }
});

test('DELETE /api/canchas/:id permite canchas con solo historial terminal', async () => {
  const cookie = await adminCookie();
  const cancha = await createCancha();
  const jugado = await createTurno(cancha.id, 'jugado', 7);
  const cancelado = await createTurno(cancha.id, 'cancelado', 8);

  await request(app).delete(`/api/canchas/${cancha.id}`).set('Cookie', cookie).expect(200);

  assert.ok((await Cancha.findByPk(cancha.id, { paranoid: false })).deletedAt);
  assert.equal((await Turno.findByPk(jugado.id)).estado, 'jugado');
  assert.equal((await Turno.findByPk(cancelado.id)).estado, 'cancelado');
});

test('DELETE /api/canchas/:id valida sesion, rol, identificador y existencia', async () => {
  const admin = await createUser('admin-rbac-cancha-demo@example.com', 'administrador');
  const jugador = await createUser('jugador-rbac-cancha-demo@example.com');
  const cancha = await createCancha();

  await request(app).delete(`/api/canchas/${cancha.id}`).expect(401);
  await request(app)
    .delete(`/api/canchas/${cancha.id}`)
    .set('Cookie', await cookieFor(jugador.email))
    .expect(403);

  const cookie = await cookieFor(admin.email);
  await request(app).delete('/api/canchas/abc').set('Cookie', cookie).expect(400);
  await request(app).delete('/api/canchas/999999').set('Cookie', cookie).expect(404);
  await request(app).delete(`/api/canchas/${cancha.id}`).set('Cookie', cookie).expect(200);
  await request(app).delete(`/api/canchas/${cancha.id}`).set('Cookie', cookie).expect(404);
});

test('DELETE /api/turnos/:id da de baja un turno sin reservas activas y lo oculta', async () => {
  const cookie = await adminCookie();
  const cancha = await createCancha();
  const turno = await createTurno(cancha.id);

  const response = await request(app)
    .delete(`/api/turnos/${turno.id}`)
    .set('Cookie', cookie)
    .expect(200);

  assert.equal(response.body.data.id, turno.id);
  assert.equal(await Turno.count(), 0);
  assert.ok((await Turno.findByPk(turno.id, { paranoid: false })).deletedAt);
  await request(app).get(`/api/turnos/${turno.id}`).set('Cookie', cookie).expect(404);
  const list = await request(app).get('/api/turnos').set('Cookie', cookie).expect(200);
  assert.ok(!list.body.data.some((item) => item.id === turno.id));
});

test('DELETE /api/turnos/:id rechaza turnos con reservas pendientes o confirmadas', async () => {
  let cookie = await adminCookie();

  for (const [indice, estado] of ['pendiente', 'confirmada'].entries()) {
    const jugador = await createUser('jugador-reserva-activa-turno-demo@example.com');
    const cancha = await createCancha();
    const turno = await createTurno(cancha.id, 'reservado', 10 + indice);
    await createReserva(turno.id, jugador.id, estado);

    await request(app).delete(`/api/turnos/${turno.id}`).set('Cookie', cookie).expect(409);

    assert.equal((await Turno.findByPk(turno.id)).deletedAt, null);
    await cleanDatabase();
    cookie = await adminCookie();
  }
});

test('DELETE /api/turnos/:id permite turnos con solo reservas terminales o bajadas', async () => {
  const cookie = await adminCookie();
  const jugador = await createUser('jugador-historial-turno-demo@example.com');
  const cancha = await createCancha();
  const turno = await createTurno(cancha.id, 'cancelado');
  const rechazada = await createReserva(turno.id, jugador.id, 'rechazada');
  const bajada = await createReserva(turno.id, jugador.id, 'cancelada');

  await bajada.destroy();

  await request(app).delete(`/api/turnos/${turno.id}`).set('Cookie', cookie).expect(200);

  assert.equal((await Reserva.findByPk(rechazada.id)).estado, 'rechazada');
  assert.ok((await Reserva.findByPk(bajada.id, { paranoid: false })).deletedAt);
});

test('la baja de turno no cambia su estado ni permite reservarlo', async () => {
  let cookie = await adminCookie();

  for (const [indice, estado] of ['cancelado', 'jugado'].entries()) {
    const jugador = await createUser('jugador-turno-bajado-demo@example.com');
    const jugadorCookie = await cookieFor(jugador.email);
    const cancha = await createCancha();
    const turno = await createTurno(cancha.id, estado, 20 + indice);

    await request(app).delete(`/api/turnos/${turno.id}`).set('Cookie', cookie).expect(200);

    const historical = await Turno.findByPk(turno.id, { paranoid: false });
    assert.equal(historical.estado, estado);
    const disponibles = await request(app)
      .get('/api/turnos?estado=disponible')
      .set('Cookie', jugadorCookie)
      .expect(200);
    assert.ok(!disponibles.body.data.some((item) => item.id === turno.id));
    await request(app)
      .post('/api/reservas')
      .set('Cookie', jugadorCookie)
      .send({ turnoId: turno.id, cuposOcupados: 1 })
      .expect(404);

    await cleanDatabase();
    cookie = await adminCookie();
  }
});

test('DELETE /api/turnos/:id valida sesion, rol, identificador y existencia', async () => {
  const admin = await createUser('admin-rbac-turno-demo@example.com', 'administrador');
  const jugador = await createUser('jugador-rbac-turno-demo@example.com');
  const cancha = await createCancha();
  const turno = await createTurno(cancha.id);

  await request(app).delete(`/api/turnos/${turno.id}`).expect(401);
  await request(app)
    .delete(`/api/turnos/${turno.id}`)
    .set('Cookie', await cookieFor(jugador.email))
    .expect(403);

  const cookie = await cookieFor(admin.email);
  await request(app).delete('/api/turnos/abc').set('Cookie', cookie).expect(400);
  await request(app).delete('/api/turnos/999999').set('Cookie', cookie).expect(404);
  await request(app).delete(`/api/turnos/${turno.id}`).set('Cookie', cookie).expect(200);
  await request(app).delete(`/api/turnos/${turno.id}`).set('Cookie', cookie).expect(404);
});
