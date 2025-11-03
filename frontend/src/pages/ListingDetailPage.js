import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../utils/api';
import { 
  MapPin, Users, Bed, Bath, Star, Wifi, Car, Utensils, 
  Snowflake, Waves, Dumbbell, Building, Calendar, 
  Contact, ArrowLeft, Heart, Share2, ChevronLeft, ChevronRight
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import BookingModal from '../components/booking/BookingModal';

const ListingDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [reviews, setReviews] = useState([]);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [submitting, setSubmitting] = useState(false); 
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);

  // Fetch listing details
  const { data: listing, isLoading, error } = useQuery(
    ['listing', id],
    async () => {
      const response = await api.get(`/api/listings/${id}`);
      return response.data.data;
    }
  );
  
// ✅ Fetch reviews on mount
useEffect(() => {
  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const { data } = await api.get(`/api/listings/${id}/reviews`);
      setReviews(data);
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setLoadingReviews(false);
    }
  };

  fetchReviews();
}, [id]);

// ✅ Handle review submission
const handleReviewSubmit = async (e) => {
  e.preventDefault();

  if (!isAuthenticated) {
    setShowAuthModal(true);
    return;
  }

  if (!rating || !comment.trim()) {
    toast.error("Please provide both a rating and a comment.");
    return;
  }

  try {
    setSubmitting(true);
    const token = localStorage.getItem("token");

    await api.post(
      `/api/listings/${id}/reviews`,
      {
        rating,
        comment,
        userName: user?.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : "Anonymous",
        userId: user?._id,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    toast.success("Review submitted successfully!");

    // Clear form inputs
    setRating(5);
    setComment('');
    setShowReviewForm(false);

    // ✅ Refresh the reviews list from backend
    const { data } = await api.get(`/api/listings/${id}/reviews`);
    setReviews(data);

    // Optional: invalidate queries if you use React Query for listing data
    queryClient.invalidateQueries(["listing", id]);
  } catch (error) {
    console.error("Error submitting review:", error);
    toast.error("Failed to submit review.");
  } finally {
    setSubmitting(false);
  }
};

useEffect(() => {
  const fetchFavorites = async () => {
    if (!isAuthenticated) return;
    try {
      const { data } = await api.get('/api/favorites'); // your GET favorites route
      const favorites = data.data || data; // adjust based on your backend response
      setIsFavorited(favorites.some(fav => fav._id === id));
    } catch (err) {
      console.error('Error fetching favorites:', err);
    }
  };

  fetchFavorites();
}, [id, isAuthenticated]);


  // Add to favorites mutation
  const favoriteMutation = useMutation(
    async () => {
      const response = await api.post(`/api/listings/${id}/favorite`);
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

  const toggleFavorite = async () => {
  if (!isAuthenticated) {
    toast.error("You need to log in first");
    return;
  }

  try {
    if (isFavorited) {
      await api.delete(`/api/favorites/${id}`);
      toast("Removed from favorites");
      setIsFavorited(false);
    } else {
      await api.post(`/api/favorites/${id}`);
      toast.success("Added to favorites!");
      setIsFavorited(true);
    }
  } catch (error) {
    console.error(error);
    toast.error("Failed to update favorites");
  }
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

  // Your existing Google Form link
  const GOOGLE_FORM_URL = "https://forms.gle/fomhAvGheDZajsof6";
  const propertyId = listing._id;

  // Create a redirect link for after the form submission
  const redirectURL = `http://localhost:3000/booking-return?propertyId=${propertyId}`;

  // Include prefilled info (optional, like before)
  const formUrl = new URL(GOOGLE_FORM_URL);
  formUrl.searchParams.append("entry.property_name", listing.title);
  formUrl.searchParams.append("entry.property_location", listing.location);
  formUrl.searchParams.append("entry.guest_name", user?.firstName || "");
  formUrl.searchParams.append("entry.guest_email", user?.email || "");
  formUrl.searchParams.append("redirect", redirectURL);

  toast("Redirecting to booking form...");
  setTimeout(() => {
    window.open(formUrl.toString(), "_blank");
  }, 800);
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
{isAuthenticated && user?.id === listing.host._id && (
  <button
    onClick={() => navigate(`/edit-listing/${listing._id}`)}
    className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
  >
    <span className="hidden sm:inline">Edit</span>
  </button>
)}

              <button
                onClick={handleShare}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">Share</span>
              </button>
              
              <button
  onClick={toggleFavorite}
  className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
    isFavorited
      ? "text-red-600 bg-red-50 hover:bg-red-100"
      : "text-gray-600 hover:text-red-600 hover:bg-red-50"
  }`}
>
  <Heart
    className={`w-4 h-4 transition ${
      isFavorited ? "fill-red-600 text-red-600" : ""
    }`}
  />
  <span className="hidden sm:inline">
    {isFavorited ? "Unfavorite" : "Save"}
  </span>
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
                  <div className="flex items-center text-gray-600 mb-2">
                    <Contact className="w-5 h-5 mr-2 text-emerald-600" />
                    <span>Contact: {listing.phone || listing.host?.phone || 'N/A'}</span>
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
                    <span className="font-semibold">{listing.rating}</span>
                    <span className="text-sm text-gray-600">: host rating</span>
                  </div>
                </div>
              </div>
            </div>
         {/* Reviews Section */}
<div className="bg-white rounded-2xl shadow-lg p-6 mt-10">
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
    <div>
      <h3 className="text-xl font-semibold text-gray-900">Guest Reviews</h3>
      <p className="text-gray-600">
        ⭐ {listing.rating?.toFixed(1) || "0.0"} average from{" "}
        {listing.reviewCount || 0} reviews
      </p>
    </div>
    {isAuthenticated && (
      <button
        onClick={() => setShowReviewForm(!showReviewForm)}
        className="mt-3 sm:mt-0 bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition"
      >
        {showReviewForm ? "Cancel" : "Write a Review"}
      </button>
    )}
  </div>

  {/* Review Form */}
  {showReviewForm && (
    <form
      onSubmit={handleReviewSubmit}
      className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200 space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Rating
        </label>
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((num) => (
            <Star
              key={num}
              onClick={() => setRating(num)}
              className={`w-6 h-6 cursor-pointer transition ${
                num <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-300"
              }`}
            />
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Comment
        </label>
        <textarea
          name="comment"
          rows="3"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience..."
          className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-emerald-500 focus:border-emerald-500"
          required
        ></textarea>
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg w-full transition"
      >
        {submitting ? "Submitting..." : "Submit Review"}
      </button>
    </form>
  )}

{/* Existing Reviews */}
{reviews && reviews.length > 0 ? (
  <div className="space-y-6">
    {reviews
      .filter((review) => review && typeof review === "object")
      .map((review, index) => {
        const userName =
          review?.user?.userName ||
          review?.user?.firstName ||
          review?.user?.email?.split("@")[0] ||
          review?.userName ||
          "Anonymous";

        return (
          <div
            key={review?._id || index}
            className="p-4 bg-gray-50 border border-gray-200 rounded-xl shadow-sm"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center font-semibold text-emerald-600">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="font-semibold text-gray-800">{userName}</h4>
                  <div className="flex items-center text-yellow-500">
                    {Array.from({ length: review?.rating || 0 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {review?.createdAt
                  ? new Date(review.createdAt).toLocaleDateString()
                  : ""}
              </span>
            </div>
            <p className="text-gray-700 mt-3">
              {review?.comment || "No comment provided."}
            </p>
          </div>
        );
      })}
  </div>
) : (
  <p className="text-gray-600 text-center py-4">
    No reviews yet. Be the first to share your experience!
  </p>
)}


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
  onClick={() => {
    if (!isAuthenticated) {
      setShowAuthModal(true);
      return;
    }
    setShowBookingModal(true);
  }}
  className="w-full btn-primary mb-4 py-3 text-lg flex justify-center items-center"
>
  <Calendar className="w-5 h-5 mr-2" />
  Book Now
</button>


              <div className="text-center text-sm text-gray-500 mb-4">
                Before booking, Contact your host for details and availability (You won't be charged yet)
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