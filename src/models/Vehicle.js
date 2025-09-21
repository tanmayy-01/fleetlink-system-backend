/**
 * Vehicle Model
 * Defines the schema and model for vehicles in the fleet
 */

const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  // Vehicle identification name
  name: {
    type: String,
    required: [true, 'Vehicle name is required'],
    trim: true,
    maxlength: [100, 'Vehicle name cannot exceed 100 characters'],
    minlength: [2, 'Vehicle name must be at least 2 characters']
  },
  
  // Vehicle capacity in kilograms
  capacityKg: {
    type: Number,
    required: [true, 'Vehicle capacity is required'],
    min: [1, 'Capacity must be at least 1 kg'],
    max: [50000, 'Capacity cannot exceed 50,000 kg']
  },
  
  // Number of tyres (wheels) the vehicle has
  tyres: {
    type: Number,
    required: [true, 'Number of tyres is required'],
    min: [2, 'Vehicle must have at least 2 tyres'],
    max: [18, 'Vehicle cannot have more than 18 tyres']
  },
  
  // Vehicle status - active vehicles can be booked
  status: {
    type: String,
    enum: ['active', 'maintenance', 'retired'],
    default: 'active'
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

// Index for better query performance
vehicleSchema.index({ capacityKg: 1, status: 1 });
vehicleSchema.index({ name: 1 });

// Virtual field to get vehicle type based on capacity
vehicleSchema.virtual('vehicleType').get(function() {
  if (this.capacityKg <= 1000) return 'Small';
  if (this.capacityKg <= 5000) return 'Medium';
  if (this.capacityKg <= 15000) return 'Large';
  return 'Heavy Duty';
});

// Instance method to check if vehicle can handle required capacity
vehicleSchema.methods.canHandleCapacity = function(requiredCapacity) {
  return this.capacityKg >= requiredCapacity && this.status === 'active';
};

// Static method to find vehicles by minimum capacity
vehicleSchema.statics.findByMinCapacity = function(minCapacity) {
  return this.find({ 
    capacityKg: { $gte: minCapacity },
    status: 'active'
  }).sort({ capacityKg: 1 });
};

module.exports = mongoose.model('Vehicle', vehicleSchema);