import { AppError } from './AppError.js';

const fail = (message) => {
  throw new AppError(message, 400);
};

const ensureObject = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    fail('El cuerpo de la solicitud debe ser un objeto JSON');
  }
};

const requiredText = (value, field) => {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(`El campo ${field} es obligatorio`);
  }
  return value.trim();
};

const booleanValue = (value, field) => {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  fail(`El campo ${field} debe ser booleano`);
};

const positiveInteger = (value, field, fallback) => {
  if (value === undefined) return fallback;
  const parsed = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
  if (typeof parsed !== 'number' || !Number.isInteger(parsed) || parsed < 1) {
    fail(`El parametro ${field} debe ser un entero positivo`);
  }
  return parsed;
};

const validateCreateCanchaPayload = (payload) => {
  ensureObject(payload);
  const data = { nombre: requiredText(payload.nombre, 'nombre') };
  if (payload.bloqueada !== undefined) {
    data.bloqueada = booleanValue(payload.bloqueada, 'bloqueada');
  }
  return data;
};

const validateUpdateCanchaPayload = (payload) => {
  ensureObject(payload);
  const updates = {};
  if (payload.nombre !== undefined) updates.nombre = requiredText(payload.nombre, 'nombre');
  if (payload.bloqueada !== undefined) {
    updates.bloqueada = booleanValue(payload.bloqueada, 'bloqueada');
  }
  return updates;
};

const parseCanchaId = (value) => {
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1) {
    fail('El identificador debe ser un entero positivo');
  }
  return Number(value);
};

const parseCanchaListQuery = (query = {}) => {
  const page = positiveInteger(query.page, 'page', 1);
  const limit = positiveInteger(query.limit, 'limit', 10);

  let nombre;
  if (query.nombre !== undefined) {
    if (typeof query.nombre !== 'string') {
      fail('El filtro nombre no es valido');
    }
    nombre = query.nombre.trim();
  }

  let bloqueada = false;
  if (query.bloqueada !== undefined) {
    bloqueada = booleanValue(query.bloqueada, 'bloqueada');
  }

  return { page, limit, offset: (page - 1) * limit, nombre, bloqueada };
};

export {
  validateCreateCanchaPayload,
  validateUpdateCanchaPayload,
  parseCanchaId,
  parseCanchaListQuery,
};
