class AppError extends Error {
  constructor(message, statusCode = 500, options = {}) {
    super(message, options);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

export { AppError };
