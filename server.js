/**
 * FleetLink Backend Server
 * Main server file that initializes Express app and connects to MongoDB
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const connectDB = require('./src/config/database.js');
const vehicleRoutes = require('./src/routes/vehicles.js');
const bookingRoutes = require('./src/routes/bookings.js');
const errorHandler = require('./src/middleware/errorHandler.js');

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration - Allow frontend to communicate with backend
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'FleetLink Backend is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/bookings', bookingRoutes);

// Handle 404 routes
// Handle 404 routes (regex way)
app.use(/.*/, (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});


// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`🚀 FleetLink Backend Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log('Unhandled Rejection at:', promise, 'reason:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;