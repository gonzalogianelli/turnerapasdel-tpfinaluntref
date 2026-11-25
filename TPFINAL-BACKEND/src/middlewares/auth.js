import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

const unauthorized = () => new AppError('Sesion invalida o expirada', 401);

const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.[config.cookie.name];
    if (!token) {
      throw new AppError('No autenticado', 401);
    }

    let payload;
    try {
      payload = jwt.verify(token, config.jwt.secret);
    } catch {
      throw unauthorized();
    }

    if (!payload || !payload.id) {
      throw unauthorized();
    }

    const user = await User.findByPk(payload.id, { paranoid: true });
    if (!user) {
      throw unauthorized();
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(new AppError('No autenticado', 401));
  }

  if (!roles.includes(req.user.rol)) {
    return next(new AppError('No autorizado para realizar esta accion', 403));
  }

  return next();
};

export { authenticate, requireRole };
