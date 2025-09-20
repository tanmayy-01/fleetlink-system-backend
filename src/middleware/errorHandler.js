/**
 * Global Error Handler Middleware
 * Handles all errors in the application and formats consistent error responses
 */

const { formatErrorResponse } = require('../utils/helpers.js');

const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error for debugging
  console.error('Error:', err);

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid ID format';
    error = formatErrorResponse(message, 400);
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for ${field}. This ${field} already exists.`;
    error = formatErrorResponse(message, 400);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const message = Object.values(err.errors)
      .map(error => error.message)
      .join(', ');
    error = formatErrorResponse(message, 400);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    const message = 'Invalid token';
    error = formatErrorResponse(message, 401);
  }

  if (err.name === 'TokenExpiredError') {
    const message = 'Token expired';
    error = formatErrorResponse(message, 401);
  }

  // Rate limiting error
  if (err.message && err.message.includes('Too many requests')) {
    error = formatErrorResponse(err.message, 429);
  }

  // Default error response
  if (!error.success === false) {
    error = formatErrorResponse(
      error.message || 'Internal server error',
      error.statusCode || 500
    );
  }

  res.status(error.error?.statusCode || 500).json(error);
};

module.exports = errorHandler;