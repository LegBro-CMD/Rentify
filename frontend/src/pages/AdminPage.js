// src/pages/AdminPage.js
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Users,
  Home,
  Calendar,
  TrendingUp,
  Plus,
  Trash2,
  Eye,
  CheckCircle,
  Circle as XCircle,
  Undo2,
  Search,
  MoveVertical as MoreVertical,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CreateListingModal from '../components/admin/CreateListingModal';
import api from '../utils/api';
import { updateBookingStatus } from '../utils/api';
import axios from 'axios';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  Legend,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AdminPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // UI state
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Users table state (fetched on-demand for Users tab)
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState(false);
  

  // Recent activity (we'll also poll)
  const { data: recentActivityData } = useQuery(
    'recent-activity',
    async () => {
      const res = await axios.get(`${BASE}/api/dashboard/recent-activity`);
      return res.data;
    },
    {
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
      enabled: true,
    }
  );

  // Format numbers into Peso currency style (₱1,000, etc.)
const formatCurrency = (value) => {
  if (typeof value !== "number") return value;
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 0 })}`;
};


  // --- React Query: dashboard analytics (polled for near-real-time) ---
  const { data: adminStats, isLoading: adminStatsLoading } = useQuery(
    'admin-stats',
    async () => {
      const res = await axios.get(`${BASE}/api/dashboard/stats`);
      return res.data;
    },
    {
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    }
  );

  // booking rate (daily)
  const { data: bookingRateData, isLoading: bookingRateLoading } = useQuery(
    'booking-rate-daily',
    async () => {
      const res = await axios.get(`${BASE}/api/dashboard/booking-stats`);
      // expected: [{ _id: "2025-10-01", count: 3 }, ...]
      return res.data || [];
    },
    { refetchInterval: 10000, refetchOnWindowFocus: true }
  );

  // bookings by status (pie)
  const { data: bookingsByStatusData } = useQuery(
    'bookings-by-status',
    async () => {
      const res = await axios.get(`${BASE}/api/dashboard/bookings-by-status`);
      // expected: [{ _id: 'pending', count: 5 }, ...]
      return res.data || [];
    },
    { refetchInterval: 10000, refetchOnWindowFocus: true }
  );

  // revenue trends (last 30 days or monthly)
  const { data: revenueTrendsData } = useQuery(
    'revenue-trends',
    async () => {
      const res = await axios.get(`${BASE}/api/dashboard/revenue-analytics`);
      return res.data || [];
    },
    { refetchInterval: 15000, refetchOnWindowFocus: true }
  );

  // user trends
  const { data: userTrendsData } = useQuery(
    'user-trends',
    async () => {
      const res = await axios.get(`${BASE}/api/dashboard/users-analytics`);
      return res.data || [];
    },
    { refetchInterval: 15000, refetchOnWindowFocus: true }
  );

  // bookings list & admin bookings (for tables)
  const { data: bookingsListData, isLoading: bookingsLoading } = useQuery(
    'admin-bookings',
    async () => {
      const res = await api.get('/api/bookings'); // using api util to attach token if needed
      return res.data;
    },
    { refetchInterval: 8000 }
  );

  // listings list
  const { data: listingsData, isLoading: listingsLoading } = useQuery(
    ['admin-listings', searchTerm, statusFilter],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      const res = await api.get(`/api/listings?${params}`);
      return res.data;
    },
    { keepPreviousData: true }
  );

  // delete listing mutation
  const deleteMutation = useMutation(
    async (listingId) => {
      await api.delete(`/api/listings/${listingId}`);
    },
    {
      onSuccess: () => {
        toast.success('Listing deleted successfully');
        queryClient.invalidateQueries(['admin-listings']);
        queryClient.invalidateQueries('admin-stats');
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to delete listing');
      },
    }
  );

  // update booking status mutation
  const updateBookingMutation = useMutation(
    async ({ bookingId, status }) => {
      const res = await api.put(`/api/bookings/${bookingId}`, { status });
      return res.data;
    },
    {
      onSuccess: () => {
        toast.success('Booking updated');
        queryClient.invalidateQueries('admin-bookings');
        queryClient.invalidateQueries('admin-stats');
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || 'Failed to update booking');
      },
    }
  );

  // ✅ Confirm payment mutation
const confirmPaymentMutation = useMutation(
  ({ bookingId }) => updateBookingStatus({ bookingId, status: 'confirmed' }),
  {
    onSuccess: () => queryClient.invalidateQueries(['bookings']),
  }
);

// ✅ Refund payment mutation
const refundPaymentMutation = useMutation(
  ({ bookingId }) => updateBookingStatus({ bookingId, status: 'refunded' }),
  {
    onSuccess: () => queryClient.invalidateQueries(['bookings']),
  }
);


  // --- Users tab fetching on-demand ---
  useEffect(() => {
    if (activeTab !== 'users') return;
    let cancelled = false;

    const fetchUsers = async () => {
      try {
        setUsersLoading(true);
        setUsersError(false);
        const token = localStorage.getItem('token');
        const res = await axios.get(`${BASE}/api/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!cancelled) setUsers(res.data || []);
      } catch (err) {
        console.error('Error fetching users', err);
        if (!cancelled) setUsersError(true);
      } finally {
        if (!cancelled) setUsersLoading(false);
      }
    };

    fetchUsers();
    return () => {
      cancelled = true;
    };
  }, [activeTab]);

  // utils
  const formatPrice = (price) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(price || 0);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
      </span>
    );
  };

  // derived chart-safe arrays
  const bookingRateForChart = Array.isArray(bookingRateData)
    ? bookingRateData.map((d) => ({ date: d._id, count: d.count }))
    : [];

  const bookingsByStatusForChart = Array.isArray(bookingsByStatusData)
    ? bookingsByStatusData.map((d) => ({ name: d._id, value: d.count }))
    : [];

  const revenueTrendsForChart = Array.isArray(revenueTrendsData)
    ? revenueTrendsData
    : [];

  const userTrendsForChart = Array.isArray(userTrendsData)
    ? userTrendsData
    : [];

  // delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${BASE}/api/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers((prev) => prev.filter((u) => u._id !== userId));
      toast.success('User deleted');
    } catch (err) {
      console.error('Error deleting user', err);
      toast.error('Failed to delete user');
    }
  };

const [setBookingsListData] = useState([]);

// fetch Bookings Function
const fetchBookings = async () => {
  try {
    const response = await fetch("/api/bookings", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await response.json();
    if (data.success) {
      setBookingsListData(data.data || []); // Update your bookings state
    } else {
      console.error("Failed to load bookings:", data.message);
    }
  } catch (error) {
    console.error("Error fetching bookings:", error);
  }
};

// Handle Admin Booking Deletion
const handleDeleteBooking = async (bookingId) => {
  // Confirm with admin before deleting
  if (!window.confirm("Are you sure you want to permanently delete this booking?")) return;

  try {
    const response = await fetch(`http://localhost:5000/api/bookings/${bookingId}/delete`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    const data = await response.json();

    if (response.ok && data.success) {
      alert(data.message || "Booking deleted successfully.");

      // ✅ Try to refetch bookings after deletion
      if (typeof fetchBookings === "function") {
        fetchBookings(); // if you're using React Query or SWR
      } else if (typeof fetchBookings === "function") {
        fetchBookings(); // fallback for manual fetching
      } else {
        console.warn("⚠️ No refetchBookings or fetchBookings function found.");
      }
    } else {
      alert(data.message || "Failed to delete booking.");
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    alert("Server error while deleting booking.");
  }
};

  // ✅ Promote user to ADMIN
const handlepromoteUser = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    await axios.put(`${BASE}/api/users/${userId}/promote`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, role: 'admin' } : u))
    );
    toast.success('User promoted to admin');
  } catch (err) {
    console.error('Error promoting user', err);
    toast.error('Failed to promote user to admin');
  }
};

  // ✅ Promote user to HOST
const handlePromoteToHost = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    await axios.put(`${BASE}/api/users/${userId}/promote-host`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, role: 'host' } : u))
    );
    toast.success('User promoted to host');
  } catch (err) {
    console.error('Error promoting to host', err);
    toast.error('Failed to promote user to host');
  }
};

// Unpromote Admin back to normal user
const handleUnpromoteAdmin = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    await axios.put(`${BASE}/api/users/${userId}/unpromote`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, role: 'user' } : u))
    );
    toast.success('Admin unpromoted to regular user');
  } catch (err) {
    console.error('Error unpromoting admin', err);
    toast.error('Failed to unpromote admin');
  }
};

// ✅ Unpromote Host back to normal user
const handleUnpromoteUser = async (userId) => {
  try {
    const token = localStorage.getItem('token');
    await axios.put(`${BASE}/api/users/${userId}/unpromote`, {}, {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers((prev) =>
      prev.map((u) => (u._id === userId ? { ...u, role: 'user' } : u))
    );
    toast.success('User unpromoted to regular user');
  } catch (err) {
    console.error('Error unpromoting user', err);
    toast.error('Failed to unpromote user');
  }
};

  // recent activity local variable
  const recentActivity = recentActivityData || [];

  // protect route
  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center space-x-2">
              <Plus className="w-4 h-4" />
              <span>Add Listing</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
                { id: 'listings', name: 'Listings', icon: Home },
                { id: 'bookings', name: 'Bookings', icon: Calendar },
                { id: 'users', name: 'Users', icon: Users },
              ].map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {adminStatsLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl shadow-md p-6">
                    <LoadingSpinner />
                  </div>
                ))
              ) : (
                <>
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Listings</p>
                        <p className="text-3xl font-bold text-gray-900">{adminStats?.totalListings || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <Home className="w-6 h-6 text-emerald-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+{adminStats?.listingGrowth ?? 0}% from last month</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Bookings</p>
                        <p className="text-3xl font-bold text-gray-900">{adminStats?.totalBookings || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Calendar className="w-6 h-6 text-blue-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+{adminStats?.bookingGrowth ?? 0}% from last month</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Users</p>
                        <p className="text-3xl font-bold text-gray-900">{adminStats?.totalUsers || 0}</p>
                      </div>
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <Users className="w-6 h-6 text-purple-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+{adminStats?.userGrowth ?? 0}% from last month</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                        <p className="text-3xl font-bold text-gray-900">{formatPrice(adminStats?.totalRevenue || 0)}</p>
                      </div>
                      <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-yellow-600" />
                      </div>
                    </div>
                    <div className="mt-4 flex items-center">
                      <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                      <span className="text-sm text-green-600">+{adminStats?.revenueGrowth ?? 0}% from last month</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Booking Rate Chart */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📈 Booking Rate (Daily)</h3>
              {!Array.isArray(bookingRateForChart) || bookingRateForChart.length === 0 ? (
                <p className="text-gray-500 text-sm">No booking data available yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={bookingRateForChart}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Line type="monotone" dataKey="count" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Bookings by Status */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Bookings by Status</h3>
              {bookingsByStatusForChart.length === 0 ? (
                <p className="text-gray-500 text-sm">No data yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie data={bookingsByStatusForChart} cx="50%" cy="50%" outerRadius={100} dataKey="value" label>
                      {bookingsByStatusForChart.map((entry, idx) => (
                        <Cell key={idx} fill={['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6'][idx % 5]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* 💰 Revenue Analytics */}
<div className="bg-white rounded-xl shadow-md p-6">
  <h3 className="text-lg font-semibold text-gray-900 mb-4">💰 Daily Revenue Analytics</h3>

  {!Array.isArray(revenueTrendsForChart) || revenueTrendsForChart.length === 0 ? (
    <p className="text-gray-500">No revenue data available yet.</p>
  ) : (
    (() => {
      // ✅ Sort and prepare daily data
      const sortedData = [...revenueTrendsForChart]
        .sort((a, b) => new Date(a._id) - new Date(b._id))
        .map(item => ({
          date: item._id, // e.g. "2025-10-25"
          revenue: item.totalRevenue
        }));

      // ✅ Calculate cumulative revenue
      let cumulative = 0;
      const dataWithCumulative = sortedData.map(item => {
        cumulative += item.revenue;
        return { ...item, cumulative };
      });

      // ✅ Compute totals and growth
      const totalRevenue = dataWithCumulative[dataWithCumulative.length - 1]?.cumulative || 0;
      const todayRevenue = dataWithCumulative[dataWithCumulative.length - 1]?.revenue || 0;
      const yesterdayRevenue = dataWithCumulative[dataWithCumulative.length - 2]?.revenue || 0;

      let growthPercent = 0;
      if (yesterdayRevenue > 0) {
        growthPercent = ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100;
      }

      const growthColor =
        growthPercent > 0
          ? 'text-green-600'
          : growthPercent < 0
          ? 'text-red-600'
          : 'text-gray-500';

      return (
        <>
          <ResponsiveContainer width="100%" height={350}>
  <LineChart
    data={dataWithCumulative}
    margin={{ top: 70, right: 30, left: 10, bottom: 30 }}
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis
      dataKey="date"
      tickFormatter={(d) => {
        const date = new Date(d);
        return date.toLocaleDateString('default', { day: '2-digit', month: 'short' });
      }}
      label={{ value: 'Date', position: 'bottom', offset: 0 }}
    />
    <YAxis
      tickFormatter={(value) => `₱${value.toLocaleString()}`}
      label={{ value: 'Revenue (₱)', angle: -90, position: 'insideLeft' }}
      domain={[0, (dataMax) => dataMax * 1.2]}
      tickCount={8}
      allowDecimals={false}
    />
    <Tooltip
      formatter={(value, name) => {
        if (name === 'revenue') {
          return [`₱${value.toLocaleString()}`, 'Daily Revenue'];
        } else if (name === 'cumulative') {
          return [`₱${value.toLocaleString()}`, 'Cumulative Revenue'];
        }
        return value;
      }}
      labelFormatter={(label) => {
        const date = new Date(label);
        return date.toLocaleDateString('default', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
      }}
    />

    <Legend
      verticalAlign="top"
      align="center"
      wrapperStyle={{
        top: -20,
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '4px 10px',
        boxShadow: '0 0 6px rgba(0,0,0,0.1)',
      }}
    />

    {/* 💙 Daily Revenue (Blue) */}
    <Line
      type="monotone"
      dataKey="revenue"
      stroke="#4F46E5"
      strokeWidth={3}
      dot={{ r: 4 }}
      name="Daily Revenue"
    />

    {/* 💚 Cumulative Revenue (Green) */}
    <Line
      type="monotone"
      dataKey="cumulative"
      stroke="#22C55E"
      strokeWidth={3}
      dot={{ r: 4 }}
      name="Cumulative Revenue"
    />
  </LineChart>
</ResponsiveContainer>



          {/* ✅ Total Revenue Summary */}
          <div className="mt-6 text-right">
            <p className="text-sm text-gray-500">Total Revenue (All Time):</p>
            <p className="text-2xl font-bold text-emerald-600">
              ₱{totalRevenue.toLocaleString()}
            </p>
            <p className={`text-sm font-medium ${growthColor}`}>
              {growthPercent > 0
                ? `▲ +${growthPercent.toFixed(2)}% from yesterday`
                : growthPercent < 0
                ? `▼ ${growthPercent.toFixed(2)}% from yesterday`
                : 'No change from yesterday'}
            </p>
          </div>
        </>
      );
    })()
  )}
</div>





            {/* User Analytics */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">👥 User Growth Analytics</h3>
              {!Array.isArray(userTrendsForChart) || userTrendsForChart.length === 0 ? (
                <p className="text-gray-500 text-sm">No user data yet.</p>
              ) : (
                <>
                {console.log(" userTrendsForChart:", userTrendsForChart)}
                <ResponsiveContainer width="100%" height={300}>
  <BarChart data={userTrendsForChart} barGap={4}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Bar dataKey="Host" fill="#34D399" name="Hosts" barSize={25} />
    <Bar dataKey="Admin" fill="#FBBF24" name="Admins" barSize={25} />
    <Bar dataKey="User" fill="#A788FA" name="Guests" barSize={25} />
  </BarChart>
</ResponsiveContainer>
</>

              )}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
              <div className="space-y-4">
                {recentActivity.length > 0 ? (
                  recentActivity.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${item.type === 'booking' ? 'bg-green-500' : item.type === 'listing' ? 'bg-blue-500' : 'bg-purple-500'}`} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.message}</p>
                        <p className="text-xs text-gray-500">{new Date(item.time).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-sm">No recent activity yet.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Listings Tab */}
        {activeTab === 'listings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input type="text" placeholder="Search listings..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="form-input pl-10" />
                  </div>
                </div>
                <div className="sm:w-48">
                  <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="form-input">
                    <option value="all">All Status</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              {listingsLoading ? (
                <div className="p-8 text-center">
                  <LoadingSpinner size="lg" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {listingsData?.data?.map((listing) => (
                        <tr key={listing._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <img src={listing.images?.[0]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'} alt={listing.title} className="w-12 h-12 rounded-lg object-cover mr-4" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{listing.title}</div>
                                <div className="text-sm text-gray-500">{listing.propertyType}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{listing.location}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatPrice(listing.price)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(listing.status)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(listing.createdAt)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end space-x-2">
                              <button onClick={() => navigate(`/listing/${listing._id}`)} className="text-emerald-600 hover:text-emerald-900"><Eye className="w-4 h-4" /></button>
                              <button onClick={() => deleteMutation.mutate(listing._id)} disabled={deleteMutation.isLoading} className="text-red-600 hover:text-red-900"><Trash2 className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      )) ?? <tr><td colSpan="6" className="p-4 text-center text-gray-500">No listings</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bookings Tab */}
{activeTab === 'bookings' && (
  <div className="bg-white rounded-xl shadow-md overflow-hidden">
    {bookingsLoading ? (
      <div className="p-8 text-center">
        <LoadingSpinner size="lg" />
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Guest</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Property</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {bookingsListData?.data?.length > 0 ? (
              bookingsListData.data.map((booking) => (
                <tr key={booking._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{booking.guestName}</div>
                      <div className="text-sm text-gray-500">{booking.guestEmail}</div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{booking.listing?.title}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {booking.guests} guest{booking.guests !== 1 ? 's' : ''}
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {formatPrice(booking.totalPrice)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(booking.status)}
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      {/* Pending bookings → Confirm or Cancel */}
                      {booking.status === 'pending' && (
                        <>
                          <button
                            onClick={() =>
                              updateBookingMutation.mutate({
                                bookingId: booking._id,
                                status: 'confirmed',
                              })
                            }
                            className="text-green-600 hover:text-green-900"
                            title="Confirm"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() =>
                              updateBookingMutation.mutate({
                                bookingId: booking._id,
                                status: 'cancelled',
                              })
                            }
                            className="text-red-600 hover:text-red-900"
                            title="Cancel"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}

                      {/* Confirmed bookings → Refund */}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() =>
                            updateBookingMutation.mutate({
                              bookingId: booking._id,
                              status: 'refunded',
                            })
                          }
                          className="text-blue-600 hover:text-blue-900"
                          title="Refund"
                        >
                          <Undo2 className="w-4 h-4" />
                        </button>
                      )}

                       {/* ✅ Delete button (Admin only) */}
                      {user?.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteBooking(booking._id)}
                         className={`${
                         booking.status === 'cancelled'
                         ? 'text-red-700 hover:text-red-900'
                         : 'text-yellow-600 hover:text-yellow-900'
                          }`}
                      
                           title={booking.status === 'cancelled' ? 'Permanently delete booking' : 'Cancel booking'}
                          > 
                         {booking.status === 'cancelled' ? '🗑️' : '❌'}
                      </button>
                      )}

                      {/* More options */}
                      <button className="text-gray-600 hover:text-gray-900">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="p-4 text-center text-gray-500">
                  No bookings
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    )}
  </div>
)}


        {/* Users Tab */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">User Management</h3>
            {usersLoading ? (
              <p className="text-gray-500">Loading users...</p>
            ) : usersError ? (
              <p className="text-red-500">Failed to load users.</p>
            ) : users.length === 0 ? (
              <p className="text-gray-500">No users found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((u) => (
                      <tr key={u._id}>
                        <td className="px-6 py-4 whitespace-nowrap">{u.firstName} {u.lastName}</td>
                        <td className="px-6 py-4 whitespace-nowrap">{u.email}</td>
                        <td className="px-6 py-4 whitespace-nowrap capitalize">{u.role || 'user'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right space-x-2">
                          {u.role !== 'admin' && <button onClick={() => handlepromoteUser(u._id)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Promote to Admin</button>}
                          {u.role !== 'host' && u.role !== 'admin' && <button onClick={() => handlePromoteToHost(u._id)} className="text-green-600 hover:text-green-800 text-sm font-medium">Promote to Host</button>}
                          {u.role === 'host' && <button onClick={() => handleUnpromoteUser(u._id)} className="text-yellow-600 hover:text-yellow-800 text-sm font-medium">Unpromote</button>}
                          {u.role === 'admin' && <button onClick={() => handleUnpromoteAdmin(u._id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Unpromote admin</button>}
                          <button onClick={() => handleDeleteUser(u._1d || u._id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      {showCreateModal && <CreateListingModal onClose={() => setShowCreateModal(false)} onSuccess={() => { setShowCreateModal(false); queryClient.invalidateQueries(['admin-listings']); queryClient.invalidateQueries('admin-stats'); }} />}
    </div>
  );
};

export default AdminPage;
