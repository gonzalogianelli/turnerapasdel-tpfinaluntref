import { logger } from '../config/logger.js';
import { AppError } from '../utils/AppError.js';

const normalizeError = (err) => {
  if (err?.name === 'SequelizeUniqueConstraintError') {
    return new AppError('El valor ya existe', 409);
  }

  if (['SequelizeValidationError', 'SequelizeForeignKeyConstraintError'].includes(err?.name)) {
    return new AppError('Datos invalidos', 400);
  }

  return err;
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const error = normalizeError(err);
  const isOperational = error instanceof Error && error.isOperational === true;
  const statusCode = isOperational && Number.isInteger(error.statusCode) ? error.statusCode : 500;
  const message = isOperational ? error.message : 'Error interno del servidor';

  logger.error(
    {
      err: error,
      method: req.method,
      url: req.originalUrl,
      statusCode,
    },
    'Error en la peticion',
  );

  const body = { status: 'error', message };

  return res.status(statusCode).json(body);
};

export { errorHandler };
