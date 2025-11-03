// routes/userRoutes.js
const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');
const multer = require('multer');

const router = express.Router();

/* -----------------------------
   🔧 Multer Setup for File Uploads
----------------------------- */
const storage = multer.diskStorage({
  destination: 'uploads/avatars/',
  filename: (req, file, cb) => {
    cb(null, `${req.user.userId}-${Date.now()}-${file.originalname}`);
  },
});

const upload = multer({ storage });

/* -----------------------------
   👤 GET All Users (Admin Only)
----------------------------- */
router.get('/', auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error while fetching users' });
  }
});

/* -----------------------------
   🗑️ DELETE a User (Admin Only)
----------------------------- */
router.delete('/:id', auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error while deleting user' });
  }
});

/* -----------------------------
   🚀 Promote / Unpromote Routes
----------------------------- */
router.put('/:id/promote', auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'admin' },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User promoted to admin', user: updatedUser });
  } catch (error) {
    console.error('Error promoting user:', error);
    res.status(500).json({ message: 'Server error while promoting user' });
  }
});

router.put('/:id/promote-host', auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'host' },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User promoted to host', user: updatedUser });
  } catch (error) {
    console.error('Error promoting user to host:', error);
    res.status(500).json({ message: 'Server error while promoting user to host' });
  }
});

router.put('/:id/unpromote', auth, async (req, res) => {
  try {
    const requestingUser = await User.findById(req.user.userId);
    if (!requestingUser || requestingUser.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admins only.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { role: 'user' },
      { new: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User unpromoted to regular user', user: updatedUser });
  } catch (error) {
    console.error('Error unpromoting user:', error);
    res.status(500).json({ message: 'Server error while unpromoting user' });
  }
});

/* -----------------------------
   🖼️ Update Profile Picture
----------------------------- */
router.put('/update-avatar', auth, upload.single('avatar'), async (req, res) => {
  try {
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    console.log('Avatar uploaded to:', avatarUrl);
    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { avatar: avatarUrl },
      { new: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (err) {
    console.error('Error uploading avatar:', err);
    res.status(500).json({ message: 'Error uploading avatar' });
  }
});

module.exports = router;
