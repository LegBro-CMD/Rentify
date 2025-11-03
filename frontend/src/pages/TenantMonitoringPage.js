import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Calendar, Users, Mail, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api from '../utils/api';
import toast from 'react-hot-toast';

const TenantMonitoringPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showPastBookings, setShowPastBookings] = useState(false);

  // ✅ Fetch all bookings related to the host's listings
  const { data: bookingsData, isLoading } = useQuery(
    'tenant-monitoring',
    async () => {
      const response = await api.get(`/api/bookings/host/bookings`);
      return response.data.data;
    },
    { enabled: !!user }
  );

  // ✅ Mutation to send cancel request to admins
  const cancelRequestMutation = useMutation(
    async (bookingId) => {
      const response = await api.post(`/api/bookings/${bookingId}/request-cancel`);
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success(data.message || 'Cancel request sent to admins.');
        queryClient.invalidateQueries('tenant-monitoring');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to send cancel request.');
      },
    }
  );

  const handleRequestCancel = (bookingId) => {
    if (window.confirm('Are you sure you want to request booking cancellation from admins?')) {
      cancelRequestMutation.mutate(bookingId);
    }
  };

  // ✅ Formatting helpers
  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
    }).format(price);

  const getStatusBadge = (status) => {
    const styles = {
      confirmed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-blue-100 text-blue-800',
      refunded: 'bg-gray-100 text-gray-800',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          styles[status] || styles.pending
        }`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ✅ Access control
  if (!user || user.role !== 'host') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">
            Only hosts can access the Tenant Monitoring page.
          </p>
        </div>
      </div>
    );
  }

  // ✅ Filter logic
  const filteredBookings = (bookingsData || []).filter((booking) => {
    const now = new Date();
    const checkOut = new Date(booking.checkOut);

    if (showPastBookings) {
      // show past or cancelled/completed
      return (
        booking.status === 'cancelled' ||
        booking.status === 'completed' ||
        checkOut < now
      );
    } else {
      // show current or upcoming
      return (
        booking.status !== 'cancelled' &&
        booking.status !== 'completed' &&
        checkOut >= now
      );
    }
  });

  // ✅ Main UI
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-gray-900">Tenant Monitoring</h1>
            <button
              onClick={() => setShowPastBookings(!showPastBookings)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition"
            >
              {showPastBookings ? 'Hide Past Bookings' : 'Show Past Bookings'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Tenant Records</h3>
            <p className="text-gray-600">
              Tenant monitoring data will appear once guests book your listings.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBookings.map((booking) => {
              const now = new Date();
              const checkOut = new Date(booking.checkOut);
              const isPast =
                booking.status === 'cancelled' ||
                booking.status === 'completed' ||
                checkOut < now;

              return (
                <div
                  key={booking._id}
                  className={`bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 ${
                    isPast
                      ? 'opacity-60 grayscale hover:opacity-90 hover:grayscale-0'
                      : 'hover:shadow-lg'
                  }`}
                >
                  <div className="relative h-40">
                    <img
                      src={
                        booking.listing?.images?.[0]?.url ||
                        'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'
                      }
                      alt={booking.listing?.title || 'Listing Image'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      {getStatusBadge(booking.status)}
                    </div>

                    {/* 🏷️ Past Booking Ribbon */}
                    {isPast && (
                      <div className="absolute top-3 left-3 bg-gray-800 text-white text-xs font-semibold px-2 py-1 rounded-full shadow-md">
                        Past Booking
                      </div>
                    )}
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {booking.listing?.title || 'Untitled Listing'}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      Tenant: <strong>{booking.guestName}</strong>
                    </p>

                    <div className="space-y-2 text-gray-600 text-sm mb-3">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-emerald-600" />
                        {booking.guestEmail}
                      </div>
                      <div className="flex items-center">
                        <Phone className="w-4 h-4 mr-2 text-emerald-600" />
                        {booking.guestPhone || 'N/A'}
                      </div>
                    </div>

                    <div className="border-t border-gray-200 pt-3 text-sm text-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-emerald-600" />
                          Check-in:
                        </span>
                        <span>{formatDate(booking.checkIn)}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-emerald-600" />
                          Check-out:
                        </span>
                        <span>{formatDate(booking.checkOut)}</span>
                      </div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1 text-emerald-600" />
                          Guests:
                        </span>
                        <span>{booking.guests}</span>
                      </div>
                      <div className="flex items-center justify-between font-semibold text-emerald-600">
                        <span>Total:</span>
                        <span>{formatPrice(booking.totalPrice)}</span>
                      </div>
                    </div>

                    {/* ✅ Cancel Request Button (only for active bookings) */}
                    {!isPast && (
                      <button
                        onClick={() => handleRequestCancel(booking._id)}
                        disabled={cancelRequestMutation.isLoading}
                        className="w-full mt-3 bg-red-500 hover:bg-red-600 text-white font-medium py-2 rounded-lg transition"
                      >
                        Request Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TenantMonitoringPage;
