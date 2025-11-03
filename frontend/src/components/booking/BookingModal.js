import React, { useState, useEffect } from 'react';
import { X, Calendar, Users, CreditCard } from 'lucide-react';
import { useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import LoadingSpinner from '../ui/LoadingSpinner';
import api from '../../utils/api';

const BookingModal = ({ listing, onClose }) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    checkIn: '',
    checkOut: '',
    guests: 1,
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    specialRequests: ''
  });

  const [errors, setErrors] = useState({});
  const [nights, setNights] = useState(0);
  const [total, setTotal] = useState(0);

  // ✅ Recalculate nights and total automatically
  useEffect(() => {
    if (formData.checkIn && formData.checkOut && listing?.price) {
      const checkInDate = new Date(formData.checkIn);
      const checkOutDate = new Date(formData.checkOut);
      const diffTime = checkOutDate - checkInDate;

      if (diffTime > 0) {
        const nightsCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        setNights(nightsCount);

        const serviceFee = 200;
        const cleaningFee = 500;
        const subtotal = nightsCount * listing.price;
        setTotal(subtotal + serviceFee + cleaningFee);
      } else {
        setNights(0);
        setTotal(0);
      }
    } else {
      setNights(0);
      setTotal(0);
    }
  }, [formData.checkIn, formData.checkOut, listing]);

  const bookingMutation = useMutation(
    async (bookingData) => {
      const response = await api.post('/api/bookings', bookingData);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Booking request submitted successfully!');
        queryClient.invalidateQueries(['bookings']);
        onClose();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to create booking');
      }
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.checkIn) newErrors.checkIn = 'Check-in date is required';
    if (!formData.checkOut) newErrors.checkOut = 'Check-out date is required';
    if (formData.checkIn && formData.checkOut && formData.checkIn >= formData.checkOut)
      newErrors.checkOut = 'Check-out must be after check-in';

    if (!formData.guestName.trim()) newErrors.guestName = 'Guest name is required';
    if (!formData.guestEmail.trim()) newErrors.guestEmail = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.guestEmail)) newErrors.guestEmail = 'Email is invalid';

    if (formData.guests < 1 || formData.guests > listing.maxGuests)
      newErrors.guests = `Guests must be between 1 and ${listing.maxGuests}`;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // ✅ Check availability before proceeding
      const { data } = await api.post('/api/bookings/check-availability', {
        listingId: listing._id,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut
      });

      if (!data.available) {
        toast.error('Someone is already checked in for the selected dates.');
        return;
      }

      toast.success(`Listing is available! Total: ${formatPrice(total)}`);

      // create booking in mongoDB
      await bookingMutation.mutateAsync({
        listingId: listing._id,
        listingTitle: listing.title,
        pricePerNight: listing.price,
        checkIn: formData.checkIn,
        checkOut: formData.checkOut,
        guests: formData.guests,
        guestName: formData.guestName,
        guestEmail: formData.guestEmail,
        guestPhone: formData.guestPhone,
        specialRequests: formData.specialRequests,
        totalPrice: total
      });

      // ✅ Redirect to Google Form after 1.5s
      toast.success('Booking successful! Redirecting to contract form...');
      setTimeout(() => {
        window.open('https://forms.gle/fomhAvGheDZajsof6', '_blank');
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Failed to check listing availability.');
    }
  };

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div
        className="modal-content animate-scale-in max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Book Your Stay</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Property Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">{listing.title}</h3>
            <p className="text-gray-600 text-sm">{listing.location}</p>
            <div className="mt-2 text-emerald-600 font-semibold">
              {formatPrice(listing.price)} per night
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                Check-in
              </label>
              <input
                type="date"
                name="checkIn"
                value={formData.checkIn}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                className={`form-input ${errors.checkIn ? 'border-red-500' : ''}`}
              />
              {errors.checkIn && <p className="form-error">{errors.checkIn}</p>}
            </div>

            <div>
              <label className="form-label flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                Check-out
              </label>
              <input
                type="date"
                name="checkOut"
                value={formData.checkOut}
                onChange={handleChange}
                min={formData.checkIn || new Date().toISOString().split('T')[0]}
                className={`form-input ${errors.checkOut ? 'border-red-500' : ''}`}
              />
              {errors.checkOut && <p className="form-error">{errors.checkOut}</p>}
            </div>
          </div>

          {/* Guests */}
          <div>
            <label className="form-label flex items-center">
              <Users className="w-4 h-4 mr-2 text-emerald-600" />
              Number of Guests
            </label>
            <select
              name="guests"
              value={formData.guests}
              onChange={handleChange}
              className={`form-input ${errors.guests ? 'border-red-500' : ''}`}
            >
              {Array.from({ length: listing.maxGuests }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1} Guest{i + 1 !== 1 ? 's' : ''}
                </option>
              ))}
            </select>
            {errors.guests && <p className="form-error">{errors.guests}</p>}
          </div>

          {/* Guest Info */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Guest Information</h4>
            <div>
              <label className="form-label">Full Name</label>
              <input
                type="text"
                name="guestName"
                value={formData.guestName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`form-input ${errors.guestName ? 'border-red-500' : ''}`}
              />
              {errors.guestName && <p className="form-error">{errors.guestName}</p>}
            </div>

            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="guestEmail"
                value={formData.guestEmail}
                onChange={handleChange}
                placeholder="your@email.com"
                className={`form-input ${errors.guestEmail ? 'border-red-500' : ''}`}
              />
              {errors.guestEmail && <p className="form-error">{errors.guestEmail}</p>}
            </div>

            <div>
              <label className="form-label">Phone Number (Optional)</label>
              <input
                type="tel"
                name="guestPhone"
                value={formData.guestPhone}
                onChange={handleChange}
                placeholder="+63 9XX XXX XXXX"
                className="form-input"
              />
            </div>

            <div>
              <label className="form-label">Special Requests (Optional)</label>
              <textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleChange}
                rows={3}
                placeholder="Any special requests or requirements..."
                className="form-input"
              />
            </div>
          </div>

          {/* Price Breakdown */}
          {nights > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-gray-900 mb-3">Price Breakdown</h4>
              <div className="flex justify-between text-sm">
                <span>
                  {formatPrice(listing.price)} × {nights} night{nights !== 1 ? 's' : ''}
                </span>
                <span>{formatPrice(nights * listing.price)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Service fee</span>
                <span>₱200</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Cleaning fee</span>
                <span>₱500</span>
              </div>
              <div className="border-t border-gray-200 pt-2 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span className="text-emerald-600">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={bookingMutation.isLoading || nights === 0}
            className="w-full btn-primary flex items-center justify-center space-x-2 py-3"
          >
            {bookingMutation.isLoading && <LoadingSpinner size="sm" />}
            <CreditCard className="w-5 h-5" />
            <span>
              {bookingMutation.isLoading ? 'Processing...' : 'Request to Book'}
            </span>
          </button>

          <p className="text-xs text-gray-500 text-center">
            You won't be charged yet. The host will review your request and respond within 24 hours.
          </p>
        </form>
      </div>
    </div>
  );
};

export default BookingModal;
