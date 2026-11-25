import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { validateCreateUserPayload } from '../utils/userValidation.js';
import { notifyUserRegistered } from './notification.service.js';

const invalidCredentials = () => new AppError('Credenciales invalidas', 401);

const isUniqueConstraintError = (error) => error?.name === 'SequelizeUniqueConstraintError';

const registerUser = async (payload, deps = {}) => {
  const data = validateCreateUserPayload(payload, { allowRole: false });

  const existing = await User.findOne({ where: { email: data.email }, paranoid: false });
  if (existing) {
    throw new AppError('El email ya esta registrado', 409);
  }

  try {
    const user = await User.create({ ...data, rol: 'jugador' });
    notifyUserRegistered(user, deps);
    return user;
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new AppError('El email ya esta registrado', 409);
    }
    throw error;
  }
};

const loginUser = async ({ email, password } = {}) => {
  if (typeof email !== 'string' || typeof password !== 'string' || email.trim() === '' || password === '') {
    throw invalidCredentials();
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await User.scope('withPassword').findOne({
    where: { email: normalizedEmail, deletedAt: null },
  });

  if (!user) {
    throw invalidCredentials();
  }

  const matches = await bcrypt.compare(password, user.password);
  if (!matches) {
    throw invalidCredentials();
  }

  return user;
};

const signSessionToken = (user) =>
  jwt.sign({ id: user.id, rol: user.rol }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });

export { registerUser, loginUser, signSessionToken };
