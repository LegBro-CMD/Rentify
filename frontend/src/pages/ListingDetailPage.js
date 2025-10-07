import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { 
  MapPin, Users, Bed, Bath, Star, Wifi, Car, Utensils, 
  Snowflake, Waves, Dumbbell, Building, Calendar, 
  ArrowLeft, Heart, Share2, ChevronLeft, ChevronRight
} from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import BookingModal from '../components/booking/BookingModal';

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Fetch listing details
  const { data: listing, isLoading, error } = useQuery(
    ['listing', id],
    async () => {
      const response = await axios.get(`/api/listings/${id}`);
      return response.data.data;
    }
  );

  // Add to favorites mutation
  const favoriteMutation = useMutation(
    async () => {
      const response = await axios.post(`/api/listings/${id}/favorite`);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Added to favorites!');
        queryClient.invalidateQueries(['listing', id]);
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add to favorites');
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

  const getAmenityIcon = (amenity) => {
    const icons = {
      'WiFi': Wifi,
      'Kitchen': Utensils,
      'Parking': Car,
      'Air Conditioning': Snowflake,
      'Pool': Waves,
      'Gym': Dumbbell,
      'Balcony': Building,
    };
    return icons[amenity] || Building;
  };

  const nextImage = () => {
    if (listing?.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === listing.images.length - 1 ? 0 : prev + 1
      );
    }
  };

  const prevImage = () => {
    if (listing?.images?.length > 1) {
      setCurrentImageIndex((prev) => 
        prev === 0 ? listing.images.length - 1 : prev - 1
      );
    }
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setShowBookingModal(true);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: listing.description,
          url: window.location.href,
        });
      } catch (error) {
        // Fallback to clipboard
        navigator.clipboard.writeText(window.location.href);
        toast.success('Link copied to clipboard!');
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Property Not Found
          </h2>
          <p className="text-gray-600 mb-4">
            The property you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/listings')}
            className="btn-primary"
          >
            Browse Properties
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              
              <button
                onClick={() => favoriteMutation.mutate()}
                disabled={favoriteMutation.isLoading}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Heart className="w-4 h-4" />
                <span className="hidden sm:inline">Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="relative">
              <div className="aspect-w-16 aspect-h-10 rounded-xl overflow-hidden">
                <img
                  src={listing.images?.[currentImageIndex]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'}
                  alt={listing.title}
                  className="w-full h-96 object-cover"
                />
              </div>
              
              {listing.images?.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-700" />
                  </button>
                  
                  <button
                    onClick={nextImage}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-700" />
                  </button>
                  
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                    {listing.images.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${
                          index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Property Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {listing.title}
                  </h1>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="w-5 h-5 mr-2 text-emerald-600" />
                    <span>{listing.location}</span>
                  </div>
                  <div className="flex items-center">
                    <Star className="w-5 h-5 text-yellow-400 fill-current mr-1" />
                    <span className="font-semibold">{listing.rating}</span>
                    <span className="text-gray-500 ml-1">({listing.reviewCount} reviews)</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-3xl font-bold text-emerald-600">
                    {formatPrice(listing.price)}
                  </div>
                  <div className="text-gray-500">per night</div>
                </div>
              </div>

              <div className="flex items-center space-x-6 py-4 border-t border-gray-200">
                <div className="flex items-center">
                  <Bed className="w-5 h-5 mr-2 text-emerald-600" />
                  <span>{listing.bedrooms} bedroom{listing.bedrooms !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center">
                  <Bath className="w-5 h-5 mr-2 text-emerald-600" />
                  <span>{listing.bathrooms} bathroom{listing.bathrooms !== 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2 text-emerald-600" />
                  <span>{listing.maxGuests} guest{listing.maxGuests !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Description</h3>
                <p className="text-gray-600 leading-relaxed">
                  {listing.description}
                </p>
              </div>
            </div>

            {/* Amenities */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {listing.amenities?.map((amenity, index) => {
                  const Icon = getAmenityIcon(amenity);
                  return (
                    <div key={index} className="flex items-center space-x-3">
                      <Icon className="w-5 h-5 text-emerald-600" />
                      <span className="text-gray-700">{amenity}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Host Info */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Meet Your Host</h3>
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold text-xl">
                    {listing.hostName?.charAt(0) || 'H'}
                  </span>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">{listing.hostName}</h4>
                  <p className="text-gray-600">Host since 2023</p>
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                    <span className="text-sm text-gray-600">4.9 host rating</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Booking Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-32">
              <div className="text-center mb-6">
                <div className="text-2xl font-bold text-emerald-600 mb-1">
                  {formatPrice(listing.price)}
                </div>
                <div className="text-gray-500">per night</div>
              </div>

              <button
                onClick={handleBookNow}
                className="w-full btn-primary mb-4 py-3 text-lg"
              >
                <Calendar className="w-5 h-5 mr-2" />
                Book Now
              </button>

              <div className="text-center text-sm text-gray-500 mb-4">
                You won't be charged yet
              </div>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Service fee</span>
                  <span className="text-gray-900">₱200</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cleaning fee</span>
                  <span className="text-gray-900">₱500</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between font-semibold">
                    <span>Total before taxes</span>
                    <span>{formatPrice(listing.price + 700)}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                  <Star className="w-4 h-4 text-yellow-400 fill-current" />
                  <span>{listing.rating} · {listing.reviewCount} reviews</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <BookingModal
          listing={listing}
          onClose={() => setShowBookingModal(false)}
        />
      )}
    </div>
  );
};

export default ListingDetailPage;