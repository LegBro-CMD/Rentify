// routes/favoriteRoutes.js
const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Listing = require('../models/Listing');

const router = express.Router();

// ✅ Add to favorites
router.post('/:listingId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const listingId = req.params.listingId;

    if (user.favorites.includes(listingId)) {
      return res.status(400).json({ message: 'Already in favorites' });
    }

    user.favorites.push(listingId);
    await user.save();

    res.json({ message: 'Added to favorites', favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Remove from favorites
router.delete('/:listingId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    const listingId = req.params.listingId;

    user.favorites = user.favorites.filter(
      (id) => id.toString() !== listingId
    );
    await user.save();

    res.json({ message: 'Removed from favorites', favorites: user.favorites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ✅ Get all favorites
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('favorites');
    res.json({ data: user.favorites });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
