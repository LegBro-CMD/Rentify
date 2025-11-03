const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Listing = require('../models/Listing');
const User = require('../models/User');

// ✅ Example: routes/admin.js or similar
router.get('/stats', async (req, res) => {
  try {
    const now = new Date();
    const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    // --- Total Listings ---
    const totalListings = await Listing.countDocuments();
    const listingsThisMonth = await Listing.countDocuments({ createdAt: { $gte: startOfThisMonth } });
    const listingsLastMonth = await Listing.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // --- Total Bookings ---
    const totalBookings = await Booking.countDocuments();
    const bookingsThisMonth = await Booking.countDocuments({ createdAt: { $gte: startOfThisMonth } });
    const bookingsLastMonth = await Booking.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // --- Total Users ---
    const totalUsers = await User.countDocuments();
    const usersThisMonth = await User.countDocuments({ createdAt: { $gte: startOfThisMonth } });
    const usersLastMonth = await User.countDocuments({
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // --- Total Revenue (confirmed/completed + paid/refunded only) ---
   const totalRevenueData = await Booking.aggregate([
  {
    $match: {
      status: { $in: ['pending', 'confirmed', 'completed'] },
      paymentStatus: { $in: ['pending', 'paid', 'refunded'] },
      totalPrice: { $gt: 0 }
    }
  },
  {
    $group: {
      _id: null,
      total: { $sum: '$totalPrice' }
    }
  }
]);

    const totalRevenue = totalRevenueData[0]?.total || 0;

   const revenueThisMonthData = await Booking.aggregate([
  { 
    $match: { 
      createdAt: { $gte: startOfThisMonth },
      totalPrice: { $gt: 0 }
    }
  },
  { $group: { _id: null, total: { $sum: '$totalPrice' } } }
]);

const revenueLastMonthData = await Booking.aggregate([
  { 
    $match: { 
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      totalPrice: { $gt: 0 }
    }
  },
  { $group: { _id: null, total: { $sum: '$totalPrice' } } }
]);

const revenueThisMonth = revenueThisMonthData[0]?.total || 0;
const revenueLastMonth = revenueLastMonthData[0]?.total || 0;

const revenueGrowth =
  revenueLastMonth === 0 ? 100 : ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100;

    const growth = (thisMonth, lastMonth) => {
      if (lastMonth === 0) return thisMonth > 0 ? 100 : 0;
      return ((thisMonth - lastMonth) / lastMonth * 100).toFixed(1);
    };

    res.json({
      totalListings,
      totalBookings,
      totalUsers,
      totalRevenue,
      listingGrowth: growth(listingsThisMonth, listingsLastMonth),
      bookingGrowth: growth(bookingsThisMonth, bookingsLastMonth),
      userGrowth: growth(usersThisMonth, usersLastMonth),
      revenueGrowth: growth(revenueThisMonth, revenueLastMonth)
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching admin stats' });
  }
});


// Aggregate booking count per day
router.get('/booking-stats', async (req, res) => {
  try {
    const stats = await Booking.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(stats);
  } catch (err) {
    console.error('Error fetching booking stats:', err);
    res.status(500).json({ message: 'Error fetching booking stats' });
  }
});


// 🕒 Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    // Import Listing model
    const Listing = require('../models/Listing');

    // Fetch latest 5 bookings
    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('listing', 'title');

    // Fetch latest 5 listings
    const recentListings = await Listing.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('title createdAt');

    // Combine both
    const activities = [
      ...recentBookings.map((b) => ({
        type: 'booking',
        message: `New booking received for "${b.listing?.title || 'Unknown listing'}"`,
        time: b.createdAt,
      })),
      ...recentListings.map((l) => ({
        type: 'listing',
        message: `New listing created: "${l.title}"`,
        time: l.createdAt,
      })),
    ];

    // Sort by time (newest first)
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    // Limit to top 10 combined results
    res.json(activities.slice(0, 10));
  } catch (err) {
    console.error('Error fetching recent activity:', err);
    res.status(500).json({ message: 'Error fetching recent activity' });
  }
});

// --- GET Bookings Stats ---
router.get('/bookings', async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments();
    const recentBookings = await Booking.find().sort({ createdAt: -1 }).limit(5);
    res.json({ totalBookings, recentBookings });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- GET Revenue Stats ---
router.get('/revenue', async (req, res) => {
  try {
    const revenue = await Booking.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
    ]);
    res.json({ totalRevenue: revenue[0]?.totalRevenue || 0 });
  } catch (error) {
    console.error('Error fetching revenue:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- GET Users Stats ---
router.get('/users', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const latestUsers = await User.find().sort({ createdAt: -1 }).limit(5);
    res.json({ totalUsers, latestUsers });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- GET Users Analytics (by Role) ---
router.get('/users-analytics', async (req, res) => {
  try {
    const usersByRoleAndMonth = await User.aggregate([
      {
        $group: {
          _id: {
            month: { $month: '$createdAt' },
            role: '$role',
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.month': 1 } },
    ]);

    // Reformat data for frontend chart
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = {};

    usersByRoleAndMonth.forEach(entry => {
      const month = monthNames[entry._id.month - 1];
      const role = entry._id.role || 'Guest';
      if (!monthlyData[month]) monthlyData[month] = { month, Guest: 0, Host: 0, Admin: 0 };
      monthlyData[month][role.charAt(0).toUpperCase() + role.slice(1)] = entry.count;
    });

    res.json(Object.values(monthlyData));
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- GET Combined Admin Stats ---
router.get('/admin/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalBookings = await Booking.countDocuments();
    const totalListings = await Listing.countDocuments();

    // Calculate total revenue (sum of all booking totalPrice)
    const revenueResult = await Booking.aggregate([
      { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } }
    ]);
    const totalRevenue = revenueResult[0]?.totalRevenue || 0;

    res.json({
      totalUsers,
      totalBookings,
      totalListings,
      totalRevenue
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

// --- GET Bookings by Status (for Bar Chart) ---
router.get('/bookings-by-status', async (req, res) => {
  try {
    const results = await Booking.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    res.json(results);
  } catch (err) {
    console.error('Error fetching bookings by status:', err);
    res.status(500).json({ message: 'Failed to fetch booking stats' });
  }
});


// --- GET Revenue Analytics (for Line Chart) ---
router.get('/revenue-analytics', async (req, res) => {
  try {
    // Include bookings that are confirmed, completed, or refunded
    const results = await Booking.aggregate([
      { 
        $match: { 
          status: { $in: ['pending', 'confirmed', 'completed'] },
          paymentStatus: { $in: ['paid', 'refunded', 'pending'] }, // include pending if not paid yet
          totalPrice: { $gt: 0}
        } 
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          totalRevenue: { $sum: { $ifNull: ['$totalPrice', 0] } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // If there's no data, return empty structure instead of []
    res.json(results.length > 0 ? results : [
      { _id: '2025-09', totalRevenue: 0 },
      { _id: '2025-10', totalRevenue: 0 }
    ]);

  } catch (err) {
    console.error('Error fetching revenue analytics:', err);
    res.status(500).json({ message: 'Failed to fetch revenue analytics' });
  }
});




module.exports = router;
