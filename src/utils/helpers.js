/**
 * Utility Functions
 * Helper functions used across the application
 */

/**
 * Calculate estimated ride duration based on pincodes
 * This is a simplified calculation as specified in requirements
 * In real-world applications, this would integrate with mapping services
 * 
 * @param {string} fromPincode - Starting pincode
 * @param {string} toPincode - Destination pincode
 * @returns {number} Estimated ride duration in hours
 */
const calculateRideDuration = (fromPincode, toPincode) => {
  try {
    // Convert pincodes to integers
    const from = parseInt(fromPincode);
    const to = parseInt(toPincode);
    
    // Validate pincodes are valid numbers
    if (isNaN(from) || isNaN(to)) {
      throw new Error('Invalid pincode format');
    }
    
    // Calculate duration using the specified formula
    // Take absolute difference and modulo 24 to keep within a day
    const duration = Math.abs(from - to) % 24;
    
    // Ensure minimum duration of 1 hour for any trip
    return Math.max(duration, 1);
    
  } catch (error) {
    console.error('Error calculating ride duration:', error);
    // Return default duration of 2 hours if calculation fails
    return 2;
  }
};

/**
 * Validate pincode format
 * 
 * @param {string} pincode - Pincode to validate
 * @returns {boolean} True if valid, false otherwise
 */
const isValidPincode = (pincode) => {
  if (!pincode || typeof pincode !== 'string') {
    return false;
  }
  
  // Check if pincode is exactly 6 digits
  const pincodeRegex = /^\d{6}$/;
  return pincodeRegex.test(pincode.trim());
};

/**
 * Validate ISO date string
 * 
 * @param {string} dateString - Date string to validate
 * @returns {boolean} True if valid ISO date, false otherwise
 */
const isValidISODate = (dateString) => {
  if (!dateString || typeof dateString !== 'string') {
    return false;
  }
  
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date) && date.toISOString() === dateString;
};

/**
 * Check if a date is in the future
 * 
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date is in future, false otherwise
 */
const isFutureDate = (date) => {
  const checkDate = new Date(date);
  const now = new Date();
  return checkDate > now;
};

/**
 * Format error response
 * 
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {Object} details - Additional error details
 * @returns {Object} Formatted error response
 */
const formatErrorResponse = (message, statusCode = 500, details = null) => {
  const response = {
    success: false,
    error: {
      message,
      statusCode,
      timestamp: new Date().toISOString()
    }
  };
  
  if (details) {
    response.error.details = details;
  }
  
  return response;
};

/**
 * Format success response
 * 
 * @param {Object} data - Response data
 * @param {string} message - Success message
 * @param {number} statusCode - HTTP status code
 * @returns {Object} Formatted success response
 */
const formatSuccessResponse = (data, message = 'Operation successful', statusCode = 200) => {
  return {
    success: true,
    message,
    statusCode,
    data,
    timestamp: new Date().toISOString()
  };
};

/**
 * Sanitize input data by removing extra whitespace and converting to appropriate types
 * 
 * @param {Object} data - Data to sanitize
 * @returns {Object} Sanitized data
 */
const sanitizeInput = (data) => {
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string') {
      sanitized[key] = value.trim();
    } else if (typeof value === 'number') {
      sanitized[key] = Number(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
};

/**
 * Calculate booking cost based on duration, capacity, and distance
 * This is a simplified calculation - real applications would have complex pricing
 * 
 * @param {number} durationHours - Ride duration in hours
 * @param {number} capacityKg - Vehicle capacity
 * @param {string} fromPincode - Starting pincode
 * @param {string} toPincode - Destination pincode
 * @returns {number} Calculated cost
 */
const calculateBookingCost = (durationHours, capacityKg, fromPincode, toPincode) => {
  // Base rate per hour
  const baseRatePerHour = 500;
  
  // Capacity multiplier (larger vehicles cost more)
  const capacityMultiplier = Math.max(1, capacityKg / 1000);
  
  // Distance factor (simplified)
  const distance = Math.abs(parseInt(toPincode) - parseInt(fromPincode));
  const distanceMultiplier = Math.max(1, distance / 100);
  
  // Calculate total cost
  const totalCost = baseRatePerHour * durationHours * capacityMultiplier * distanceMultiplier;
  
  // Round to 2 decimal places
  return Math.round(totalCost * 100) / 100;
};

module.exports = {
  calculateRideDuration,
  isValidPincode,
  isValidISODate,
  isFutureDate,
  formatErrorResponse,
  formatSuccessResponse,
  sanitizeInput,
  calculateBookingCost
};