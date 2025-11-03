const express = require('express');
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Notification = require('../models/Notification');
const {notifyAdmins, sendBookingNotification} = require('./notifications');

const router = express.Router();


// =====================================================
// @route   GET /api/bookings
// @desc    Get all bookings (admin) or user's bookings
// =====================================================
router.get('/', auth, async (req, res) => {
  try {
    let query = {};

    if (req.user.role !== 'admin') {
      query.guest = req.user.userId;
    }

    const bookings = await Booking.find(query)
      .populate('listing', 'title location images price')
      .populate('guest', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching bookings' });
  }
});

// =====================================================
// @route   GET /api/bookings/:id
// @desc    Get single booking
// =====================================================
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('listing', 'title location images price host')
      .populate('guest', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Check if user owns the booking or is the host
    if (
      booking.guest && booking.guest._id.toString() !== req.user.userId &&
      booking.listing.host.toString() !== req.user.userId
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this booking' });
    }

    res.json({ success: true, data: booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching booking' });
  }
});

// =====================================================
// @route   POST /api/bookings/check-availability
// @desc    Check if listing is available for certain dates
// =====================================================
router.post(
  '/check-availability',
  auth,
  [
    body('listingId').isMongoId().withMessage('Valid listing ID is required'),
    body('checkIn').isISO8601().withMessage('Valid check-in date is required'),
    body('checkOut').isISO8601().withMessage('Valid check-out date is required'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { listingId, checkIn, checkOut } = req.body;
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);

      if (checkOutDate <= checkInDate) {
        return res.status(400).json({
          success: false,
          message: 'Check-out date must be after check-in date',
        });
      }

      const listing = await Listing.findById(listingId);
      if (!listing || listing.status !== 'active') {
        return res.status(404).json({ success: false, message: 'Listing not found or inactive' });
      }

      const conflictingBooking = await Booking.findOne({
        listing: listingId,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          { checkIn: { $lte: checkInDate }, checkOut: { $gt: checkInDate } },
          { checkIn: { $lt: checkOutDate }, checkOut: { $gte: checkOutDate } },
          { checkIn: { $gte: checkInDate }, checkOut: { $lte: checkOutDate } },
        ],
      });

      if (conflictingBooking) {
        return res.json({ success: false, available: false, message: 'Dates not available' });
      }

      res.json({ success: true, available: true, message: 'Listing is available' });
    } catch (error) {
      console.error('Check availability error:', error);
      res.status(500).json({ success: false, message: 'Server error while checking availability' });
    }
  }
);

// =====================================================
// @route   POST /api/bookings
// @desc    Create new booking
// =====================================================
router.post(
  '/',
  auth,
  [
    body('listingId').isMongoId().withMessage('Valid listing ID is required'),
    body('checkIn').isISO8601().withMessage('Valid check-in date is required'),
    body('checkOut').isISO8601().withMessage('Valid check-out date is required'),
    body('guests').isInt({ min: 1 }).withMessage('Number of guests must be at least 1'),
    body('totalPrice').isNumeric().withMessage('Total price must be a number'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const {
        listingId,
        guestName,
        guestEmail,
        guestPhone,
        checkIn,
        checkOut,
        guests,
        totalPrice,
        specialRequests,
      } = req.body;

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(401).json({ success: false, message: 'User not found' });
      }

      const listing = await Listing.findById(listingId).populate('host', '_id firstName lastName email role');
      if (!listing || listing.status !== 'active') {
        return res.status(404).json({ success: false, message: 'Listing not found or inactive' });
      }

      // ✅ Validate check-in/check-out dates
      const checkInDate = new Date(checkIn);
      const checkOutDate = new Date(checkOut);
      if (checkOutDate <= checkInDate) {
        return res.status(400).json({ success: false, message: 'Check-out date must be after check-in date' });
      }

      // ✅ Check for booking conflicts
      const conflictingBooking = await Booking.findOne({
        listing: listingId,
        status: { $in: ['pending', 'confirmed'] },
        $or: [
          { checkIn: { $lte: checkInDate }, checkOut: { $gt: checkInDate } },
          { checkIn: { $lt: checkOutDate }, checkOut: { $gte: checkOutDate } },
          { checkIn: { $gte: checkInDate }, checkOut: { $lte: checkOutDate } },
        ],
      });

      if (conflictingBooking) {
        return res.status(400).json({
          success: false,
          message: 'Property is not available for the selected dates',
        });
      }

      // ✅ Create booking
      const booking = new Booking({
        listing: listingId,
        host: listing.host?._id || listing.host,
        guest: user._id,
        guestName: guestName || user.name,
        guestEmail: guestEmail || user.email,
        guestPhone: guestPhone || user.phone,
        checkIn: checkInDate,
        checkOut: checkOutDate,
        guests: Number(guests),
        totalPrice: Number(totalPrice),
        specialRequests,
      });

      await booking.save();

      // ✅ Populate listing & guest data for notifications
      await booking.populate({
        path: 'listing',
        select: 'title location images price host',
        populate: { path: 'host', select: '_id firstName lastName email role' }
      });

      await booking.populate('guest', 'firstName lastName email');

      // ✅ Debug check: is there a host?
      console.log('🔍 Host for notification:', booking.listing?.host?._id || booking.listing?.host);

      // ✅ Send notification to host
      await sendBookingNotification(booking, req.user.userId, 'booked');

      // ✅ Notify all admins
      await notifyAdmins(`${user.firstName || 'A user'} booked "${booking.listing.title}".`, req.user.userId, 'booking');

      res.status(201).json({
        success: true,
        message: 'Booking created successfully',
        data: booking,
      });
    } catch (error) {
      console.error('Create booking error:', error);
      res.status(500).json({ success: false, message: 'Server error while creating booking' });
    }
  }
);


// =====================================================
// @route   GET /api/bookings/host/bookings
// @desc    Get all bookings for a host's listings or all (admin)
// =====================================================
router.get('/host/bookings', auth, async (req, res) => {
  try {
    if (req.user.role !== 'host' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Host or admin role required.',
      });
    }

    // 🏘️ Get all listings for this host (or all if admin)
    const listingFilter = req.user.role === 'host' ? { host: req.user.userId } : {};
    const hostListings = await Listing.find(listingFilter).select('_id title location images host');
    const listingIds = hostListings.map((listing) => listing._id);

    if (listingIds.length === 0) {
      return res.json({ success: true, data: [], message: 'No listings found.' });
    }

    // 📦 Get all bookings tied to those listings
    const bookings = await Booking.find({ listing: { $in: listingIds } })
      .populate('listing', 'title location images')
      .populate('guest', 'firstName lastName email phone')
      .sort({ createdAt: -1 });

    // 🧩 Safely format the data
    const formatted = bookings.map((b) => ({
      _id: b._id,
      guestName: b.guest
        ? `${b.guest.firstName || ''} ${b.guest.lastName || ''}`.trim()
        : 'Unknown Tenant',
      guestEmail: b.guest?.email || 'N/A',
      guestPhone: b.guest?.phone || 'N/A',
      guests: b.guests || 1,
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      totalPrice: b.totalPrice || 0,
      status: b.status || 'pending',
      listing: b.listing || null,
      listingTitle: b.listing?.title || 'N/A',
      location: b.listing?.location || 'N/A',
    }));

    return res.json({ success: true, data: formatted });
  } catch (error) {
    console.error('Get host/admin bookings error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching bookings' });
  }
});

// =====================================================
// @route   PUT /api/bookings/:id
// @desc    Update booking status
// =====================================================
router.put('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('listing', 'title host')
      .populate('guest', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isAdmin = req.user.role === 'admin';
    const isHost = booking.listing.host.toString() === req.user.userId;
    if (!isAdmin && !isHost) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const prevStatus = booking.status;
    booking.status = req.body.status || booking.status;
    await booking.save();

    if (booking.status !== prevStatus) {
      if (booking.status === 'confirmed') {
        await sendBookingNotification(booking, req.user.userId, 'confirmed');
      } else if (booking.status === 'cancelled') {
        await sendBookingNotification(booking, req.user.userId, 'cancelled');
      }
    }

    res.json({ success: true, message: `Booking ${booking.status}`, data: booking });
  } catch (error) {
    console.error('Update booking error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating booking' });
  }
});

// =====================================================
// @route   DELETE /api/bookings/:id
// @desc    Cancel/delete booking
// =====================================================
router.delete('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('listing', 'title host')
      .populate('guest', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isHost = booking.listing.host.toString() === req.user.userId;
    const isGuest = booking.guest && booking.guest._id.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isHost && !isGuest && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (booking.status !== 'cancelled') {
      booking.status = 'cancelled';
      await booking.save();
    }

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ success: false, message: 'Server error while cancelling booking' });
  }
});


// =====================================================
// @route   DELETE /api/bookings/:id/delete
// @desc    Permanently delete a booking (Admin only)
// =====================================================
router.delete('/:id/delete', auth, async (req, res) => {
  try {
    // 🔹 Check if the user is an admin
    const user = await User.findById(req.user.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied: Admins only',
      });
    }

    // 🔹 Find the booking
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
      });
    }

    // 🔹 If booking is cancelled → permanently delete
    if (booking.status === 'cancelled') {
      await Booking.findByIdAndDelete(req.params.id);
      return res.json({
        success: true,
        message: 'Cancelled booking permanently deleted from system',
      });
    }

    // 🔹 If booking is not cancelled → cancel first
    booking.status = 'cancelled';
    await booking.save();

    return res.json({
      success: true,
      message: 'Booking cancelled first — delete again to remove permanently',
    });
  } catch (error) {
    console.error('Admin delete booking error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting booking',
    });
  }
});


// =====================================================
// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel a booking (Guest, Host, or Admin) + Notify relevant users
// =====================================================
router.put('/:id/cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('listing', 'title host')
      .populate('guest', 'firstName lastName email');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const listing = booking.listing;
    const guest = booking.guest;

    const isAdmin = req.user.role === 'admin';
    const isHost = listing?.host?.toString() === req.user.userId;
    const isGuest = guest?._id?.toString() === req.user.userId;

    if (!isAdmin && !isHost && !isGuest) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this booking' });
    }

    // ✅ Mark booking as cancelled
    booking.status = 'cancelled';
    await booking.save();

    // ============================================
    // 🔔 Notifications based on who cancelled
    // ============================================

    if (isAdmin) {
      // Admin canceled → notify both guest and host
      const notifications = [];

      if (guest?._id) {
        notifications.push({
          recipient: guest._id,
          sender: req.user.userId,
          message: `Your booking for "${listing.title}" has been cancelled by an admin.`,
          type: 'cancellation',
        });
      }

      if (listing?.host) {
        notifications.push({
          recipient: listing.host,
          sender: req.user.userId,
          message: `An admin cancelled a booking for your listing "${listing.title}".`,
          type: 'cancellation',
        });
      }

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
        console.log(`✅ Admin cancellation: Notified ${notifications.length} recipients.`);
      }
    } 
    else if (isHost) {
      // Host canceled → notify guest + admins
      if (guest?._id) {
        await Notification.create({
          recipient: guest._id,
          sender: req.user.userId,
          message: `Your booking for "${listing.title}" has been cancelled by the host.`,
          type: 'cancellation',
        });
      }

      await notifyAdmins(
        `Host cancelled a booking for "${listing.title}".`,
        req.user.userId,
        'cancellation'
      );
    } 
    else if (isGuest) {
      // Guest canceled → notify host + admins
      if (listing?.host) {
        await Notification.create({
          recipient: listing.host,
          sender: req.user.userId,
          message: `Booking for "${listing.title}" was cancelled by the guest.`,
          type: 'cancellation',
        });
      }

      await notifyAdmins(
        `A guest cancelled their booking for "${listing.title}".`,
        req.user.userId,
        'cancellation'
      );
    }

    res.json({
      success: true,
      message: 'Booking cancelled and relevant parties notified.',
      data: booking,
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ success: false, message: 'Server error while cancelling booking' });
  }
});


// =====================================================
// @route   POST /api/bookings/:id/request-cancel
// @desc    Host requests admin to cancel a booking
// =====================================================
router.post('/:id/request-cancel', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('listing', 'title host')
      .populate('guest', 'firstName lastName');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isHost = booking.listing?.host?.toString() === req.user.userId;
    if (!isHost) {
      return res.status(403).json({ success: false, message: 'Only hosts can request cancellation' });
    }

    
    // Notify all admins manually
const admins = await User.find({ role: 'admin' }).select('_id');
for (const admin of admins) {
  await Notification.create({
    recipient: admin._id,
    sender: req.user.userId,
    message: `Host requested cancellation for booking "${booking.listing.title}" by ${booking.guest?.firstName || 'a guest'}.`,
    type: 'cancel-request',
  });
}


    res.json({
      success: true,
      message: 'Cancellation request sent to admins.',
    });
  } catch (error) {
    console.error('Cancel request error:', error);
    res.status(500).json({ success: false, message: 'Server error while sending cancellation request' });
  }
});




module.exports = router;
