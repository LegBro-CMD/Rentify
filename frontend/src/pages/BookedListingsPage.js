import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Eye, Trash2, MapPin, Calendar, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useNavigate } from 'react-router-dom';

const BookedListingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);

  // ✅ Fetch user's bookings
  const { data: bookingsData, isLoading } = useQuery(
    ['my-bookings', user?.id],
    async () => {
      const response = await api.get(`/api/bookings?user=${user.id}`);
      return response.data;
    },
    { enabled: !!user }
  );

  // ✅ Cancel booking mutation
  const cancelMutation = useMutation(
    async ({ bookingId, reason }) => {
      await api.put(`/api/bookings/${bookingId}/cancel`, { reason });
    },
    {
      onSuccess: () => {
        toast.success('Cancellation request sent to admin.');
        queryClient.invalidateQueries(['my-bookings', user?.id]);
        setShowCancelModal(false);
        setCancelReason('');
        setSelectedBookingId(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to request cancellation');
      }
    }
  );

  const handleCancelClick = (bookingId) => {
    setSelectedBookingId(bookingId);
    setShowCancelModal(true);
  };

  const handleSubmitCancel = () => {
    if (!cancelReason.trim()) {
      toast.error('Please enter a reason for cancellation.');
      return;
    }
    cancelMutation.mutate({ bookingId: selectedBookingId, reason: cancelReason });
  };

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Please log in to view your bookings
          </h2>
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
            <h1 className="text-2xl font-bold text-gray-900">My Booked Listings</h1>
          </div>
        </div>
      </div>

      {/* Bookings grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : bookingsData?.data?.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛏️</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Bookings Yet
            </h3>
            <p className="text-gray-600">You haven’t booked any listings yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookingsData?.data?.map((booking) => {
              const listing = booking.listing;
              return (
                <div
                  key={booking._id}
                  className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300"
                >
                  <div className="relative h-48">
                    <img
                      src={listing?.images?.[0]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'}
                      alt={listing?.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 right-3">{getStatusBadge(booking.status)}</div>
                    <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-sm">{listing?.rating}</span>
                    </div>
                  </div>

                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                      {listing?.title}
                    </h3>

                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin className="w-4 h-4 mr-1 text-emerald-600" />
                      <span className="text-sm">{listing?.location}</span>
                    </div>

                    <div className="flex items-center text-gray-600 mb-2">
                      <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                      <span className="text-sm">
                        {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mb-4">
                      <div className="text-lg font-semibold text-emerald-600">
                        {formatPrice(booking.totalPrice)}
                      </div>
                      <div className="text-sm text-gray-500">Booked on {formatDate(booking.createdAt)}</div>
                    </div>

                    <div className="flex justify-between items-center">
                      <button
                        onClick={() => navigate(`/listing/${listing?._id}`)}
                        className="text-emerald-600 hover:text-emerald-900 flex items-center space-x-1"
                      >
                        <Eye className="w-4 h-4" />
                        <span>View</span>
                      </button>

                      {booking.status === 'pending' && (
                        <button
                          onClick={() => handleCancelClick(booking._id)}
                          disabled={cancelMutation.isLoading}
                          className="text-red-600 hover:text-red-700 flex items-center space-x-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 🧾 Cancel Reason Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Cancel Booking</h3>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Please type your reason for cancellation..."
              className="w-full border rounded-lg p-3 h-28 text-sm focus:ring-emerald-500 focus:border-emerald-500"
            ></textarea>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-100"
              >
                Close
              </button>
              <button
                onClick={handleSubmitCancel}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookedListingsPage;
