const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, validationResult } = require('express-validator');
const Listing = require('../models/Listing');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/listings'),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});
const upload = multer({ storage });


// @route   GET /api/listings
// @desc    Get all listings
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { 
      search, 
      city, 
      minPrice, 
      maxPrice, 
      propertyType, 
      amenities, 
      phone,
      sort = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 12
    } = req.query;

    // Build query
    let query = { status: 'active' };

    // If host parameter is provided, filter by host
    if (req.query.host) {
      query.host = req.query.host;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } }
      ];
    }

    if (city) {
      query.city = { $regex: city, $options: 'i' };
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (propertyType) {
      query.propertyType = propertyType;
    }

    if (amenities) {
      const amenityList = Array.isArray(amenities) ? amenities : [amenities];
      query.amenities = { $in: amenityList };
    }

    // Sort options
    const sortOptions = {};
    if (sort === 'price') {
      sortOptions.price = order === 'desc' ? -1 : 1;
    } else if (sort === 'rating') {
      sortOptions.rating = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    // Execute query with pagination
    const skip = (Number(page) - 1) * Number(limit);
    
    const listings = await Listing.find(query)
      .populate('host', 'firstName lastName')
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit));

    const total = await Listing.countDocuments(query);

    res.json({
      success: true,
      data: listings,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });

  } catch (error) {
    console.error('Get listings error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching listings'
    });
  }
});

// ✅ Put this BEFORE any '/:id' route
router.get('/favorites', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).populate('favorites');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ data: user.favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/listings/:id
// @desc    Get single listing
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id)
      .populate('host', 'firstName lastName email phone');

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    res.json({
      success: true,
      data: listing
    });

  } catch (error) {
    console.error('Get listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching listing'
    });
  }
});

// @route   POST /api/listings
// @desc    Create new listing
// @access  Private
router.post('/', auth, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').trim().notEmpty().withMessage('Description is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('country').trim().notEmpty().withMessage('Country is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('bedrooms').isInt({ min: 1 }).withMessage('Bedrooms must be at least 1'),
  body('bathrooms').isFloat({ min: 0.5 }).withMessage('Bathrooms must be at least 0.5'),
  body('maxGuests').isInt({ min: 1 }).withMessage('Max guests must be at least 1'),
  body('propertyType').isIn(['apartment', 'house', 'studio', 'condo', 'loft']).withMessage('Invalid property type')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      address,
      city,
      country,
      price,
      bedrooms,
      bathrooms,
      maxGuests,
      propertyType,
      amenities = [],
      images = [],
      hostName,
      phone
    } = req.body;

    const location = `${city}, ${country}`;

    const listing = new Listing({
      title,
      description,
      location,
      city,
      country,
      price: Number(price),
      bedrooms: Number(bedrooms),
      bathrooms: Number(bathrooms),
      maxGuests: Number(maxGuests),
      propertyType,
      amenities,
      images,
      host: req.user.userId,
      hostName: hostName || 'Host',
      phone: phone,
    });
    

    await listing.save();

    // Populate host info
    await listing.populate('host', 'firstName lastName');

    res.status(201).json({
      success: true,
      message: 'Listing created successfully',
      data: listing
    });

  } catch (error) {
    console.error('Create listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating listing'
    });
  }
});

// @route   PUT /api/listings/:id
// @desc    Update listing
// @access  Private
router.put('/:id', auth, upload.array('images', 10), async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);
    if (!listing) return res.status(404).json({ success: false, message: 'Listing not found' });
    
    const user = await User.findById(req.user.userId);
    if (listing.host.toString() !== req.user.userId && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to update this listing' });
    }

    // Handle new uploaded images
    let newImages = listing.images;
    if (req.files && req.files.length > 0) {
      const uploaded = req.files.map((file) => ({
        url: `${req.protocol}://${req.get('host')}/uploads/listings/${file.filename}`,
      }));
      newImages = [...newImages, ...uploaded];
    }

    // Merge new data
    const updatedData = {
      ...req.body,
      images: newImages,
    };

    if (req.body.phone !== undefined) {
      updatedData.phone = req.body.phone;
    }

    const updatedListing = await Listing.findByIdAndUpdate(req.params.id, updatedData, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, message: 'Listing updated successfully', data: updatedListing });
  } catch (error) {
    console.error('Update listing error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating listing' });
  }
});


// @route   DELETE /api/listings/:id
// @desc    Delete listing
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }

    // Check if user owns the listing
    if (listing.host.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this listing'
      });
    }

    await Listing.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });

  } catch (error) {
    console.error('Delete listing error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting listing'
    });
  }
});

router.post(
  "/:id/reviews",
  auth,
  [
    body("rating")
      .isInt({ min: 1, max: 5 })
      .withMessage("Rating must be between 1 and 5"),
    body("comment").notEmpty().withMessage("Comment is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty())
        return res.status(400).json({ errors: errors.array() });

      const { rating, comment } = req.body;
      const listing = await Listing.findById(req.params.id);
      if (!listing)
        return res.status(404).json({ message: "Listing not found" });

      // ✅ match middleware structure
      const newReview = {
        user: req.user.userId,
        userName: req.user.email.split("@")[0], // fallback name
        rating,
        comment,
        createdAt: new Date(),
      };

      listing.reviews.push(newReview);

      listing.reviewCount = listing.reviews.length;
      listing.rating =
        listing.reviews.reduce((sum, r) => sum + r.rating, 0) /
        listing.reviewCount;

      await listing.save();
      res
        .status(201)
        .json({ message: "Review added successfully", reviews: listing.reviews });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);


router.get('/:id/reviews', async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id).select('reviews');
    if (!listing) return res.status(404).json({ message: 'Listing not found' });
    res.json(listing.reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/listings/:id/favorite
// @desc    Toggle favorite listing for the logged-in user
// @access  Private
router.post('/:id/favorite', auth, async (req, res) => {
  try {
    const listingId = req.params.id;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const index = user.favorites.indexOf(listingId);

    if (index === -1) {
      // Add to favorites
      user.favorites.push(listingId);
    } else {
      // Remove from favorites
      user.favorites.splice(index, 1);
    }

    await user.save();
    res.status(200).json({
      message: index === -1 ? 'Added to favorites' : 'Removed from favorites',
      favorites: user.favorites
    });
  } catch (error) {
    console.error('Error updating favorites:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;