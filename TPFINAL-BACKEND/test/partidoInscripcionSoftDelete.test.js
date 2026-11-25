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

const createUser = (email, rol = 'jugador') =>
  User.create({
    nombre: 'Usuario partidos baja Demo',
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
  const admin = await createUser('admin-partidos-baja-demo@example.com', 'administrador');
  return cookieFor(admin.email);
};

const createEscenario = async (
  estadoPartido = 'incompleto',
  estadoReserva = 'confirmada',
  estadoTurno = 'reservado',
) => {
  const cancha = await Cancha.create({ nombre: `Cancha partido baja ${Date.now()}` });
  const inicio = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const turno = await Turno.create({
    canchaId: cancha.id,
    fechaHoraInicio: inicio,
    fechaHoraFin: new Date(inicio.getTime() + 90 * 60 * 1000),
    estado: estadoTurno,
  });
  const jugador = await createUser('jugador-partido-baja-demo@example.com');
  const reserva = await Reserva.create({
    turnoId: turno.id,
    usuarioId: jugador.id,
    estado: estadoReserva,
    cuposOcupados: 1,
  });
  const partido = await Partido.create({
    reservaId: reserva.id,
    categoria: 'sexta',
    estado: estadoPartido,
  });
  return { cancha, turno, jugador, reserva, partido };
};

const inscribirDirecto = async (partidoId, usuarioId) =>
  Inscripcion.create({ partidoId, usuarioId });

test('DELETE /api/partidos/:id da de baja un partido terminal y lo oculta sin tocar reserva ni turno', async () => {
  const cookie = await adminCookie();
  const { partido, reserva, turno } = await createEscenario('jugado');

  const response = await request(app)
    .delete(`/api/partidos/${partido.id}`)
    .set('Cookie', cookie)
    .expect(200);

  assert.equal(response.body.data.id, partido.id);
  assert.ok((await Partido.findByPk(partido.id, { paranoid: false })).deletedAt);
  assert.equal((await Reserva.findByPk(reserva.id)).estado, 'confirmada');
  assert.equal((await Turno.findByPk(turno.id)).estado, 'reservado');
  assert.equal(await Partido.count(), 0);
  await request(app).get(`/api/partidos/${partido.id}`).set('Cookie', cookie).expect(404);
  const list = await request(app).get('/api/partidos').set('Cookie', cookie).expect(200);
  assert.ok(!list.body.data.some((item) => item.id === partido.id));
});

test('DELETE /api/partidos/:id rechaza partidos incompletos o completos', async () => {
  let cookie = await adminCookie();

  for (const estado of ['incompleto', 'completo']) {
    const { partido } = await createEscenario(estado);

    await request(app).delete(`/api/partidos/${partido.id}`).set('Cookie', cookie).expect(409);

    assert.equal((await Partido.findByPk(partido.id)).deletedAt, null);
    await cleanDatabase();
    cookie = await adminCookie();
  }
});

test('DELETE /api/partidos/:id rechaza terminales con inscripciones vigentes y permite con historial bajado', async () => {
  const cookie = await adminCookie();
  const { partido } = await createEscenario('jugado');
  const inscripcion = await inscribirDirecto(partido.id, (await createUser('inscripto-vigente-demo@example.com')).id);

  await request(app).delete(`/api/partidos/${partido.id}`).set('Cookie', cookie).expect(409);
  assert.equal((await Partido.findByPk(partido.id)).deletedAt, null);

  await inscripcion.destroy();
  await request(app).delete(`/api/partidos/${partido.id}`).set('Cookie', cookie).expect(200);
  assert.ok((await Inscripcion.findByPk(inscripcion.id, { paranoid: false })).deletedAt);
  assert.ok((await Partido.findByPk(partido.id, { paranoid: false })).deletedAt);
});

test('DELETE /api/partidos/:id valida sesion, rol, identificador y existencia', async () => {
  const admin = await createUser('admin-rbac-partido-demo@example.com', 'administrador');
  const jugador = await createUser('jugador-rbac-partido-demo@example.com');
  const { partido } = await createEscenario('cancelado');

  await request(app).delete(`/api/partidos/${partido.id}`).expect(401);
  await request(app)
    .delete(`/api/partidos/${partido.id}`)
    .set('Cookie', await cookieFor(jugador.email))
    .expect(403);

  const cookie = await cookieFor(admin.email);
  await request(app).delete('/api/partidos/abc').set('Cookie', cookie).expect(400);
  await request(app).delete('/api/partidos/999999').set('Cookie', cookie).expect(404);
  await request(app).delete(`/api/partidos/${partido.id}`).set('Cookie', cookie).expect(200);
  await request(app).delete(`/api/partidos/${partido.id}`).set('Cookie', cookie).expect(404);
});

test('baja propia de inscripcion marca deletedAt, descompleta el partido y no republica el turno', async () => {
  const { turno, jugador, partido } = await createEscenario('completo');
  const jugadorCookie = await cookieFor(jugador.email);
  for (const numero of [1, 2, 3]) {
    const companero = await createUser(`companero-baja-${numero}-demo@example.com`);
    await inscribirDirecto(partido.id, companero.id);
  }
  await inscribirDirecto(partido.id, jugador.id);

  const response = await request(app)
    .delete(`/api/partidos/${partido.id}/inscripciones/${jugador.id}`)
    .set('Cookie', jugadorCookie)
    .expect(200);

  assert.equal(response.body.data.estado, 'incompleto');
  assert.equal(response.body.data.lugaresOcupados, 3);
  assert.equal((await Turno.findByPk(turno.id)).estado, 'reservado');
  const historica = await Inscripcion.findOne({
    where: { partidoId: partido.id, usuarioId: jugador.id },
    paranoid: false,
  });
  assert.ok(historica.deletedAt);

  await request(app)
    .post(`/api/partidos/${partido.id}/inscripciones`)
    .set('Cookie', jugadorCookie)
    .expect(409);
});

test('un administrador puede bajar cualquier inscripcion, pero un jugador no puede bajar a otro', async () => {
  let { partido, jugador } = await createEscenario('incompleto');
  const admin = await adminCookie();
  await inscribirDirecto(partido.id, jugador.id);

  await request(app)
    .delete(`/api/partidos/${partido.id}/inscripciones/${jugador.id}`)
    .set('Cookie', admin)
    .expect(200);

  await cleanDatabase();
  const otroEscenario = await createEscenario('incompleto');
  partido = otroEscenario.partido;
  jugador = otroEscenario.jugador;
  await inscribirDirecto(partido.id, jugador.id);
  const tercero = await createUser('tercero-baja-inscripcion-demo@example.com');

  await request(app)
    .delete(`/api/partidos/${partido.id}/inscripciones/${jugador.id}`)
    .set('Cookie', await cookieFor(tercero.email))
    .expect(403);

  await request(app)
    .delete(`/api/partidos/${partido.id}/inscripciones/${jugador.id}`)
    .expect(401);
});

test('no se puede bajar una inscripcion de un partido jugado o cancelado', async () => {
  for (const estado of ['jugado', 'cancelado']) {
    const { partido, jugador } = await createEscenario(estado);
    await inscribirDirecto(partido.id, jugador.id);
    const cookie = await cookieFor(jugador.email);

    await request(app)
      .delete(`/api/partidos/${partido.id}/inscripciones/${jugador.id}`)
      .set('Cookie', cookie)
      .expect(409);

    await cleanDatabase();
  }
});

test('cancelar por quorum marca inscripciones con deletedAt, cancela sin republicar y conserva historial', async () => {
  const cookie = await adminCookie();
  const { turno, jugador, reserva, partido } = await createEscenario('incompleto');
  const companero = await createUser('companero-quorum-demo@example.com');
  await inscribirDirecto(partido.id, jugador.id);
  await inscribirDirecto(partido.id, companero.id);

  const response = await request(app)
    .patch(`/api/partidos/${partido.id}/cancelar`)
    .set('Cookie', cookie)
    .expect(200);

  assert.equal(response.body.data.estado, 'cancelado');
  assert.equal((await Partido.findByPk(partido.id)).estado, 'cancelado');
  assert.equal((await Reserva.findByPk(reserva.id)).estado, 'cancelada');
  assert.equal((await Turno.findByPk(turno.id)).estado, 'cancelado');
  assert.equal(await Inscripcion.count({ where: { partidoId: partido.id } }), 0);
  const historicas = await Inscripcion.findAll({
    where: { partidoId: partido.id },
    paranoid: false,
  });
  assert.equal(historicas.length, 2);
  assert.ok(historicas.every((item) => item.deletedAt));

  const disponibles = await request(app)
    .get('/api/turnos?estado=disponible')
    .set('Cookie', await cookieFor(jugador.email))
    .expect(200);
  assert.ok(!disponibles.body.data.some((item) => item.id === turno.id));
});
