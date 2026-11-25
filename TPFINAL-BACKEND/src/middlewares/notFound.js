import { AppError } from '../utils/AppError.js';

const notFound = (req, res, next) => {
  next(new AppError(`Ruta no encontrada: ${req.method} ${req.originalUrl}`, 404));
};

export { notFound };
