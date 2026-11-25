import { AppError } from './AppError.js';
import { CATEGORIAS, POSICIONES, MANOS, SEXOS, ROLES } from '../models/User.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const emailValue = (value) => {
  const email = requiredText(value, 'email').toLowerCase();
  if (!EMAIL_REGEX.test(email)) {
    fail('El email no tiene un formato valido');
  }
  return email;
};

const passwordValue = (value) => {
  if (typeof value !== 'string' || value.length < 8) {
    fail('La contrasena debe tener al menos 8 caracteres');
  }
  return value;
};

const oneOf = (value, allowed, field) => {
  if (typeof value !== 'string' || !allowed.includes(value)) {
    fail(`El campo ${field} no es valido`);
  }
  return value;
};

const validateCreateUserPayload = (payload, { allowRole = false } = {}) => {
  ensureObject(payload);

  if (!allowRole && payload.rol !== undefined) {
    fail('No esta permitido enviar el rol en el registro publico');
  }

  const data = {
    nombre: requiredText(payload.nombre, 'nombre'),
    email: emailValue(payload.email),
    password: passwordValue(payload.password),
    categoria: oneOf(payload.categoria, CATEGORIAS, 'categoria'),
    posicionHabitual: oneOf(payload.posicionHabitual, POSICIONES, 'posicionHabitual'),
    manoDominante: oneOf(payload.manoDominante, MANOS, 'manoDominante'),
    sexo: oneOf(payload.sexo, SEXOS, 'sexo'),
    telefono: requiredText(payload.telefono, 'telefono'),
  };

  if (allowRole && payload.rol !== undefined) {
    data.rol = oneOf(payload.rol, ROLES, 'rol');
  }

  return data;
};

const validateUpdateUserPayload = (payload, { allowRole = false } = {}) => {
  ensureObject(payload);

  const updates = {};

  if (payload.nombre !== undefined) updates.nombre = requiredText(payload.nombre, 'nombre');
  if (payload.email !== undefined) updates.email = emailValue(payload.email);
  if (payload.password !== undefined) updates.password = passwordValue(payload.password);
  if (payload.categoria !== undefined) {
    updates.categoria = oneOf(payload.categoria, CATEGORIAS, 'categoria');
  }
  if (payload.posicionHabitual !== undefined) {
    updates.posicionHabitual = oneOf(payload.posicionHabitual, POSICIONES, 'posicionHabitual');
  }
  if (payload.manoDominante !== undefined) {
    updates.manoDominante = oneOf(payload.manoDominante, MANOS, 'manoDominante');
  }
  if (payload.sexo !== undefined) updates.sexo = oneOf(payload.sexo, SEXOS, 'sexo');
  if (payload.telefono !== undefined) updates.telefono = requiredText(payload.telefono, 'telefono');

  if (payload.rol !== undefined) {
    if (!allowRole) {
      fail('No esta permitido modificar el rol desde el perfil propio');
    }
    updates.rol = oneOf(payload.rol, ROLES, 'rol');
  }

  return updates;
};

const positiveInteger = (value, field, fallback) => {
  if (value === undefined) return fallback;
  if (typeof value !== 'string' && typeof value !== 'number') {
    fail(`El parametro ${field} debe ser un entero positivo`);
  }
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    fail(`El parametro ${field} debe ser un entero positivo`);
  }
  return parsed;
};

const parseUserListQuery = (query = {}) => {
  const page = positiveInteger(query.page, 'page', 1);
  const limit = positiveInteger(query.limit, 'limit', 10);

  let rol;
  if (query.rol !== undefined) {
    if (typeof query.rol !== 'string' || !ROLES.includes(query.rol)) {
      fail('El filtro rol no es valido');
    }
    rol = query.rol;
  }

  let categoria;
  if (query.categoria !== undefined) {
    if (typeof query.categoria !== 'string' || !CATEGORIAS.includes(query.categoria)) {
      fail('El filtro categoria no es valido');
    }
    categoria = query.categoria;
  }

  let search;
  if (query.search !== undefined) {
    if (typeof query.search !== 'string') {
      fail('El filtro search no es valido');
    }
    search = query.search.trim();
  }

  return { page, limit, offset: (page - 1) * limit, rol, categoria, search };
};

const parseUserId = (value) => {
  if (typeof value !== 'string' || !/^\d+$/.test(value) || Number(value) < 1) {
    fail('El identificador debe ser un entero positivo');
  }
  return Number(value);
};

export {
  CATEGORIAS,
  POSICIONES,
  MANOS,
  SEXOS,
  ROLES,
  validateCreateUserPayload,
  validateUpdateUserPayload,
  parseUserListQuery,
  parseUserId,
};
