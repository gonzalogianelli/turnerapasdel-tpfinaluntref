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
import { HORARIOS_TURNO } from '../src/models/Turno.js';

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
const FECHA = '2026-11-30';

const inicioPara = (hora) => {
  const [anio, mes, dia] = FECHA.split('-').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(anio, mes - 1, dia, horas, minutos, 0, 0);
};

const crearUsuario = (email, rol) =>
  User.create({
    nombre: rol === 'administrador' ? 'Admin Prueba Demo' : 'Jugador Prueba Demo',
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

const crearEscenario = async () => {
  const admin = await crearUsuario('admin-grilla-demo@example.com', 'administrador');
  const jugador = await crearUsuario('jugador-grilla-demo@example.com', 'jugador');
  const canchaUno = await Cancha.create({ nombre: 'Cancha grilla uno' });
  const canchaDos = await Cancha.create({ nombre: 'Cancha grilla dos' });
  return {
    admin,
    jugador,
    canchaUno,
    canchaDos,
    cookieAdmin: await cookieFor(admin.email),
    cookieJugador: await cookieFor(jugador.email),
  };
};

test('la grilla pública genera diez bloques de 90 minutos por cancha entre 08:00 y 23:00', async () => {
  await crearEscenario();

  const response = await request(app)
    .get('/api/turnos/disponibles')
    .query({ fecha: FECHA, limit: 100 })
    .expect(200);

  assert.equal(response.body.data.length, 20);
  assert.equal(response.body.meta.total, 20);
  const inicios = response.body.data.map((turno) => turno.fechaHoraInicio);
  assert.ok(inicios.includes(inicioPara('08:00').toISOString()));
  assert.ok(inicios.includes(inicioPara('21:30').toISOString()));
  assert.equal(HORARIOS_TURNO.length, 10);
  assert.equal(HORARIOS_TURNO[0], '08:00');
  assert.equal(HORARIOS_TURNO[9], '21:30');

  const ultimo = response.body.data.find((turno) => turno.fechaHoraInicio === inicioPara('21:30').toISOString());
  assert.equal(new Date(ultimo.fechaHoraFin).getTime() - new Date(ultimo.fechaHoraInicio).getTime(), 90 * 60 * 1000);
});

test('la generación de turnos es idempotente', async () => {
  const { cookieAdmin } = await crearEscenario();

  const primera = await request(app)
    .post('/api/turnos/generar')
    .set('Cookie', cookieAdmin)
    .send({ fecha: FECHA })
    .expect(200);
  const segunda = await request(app)
    .post('/api/turnos/generar')
    .set('Cookie', cookieAdmin)
    .send({ fecha: FECHA })
    .expect(200);

  assert.equal(primera.body.data.creados, 20);
  assert.equal(segunda.body.data.creados, 0);
  assert.equal(await Turno.count(), 20);
});

test('la API rechaza inicios fuera de los bloques de 90 minutos', async () => {
  const { canchaUno, cookieAdmin } = await crearEscenario();

  const respuesta = await request(app)
    .post('/api/turnos')
    .set('Cookie', cookieAdmin)
    .send({ canchaId: canchaUno.id, fechaHoraInicio: inicioPara('08:45').toISOString() })
    .expect(400);

  assert.match(respuesta.body.message, /horarios permitidos/);
});

test('un turno bloqueado por el administrador desaparece de los libres y puede liberarse', async () => {
  const { cookieAdmin } = await crearEscenario();
  await request(app).get('/api/turnos/disponibles').query({ fecha: FECHA, limit: 100 }).expect(200);
  const turno = await Turno.findOne({ order: [['id', 'ASC']] });

  await request(app)
    .patch(`/api/turnos/${turno.id}`)
    .set('Cookie', cookieAdmin)
    .send({ estado: 'bloqueado' })
    .expect(200);

  let libres = await request(app).get('/api/turnos/disponibles').query({ fecha: FECHA, limit: 100 }).expect(200);
  assert.equal(libres.body.data.some((item) => item.id === turno.id), false);

  await request(app)
    .patch(`/api/turnos/${turno.id}`)
    .set('Cookie', cookieAdmin)
    .send({ estado: 'disponible' })
    .expect(200);

  libres = await request(app).get('/api/turnos/disponibles').query({ fecha: FECHA, limit: 100 }).expect(200);
  assert.equal(libres.body.data.some((item) => item.id === turno.id), true);
});

test('GET /api/notificaciones informa cancha, horario y solicitante de cada reserva', async () => {
  const { jugador, canchaUno, cookieAdmin, cookieJugador } = await crearEscenario();
  await request(app).get('/api/turnos/disponibles').query({ fecha: FECHA, limit: 100 }).expect(200);
  const turno = await Turno.findOne({ where: { canchaId: canchaUno.id }, order: [['id', 'ASC']] });

  await request(app)
    .post('/api/reservas')
    .set('Cookie', cookieJugador)
    .send({ turnoId: turno.id, cuposOcupados: 2 })
    .expect(201);

  const avisos = await request(app).get('/api/notificaciones').set('Cookie', cookieAdmin).expect(200);
  assert.equal(avisos.body.data.length, 1);
  const aviso = avisos.body.data[0];
  assert.equal(aviso.tipo, 'reserva');
  assert.equal(aviso.cancha, canchaUno.nombre);
  assert.equal(aviso.solicitante.email, jugador.email);
  assert.equal(aviso.solicitante.nombre, jugador.nombre);
  assert.equal(new Date(aviso.fechaHora).getTime(), inicioPara('08:00').getTime());
  assert.equal((await Reserva.count()), 1);
});

test('GET /api/notificaciones exige sesión de administrador', async () => {
  const { cookieJugador } = await crearEscenario();

  await request(app).get('/api/notificaciones').expect(401);
  await request(app).get('/api/notificaciones').set('Cookie', cookieJugador).expect(403);
});
