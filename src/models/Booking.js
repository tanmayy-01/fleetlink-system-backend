/**
 * Booking Model
 * Defines the schema and model for vehicle bookings
 */

const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Reference to the booked vehicle
  vehicleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle ID is required']
  },
  
  // Customer who made the booking
  customerId: {
    type: String,
    required: [true, 'Customer ID is required'],
    trim: true,
    maxlength: [50, 'Customer ID cannot exceed 50 characters']
  },
  
  // Pickup location pincode
  fromPincode: {
    type: String,
    required: [true, 'From pincode is required'],
    trim: true,
    match: [/^\d{6}$/, 'Pincode must be exactly 6 digits'],
    minlength: [6, 'Pincode must be exactly 6 digits'],
    maxlength: [6, 'Pincode must be exactly 6 digits']
  },
  
  // Destination location pincode
  toPincode: {
    type: String,
    required: [true, 'To pincode is required'],
    trim: true,
    match: [/^\d{6}$/, 'Pincode must be exactly 6 digits'],
    minlength: [6, 'Pincode must be exactly 6 digits'],
    maxlength: [6, 'Pincode must be exactly 6 digits']
  },
  
  // Booking start time
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    validate: {
      validator: function(value) {
        // Ensure booking start time is not in the past
        return value > new Date();
      },
      message: 'Start time must be in the future'
    }
  },
  
  // Booking end time (calculated based on ride duration)
  endTime: {
    type: Date,
    required: [true, 'End time is required']
  },
  
  // Estimated ride duration in hours
  estimatedRideDurationHours: {
    type: Number,
    required: [true, 'Estimated ride duration is required'],
    min: [0.1, 'Ride duration must be at least 0.1 hours'],
    max: [24, 'Ride duration cannot exceed 24 hours']
  },
  
  // Booking status
  status: {
    type: String,
    enum: ['confirmed', 'in-progress', 'completed', 'cancelled'],
    default: 'confirmed'
  },
  
  // Total booking cost (can be calculated based on distance, duration, vehicle type)
  totalCost: {
    type: Number,
    min: [0, 'Cost cannot be negative'],
    default: 0
  }
}, {
  // Add timestamps for created and updated dates
  timestamps: true,
  // Transform output to remove sensitive fields and format response
  toJSON: {
    transform: function(doc, ret) {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound index for efficient overlap checking
bookingSchema.index({ vehicleId: 1, startTime: 1, endTime: 1 });
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1 });

// Virtual field to calculate actual duration
bookingSchema.virtual('actualDurationHours').get(function() {
  if (this.endTime && this.startTime) {
    return (this.endTime - this.startTime) / (1000 * 60 * 60); // Convert to hours
  }
  return this.estimatedRideDurationHours;
});

// Instance method to check if booking overlaps with given time window
bookingSchema.methods.overlapsWithTimeWindow = function(startTime, endTime) {
  return (
    // New booking starts before current booking ends AND
    // New booking ends after current booking starts
    startTime < this.endTime && endTime > this.startTime
  );
};

// Static method to find overlapping bookings for a vehicle
bookingSchema.statics.findOverlappingBookings = function(vehicleId, startTime, endTime, excludeBookingId = null) {
  const query = {
    vehicleId: vehicleId,
    status: { $in: ['confirmed', 'in-progress'] },
    $or: [
      {
        // Existing booking starts before new booking ends
        // AND existing booking ends after new booking starts
        startTime: { $lt: endTime },
        endTime: { $gt: startTime }
      }
    ]
  };
  
  // Exclude current booking if updating
  if (excludeBookingId) {
    query._id = { $ne: excludeBookingId };
  }
  
  return this.find(query);
};

// Static method to get customer booking history
bookingSchema.statics.getCustomerBookings = function(customerId, limit = 10) {
  return this.find({ customerId })
    .populate('vehicleId', 'name capacityKg')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('Booking', bookingSchema);