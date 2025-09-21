/**
 * Validation Middleware
 * Uses Joi for request validation
 */

const Joi = require('joi');
const { formatErrorResponse } = require('../utils/helpers.js');

// Vehicle creation validation schema
const vehicleSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.empty': 'Vehicle name is required',
      'string.min': 'Vehicle name must be at least 2 characters',
      'string.max': 'Vehicle name cannot exceed 100 characters',
      'any.required': 'Vehicle name is required'
    }),
    
  capacityKg: Joi.number()
    .positive()
    .min(1)
    .max(50000)
    .required()
    .messages({
      'number.base': 'Capacity must be a number',
      'number.positive': 'Capacity must be a positive number',
      'number.min': 'Capacity must be at least 1 kg',
      'number.max': 'Capacity cannot exceed 50,000 kg',
      'any.required': 'Vehicle capacity is required'
    }),
    
  tyres: Joi.number()
    .integer()
    .min(2)
    .max(18)
    .required()
    .messages({
      'number.base': 'Number of tyres must be a number',
      'number.integer': 'Number of tyres must be an integer',
      'number.min': 'Vehicle must have at least 2 tyres',
      'number.max': 'Vehicle cannot have more than 18 tyres',
      'any.required': 'Number of tyres is required'
    })
});

// Vehicle availability search validation schema
const availabilitySchema = Joi.object({
  capacityRequired: Joi.number()
    .positive()
    .min(1)
    .max(50000)
    .required()
    .messages({
      'number.base': 'Required capacity must be a number',
      'number.positive': 'Required capacity must be positive',
      'number.min': 'Required capacity must be at least 1 kg',
      'number.max': 'Required capacity cannot exceed 50,000 kg',
      'any.required': 'Required capacity is required'
    }),
    
  fromPincode: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.empty': 'From pincode is required',
      'string.pattern.base': 'From pincode must be exactly 6 digits',
      'any.required': 'From pincode is required'
    }),
    
  toPincode: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.empty': 'To pincode is required',
      'string.pattern.base': 'To pincode must be exactly 6 digits',
      'any.required': 'To pincode is required'
    }),
    
  startTime: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.base': 'Start time must be a valid date',
      'date.format': 'Start time must be in ISO format',
      'date.min': 'Start time must be in the future',
      'any.required': 'Start time is required'
    })
});

// Booking creation validation schema
const bookingSchema = Joi.object({
  vehicleId: Joi.string()
    .trim()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.empty': 'Vehicle ID is required',
      'string.pattern.base': 'Vehicle ID must be a valid MongoDB ObjectId',
      'any.required': 'Vehicle ID is required'
    }),
    
  customerId: Joi.string()
    .trim()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': 'Customer ID is required',
      'string.max': 'Customer ID cannot exceed 50 characters',
      'any.required': 'Customer ID is required'
    }),
    
  fromPincode: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.empty': 'From pincode is required',
      'string.pattern.base': 'From pincode must be exactly 6 digits',
      'any.required': 'From pincode is required'
    }),
    
  toPincode: Joi.string()
    .trim()
    .pattern(/^\d{6}$/)
    .required()
    .messages({
      'string.empty': 'To pincode is required',
      'string.pattern.base': 'To pincode must be exactly 6 digits',
      'any.required': 'To pincode is required'
    }),
    
  startTime: Joi.date()
    .iso()
    .min('now')
    .required()
    .messages({
      'date.base': 'Start time must be a valid date',
      'date.format': 'Start time must be in ISO format',
      'date.min': 'Start time must be in the future',
      'any.required': 'Start time is required'
    })
});

/**
 * Generic validation middleware factory
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 */
const 
validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const dataToValidate = req[source];
    
    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
      convert: true // Convert strings to appropriate types
    });
    
    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message)
        .join(', ');
        
      return res.status(400).json(
        formatErrorResponse(errorMessage, 400, {
          validationErrors: error.details
        })
      );
    }
    
    // Replace original data with validated and sanitized data
    req[source] = value;
    next();
  };
};

// Export validation middlewares
module.exports = {
  validateVehicle: validate(vehicleSchema, 'body'),
  validateAvailability: validate(availabilitySchema, 'query'),
  validateBooking: validate(bookingSchema, 'body'),
  validate
};