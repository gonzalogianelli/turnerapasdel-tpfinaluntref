import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReservedExampleRecipient, sendEmail } from '../src/services/mail.service.js';
import { notifyUserRegistered } from '../src/services/notification.service.js';
import { logger } from '../src/config/logger.js';

const transportSpy = () => {
  const calls = [];
  return {
    calls,
    sendMail: async (message) => {
      calls.push(message);
      return { accepted: [message.to] };
    },
  };
};

const captureWarnings = async (fn) => {
  const originalWarn = logger.warn;
  const warnings = [];
  logger.warn = (...args) => {
    warnings.push(args);
  };

  try {
    return { value: await fn(), warnings };
  } finally {
    logger.warn = originalWarn;
  }
};

const message = (to) => ({
  to,
  subject: 'Asunto Demo',
  text: 'Cuerpo Demo',
  event: 'demo.example_domain',
});

test('isReservedExampleRecipient detecta dominios de ejemplo reservados y normaliza', () => {
  for (const recipient of [
    'jugador@example.com',
    'JUGADOR@EXAMPLE.COM. ',
    'admin@sub.example.org',
    'jugador@club.example',
    'jugador@otro.club.example',
  ]) {
    assert.equal(isReservedExampleRecipient(recipient), true, recipient);
  }

  for (const recipient of [
    'jugador@padel.test',
    'admin@correo-real.com',
    'sin-arroba',
    undefined,
  ]) {
    assert.equal(isReservedExampleRecipient(recipient), false, String(recipient));
  }
});

test('sendEmail no invoca SMTP para example.com y registra aviso sin secretos', async () => {
  const transport = transportSpy();
  const { value, warnings } = await captureWarnings(() =>
    sendEmail(message('jugador@example.com'), transport),
  );

  assert.deepEqual(value, { delivered: false, reason: 'example-domain' });
  assert.equal(transport.calls.length, 0);
  assert.equal(warnings.length, 1);
  assert.deepEqual(warnings[0][0], {
    event: 'email.example_domain_skipped',
    skippedCount: 1,
  });
  assert.doesNotMatch(JSON.stringify(warnings), /pass|token|auth/i);
});

test('sendEmail omite dominios terminados en .example sin invocar SMTP', async () => {
  const transport = transportSpy();
  const { value } = await captureWarnings(() =>
    sendEmail(message('jugador@club.example'), transport),
  );

  assert.deepEqual(value, { delivered: false, reason: 'example-domain' });
  assert.equal(transport.calls.length, 0);
});

test('sendEmail envia a direcciones validas y solo a las validas en listas mixtas', async () => {
  const transport = transportSpy();
  const validMessage = message('jugador@padel.test');

  const validResult = await sendEmail(validMessage, transport);
  assert.deepEqual(validResult, { delivered: true });
  assert.equal(transport.calls.length, 1);
  assert.equal(transport.calls[0].to, 'jugador@padel.test');

  const mixedResult = await captureWarnings(() =>
    sendEmail(message(['jugador@example.com', 'admin@padel.test']), transport),
  );
  assert.deepEqual(mixedResult.value, { delivered: true });
  assert.equal(transport.calls.length, 2);
  assert.deepEqual(transport.calls[1].to, ['admin@padel.test']);
});

test('notifyUserRegistered no entrega example.com al sendMail inyectado', async () => {
  const transport = transportSpy();
  const { value } = await captureWarnings(() =>
    notifyUserRegistered(
      { id: 1, nombre: 'Jugador Demo', email: 'jugador@example.com' },
      { findAdmin: async () => [], sendMail: transport.sendMail },
    ),
  );

  assert.deepEqual(value, { sent: 0 });
  assert.equal(transport.calls.length, 0);
});
