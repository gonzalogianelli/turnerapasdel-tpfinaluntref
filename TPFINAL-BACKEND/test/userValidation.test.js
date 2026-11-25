import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { closeTestEnvironment } from '../test-support/setup.js';
import { validateCreateUserPayload } from '../src/utils/userValidation.js';

after(async () => {
  await closeTestEnvironment();
});

const payload = {
  nombre: 'Jugador Demo',
  email: 'validacion-demo@example.com',
  password: 'DemoTestPass!2026',
  categoria: 'sexta',
  posicionHabitual: 'drive',
  manoDominante: 'diestro',
  sexo: 'masculino',
  telefono: '123456789',
};

test('rechaza rol administrador en el registro publico', () => {
  assert.throws(
    () => validateCreateUserPayload({ ...payload, rol: 'administrador' }, { allowRole: false }),
    (error) => error.name === 'AppError' && error.statusCode === 400 && /rol/.test(error.message),
  );
});

test('rechaza incluso el rol jugador explicito en el registro publico', () => {
  assert.throws(
    () => validateCreateUserPayload({ ...payload, rol: 'jugador' }, { allowRole: false }),
    (error) => error.name === 'AppError' && error.statusCode === 400,
  );
});

test('acepta rol administrador en el alta protegida', () => {
  const data = validateCreateUserPayload({ ...payload, rol: 'administrador' }, { allowRole: true });
  assert.equal(data.rol, 'administrador');
});
