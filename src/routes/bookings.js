/**
 * Booking Routes
 * Defines all routes related to booking operations
 */

const express = require('express');
const router = express.Router();
const {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getCustomerBookings
} = require('../controllers/bookingController.js');
const { validateBooking } = require('../middleware/validation.js');

/**
 * @route   POST /api/bookings
 * @desc    Create a new booking
 * @access  Public
 * @body    { vehicleId, customerId, fromPincode, toPincode, startTime }
 */
router.post('/', validateBooking, createBooking);

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings with filtering and pagination
 * @access  Public (in real app, this would be admin only)
 * @query   customerId, vehicleId, status, fromDate, toDate, page, limit
 */
router.get('/', getAllBookings);

/**
 * @route   GET /api/bookings/customer/:customerId
 * @desc    Get customer's booking history
 * @access  Public
 * @params  customerId - Customer ID
 * @query   limit, status
 */
router.get('/customer/:customerId', getCustomerBookings);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking details by ID
 * @access  Public
 * @params  id - Booking ID
 */
router.get('/:id', getBookingById);

/**
 * @route   PATCH /api/bookings/:id/status
 * @desc    Update booking status
 * @access  Public (in real app, this would be restricted)
 * @params  id - Booking ID
 * @body    { status: string }
 */
router.patch('/:id/status', updateBookingStatus);

/**
 * @route   DELETE /api/bookings/:id
 * @desc    Cancel a booking
 * @access  Public
 * @params  id - Booking ID
 */
router.delete('/:id', cancelBooking);

module.exports = router;