const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();


const authRoutes = require('./routes/auth');
const listingRoutes = require('./routes/listings');
const bookingRoutes = require('./routes/bookings');
const uploadRoutes = require('./routes/upload');
const adminRoutes = require('./routes/admin');
const dashboardRoutes = require('./routes/dashboard');
const userRoutes = require('./routes/userRoutes');
const { router: notificationRoutes } = require('./routes/notifications');
const favoriteRoutes = require('./routes/favorites');


const app = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000 // limit each IP to 1000 requests per windowMs (increased for development)
});
app.use(limiter);

// CORS configuration - MUST be before routes
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing middleware - MUST be before routes
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test endpoint - BEFORE other routes
app.get('/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Backend server is running!',
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5000
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Rentify API is running',
    timestamp: new Date().toISOString()
  });
});

// API Routes - Make sure these are properly mounted
app.use('/api/auth', authRoutes);
app.use('/api/listings', listingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/admin', dashboardRoutes);
app.use('/api/admin', require('./routes/dashboard'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/uploads/avatars', express.static(path.join(__dirname, 'uploads/avatars')));
app.use('/api/bookings', require('./routes/bookings'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rentify', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  // Don't exit process, continue without DB for now
});

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

app.get("/", (req, res) => {
  res.send("✅ Rentify API is running successfully!");
});


// 404 handler - MUST be last
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    success: false, 
    message: `API endpoint not found: ${req.method} ${req.originalUrl}`,
    availableEndpoints: [
      'GET /test',
      'GET /api/health',
      'POST /api/auth/login',
      'POST /api/auth/register',
      'GET /api/listings',
      'GET /api/bookings'
    ]
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`🧪 Test URL: http://localhost:${PORT}/test`);
  console.log(`💾 MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/rentify'}`);
});

module.exports = app;