import { AppError } from './AppError.js';
import { CUPO_MAXIMO, ESTADOS_RESERVA } from '../models/Reserva.js';

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const fail = (message) => {
  throw new AppError(message, 400);
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

const cuposValue = (value, field) => {
  const cupos = positiveInteger(value, field);
  if (cupos > CUPO_MAXIMO) {
    fail(`El campo ${field} debe estar entre 1 y ${CUPO_MAXIMO}`);
  }
  return cupos;
};

const estadoValue = (value) => {
  if (typeof value !== 'string' || !ESTADOS_RESERVA.includes(value)) {
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

const lugaresFaltantes = (cuposOcupados) => CUPO_MAXIMO - cuposOcupados;

const esCompleta = (cuposOcupados) => cuposOcupados === CUPO_MAXIMO;

const validateCreateReservaPayload = (payload) => {
  ensureObject(payload);
  return {
    turnoId: positiveInteger(payload.turnoId, 'turnoId'),
    cuposOcupados: cuposValue(payload.cuposOcupados, 'cuposOcupados'),
  };
};

const validateUpdateCuposPayload = (payload) => {
  ensureObject(payload);
  if (payload.cuposOcupados === undefined) {
    fail('El campo cuposOcupados es obligatorio');
  }
  return { cuposOcupados: cuposValue(payload.cuposOcupados, 'cuposOcupados') };
};

const parseReservaId = (value) => positiveInteger(value, 'id');

const parseReservaListQuery = (query = {}) => {
  const page = positiveInteger(query.page, 'page', 1);
  const limit = positiveInteger(query.limit, 'limit', 10);
  const turnoId = positiveInteger(query.turnoId, 'turnoId');
  const estado = query.estado === undefined ? undefined : estadoValue(query.estado);
  const fecha = query.fecha === undefined ? undefined : fechaValue(query.fecha);

  return { page, limit, offset: (page - 1) * limit, turnoId, estado, fecha };
};

export {
  CUPO_MAXIMO,
  lugaresFaltantes,
  esCompleta,
  validateCreateReservaPayload,
  validateUpdateCuposPayload,
  parseReservaId,
  parseReservaListQuery,
};
