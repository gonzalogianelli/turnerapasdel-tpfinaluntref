import { AppError } from './AppError.js';
import { CATEGORIAS } from '../models/User.js';
import {
  CUPO_MAXIMO_PARTIDO,
  ESTADOS_PARTIDO,
} from '../models/Partido.js';

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const ORDEN_CATEGORIAS = [...CATEGORIAS].reverse();

const fail = (message, statusCode = 400) => {
  throw new AppError(message, statusCode);
};

const ensureObject = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    fail('El cuerpo de la solicitud debe ser un objeto JSON');
  }
};

const positiveInteger = (value, field, fallback) => {
  if (value === undefined) return fallback;
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 1) {
    fail(`El campo ${field} debe ser un entero positivo`);
  }
  return parsed;
};

const categoriaValue = (value) => {
  if (typeof value !== 'string' || !CATEGORIAS.includes(value)) {
    fail('El campo categoria no es valido');
  }
  return value;
};

const estadoValue = (value) => {
  if (typeof value !== 'string' || !ESTADOS_PARTIDO.includes(value)) {
    fail('El campo estado no es valido');
  }
  return value;
};

const fechaValue = (value) => {
  if (typeof value !== 'string' || !FECHA_REGEX.test(value)) {
    fail('El filtro fecha debe tener formato YYYY-MM-DD');
  }
  const fecha = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== value) {
    fail('El filtro fecha no es valido');
  }
  return value;
};

const categoriasCompatibles = (categoriaJugador, categoriaPartido) => {
  const indiceJugador = ORDEN_CATEGORIAS.indexOf(categoriaJugador);
  const indicePartido = ORDEN_CATEGORIAS.indexOf(categoriaPartido);
  if (indiceJugador < 0 || indicePartido < 0) return false;
  return Math.abs(indiceJugador - indicePartido) <= 1;
};

const validarCompatibilidadCategoria = (categoriaJugador, categoriaPartido) => {
  if (!categoriasCompatibles(categoriaJugador, categoriaPartido)) {
    fail('La categoria del jugador no es compatible con el partido', 409);
  }
};

const lugaresFaltantes = (lugaresOcupados) => CUPO_MAXIMO_PARTIDO - lugaresOcupados;

const esCompleta = (lugaresOcupados) => lugaresOcupados === CUPO_MAXIMO_PARTIDO;

const validateCreatePartidoPayload = (payload) => {
  ensureObject(payload);
  return {
    reservaId: positiveInteger(payload.reservaId, 'reservaId'),
    categoria: categoriaValue(payload.categoria),
  };
};

const validateUpdatePartidoPayload = (payload) => {
  ensureObject(payload);
  const updates = {};

  if (payload.categoria !== undefined) {
    updates.categoria = categoriaValue(payload.categoria);
  }
  if (payload.estado !== undefined) {
    if (estadoValue(payload.estado) !== 'jugado') {
      fail('El unico estado que se puede asignar es jugado');
    }
    updates.estado = payload.estado;
  }
  if (Object.keys(updates).length === 0) {
    fail('Se requiere al menos categoria o estado');
  }
  if (updates.categoria !== undefined && updates.estado !== undefined) {
    fail('No se pueden cambiar categoria y estado a la vez');
  }

  return updates;
};

const parsePartidoId = (value) => positiveInteger(value, 'id');

const parseUsuarioId = (value) => positiveInteger(value, 'usuarioId');

const parsePartidoListQuery = (query = {}) => {
  const page = positiveInteger(query.page, 'page', 1);
  const limit = positiveInteger(query.limit, 'limit', 10);
  const categoria = query.categoria === undefined ? undefined : categoriaValue(query.categoria);
  const estado = query.estado === undefined ? undefined : estadoValue(query.estado);
  const fecha = query.fecha === undefined ? undefined : fechaValue(query.fecha);

  return { page, limit, offset: (page - 1) * limit, categoria, estado, fecha };
};

export {
  CUPO_MAXIMO_PARTIDO,
  categoriasCompatibles,
  validarCompatibilidadCategoria,
  lugaresFaltantes,
  esCompleta,
  validateCreatePartidoPayload,
  validateUpdatePartidoPayload,
  parsePartidoId,
  parseUsuarioId,
  parsePartidoListQuery,
};
