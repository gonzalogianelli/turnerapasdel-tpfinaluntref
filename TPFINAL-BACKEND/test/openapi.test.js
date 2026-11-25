import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, closeTestEnvironment } from '../test-support/setup.js';

after(async () => {
  await closeTestEnvironment();
});

test('el contrato OpenAPI documenta el rechazo de rol en el registro', async () => {
  const response = await request(app).get('/api-docs.json').expect(200);
  const register = response.body.paths['/api/auth/register'].post;

  assert.match(register.description, /rol no esta permitido/);
  assert.match(register.responses['400'].description, /rol no esta permitido/);
  assert.equal(response.body.components.schemas.RegisterRequest.additionalProperties, false);
  assert.equal(response.body.components.schemas.RegisterRequest.properties.rol, undefined);
});

test('el contrato OpenAPI documenta RBAC y el guard del ultimo administrador', async () => {
  const response = await request(app).get('/api-docs.json').expect(200);
  const spec = response.body;
  const usuariosTag = spec.tags.find((tag) => tag.name === 'Usuarios');

  assert.match(usuariosTag.description, /administrador/);
  assert.match(usuariosTag.description, /empleado/);
  assert.match(spec.paths['/api/users'].post.description, /dueno y empleado/);

  const patchUser = spec.paths['/api/users/{id}'].patch;
  assert.match(patchUser.description, /ultimo administrador/);
  assert.match(patchUser.responses['409'].description, /ultimo administrador/);

  const management = [
    ['/api/users', 'get'],
    ['/api/users', 'post'],
    ['/api/users/{id}', 'get'],
    ['/api/users/{id}', 'patch'],
  ];
  for (const [path, method] of management) {
    const responses = spec.paths[path][method].responses;
    assert.ok(responses['401'], `falta 401 en ${method} ${path}`);
    assert.ok(responses['403'], `falta 403 en ${method} ${path}`);
  }
});

test('el contrato OpenAPI no sugiere correos de dominios de ejemplo', async () => {
  const response = await request(app).get('/api-docs.json').expect(200);
  const schemas = JSON.stringify(response.body.components.schemas);

  assert.doesNotMatch(schemas, /ana@example\.com/i);
  assert.doesNotMatch(schemas, /@example\.(com|org|net)\b/i);
  assert.doesNotMatch(schemas, /@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.example\b/i);
  assert.match(
    response.body.components.schemas.Usuario.properties.email.description,
    /correo real válida/,
  );
  assert.match(
    response.body.components.schemas.RegisterRequest.properties.email.description,
    /correo real válida/,
  );
});

test('el contrato OpenAPI documenta cancelacion por administrador y liberacion por jugador', async () => {
  const response = await request(app).get('/api-docs.json').expect(200);
  const cancelar = response.body.paths['/api/reservas/{id}/cancelar'].patch;

  assert.match(cancelar.summary, /Cancelacion o liberacion/);
  assert.match(cancelar.description, /administrador/);
  assert.match(cancelar.description, /jugador/);
  assert.match(cancelar.description, /republicacion manual/);
  assert.match(cancelar.description, /turno disponible/);
  assert.match(cancelar.responses['200'].description, /turno cancelado/);
  assert.match(cancelar.responses['200'].description, /disponible para jugador/);
  for (const codigo of ['401', '403', '404', '409']) {
    assert.ok(cancelar.responses[codigo], `falta ${codigo} en el endpoint de cancelacion`);
  }
});
