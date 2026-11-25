import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from '../src/config/logger.js';
import { connectDatabase, closeDatabase, sequelize } from '../src/config/database.js';
import { Cancha, User, initModels } from '../src/models/index.js';

const USUARIOS_SEED = Object.freeze([
  Object.freeze({
    nombre: 'Gonzalo Gianelli',
    email: 'dueno@padel.example',
    password: 'Dueno123!',
    categoria: 'tercera',
    posicionHabitual: 'drive',
    manoDominante: 'diestro',
    sexo: 'masculino',
    telefono: '1100000001',
    rol: 'administrador',
  }),
  Object.freeze({
    nombre: 'Camila Rodríguez',
    email: 'empleado1@padel.example',
    password: 'Empleado123!',
    categoria: 'sexta',
    posicionHabitual: 'revés',
    manoDominante: 'zurdo',
    sexo: 'femenino',
    telefono: '1100000002',
    rol: 'administrador',
  }),
  Object.freeze({
    nombre: 'Martín Ferreyra',
    email: 'empleado2@padel.example',
    password: 'Empleado456!',
    categoria: 'quinta',
    posicionHabitual: 'drive',
    manoDominante: 'diestro',
    sexo: 'masculino',
    telefono: '1100000003',
    rol: 'administrador',
  }),
  Object.freeze({
    nombre: 'Lucía Fernández',
    email: 'jugador1@padel.example',
    password: 'Jugador123!',
    categoria: 'octava',
    posicionHabitual: 'revés',
    manoDominante: 'zurdo',
    sexo: 'femenino',
    telefono: '1100000004',
    rol: 'jugador',
  }),
  Object.freeze({
    nombre: 'Nicolás Aguirre',
    email: 'jugador2@padel.example',
    password: 'Jugador456!',
    categoria: 'séptima',
    posicionHabitual: 'drive',
    manoDominante: 'diestro',
    sexo: 'masculino',
    telefono: '1100000005',
    rol: 'jugador',
  }),
  Object.freeze({
    nombre: 'Valeria Gómez',
    email: 'jugador3@padel.example',
    password: 'Jugador789!',
    categoria: 'sexta',
    posicionHabitual: 'revés',
    manoDominante: 'diestro',
    sexo: 'femenino',
    telefono: '1100000006',
    rol: 'jugador',
  }),
  Object.freeze({
    nombre: 'Facundo Martínez',
    email: 'jugador4@padel.example',
    password: 'Jugador101!',
    categoria: 'quinta',
    posicionHabitual: 'drive',
    manoDominante: 'zurdo',
    sexo: 'masculino',
    telefono: '1100000007',
    rol: 'jugador',
  }),
  Object.freeze({
    nombre: 'Sofía Castillo',
    email: 'jugador5@padel.example',
    password: 'Jugador202!',
    categoria: 'cuarta',
    posicionHabitual: 'revés',
    manoDominante: 'zurdo',
    sexo: 'femenino',
    telefono: '1100000008',
    rol: 'jugador',
  }),
  Object.freeze({
    nombre: 'Tomás Beltrán',
    email: 'jugador6@padel.example',
    password: 'Jugador303!',
    categoria: 'tercera',
    posicionHabitual: 'drive',
    manoDominante: 'diestro',
    sexo: 'masculino',
    telefono: '1100000009',
    rol: 'jugador',
  }),
]);

const CANCHAS_SEED = Object.freeze([
  Object.freeze({ nombre: 'Cancha 1 — Central', bloqueada: false }),
  Object.freeze({ nombre: 'Cancha 2 — Blindex', bloqueada: false }),
]);

const seedUsuarios = async () => {
  const resumen = [];

  await sequelize.transaction(async (transaction) => {
    for (const usuario of USUARIOS_SEED) {
      const existente = await User.unscoped().findOne({
        where: { email: usuario.email },
        paranoid: false,
        transaction,
      });

      const datos = {
        nombre: usuario.nombre,
        email: usuario.email,
        categoria: usuario.categoria,
        posicionHabitual: usuario.posicionHabitual,
        manoDominante: usuario.manoDominante,
        sexo: usuario.sexo,
        telefono: usuario.telefono,
        rol: usuario.rol,
      };

      if (!existente) {
        await User.create({ ...datos, password: usuario.password }, { transaction });
        resumen.push({ email: usuario.email, rol: usuario.rol, accion: 'creado' });
        continue;
      }

      if (existente.deletedAt) {
        await existente.restore({ transaction });
        await existente.update({ ...datos, password: usuario.password }, { transaction });
        resumen.push({ email: usuario.email, rol: usuario.rol, accion: 'restaurado' });
        continue;
      }

      const cambio = Object.entries(datos).some(([campo, valor]) => existente[campo] !== valor);
      if (cambio) {
        await existente.update(datos, { transaction });
        resumen.push({ email: usuario.email, rol: usuario.rol, accion: 'actualizado' });
        continue;
      }

      resumen.push({ email: usuario.email, rol: usuario.rol, accion: 'omitido' });
    }
  });

  return resumen;
};

const seedCanchas = async () => {
  const resumen = [];

  await sequelize.transaction(async (transaction) => {
    for (const cancha of CANCHAS_SEED) {
      const existente = await Cancha.unscoped().findOne({
        where: { nombre: cancha.nombre },
        paranoid: false,
        transaction,
      });

      if (!existente) {
        await Cancha.create({ ...cancha }, { transaction });
        resumen.push({ nombre: cancha.nombre, accion: 'creado' });
        continue;
      }

      if (existente.deletedAt) {
        await existente.restore({ transaction });
        resumen.push({ nombre: cancha.nombre, accion: 'restaurado' });
        continue;
      }

      resumen.push({ nombre: cancha.nombre, accion: 'omitido' });
    }
  });

  return resumen;
};

const ejecutarSeeder = async () => {
  await initModels();
  await connectDatabase();
  const usuarios = await seedUsuarios();
  const canchas = await seedCanchas();
  logger.info({ usuarios, canchas }, 'Seeder finalizado');
  return { usuarios, canchas };
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ejecutarSeeder()
    .then(() => closeDatabase())
    .catch((error) => {
      logger.error({ err: error.message }, 'Seeder fallido');
      process.exitCode = 1;
    });
}

export { CANCHAS_SEED, USUARIOS_SEED, seedCanchas, seedUsuarios, ejecutarSeeder };
