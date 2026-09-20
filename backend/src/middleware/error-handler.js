const { errorResponse } = require('../utils/api-response');

class AppError extends Error {
  constructor(statusCode, code, message) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function notFoundHandler(_request, _response, next) {
  next(new AppError(404, 'NOT_FOUND', 'Rota nao encontrada'));
}

function errorHandler(error, _request, response, _next) {
  if (error.name === 'ValidationError') {
    return response.status(400).json(errorResponse('VALIDATION_ERROR', error.message));
  }

  const statusCode = error.statusCode || 500;
  const code = error.code || 'INTERNAL_ERROR';
  const message = statusCode >= 500 ? 'Erro interno do servidor' : error.message;

  if (statusCode >= 500) {
    console.error(error);
  }

  return response.status(statusCode).json(errorResponse(code, message));
}

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
};
