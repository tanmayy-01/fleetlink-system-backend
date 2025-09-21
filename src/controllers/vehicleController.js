/**
 * Vehicle Controller
 * Handles all vehicle-related operations
 */

const Vehicle = require('../models/Vehicle');
const Booking = require('../models/Booking');
const { 
  formatSuccessResponse, 
  formatErrorResponse,
  calculateRideDuration 
} = require('../utils/helpers');

/**
 * Add a new vehicle to the fleet
 * POST /api/vehicles
 */
const addVehicle = async (req, res, next) => {
  try {
    const { name, capacityKg, tyres } = req.body;
    
    // Create new vehicle
    const vehicle = new Vehicle({
      name,
      capacityKg,
      tyres
    });
    
    // Save to database
    const savedVehicle = await vehicle.save();
    
    res.status(201).json(
      formatSuccessResponse(
        savedVehicle,
        'Vehicle added successfully',
        201
      )
    );
    
  } catch (error) {
    console.error('Error adding vehicle:', error);
    next(error);
  }
};

/**
 * Find available vehicles based on capacity, route, and time
 * GET /api/vehicles/available
 */
const findAvailableVehicles = async (req, res, next) => {
  try {
    const { capacityRequired, fromPincode, toPincode, startTime } = req.query;
    
    // Calculate estimated ride duration
    const estimatedRideDurationHours = calculateRideDuration(fromPincode, toPincode);
    
    // Calculate end time for the booking
    const bookingStartTime = new Date(startTime);
    const bookingEndTime = new Date(bookingStartTime.getTime() + (estimatedRideDurationHours * 60 * 60 * 1000));
    
    // Find all vehicles that meet capacity requirements and are active
    const suitableVehicles = await Vehicle.find({
      capacityKg: { $gte: parseInt(capacityRequired) },
      status: 'active'
    }).sort({ capacityKg: 1 }); // Sort by capacity (ascending) for better optimization
    
    if (suitableVehicles.length === 0) {
      return res.status(200).json(
        formatSuccessResponse(
          [],
          'No vehicles found with required capacity',
          200
        )
      );
    }
    
    // Check availability for each suitable vehicle
    const availableVehicles = [];
    
    for (const vehicle of suitableVehicles) {
      // Find any overlapping bookings for this vehicle
      const overlappingBookings = await Booking.findOverlappingBookings(
        vehicle._id,
        bookingStartTime,
        bookingEndTime
      );
      
      // If no overlapping bookings, vehicle is available
      if (overlappingBookings.length === 0) {
        availableVehicles.push({
          ...vehicle.toJSON(),
          estimatedRideDurationHours,
          route: {
            from: fromPincode,
            to: toPincode
          },
          timeWindow: {
            start: bookingStartTime,
            end: bookingEndTime
          }
        });
      }
    }
    
    // Log search details for monitoring
    console.log(`🔍 Vehicle Search - Capacity: ${capacityRequired}kg, Route: ${fromPincode} → ${toPincode}, Time: ${startTime}`);
    console.log(`📋 Found ${availableVehicles.length} available vehicles out of ${suitableVehicles.length} suitable vehicles`);
    
    res.status(200).json(
      formatSuccessResponse(
        availableVehicles,
        `Found ${availableVehicles.length} available vehicles`,
        200
      )
    );
    
  } catch (error) {
    console.error('Error finding available vehicles:', error);
    next(error);
  }
};

/**
 * Get all vehicles (for admin purposes)
 * GET /api/vehicles
 */
const getAllVehicles = async (req, res, next) => {
  try {
    const { status, minCapacity, maxCapacity, page = 1, limit = 50 } = req.query;
    
    // Build filter query
    const filter = {};
    if (status) filter.status = status;
    if (minCapacity) filter.capacityKg = { $gte: parseInt(minCapacity) };
    if (maxCapacity) {
      if (filter.capacityKg) {
        filter.capacityKg.$lte = parseInt(maxCapacity);
      } else {
        filter.capacityKg = { $lte: parseInt(maxCapacity) };
      }
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get vehicles with pagination
    const vehicles = await Vehicle.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    // Get total count for pagination info
    const total = await Vehicle.countDocuments(filter);
    
    const response = {
      vehicles,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        totalVehicles: total,
        hasNext: skip + vehicles.length < total,
        hasPrev: parseInt(page) > 1
      }
    };
    
    res.status(200).json(
      formatSuccessResponse(
        response,
        'Vehicles retrieved successfully',
        200
      )
    );
    
  } catch (error) {
    console.error('Error getting all vehicles:', error);
    next(error);
  }
};

/**
 * Get vehicle by ID
 * GET /api/vehicles/:id
 */
const getVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    const vehicle = await Vehicle.findById(id);
    
    if (!vehicle) {
      return res.status(404).json(
        formatErrorResponse('Vehicle not found', 404)
      );
    }
    
    // Get recent bookings for this vehicle
    const recentBookings = await Booking.find({ vehicleId: id })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('customerId fromPincode toPincode startTime endTime status');
    
    const response = {
      vehicle,
      recentBookings,
      stats: {
        totalBookings: await Booking.countDocuments({ vehicleId: id }),
        activeBookings: await Booking.countDocuments({ 
          vehicleId: id, 
          status: { $in: ['confirmed', 'in-progress'] }
        })
      }
    };
    
    res.status(200).json(
      formatSuccessResponse(
        response,
        'Vehicle details retrieved successfully',
        200
      )
    );
    
  } catch (error) {
    console.error('Error getting vehicle by ID:', error);
    next(error);
  }
};

/**
 * Update vehicle status (for maintenance, retirement, etc.)
 * PATCH /api/vehicles/:id/status
 */
const updateVehicleStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    if (!['active', 'maintenance', 'retired'].includes(status)) {
      return res.status(400).json(
        formatErrorResponse('Invalid status. Must be: active, maintenance, or retired', 400)
      );
    }
    
    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { status },
      { new: true, runValidators: true }
    );
    
    if (!vehicle) {
      return res.status(404).json(
        formatErrorResponse('Vehicle not found', 404)
      );
    }
    
    res.status(200).json(
      formatSuccessResponse(
        vehicle,
        `Vehicle status updated to ${status}`,
        200
      )
    );
    
  } catch (error) {
    console.error('Error updating vehicle status:', error);
    next(error);
  }
};

module.exports = {
  addVehicle,
  findAvailableVehicles,
  getAllVehicles,
  getVehicleById,
  updateVehicleStatus
};