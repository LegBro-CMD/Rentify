const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    console.log('Auth middleware - Token received:', token ? 'Yes' : 'No');
    console.log('Auth middleware - Full Authorization header:', req.header('Authorization'));

    if (!token) {
      console.log('Auth middleware - No token provided');
      return res.status(401).json({
        success: false,
        message: 'No token provided, authorization denied'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - Token decoded successfully:', decoded.userId);
    
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      console.log('Auth middleware - User not found for token');
      return res.status(401).json({
        success: false,
        message: 'Token is not valid'
      });
    }

    console.log('Auth middleware - User authenticated:', user.email);
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role || 'user',
      name: user.name || `${user.firstName} ${user.lastName}`
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error.message);
    res.status(401).json({
      success: false,
      message: 'Token is not valid'
    });
  }
};

module.exports = auth;