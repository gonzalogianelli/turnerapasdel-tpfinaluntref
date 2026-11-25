import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  cleanDatabase,
  closeTestEnvironment,
  User,
  Cancha,
  Turno,
  Reserva,
  Partido,
  Inscripcion,
} from '../test-support/setup.js';
import {
  notifyUserRegistered,
  notifyPartidoBaja,
} from '../src/services/notification.service.js';
import { cancelarPorQuorum } from '../src/services/partido.service.js';

before(async () => {
  await cleanDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

after(async () => {
  await closeTestEnvironment();
});

const cwd = fileURLToPath(new URL('..', import.meta.url));

const resolveConfiguredAdmin = (adminNotifyEmail, smtpUser) =>
  execFileSync(
    process.execPath,
    [
      '--input-type=module',
      '-e',
      "import { config } from './src/config/env.js'; process.stdout.write(config.smtp.adminNotifyEmail);",
    ],
    {
      cwd,
      encoding: 'utf8',
      env: { ...process.env, ADMIN_NOTIFY_EMAIL: adminNotifyEmail, SMTP_USER: smtpUser },
    },
  );

const recipientCollector = () => {
  const recipients = [];
  return {
    recipients,
    sendMail: async (message) => {
      recipients.push(message.to);
      return { delivered: true };
    },
  };
};

const createUser = async (email, rol = 'jugador') =>
  User.create({
    nombre: 'Usuario notificaciones Demo',
    email,
    password: 'DemoTestPass!2026',
    categoria: 'sexta',
    posicionHabitual: 'drive',
    manoDominante: 'diestro',
    sexo: 'masculino',
    telefono: '123456789',
    rol,
  });

const waitFor = async (predicate, timeoutMs = 3000) => {
  const started = Date.now();
  while (!predicate() && Date.now() - started < timeoutMs) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
};

test('ADMIN_NOTIFY_EMAIL se resuelve sin requerir SMTP y sin direcciones de ejemplo', () => {
  assert.equal(resolveConfiguredAdmin('', ''), '');
  assert.equal(
    resolveConfiguredAdmin('admin-entorno-demo@padel.test', 'smtp-demo@padel.test'),
    'admin-entorno-demo@padel.test',
  );
  assert.equal(resolveConfiguredAdmin('', 'smtp-demo@padel.test'), 'smtp-demo@padel.test');
  assert.equal(resolveConfiguredAdmin('valor-invalido', 'smtp-demo@padel.test'), 'smtp-demo@padel.test');
  const ejemploProhibido = 'admin@' + 'example.com';
  assert.notEqual(resolveConfiguredAdmin('', ''), ejemploProhibido);
});

test('dispatchEvent usa el destinatario admin inyectado junto al jugador', async () => {
  const { recipients, sendMail } = recipientCollector();

  await notifyUserRegistered(
    { id: 1, nombre: 'Jugador Demo', email: 'jugador-notify-demo@padel.test' },
    {
      findAdmin: async () => [{ email: 'admin-config-demo@padel.test', nombre: 'Admin' }],
      sendMail,
    },
  );

  assert.deepEqual(recipients.sort(), [
    'admin-config-demo@padel.test',
    'jugador-notify-demo@padel.test',
  ]);
  assert.ok(!recipients.includes('admin@' + 'example.com'));
});

test('sin destinatario administrativo el aviso llega solo al jugador', async () => {
  const { recipients, sendMail } = recipientCollector();

  await notifyUserRegistered(
    { id: 2, nombre: 'Jugador Demo', email: 'jugador-sin-admin-demo@padel.test' },
    { findAdmin: async () => [], sendMail },
  );

  assert.deepEqual(recipients, ['jugador-sin-admin-demo@padel.test']);
});

test('un usuario dado de baja conserva su email como destinatario historico', async () => {
  const user = await createUser('historico-baja-email-demo@padel.test');
  await user.destroy();
  const { recipients, sendMail } = recipientCollector();

  await notifyPartidoBaja(
    { categoria: 'sexta', lugaresOcupados: 0, lugaresFaltantes: 4 },
    user.id,
    { findAdmin: async () => [], sendMail },
  );

  assert.deepEqual(recipients, ['historico-baja-email-demo@padel.test']);
});

test('la cancelacion por quorum notifica a inscriptos dados de baja con anterioridad', async () => {
  const cancha = await Cancha.create({ nombre: 'Cancha quorum email Demo' });
  const inicio = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
  const turno = await Turno.create({
    canchaId: cancha.id,
    fechaHoraInicio: inicio,
    fechaHoraFin: new Date(inicio.getTime() + 90 * 60 * 1000),
    estado: 'reservado',
  });
  const jugador = await createUser('inscripto-historico-quorum-demo@padel.test');
  const reserva = await Reserva.create({
    turnoId: turno.id,
    usuarioId: jugador.id,
    estado: 'confirmada',
    cuposOcupados: 1,
  });
  const partido = await Partido.create({
    reservaId: reserva.id,
    categoria: 'sexta',
    estado: 'incompleto',
  });
  await Inscripcion.create({ partidoId: partido.id, usuarioId: jugador.id });
  await jugador.destroy();
  const { recipients, sendMail } = recipientCollector();

  await cancelarPorQuorum(partido.id, { findAdmin: async () => [], sendMail });
  await waitFor(() => recipients.length > 0);

  assert.deepEqual(recipients, ['inscripto-historico-quorum-demo@padel.test']);
});
