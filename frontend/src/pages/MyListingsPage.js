import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Plus, CreditCard as Edit, Trash2, Eye, MapPin, Users, Bed, Bath, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import CreateListingModal from '../components/admin/CreateListingModal';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const MyListingsPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const navigate = useNavigate();


  // Fetch user's listings
  const { data: listingsData, isLoading } = useQuery(
    'my-listings',
    async () => {
      const response = await api.get(`/api/listings?host=${user.id}`);
      return response.data;
    },
    {
      enabled: !!user
    }
  );

  // Delete listing mutation
  const deleteMutation = useMutation(
    async (listingId) => {
      await api.delete(`/api/listings/${listingId}`);
    },
    {
      onSuccess: () => {
        toast.success('Listing deleted successfully');
        queryClient.invalidateQueries('my-listings');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete listing');
      }
    }
  );

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-800',
      inactive: 'bg-gray-100 text-gray-800',
      pending: 'bg-yellow-100 text-yellow-800'
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (!user || (user.role !== 'host' && user.role !== 'admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You need to be a host to access this page.
          </p>
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
            <h1 className="text-2xl font-bold text-gray-900">My Listings</h1>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Listing</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner size="lg" />
          </div>
        ) : listingsData?.data?.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏠</div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              No Listings Yet
            </h3>
            <p className="text-gray-600 mb-4">
              Create your first listing to start hosting guests.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              Create Your First Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listingsData?.data?.map((listing) => (
              <div
                key={listing._id}
                className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300"
              >
                <div className="relative h-48">
                  <img
                    src={listing.images?.[0]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 right-3">
                    {getStatusBadge(listing.status)}
                  </div>
                  <div className="absolute top-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg flex items-center space-x-1">
                    <Star className="w-3 h-3 text-yellow-400 fill-current" />
                    <span className="text-sm">{listing.rating}</span>
                  </div>
                </div>

                <div className="p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-1">
                    {listing.title}
                  </h3>
                  
                  <div className="flex items-center text-gray-600 mb-3">
                    <MapPin className="w-4 h-4 mr-1 text-emerald-600" />
                    <span className="text-sm">{listing.location}</span>
                  </div>

                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        <Bed className="w-4 h-4 mr-1 text-emerald-600" />
                        <span>{listing.bedrooms}</span>
                      </div>
                      <div className="flex items-center">
                        <Bath className="w-4 h-4 mr-1 text-emerald-600" />
                        <span>{listing.bathrooms}</span>
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1 text-emerald-600" />
                        <span>{listing.maxGuests}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <div className="text-lg font-semibold text-emerald-600">
                      {formatPrice(listing.price)}
                      <span className="text-sm text-gray-500">/night</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Created {formatDate(listing.createdAt)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2">
                      <button onClick={() => navigate(`/listing/${listing._id}`)}
                      alt={listing.title}
                      className="text-emerald-600 hover:text-emerald-900">
                      <Eye className="w-4 h-4" />
                      </button>
                      <button onClick={() => navigate(`/edit-listing/${listing._id}`)}
                      alt={listing.title}
                      className="text-gray-600 hover:text-emerald-600">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteMutation.mutate(listing._id)}
                        disabled={deleteMutation.isLoading}
                        className="text-red-600 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-sm text-gray-500">
                      {listing.reviewCount} reviews
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Listing Modal */}
      {showCreateModal && (
        <CreateListingModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            queryClient.invalidateQueries('my-listings');
          }}
        />
      )}
    </div>
  );
};

export default MyListingsPage;