const express = require('express');
const router = express.Router();
const User = require('../models/User');
const auth = require('../middleware/auth'); // your JWT middleware

// ✅ Update user profile
router.put('/update-profile', auth, async (req, res) => {
  try {
    const { firstName, lastName, email, bio, avatar, phone } = req.body;

    // Update user by ID from token
    const updatedUser = await User.findByIdAndUpdate(
      req.user.userId,
      { firstName, lastName, email, bio, avatar, phone },
      { new: true, runValidators: true }
    ).select('-password'); // exclude password for security

    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser },
    });
  } catch (err) {
    console.error('❌ Update profile error:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while updating profile',
    });
  }
});

module.exports = router;
