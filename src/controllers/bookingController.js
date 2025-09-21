/**
 * Booking Controller
 * Handles all booking-related operations
 */

const Booking = require('../models/Booking');
const Vehicle = require('../models/Vehicle');
const { 
  formatSuccessResponse, 
  formatErrorResponse,
  calculateRideDuration,
  calculateBookingCost
} = require('../utils/helpers');

/**
 * Create a new booking
 * POST /api/bookings
 */
const createBooking = async (req, res, next) => {
  try {
    const { vehicleId, customerId, fromPincode, toPincode, startTime } = req.body;
    
    // Verify vehicle exists and is active
    const vehicle = await Vehicle.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json(
        formatErrorResponse('Vehicle not found', 404)
      );
    }
    
    if (vehicle.status !== 'active') {
      return res.status(400).json(
        formatErrorResponse('Vehicle is not available for booking', 400)
      );
    }
    
    // Calculate ride duration and end time
    const estimatedRideDurationHours = calculateRideDuration(fromPincode, toPincode);
    const bookingStartTime = new Date(startTime);
    const bookingEndTime = new Date(bookingStartTime.getTime() + (estimatedRideDurationHours * 60 * 60 * 1000));
    
    // Critical: Re-verify vehicle availability to prevent race conditions
    const overlappingBookings = await Booking.findOverlappingBookings(
      vehicleId,
      bookingStartTime,
      bookingEndTime
    );
    
    if (overlappingBookings.length > 0) {
      return res.status(409).json(
        formatErrorResponse(
          'Vehicle is already booked for the requested time slot',
          409,
          {
            conflictingBookings: overlappingBookings.length,
            suggestedAction: 'Please search for available vehicles again'
          }
        )
      );
    }
    
    // Calculate booking cost
    const totalCost = calculateBookingCost(
      estimatedRideDurationHours,
      vehicle.capacityKg,
      fromPincode,
      toPincode
    );
    
    // Create booking
    const booking = new Booking({
      vehicleId,
      customerId,
      fromPincode,
      toPincode,
      startTime: bookingStartTime,
      endTime: bookingEndTime,
      estimatedRideDurationHours,
      totalCost,
      status: 'confirmed'
    });
    
    const savedBooking = await booking.save();
    
    // Populate vehicle details in response
    await savedBooking.populate('vehicleId', 'name capacityKg tyres');
    
    // Log successful booking
    console.log(`✅ Booking Created - Customer: ${customerId}, Vehicle: ${vehicle.name}, Route: ${fromPincode} → ${toPincode}`);
    
    res.status(201).json(
      formatSuccessResponse(
        savedBooking,
        'Booking created successfully',
        201
      )
    );
    
  } catch (error) {
    console.error('Error creating booking:', error);
    next(error);
  }
};

/**
 * Get all bookings with filtering and pagination
 * GET /api/bookings
 */
const getAllBookings = async (req, res, next) => {
  try {
    const { 
      customerId, 
      vehicleId, 
      status, 
      fromDate, 
      toDate, 
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build filter query
    const filter = {};
    if (customerId) filter.customerId = customerId;
    if (vehicleId) filter.vehicleId = vehicleId;
    if (status) filter.status = status;
    
    // Date range filtering
    if (fromDate || toDate) {
      filter.startTime = {};
      if (fromDate) filter.startTime.$gte = new Date(fromDate);
      if (toDate) filter.startTime.$lte = new Date(toDate);
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get bookings with vehicle details
    const bookings = await Booking.find(filter)
      .populate('vehicleId', 'name capacityKg tyres status')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    // Get total count for pagination
    const total = await Booking.countDocuments(filter);
    
    const response = {
      bookings,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalBookings: total,
        hasNext: skip + bookings.length < total,
        hasPrev: parseInt(page) > 1
      }
    };
    
    res.status(200).json(
      formatSuccessResponse(
        response,
        'Bookings retrieved successfully',
        200
      )
    );
    
  } catch (error) {
    console.error('Error getting all bookings:', error);
    next(error);
  }
};

/**
 * Get booking by ID
 * GET /api/bookings/:id
 */
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id)
      .populate('vehicleId', 'name capacityKg tyres status');
    
    if (!booking) {
      return res.status(404).json(
        formatErrorResponse('Booking not found', 404)
      );
    }
    
    res.status(200).json(
      formatSuccessResponse(
        booking,
        'Booking details retrieved successfully',
        200
      )
    );
    
  } catch (error) {
    console.error('Error getting booking by ID:', error);
    next(error);
  }
};

/**
 * Update booking status
 * PATCH /api/bookings/:id/status
 */
const updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['confirmed', 'in-progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json(
        formatErrorResponse(
          `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          400
        )
      );
    }
    
    const booking = await Booking.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    ).populate('vehicleId', 'name capacityKg tyres');
    
    if (!booking) {
      return res.status(404).json(
        formatErrorResponse('Booking not found', 404)
      );
    }
    
    console.log(`📝 Booking Status Updated - ID: ${id}, New Status: ${status}`);
    
    res.status(200).json(
      formatSuccessResponse(
        booking,
        `Booking status updated to ${status}`,
        200
      )
    );
    
  } catch (error) {
    console.error('Error updating booking status:', error);
    next(error);
  }
};

/**
 * Cancel booking (soft delete)
 * DELETE /api/bookings/:id
 */
const cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const booking = await Booking.findById(id);
    
    if (!booking) {
      return res.status(404).json(
        formatErrorResponse('Booking not found', 404)
      );
    }
    
    // Only allow cancellation of confirmed bookings
    if (booking.status !== 'confirmed') {
      return res.status(400).json(
        formatErrorResponse(
          'Only confirmed bookings can be cancelled',
          400
        )
      );
    }
    
    // Check if booking start time is still in future (allow cancellation buffer)
    const now = new Date();
    const bookingStart = new Date(booking.startTime);
    const hoursUntilStart = (bookingStart - now) / (1000 * 60 * 60);
    
    if (hoursUntilStart < 1) {
      return res.status(400).json(
        formatErrorResponse(
          'Cannot cancel booking within 1 hour of start time',
          400
        )
      );
    }
    
    booking.status = 'cancelled';
    await booking.save();
    
    console.log(`❌ Booking Cancelled - ID: ${id}, Customer: ${booking.customerId}`);
    
    res.status(200).json(
      formatSuccessResponse(
        booking,
        'Booking cancelled successfully',
        200
      )
    );
    
  } catch (error) {
    console.error('Error cancelling booking:', error);
    next(error);
  }
};

/**
 * Get customer booking history
 * GET /api/bookings/customer/:customerId
 */
const getCustomerBookings = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { limit = 10, status } = req.query;
    
    const filter = { customerId };
    if (status) filter.status = status;
    
    const bookings = await Booking.find(filter)
      .populate('vehicleId', 'name capacityKg tyres')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));
    
    // Calculate customer statistics
    const stats = {
      totalBookings: await Booking.countDocuments({ customerId }),
      completedBookings: await Booking.countDocuments({ 
        customerId, 
        status: 'completed' 
      }),
      activeBookings: await Booking.countDocuments({ 
        customerId, 
        status: { $in: ['confirmed', 'in-progress'] }
      })
    };
    
    res.status(200).json(
      formatSuccessResponse(
        { bookings, stats },
        'Customer bookings retrieved successfully',
        200
      )
    );
    
  } catch (error) {
    console.error('Error getting customer bookings:', error);
    next(error);
  }
};

module.exports = {
  createBooking,
  getAllBookings,
  getBookingById,
  updateBookingStatus,
  cancelBooking,
  getCustomerBookings
};