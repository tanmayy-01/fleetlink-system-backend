/**
 * FleetLink Backend Unit Tests - Core Functionality
 * Focuses on critical vehicle and booking operations with overlap logic
 */

const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const Vehicle = require("../src/models/Vehicle");
const Booking = require("../src/models/Booking");
const { calculateRideDuration } = require("../src/utils/helpers");

// Test database connection
const MONGODB_TEST_URI =
  process.env.MONGODB_TEST_URI || "mongodb://localhost:27017/fleetlink_test";

describe("FleetLink Core Backend Tests", () => {
  let testVehicleId;

  // Setup test database
  beforeAll(async () => {
    // Close existing connection if any
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    // Connect to test database
    await mongoose.connect(MONGODB_TEST_URI);
    console.log("Connected to test database");
  });

  // Clean database before each test
  beforeEach(async () => {
    await Vehicle.deleteMany({});
    await Booking.deleteMany({});
  });

  // Cleanup after tests
  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    console.log("Test database connection closed");
  });

  // ==================== UTILITY FUNCTION TESTS ====================

  describe("Utility Functions", () => {
    describe("calculateRideDuration", () => {
      test("should calculate duration correctly", () => {
        expect(calculateRideDuration("110001", "110005")).toBe(4);
        expect(calculateRideDuration("400001", "400010")).toBe(9);
        expect(calculateRideDuration("110001", "110001")).toBe(1); // Minimum 1 hour
      });

      test("should handle invalid inputs", () => {
        expect(calculateRideDuration("invalid", "123456")).toBe(2); // Default fallback
      });
    });
  });

  // ==================== POST /api/vehicles TESTS ====================

  describe("POST /api/vehicles", () => {
    test("should create vehicle with valid data", async () => {
      const vehicleData = {
        name: "Test Truck",
        capacityKg: 5000,
        tyres: 6,
      };

      const response = await request(app)
        .post("/api/vehicles")
        .send(vehicleData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: vehicleData.name,
        capacityKg: vehicleData.capacityKg,
        tyres: vehicleData.tyres,
        status: "active",
      });
      expect(response.body.data.id).toBeDefined();

      // Verify in database
      const dbVehicle = await Vehicle.findById(response.body.data.id);
      expect(dbVehicle).toBeTruthy();
      expect(dbVehicle.name).toBe(vehicleData.name);
    });

    test("should reject invalid vehicle data", async () => {
      const invalidCases = [
        {
          description: "missing name",
          data: { capacityKg: 5000, tyres: 6 },
        },
        {
          description: "invalid capacity (negative)",
          data: { name: "Test", capacityKg: -100, tyres: 6 },
        },
        {
          description: "invalid tyres (too few)",
          data: { name: "Test", capacityKg: 5000, tyres: 1 },
        },
        {
          description: "invalid tyres (too many)",
          data: { name: "Test", capacityKg: 5000, tyres: 20 },
        },
        {
          description: "empty name",
          data: { name: "", capacityKg: 5000, tyres: 6 },
        },
      ];

      for (const testCase of invalidCases) {
        const response = await request(app)
          .post("/api/vehicles")
          .send(testCase.data);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    test("should validate capacity and tyres ranges", async () => {
      // Test boundary values
      const validBoundary = {
        name: "Boundary Test",
        capacityKg: 50000, // Maximum allowed
        tyres: 18, // Maximum allowed
      };

      const response = await request(app)
        .post("/api/vehicles")
        .send(validBoundary)
        .expect(201);

      expect(response.body.success).toBe(true);

      // Test exceeding boundaries
      const invalidBoundary = {
        name: "Invalid Boundary",
        capacityKg: 50001, // Exceeds maximum
        tyres: 19, // Exceeds maximum
      };

      await request(app)
        .post("/api/vehicles")
        .send(invalidBoundary)
        .expect(400);
    });
  });

  // ==================== POST /api/bookings TESTS ====================

  describe("POST /api/bookings", () => {
    beforeEach(async () => {
      // Create test vehicle
      const vehicle = await Vehicle.create({
        name: "Test Vehicle",
        capacityKg: 5000,
        tyres: 6,
        status: "active",
      });
      testVehicleId = vehicle._id;
    });

    test("should create booking successfully with valid data", async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);

      const bookingData = {
        vehicleId: testVehicleId.toString(),
        customerId: "CUST001",
        fromPincode: "110001",
        toPincode: "400001",
        startTime: startTime.toISOString(),
      };

      const response = await request(app)
        .post("/api/bookings")
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        customerId: bookingData.customerId,
        fromPincode: bookingData.fromPincode,
        toPincode: bookingData.toPincode,
        status: "confirmed",
      });
      expect(response.body.data.estimatedRideDurationHours).toBeDefined();
      expect(response.body.data.totalCost).toBeGreaterThan(0);
      expect(response.body.data.endTime).toBeDefined();

      // Verify in database
      const dbBooking = await Booking.findById(response.body.data.id);
      expect(dbBooking).toBeTruthy();
      expect(dbBooking.vehicleId.toString()).toBe(testVehicleId.toString());
    });

    test("should return 404 for non-existent vehicle", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);

      const bookingData = {
        vehicleId: nonExistentId.toString(),
        customerId: "CUST001",
        fromPincode: "110001",
        toPincode: "400001",
        startTime: startTime.toISOString(),
      };

      const response = await request(app)
        .post("/api/bookings")
        .send(bookingData)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain("Vehicle not found");
    });

    test("should return 400 for inactive vehicle", async () => {
      // Update vehicle status to maintenance
      await Vehicle.findByIdAndUpdate(testVehicleId, { status: "maintenance" });

      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);

      const bookingData = {
        vehicleId: testVehicleId.toString(),
        customerId: "CUST001",
        fromPincode: "110001",
        toPincode: "400001",
        startTime: startTime.toISOString(),
      };

      const response = await request(app)
        .post("/api/bookings")
        .send(bookingData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain(
        "not available for booking"
      );
    });

        test('should return 409 for exact time conflict', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 4);

      // Create first booking
      await Booking.create({
        vehicleId: testVehicleId,
        customerId: 'CUST001',
        fromPincode: '110001',
        toPincode: '400001',
        startTime,
        endTime,
        estimatedRideDurationHours: 4,
        status: 'confirmed'
      });

      // Try to create booking at exact same time
      const conflictingData = {
        vehicleId: testVehicleId.toString(),
        customerId: 'CUST002',
        fromPincode: '110002',
        toPincode: '400002',
        startTime: startTime.toISOString()
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(conflictingData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('already booked');
    });

    test('should return 409 for overlapping conflict - new booking starts during existing', async () => {
      // Create existing booking (2-6 hours from now)
      const existingStart = new Date();
      existingStart.setHours(existingStart.getHours() + 2);
      const existingEnd = new Date(existingStart);
      existingEnd.setHours(existingEnd.getHours() + 4);

      await Booking.create({
        vehicleId: testVehicleId,
        customerId: 'CUST001',
        fromPincode: '110001',
        toPincode: '400001',
        startTime: existingStart,
        endTime: existingEnd,
        estimatedRideDurationHours: 4,
        status: 'confirmed'
      });

      // Try to create booking that starts during existing booking
      const conflictingStart = new Date();
      conflictingStart.setHours(conflictingStart.getHours() + 4); // Starts during existing booking

      const conflictingData = {
        vehicleId: testVehicleId.toString(),
        customerId: 'CUST002',
        fromPincode: '110001',
        toPincode: '400002', // 2 hour duration
        startTime: conflictingStart.toISOString()
      };

      await request(app)
        .post('/api/bookings')
        .send(conflictingData)
        .expect(409);
    });

    test('should return 409 for overlapping conflict - new booking ends during existing', async () => {
      // Create existing booking (4-8 hours from now)
      const existingStart = new Date();
      existingStart.setHours(existingStart.getHours() + 4);
      const existingEnd = new Date(existingStart);
      existingEnd.setHours(existingEnd.getHours() + 4);

      await Booking.create({
        vehicleId: testVehicleId,
        customerId: 'CUST001',
        fromPincode: '110001',
        toPincode: '400001',
        startTime: existingStart,
        endTime: existingEnd,
        estimatedRideDurationHours: 4,
        status: 'confirmed'
      });

      // Try to create booking that ends during existing booking (2-6 hours from now)
      const conflictingStart = new Date();
      conflictingStart.setHours(conflictingStart.getHours() + 2);

      const conflictingData = {
        vehicleId: testVehicleId.toString(),
        customerId: 'CUST002',
        fromPincode: '110001',
        toPincode: '400001', // 4 hour duration, ends at 6 hours
        startTime: conflictingStart.toISOString()
      };

      await request(app)
        .post('/api/bookings')
        .send(conflictingData)
        .expect(409);
    });

    test('should create booking successfully after existing booking ends', async () => {
      // Create existing booking (2-6 hours from now)
      const existingStart = new Date();
      existingStart.setHours(existingStart.getHours() + 2);
      const existingEnd = new Date(existingStart);
      existingEnd.setHours(existingEnd.getHours() + 4);

      await Booking.create({
        vehicleId: testVehicleId,
        customerId: 'CUST001',
        fromPincode: '110001',
        toPincode: '400001',
        startTime: existingStart,
        endTime: existingEnd,
        estimatedRideDurationHours: 4,
        status: 'confirmed'
      });

      // Create booking that starts after existing booking ends (7 hours from now)
      const nonConflictingStart = new Date();
      nonConflictingStart.setHours(nonConflictingStart.getHours() + 7);

      const nonConflictingData = {
        vehicleId: testVehicleId.toString(),
        customerId: 'CUST002',
        fromPincode: '110001',
        toPincode: '400002',
        startTime: nonConflictingStart.toISOString()
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(nonConflictingData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('should ignore cancelled and completed bookings for conflict detection', async () => {
      const startTime = new Date();
      startTime.setHours(startTime.getHours() + 2);
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 4);

      // Create cancelled booking at same time
      await Booking.create({
        vehicleId: testVehicleId,
        customerId: 'CUST001',
        fromPincode: '110001',
        toPincode: '400001',
        startTime,
        endTime,
        estimatedRideDurationHours: 4,
        status: 'cancelled'
      });

      // Should be able to create new booking at same time
      const bookingData = {
        vehicleId: testVehicleId.toString(),
        customerId: 'CUST002',
        fromPincode: '110001',
        toPincode: '400001',
        startTime: startTime.toISOString()
      };

      const response = await request(app)
        .post('/api/bookings')
        .send(bookingData)
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    test('should return 400 for invalid booking data', async () => {
      const invalidBookingCases = [
        {
          description: 'past start time',
          data: {
            vehicleId: testVehicleId.toString(),
            customerId: 'CUST001',
            fromPincode: '110001',
            toPincode: '400001',
            startTime: '2020-01-01T10:00:00Z'
          }
        },
        {
          description: 'invalid pincode format',
          data: {
            vehicleId: testVehicleId.toString(),
            customerId: 'CUST001',
            fromPincode: '11001', // 5 digits
            toPincode: '400001',
            startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
          }
        },
        {
          description: 'missing required field',
          data: {
            vehicleId: testVehicleId.toString(),
            fromPincode: '110001',
            toPincode: '400001',
            startTime: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()
            // Missing customerId
          }
        }
      ];

      for (const testCase of invalidBookingCases) {
        const response = await request(app)
          .post('/api/bookings')
          .send(testCase.data);

        expect(response.status).toBe(400);
        expect(response.body.success).toBe(false);
      }
    });
  });
});
