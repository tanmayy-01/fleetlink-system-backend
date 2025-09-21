/**
 * Vehicle Routes
 * Defines all routes related to vehicle operations
 */

const express = require('express');
const router = express.Router();
const {
  addVehicle,
  findAvailableVehicles,
  getAllVehicles,
  getVehicleById,
  updateVehicleStatus
} = require('../controllers/vehicleController.js');
const {
  validateVehicle,
  validateAvailability
} = require('../middleware/validation.js');

/**
 * @route   POST /api/vehicles
 * @desc    Add a new vehicle to the fleet
 * @access  Public (in real app, this would be admin only)
 * @body    { name: string, capacityKg: number, tyres: number }
 */
router.post('/', validateVehicle, addVehicle);

/**
 * @route   GET /api/vehicles/available
 * @desc    Find available vehicles based on criteria
 * @access  Public
 * @query   capacityRequired, fromPincode, toPincode, startTime
 */
router.get('/available', validateAvailability, findAvailableVehicles);

/**
 * @route   GET /api/vehicles
 * @desc    Get all vehicles with optional filtering and pagination
 * @access  Public (in real app, this would be admin only)
 * @query   status, minCapacity, maxCapacity, page, limit
 */
router.get('/', getAllVehicles);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Get vehicle details by ID
 * @access  Public
 * @params  id - Vehicle ID
 */
router.get('/:id', getVehicleById);

/**
 * @route   PATCH /api/vehicles/:id/status
 * @desc    Update vehicle status (active, maintenance, retired)
 * @access  Public (in real app, this would be admin only)
 * @params  id - Vehicle ID
 * @body    { status: string }
 */
router.patch('/:id/status', updateVehicleStatus);

module.exports = router;