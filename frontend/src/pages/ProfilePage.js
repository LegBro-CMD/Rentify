import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { User, Calendar, MapPin, Star, Edit, Save, X, Camera, Heart, Eye } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import api, { updateProfile } from '../utils/api';
import { useNavigate } from 'react-router-dom';

axios.defaults.baseURL = 'http://localhost:5000';

const ProfilePage = () => {
  const { user, updateUser, loading: authLoading } = useAuth(); // ✅ Get updateUser from context
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('profile');
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bio: '',
    avatar: ''
  });

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const { data: profile, isLoading: profileLoading } = useQuery(
    ['user-profile', user?._id],
    async () => {
      const response = await api.get('/api/auth/me');
      return response.data.data.user;
    },
    {
      enabled: !!user,
      onSuccess: (data) => {
        setFormData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || '',
          phone: data.phone || '',
          bio: data.bio || '',
          avatar: data.avatar || ''
        });
      }
    }
  );

  const { data: bookingsData, isLoading: bookingsLoading } = useQuery(
    ['user-bookings', user?._id],
    async () => {
      const response = await axios.get('/api/bookings');
      return response.data;
    },
    { enabled: !!user }
  );

  const { data: favoritesData, isLoading: favoritesLoading } = useQuery(
    ['user-favorites', user?._id],
    async () => {
      const response = await api.get('/api/favorites');
      return response.data;
    },
    { enabled: !!user }
  );

  const updateProfileMutation = useMutation(updateProfile, {
    onSuccess: (data) => {
      toast.success('Profile updated successfully!');
      const updatedUser = data.data?.user;
      if (updatedUser) {
        setFormData({
          firstName: updatedUser.firstName || '',
          lastName: updatedUser.lastName || '',
          email: updatedUser.email || '',
          phone: updatedUser.phone || '',
          bio: updatedUser.bio || '',
          avatar: updatedUser.avatar || ''
        });
      }
      setIsEditing(false);
      queryClient.invalidateQueries(['user-profile', user?._id]);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to update profile');
    },
  });

  const changePasswordMutation = useMutation(
    async (passwordData) => {
      const response = await api.put('/api/auth/change-password', passwordData);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Password changed successfully!');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to change password');
      }
    }
  );

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const filteredData = Object.fromEntries(
      Object.entries(formData).filter(([key, v]) => key !== 'avatar' && v && v.trim() !== '')
    );
    updateProfileMutation.mutate(filteredData);
  };

  const handleCancel = () => {
    setFormData({
      firstName: profile?.firstName || '',
      lastName: profile?.lastName || '',
      email: profile?.email || '',
      phone: profile?.phone || '',
      bio: profile?.bio || '',
      avatar: profile?.avatar || ''
    });
    setIsEditing(false);
  };

  // ✅ CRITICAL: Handle avatar upload with full persistence
  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    const uploadFormData = new FormData();
    uploadFormData.append('avatar', file);

    try {
      const loadingToast = toast.loading('Uploading profile picture...');

      const res = await api.put('/api/users/update-avatar', uploadFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      toast.dismiss(loadingToast);

      if (res.data.success) {
        toast.success('Profile picture updated!');
        
        const newAvatar = res.data.user.avatar;

        // ✅ 1. Update React Query cache
        queryClient.setQueryData(['user-profile', user?._id], (oldData) => ({
          ...oldData,
          avatar: newAvatar,
        }));

        // ✅ 2. Update local formData state
        setFormData((prev) => ({
          ...prev,
          avatar: newAvatar,
        }));

        // ✅ 3. Update AuthContext user state & localStorage (all in one call!)
        updateUser({ avatar: newAvatar });

        // ✅ 4. Force refetch to ensure data is fresh
        queryClient.invalidateQueries(['user-profile', user?._id]);
        
      } else {
        toast.error('Failed to update avatar.');
      }
    } catch (err) {
      toast.dismiss();
      console.error('Avatar upload error:', err);
      toast.error(err.response?.data?.message || 'Upload failed');
    }

    // Reset file input
    e.target.value = '';
  };

  const formatDate = (date) =>
    new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  const formatPrice = (price) =>
    new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 0 }).format(price);

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      cancelled: 'bg-red-100 text-red-800',
      completed: 'bg-green-100 text-green-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  // ✅ Get avatar URL with proper fallback
  const getAvatarUrl = () => {
    // Priority: formData > profile > user from context
    const avatarPath = formData.avatar || profile?.avatar || user?.avatar;
    if (!avatarPath) return null;
    
    // If avatar already has full URL, return it
    if (avatarPath.startsWith('http')) return avatarPath;
    
    // Otherwise prepend base URL
    return `http://localhost:5000${avatarPath}`;
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'bookings', name: 'My Bookings', icon: Calendar },
    { id: 'favorites', name: 'Favorites', icon: Heart },
  ];

  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-gradient-to-r from-emerald-600 to-emerald-500 flex items-center justify-center">
                {getAvatarUrl() ? (
                  <img
                    src={getAvatarUrl()}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Hide image and show initials on error
                      e.target.style.display = 'none';
                      const fallback = e.target.parentElement.querySelector('.fallback-initial');
                      if (fallback) fallback.style.display = 'flex';
                    }}
                  />
                ) : null}
                <span 
                  className="fallback-initial text-white font-bold text-2xl w-full h-full flex items-center justify-center absolute top-0 left-0"
                  style={{ display: getAvatarUrl() ? 'none' : 'flex' }}
                >
                  {profile?.firstName?.charAt(0)?.toUpperCase() || user?.firstName?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>

              

              {/* Hidden File Input */}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                className="hidden"
                onChange={handleAvatarUpload}
              />
            </div>

            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900">
                {profile?.firstName} {profile?.lastName}
              </h1>
              <p className="text-gray-600 mt-1">{profile?.email}</p>
              <div className="flex items-center mt-2 space-x-4 text-sm text-gray-500">
                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Joined {formatDate(profile?.createdAt)}</span>
                </div>
                <div className="flex items-center">
                  <Star className="w-4 h-4 mr-1 text-yellow-400" />
                  <span>4.9 rating</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setIsEditing(!isEditing)}
              className="btn-primary flex items-center space-x-2"
            >
              <Edit className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tabs */}
        <div className="mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === tab.id
                        ? 'border-emerald-500 text-emerald-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Profile Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Personal Information
                  </h2>
                  {isEditing && (
                    <div className="flex space-x-2">
                      <button
                        onClick={handleCancel}
                        className="btn-secondary flex items-center space-x-2"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={handleSubmit}
                        disabled={updateProfileMutation.isLoading}
                        className="btn-primary flex items-center space-x-2"
                        type="button"
                      >
                        {updateProfileMutation.isLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        <span>Save</span>
                      </button>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="form-label">First Name</label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        disabled={!isEditing}
                        required
                        className={`form-input ${!isEditing ? 'bg-gray-50' : ''}`}
                      />
                    </div>
                    <div>
                      <label className="form-label">Last Name</label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        disabled={!isEditing}
                        required
                        className={`form-input ${!isEditing ? 'bg-gray-50' : ''}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label">Email Address</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      disabled={!isEditing}
                      required
                      className={`form-input ${!isEditing ? 'bg-gray-50' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      disabled={!isEditing}
                      placeholder="+63 9XX XXX XXXX"
                      className={`form-input ${!isEditing ? 'bg-gray-50' : ''}`}
                    />
                  </div>

                  <div>
                    <label className="form-label">Bio</label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      disabled={!isEditing}
                      rows={4}
                      placeholder="Tell us about yourself..."
                      className={`form-input ${!isEditing ? 'bg-gray-50' : ''}`}
                    />
                  </div>
                </form>
              </div>
            </div>

            {/* Profile Stats */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Profile Stats
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-gray-600">Total Bookings</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {bookingsData?.data?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Heart className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-gray-600">Favorites</span>
                    </div>
                    <span className="font-semibold text-gray-900">
                      {favoritesData?.data?.length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Star className="w-4 h-4 text-emerald-600" />
                      <span className="text-sm text-gray-600">Average Rating</span>
                    </div>
                    <span className="font-semibold text-gray-900">4.9</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Account Settings
                </h3>
                <div className="space-y-3">
                  <button 
                    onClick={() => setShowPasswordModal(true)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    Change Password
                  </button>
                  <button className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-6">
            {bookingsLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : bookingsData?.data?.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Bookings Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  You haven't made any bookings yet. Start exploring properties!
                </p>
                <button className="btn-primary">
                  Browse Properties
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookingsData?.data?.map((booking) => (
                  <div key={booking._id} className="bg-white rounded-xl shadow-md overflow-hidden">
                    <img
                      src={booking.listing?.images?.[0]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'}
                      alt={booking.listing?.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-gray-900">
                          {booking.listing?.title}
                        </h3>
                        {getStatusBadge(booking.status)}
                      </div>
                      
                      <div className="flex items-center text-gray-600 mb-3">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span className="text-sm">{booking.listing?.location}</span>
                      </div>

                      <div className="space-y-2 text-sm text-gray-600 mb-4">
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-emerald-600" />
                          <span>
                            {formatDate(booking.checkIn)} - {formatDate(booking.checkOut)}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-emerald-600" />
                          <span>{booking.guests} guest{booking.guests !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-lg font-semibold text-emerald-600">
                          {formatPrice(booking.totalPrice)}
                        </div>
                        <button className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
                          View Details
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Favorites Tab */}
        {activeTab === 'favorites' && (
          <div>
            {favoritesLoading ? (
              <div className="text-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : !favoritesData?.data?.length ? (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No Favorites Yet
                </h3>
                <p className="text-gray-600 mb-4">
                  Save properties you love to easily find them later.
                </p>
                <button className="btn-primary">Browse Properties</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoritesData.data.map((listing) => (
                  <div key={listing._id} className="bg-white rounded-xl shadow-md overflow-hidden">
                    <img
                      src={listing.images?.[0]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'}
                      alt={listing.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="p-6">
                      <h3 className="font-semibold text-gray-900 mb-2">{listing.title}</h3>
                      <p className="text-gray-600 text-sm mb-4">{listing.location}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-semibold text-emerald-600">
                          ₱{listing.price?.toLocaleString()}
                        </span>
                        <button 
                          onClick={() => navigate(`/listing/${listing._id}`)}
                          className="text-emerald-600 hover:text-emerald-900"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay animate-fade-in" onClick={() => setShowPasswordModal(false)}>
          <div 
            className="modal-content animate-scale-in max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Change Password
              </h2>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                if (passwordData.newPassword !== passwordData.confirmPassword) {
                  toast.error('New passwords do not match');
                  return;
                }
                changePasswordMutation.mutate(passwordData);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="form-label">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="form-input"
                  required
                />
              </div>

              <div>
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="form-input"
                  minLength="6"
                  required
                />
              </div>

              <div>
                <label className="form-label">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="form-input"
                  minLength="6"
                  required
                />
              </div>

              <div className="flex justify-end space-x-4 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changePasswordMutation.isLoading}
                  className="btn-primary flex items-center space-x-2"
                >
                  {changePasswordMutation.isLoading && <LoadingSpinner size="sm" />}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;