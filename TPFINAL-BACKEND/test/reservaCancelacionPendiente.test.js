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
import { notifyReservaCancelada } from '../src/services/notification.service.js';

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
    nombre: 'Usuario cancelacion pendiente Demo',
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

const createEscenario = async ({
  estadoTurno = 'reservado',
  estadoReserva = 'pendiente',
  emailJugador = 'jugador-libera-demo@example.com',
} = {}) => {
  const cancha = await Cancha.create({ nombre: `Cancha liberacion ${Date.now()}` });
  const inicio = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
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
  return { turno, jugador, reserva, cookie: await cookieFor(emailJugador) };
};

test('PATCH /api/reservas/:id/cancelar sin sesion responde 401', async () => {
  await request(app).patch('/api/reservas/1/cancelar').expect(401);
});

test('jugador libera su reserva pendiente y el turno vuelve al listado de disponibles', async () => {
  const { turno, reserva, cookie } = await createEscenario();

  const response = await request(app)
    .patch(`/api/reservas/${reserva.id}/cancelar`)
    .set('Cookie', cookie)
    .expect(200);

  assert.equal(response.body.data.estado, 'cancelada');
  assert.equal((await Reserva.findByPk(reserva.id)).estado, 'cancelada');
  assert.equal((await Turno.findByPk(turno.id)).estado, 'disponible');

  const listado = await request(app).get('/api/turnos').set('Cookie', cookie).expect(200);
  assert.ok(listado.body.data.some((item) => item.id === turno.id));
});

test('jugador recibe 404 al intentar liberar una reserva ajena', async () => {
  const { reserva } = await createEscenario({ emailJugador: 'jugador-dueno-demo@example.com' });
  const otro = await createUser('jugador-ajeno-demo@example.com');
  const cookie = await cookieFor(otro.email);

  await request(app)
    .patch(`/api/reservas/${reserva.id}/cancelar`)
    .set('Cookie', cookie)
    .expect(404);

  assert.equal((await Reserva.findByPk(reserva.id)).estado, 'pendiente');
});

test('jugador recibe 409 con mensaje de administrador al intentar cancelar una confirmada', async () => {
  const { turno, reserva, cookie } = await createEscenario({ estadoReserva: 'confirmada' });

  const response = await request(app)
    .patch(`/api/reservas/${reserva.id}/cancelar`)
    .set('Cookie', cookie)
    .expect(409);

  assert.match(response.body.message, /administrador/i);
  assert.equal((await Reserva.findByPk(reserva.id)).estado, 'confirmada');
  assert.equal((await Turno.findByPk(turno.id)).estado, 'reservado');
});

test('jugador recibe 409 si el turno ya no esta reservado', async () => {
  const { turno, reserva, cookie } = await createEscenario({ estadoTurno: 'cancelado' });

  await request(app)
    .patch(`/api/reservas/${reserva.id}/cancelar`)
    .set('Cookie', cookie)
    .expect(409);

  assert.equal((await Reserva.findByPk(reserva.id)).estado, 'pendiente');
  assert.equal((await Turno.findByPk(turno.id)).estado, 'cancelado');
});

test('doble liberacion responde 200 y luego 409', async () => {
  const { reserva, cookie } = await createEscenario();
  const url = `/api/reservas/${reserva.id}/cancelar`;

  await request(app).patch(url).set('Cookie', cookie).expect(200);
  await request(app).patch(url).set('Cookie', cookie).expect(409);
});

test('liberaciones concurrentes solo confirman una transaccion', async () => {
  const { turno, reserva, cookie } = await createEscenario();
  const url = `/api/reservas/${reserva.id}/cancelar`;

  const respuestas = await Promise.all([
    request(app).patch(url).set('Cookie', cookie),
    request(app).patch(url).set('Cookie', cookie),
  ]);

  assert.deepEqual(respuestas.map((respuesta) => respuesta.status).sort(), [200, 409]);
  assert.equal((await Reserva.findByPk(reserva.id)).estado, 'cancelada');
  assert.equal((await Turno.findByPk(turno.id)).estado, 'disponible');
});

test('administrador cancela reserva confirmada sin republicar el turno', async () => {
  const admin = await createUser('admin-cancela-demo@example.com', 'administrador');
  const { turno, reserva } = await createEscenario({ estadoReserva: 'confirmada' });
  const cookie = await cookieFor(admin.email);

  await request(app)
    .patch(`/api/reservas/${reserva.id}/cancelar`)
    .set('Cookie', cookie)
    .expect(200);

  assert.equal((await Reserva.findByPk(reserva.id)).estado, 'cancelada');
  assert.equal((await Turno.findByPk(turno.id)).estado, 'cancelado');

  const disponibles = await request(app)
    .get('/api/turnos?estado=disponible')
    .set('Cookie', cookie)
    .expect(200);
  assert.ok(!disponibles.body.data.some((item) => item.id === turno.id));
});

test('aviso de liberacion pendiente informa turno disponible sin republicacion manual', async () => {
  const mensajes = [];
  const deps = {
    findTurno: async () => ({
      canchaId: 1,
      fechaHoraInicio: new Date('2026-12-01T10:00:00.000Z'),
      estado: 'disponible',
    }),
    findCancha: async () => ({ nombre: 'Cancha Notificacion Demo' }),
    findUser: async () => ({ email: 'jugador-aviso-demo@padel.test', nombre: 'Jugador Demo' }),
    findAdmin: async () => [],
    sendMail: async (message) => {
      mensajes.push(message);
      return { delivered: true };
    },
  };
  const reserva = { turnoId: 1, usuarioId: 1, cuposOcupados: 1, lugaresFaltantes: 3 };

  await notifyReservaCancelada(reserva, deps, {
    estadoTurno: 'disponible',
    motivo: 'liberada por el jugador',
  });

  assert.equal(mensajes.length, 1);
  assert.match(mensajes[0].text, /Estado del turno: disponible/);
  assert.match(mensajes[0].text, /liberada por el jugador/);
  assert.match(mensajes[0].text, /volvio a estar disponible/);
  assert.doesNotMatch(mensajes[0].text, /no se republico automaticamente/);
});

test('aviso de cancelacion administrativa conserva la republicacion manual', async () => {
  const mensajes = [];
  const deps = {
    findTurno: async () => ({
      canchaId: 1,
      fechaHoraInicio: new Date('2026-12-01T10:00:00.000Z'),
      estado: 'cancelado',
    }),
    findCancha: async () => ({ nombre: 'Cancha Notificacion Demo' }),
    findUser: async () => ({ email: 'jugador-aviso-admin-demo@padel.test', nombre: 'Jugador Demo' }),
    findAdmin: async () => [],
    sendMail: async (message) => {
      mensajes.push(message);
      return { delivered: true };
    },
  };
  const reserva = { turnoId: 1, usuarioId: 1, cuposOcupados: 1, lugaresFaltantes: 3 };

  await notifyReservaCancelada(reserva, deps);

  assert.equal(mensajes.length, 1);
  assert.match(mensajes[0].text, /Estado del turno: cancelado/);
  assert.match(mensajes[0].text, /no se republico automaticamente/);
  assert.doesNotMatch(mensajes[0].text, /liberada por el jugador/);
});
