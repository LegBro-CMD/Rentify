const express = require('express');
const auth = require('../middleware/auth');
const Notification = require('../models/Notification');
const User = require('../models/User');
const Listing = require('../models/Listing');

const router = express.Router();

/* =====================================================
   🔔 Notify all admins
===================================================== */
const notifyAdmins = async (message, senderId = null, type = 'system') => {
  try {
    const admins = await User.find({ role: 'admin' });
    if (!admins.length) return;

    const notifications = admins.map((admin) => ({
      recipient: admin._id,
      sender: senderId,
      message,
      type,
    }));

    const inserted = await Notification.insertMany(notifications);

    console.log(`📢 Notification sent to ${admins.length} admins.`);

  } catch (err) {
    console.error('Admin notification error:', err);
  }
};

/* =====================================================
   🔔 Booking notifications (improved host safety)
===================================================== */
const sendBookingNotification = async (booking, senderId, action) => {
  try {
    // Ensure we have the listing info populated
    let listing = booking.listing;
    if (!listing.title || !listing.host) {
      listing = await Listing.findById(booking.listing)
        .select('title host')
        .populate('host', '_id firstName lastName email')
        .lean();
    }

    const guest = booking.guest;

    const messages = {
      booked: {
        recipient: listing.host?._id || listing.host,
        message: `booked your listing "${listing.title}".`,
        type: 'booking',
      },
      confirmed: {
        recipient: guest?._id || guest,
        message: `Your booking for "${listing.title}" has been confirmed.`,
        type: 'confirmation',
      },
      cancelled: [
        {
        recipient: guest?._id || guest,
        message: `Your booking for "${listing.title}" has been cancelled.`,
        type: 'cancellation',
      },
      {
      recipient: listing.host?._id || listing.host,
      message: `The booking for your listing "${listing.title}" has been cancelled successfully.`,
      type: 'cancellation',
      },
    ],
    };

    const data = messages[action];
if (!data) return;

// If multiple recipients (e.g., cancellation), send to all
const notificationsArray = Array.isArray(data) ? data : [data];

for (const notif of notificationsArray) {
  if (!notif.recipient) continue;
  await Notification.create({
    recipient: notif.recipient,
    sender: senderId,
    message: notif.message,
    type: notif.type,
  });
  
    console.log(`✅ Sent ${action} notification to ${data.recipient}: ${data.message}`);

    console.log(`📢 Notification created for ${data.recipient}`);
}

  } catch (err) {
    console.error('Notification helper error:', err);
  }
};


/* =====================================================
   📬 GET /api/notifications — get user notifications
===================================================== */
router.get('/', auth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .populate('sender', 'firstName lastName email')
      .lean();

    res.json({ success: true, data: notifications });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
});

/* =====================================================
   ✅ PUT /api/notifications/:id/read — mark as read
===================================================== */
router.put('/:id/read', auth, async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification)
      return res.status(404).json({ success: false, message: 'Notification not found' });

    if (notification.recipient.toString() !== req.user.userId)
      return res.status(403).json({ success: false, message: 'Not authorized' });

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, data: notification });
  } catch (err) {
    console.error('Mark notification as read error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = { router, notifyAdmins, sendBookingNotification };
