import { after, before, beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { app, cleanDatabase, closeTestEnvironment, Cancha, User } from '../test-support/setup.js';
import {
  CANCHAS_SEED,
  USUARIOS_SEED,
  seedCanchas,
  seedUsuarios,
} from '../scripts/seed.js';

before(async () => {
  await cleanDatabase();
});

beforeEach(async () => {
  await cleanDatabase();
});

after(async () => {
  await closeTestEnvironment();
});

const obtenerUsuario = (email) =>
  User.unscoped().findOne({ where: { email }, paranoid: false });

const obtenerCancha = (nombre) =>
  Cancha.unscoped().findOne({ where: { nombre }, paranoid: false });

const contarPorRol = async () => {
  const usuarios = await User.unscoped().findAll({ attributes: ['rol'], paranoid: false });
  return usuarios.reduce((conteo, usuario) => {
    conteo[usuario.rol] = (conteo[usuario.rol] || 0) + 1;
    return conteo;
  }, {});
};

test('primera ejecucion crea nueve usuarios con roles y campos obligatorios', async () => {
  const resumen = await seedUsuarios();

  assert.equal(resumen.length, 9);
  assert.equal(await User.unscoped().count({ paranoid: false }), 9);
  assert.deepEqual(await contarPorRol(), { administrador: 3, jugador: 6 });

  for (const semilla of USUARIOS_SEED) {
    const usuario = await obtenerUsuario(semilla.email);
    assert.ok(usuario, `Falta ${semilla.email}`);
    assert.equal(usuario.nombre, semilla.nombre);
    assert.equal(usuario.categoria, semilla.categoria);
    assert.equal(usuario.posicionHabitual, semilla.posicionHabitual);
    assert.equal(usuario.manoDominante, semilla.manoDominante);
    assert.equal(usuario.sexo, semilla.sexo);
    assert.equal(usuario.telefono, semilla.telefono);
    assert.equal(usuario.rol, semilla.rol);
  }
});

test('los nombres sembrados son reales y variados y no usan marcadores genéricos', async () => {
  const nombres = USUARIOS_SEED.map((semilla) => semilla.nombre);

  assert.equal(new Set(nombres).size, 9);
  for (const nombre of nombres) {
    assert.match(nombre, /^\p{L}+\s+\p{L}+$/u, nombre);
    assert.doesNotMatch(nombre, /Jugador\s*\d|Emplead[oa]\s*(Uno|Dos|\d)|Dueño 4to/i);
    assert.ok(!nombre.toUpperCase().includes(['Q', 'A'].join('')), nombre);
  }
});

test('primera ejecucion crea exactamente dos canchas iniciales del complejo', async () => {
  const resumen = await seedCanchas();

  assert.deepEqual(resumen, CANCHAS_SEED.map((cancha) => ({ nombre: cancha.nombre, accion: 'creado' })));
  assert.equal(await Cancha.unscoped().count({ paranoid: false }), 2);
  for (const semilla of CANCHAS_SEED) {
    const cancha = await obtenerCancha(semilla.nombre);
    assert.ok(cancha, `Falta ${semilla.nombre}`);
    assert.equal(cancha.bloqueada, semilla.bloqueada);
    assert.equal(cancha.deletedAt, null);
  }
});

test('segunda ejecucion no duplica canchas', async () => {
  await seedCanchas();

  const resumen = await seedCanchas();

  assert.ok(resumen.every((item) => item.accion === 'omitido'));
  assert.equal(await Cancha.unscoped().count({ paranoid: false }), 2);
});

test('cancha inicial dada de baja se restaura sin crear otra fila', async () => {
  await seedCanchas();
  const semilla = CANCHAS_SEED[0];
  const cancha = await Cancha.findOne({ where: { nombre: semilla.nombre } });
  await cancha.destroy();

  const resumen = await seedCanchas();
  const restaurada = await obtenerCancha(semilla.nombre);

  assert.equal(resumen.find((item) => item.nombre === semilla.nombre).accion, 'restaurado');
  assert.equal(restaurada.deletedAt, null);
  assert.equal(await Cancha.unscoped().count({ paranoid: false }), 2);
});

test('el administrador crea y da de baja canchas adicionales sin topes artificiales', async () => {
  await seedUsuarios();
  await seedCanchas();
  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'dueno@padel.example', password: 'Dueno123!' })
    .expect(200);
  const cookie = login.headers['set-cookie'][0].split(';')[0];

  const listado = await request(app).get('/api/canchas').set('Cookie', cookie).expect(200);
  assert.deepEqual(
    listado.body.data.map((cancha) => cancha.nombre).sort(),
    CANCHAS_SEED.map((cancha) => cancha.nombre).sort(),
  );

  const creada = await request(app)
    .post('/api/canchas')
    .set('Cookie', cookie)
    .send({ nombre: 'Cancha 3 — Norte' })
    .expect(201);
  assert.equal(creada.body.data.nombre, 'Cancha 3 — Norte');
  assert.equal(await Cancha.unscoped().count({ paranoid: false }), 3);

  await request(app).delete(`/api/canchas/${creada.body.data.id}`).set('Cookie', cookie).expect(200);
  assert.equal((await obtenerCancha('Cancha 3 — Norte')).deletedAt === null, false);
  assert.equal(await Cancha.unscoped().count({ paranoid: false }), 3);
  assert.equal(await Cancha.count(), 2);
  await seedCanchas();
  assert.equal(await Cancha.unscoped().count({ paranoid: false }), 3);
});

test('las contraseñas sembradas se guardan como hash bcrypt y los empleados son administradores', async () => {
  await seedUsuarios();

  for (const semilla of USUARIOS_SEED) {
    const usuario = await obtenerUsuario(semilla.email);
    assert.notEqual(usuario.password, semilla.password);
    assert.equal(await bcrypt.compare(semilla.password, usuario.password), true);
  }

  for (const email of ['empleado1@padel.example', 'empleado2@padel.example']) {
    const empleado = await obtenerUsuario(email);
    assert.equal(empleado.rol, 'administrador');
  }
});

test('cuenta vigente con nombre generico se actualiza sin cambiar su contraseña', async () => {
  await seedUsuarios();
  const semilla = USUARIOS_SEED[0];
  const usuario = await obtenerUsuario(semilla.email);
  const hashAntes = usuario.password;
  await usuario.update({ nombre: 'Usuario sin nombre real' });

  const resumen = await seedUsuarios();
  const actualizado = await obtenerUsuario(semilla.email);

  assert.equal(resumen.find((item) => item.email === semilla.email).accion, 'actualizado');
  assert.equal(actualizado.nombre, semilla.nombre);
  assert.equal(actualizado.password, hashAntes);
  assert.equal(await User.unscoped().count({ paranoid: false }), 9);
});

test('segunda ejecucion no duplica cuentas ni cambia contraseñas vigentes', async () => {
  await seedUsuarios();
  const passwordsAntes = new Map();
  for (const semilla of USUARIOS_SEED) {
    const usuario = await obtenerUsuario(semilla.email);
    passwordsAntes.set(semilla.email, usuario.password);
  }

  const resumen = await seedUsuarios();

  assert.ok(resumen.every((item) => item.accion === 'omitido'));
  assert.equal(await User.unscoped().count({ paranoid: false }), 9);
  for (const semilla of USUARIOS_SEED) {
    const usuario = await obtenerUsuario(semilla.email);
    assert.equal(usuario.password, passwordsAntes.get(semilla.email));
  }
});

test('cuenta sembrada dada de baja se restaura sin crear otra fila', async () => {
  await seedUsuarios();
  const semilla = USUARIOS_SEED.find((item) => item.email === 'jugador3@padel.example');
  const usuario = await User.findOne({ where: { email: semilla.email } });
  await usuario.destroy();
  const hashAntes = (await obtenerUsuario(semilla.email)).password;

  const resumen = await seedUsuarios();
  const restaurado = await obtenerUsuario(semilla.email);

  assert.equal(resumen.find((item) => item.email === semilla.email).accion, 'restaurado');
  assert.equal(restaurado.deletedAt, null);
  assert.notEqual(restaurado.password, hashAntes);
  assert.equal(await bcrypt.compare(semilla.password, restaurado.password), true);
  assert.equal(await User.unscoped().count({ paranoid: false }), 9);
});

test('el seeder no importa notificaciones ni requiere SMTP', async () => {
  const fuente = readFileSync(fileURLToPath(new URL('../scripts/seed.js', import.meta.url)), 'utf8');

  assert.doesNotMatch(fuente, /notification\.service|nodemailer|sendMail|notify[A-Z]/i);
  assert.equal((await seedUsuarios()).length, 9);
});

test('credencial documentada de dueno inicia sesion con cookie HTTPOnly y rol administrador', async () => {
  await seedUsuarios();

  const respuesta = await request(app)
    .post('/api/auth/login')
    .send({ email: 'dueno@padel.example', password: 'Dueno123!' })
    .expect(200);

  assert.equal(respuesta.body.status, 'success');
  assert.equal(respuesta.body.data.rol, 'administrador');
  assert.equal(respuesta.body.data.email, 'dueno@padel.example');
  assert.ok(Array.isArray(respuesta.headers['set-cookie']));
  assert.match(respuesta.headers['set-cookie'][0], /padel_token=/);
  assert.match(respuesta.headers['set-cookie'][0], /HttpOnly/i);
});
