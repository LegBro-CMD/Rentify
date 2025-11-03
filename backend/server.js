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
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],
        connectSrc: [
          "'self'",
          "https://rentify-m636.onrender.com", // ✅ Allow API calls to your Render backend
          "https://api.render.com",
        ],
        imgSrc: ["'self'", "data:", "https://rentify-m636.onrender.com"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com", // ✅ Allow Google Fonts CSS
        ],
        fontSrc: [
          "'self'",
          "https://fonts.googleapis.com",
          "https://fonts.gstatic.com", // ✅ Allow Google Fonts assets
          "data:",
        ],
      },
    },
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
});
app.use(limiter);

// ✅ CORS configuration — works in both development & production
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://rentify-cauy.onrender.com', // ✅ Your frontend (Render)
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);


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
app.use('/auth', authRoutes);
app.use('/listings', listingRoutes);
app.use('/bookings', bookingRoutes);
app.use('/upload', uploadRoutes);
app.use('/admin', adminRoutes);
app.use('/admin', dashboardRoutes);
app.use('/admin', require('./routes/dashboard'));
app.use('/dashboard', require('./routes/dashboard'));
app.use('/dashboard', dashboardRoutes);
app.use('/users', userRoutes);
app.use('/notifications', notificationRoutes);
app.use('/favorites', favoriteRoutes);
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

// Serve frontend
if (process.env.NODE_ENV === 'production') {
  const __dirname1 = path.resolve();
  app.use(express.static(path.join(__dirname1, '../frontend/build')));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname1, '../frontend', 'build', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('✅ Rentify API is running successfully!');
  });
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
  console.log(`🧪 Test URL: http://localhost:${PORT}/test`);
  console.log(`💾 MongoDB URI: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/rentify'}`);
});

module.exports = app;