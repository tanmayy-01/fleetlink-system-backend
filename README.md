# FleetLink Backend - Logistics Vehicle Booking System

A robust Node.js backend API for managing logistics vehicle bookings with real-time availability checking and booking management.

## 🚀 Features

- **Vehicle Management**: Add, update, and manage fleet vehicles
- **Real-time Availability**: Check vehicle availability with time overlap detection
- **Booking System**: Create, update, and cancel vehicle bookings
- **Data Validation**: Comprehensive input validation with Joi
- **Error Handling**: Centralized error handling with detailed responses
- **Race Condition Prevention**: Robust booking logic to prevent double-bookings
- **MongoDB Integration**: Efficient data storage with Mongoose ODM

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Testing**: Jest with Supertest
- **Environment**: dotenv for configuration

## 📦 Installation

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd fleetlink-system/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**

   Update the `.env` file with your configuration:
   ```env
    PORT=1234
    NODE_ENV=development
    MONGODB_URI=mongodb://localhost:27017/fleetlink
    FRONTEND_URL=http://localhost:5173
    MONGODB_TEST_URI=mongodb://localhost:27017/fleetlink_test

   ```

4. **Start MongoDB**

5. **Start the server**
   ```bash
   # Development mode with auto-restart
   npm run dev
   
## 🌐 API Endpoints

### Vehicle Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/vehicles` | Add new vehicle | `{ name, capacityKg, tyres }` |
| `GET` | `/api/vehicles/available` | Get available vehicles | Query params: `capacityRequired`, `fromPincode`, `toPincode`, `startTime` |
| `GET` | `/api/vehicles` | Get all vehicles | Query params: `status`, `minCapacity`, `maxCapacity`, `page`, `limit` |
| `GET` | `/api/vehicles/:id` | Get vehicle by ID | - |
| `PATCH` | `/api/vehicles/:id/status` | Update vehicle status | `{ status }` |

### Booking Endpoints

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| `POST` | `/api/bookings` | Create new booking | `{ vehicleId, customerId, fromPincode, toPincode, startTime }` |
| `GET` | `/api/bookings` | Get all bookings | Query params: `customerId`, `vehicleId`, `status`, `fromDate`, `toDate`, `page`, `limit` |
| `GET` | `/api/bookings/:id` | Get booking by ID | - |
| `GET` | `/api/bookings/customer/:customerId` | Get customer bookings | Query params: `limit`, `status` |
| `PATCH` | `/api/bookings/:id/status` | Update booking status | `{ status }` |
| `DELETE` | `/api/bookings/:id` | Cancel booking | - |


## 📊 Data Models

### Vehicle Schema
```javascript
{
  name: String,           // Vehicle identification name
  capacityKg: Number,     // Capacity in kilograms
  tyres: Number,          // Number of tyres
  status: String,         // active, maintenance, retired
  createdAt: Date,
  updatedAt: Date
}
```

### Booking Schema
```javascript
{
  vehicleId: ObjectId,           // Reference to vehicle
  customerId: String,            // Customer identifier
  fromPincode: String,           // Pickup location (6 digits)
  toPincode: String,             // Destination location (6 digits)
  startTime: Date,               // Booking start time
  endTime: Date,                 // Booking end time (calculated)
  estimatedRideDurationHours: Number,  // Duration in hours
  status: String,                // confirmed, in-progress, completed, cancelled
  totalCost: Number,             // Booking cost
  createdAt: Date,
  updatedAt: Date
}
```

## 🧪 Testing

The backend includes comprehensive unit tests for critical functionality.

### Run Tests
```bash
# Run all tests
npm test

