import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app, cleanDatabase, closeTestEnvironment } from '../test-support/setup.js';

before(async () => {
  await cleanDatabase();
});

after(async () => {
  await closeTestEnvironment();
});

test('GET /api/health responde 200 con la base de prueba', async () => {
  const response = await request(app).get('/api/health');

  assert.equal(response.status, 200);
  assert.equal(response.body.status, 'ok');
  assert.equal(response.body.database, 'up');
});
