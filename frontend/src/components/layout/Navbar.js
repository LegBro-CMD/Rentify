import React, { useState, useEffect, useRef } from 'react';
import {useQuery} from 'react-query';
import api from '../../utils/api';
import { CalendarCheck, Bell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Hop as Home, Search, Settings, User, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AuthModal from '../auth/AuthModal';

const Navbar = () => {
  const { user, logout, isAuthenticated } = useAuth();
  const location = useLocation();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifications, setUnreadNotifications] = useState([]);

  const userId = user?.id

  // Fetch notifications for logged-in users
  const { data: notificationsData } = useQuery({
    queryKey: ['notifications', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await api.get(`/api/notifications?recipient=${userId}`);
      return response.data.data;
    },
    enabled: !!userId,
    refetchInterval: 5000,
  });

  const unreadCount = notificationsData?.filter(notification => !notification.isRead).length || 0;

  // Mark notification as read
  const handleMarkAsRead = async () => {
    try {
      await api.put(`/api/notifications/mark-as-read/${userId}`);
      setShowNotifications(false);
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const prevNotificationsRef = useRef([]);

useEffect(() => {
  if (!notificationsData) return;

  // Compare previous vs new notifications
  const prev = prevNotificationsRef.current;
  const newOnes = notificationsData.filter(
    n => !prev.some(p => p._id === n._id)
  );

  // If there are new notifications, play sound
  if (newOnes.length > 0) {
    const audio = new Audio('/notification.wav');
    audio.play().catch(() => {});
    console.log('🔔 New notifications:', newOnes);
  }

  // Update ref for next comparison
  prevNotificationsRef.current = notificationsData;
}, [notificationsData]);

  // Fetch bookings for logged-in users
  const { data: bookingsData } = useQuery({
    queryKey: ['userBookings', userId],
    queryFn: async () => {
      if (!userId) return [];
      const response = await api.get(`/api/bookings?user=${userId}`);
      return response.data.data;
    },
    enabled: !!userId,
  });

  // Determine if user has bookings
  const bookings = bookingsData || [];

   const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Browse', href: '/listings', icon: Search },
  ]; 

  // Add conditional navigation items based on user role
  const getNavigationItems = () => {
    const items = [...navigation];
    
    if (isAuthenticated && user?.role === 'admin') {
      items.push({ name: 'Admin', href: '/admin', icon: Settings });
    }
    
    if (isAuthenticated && (user?.role === 'host' || user?.role === 'admin')) {
      items.push({ name: 'My Listings', href: '/my-listings', icon: Home });
      items.push({ name: 'Tenant Monitoring', href: '/tenant-monitoring', icon: CalendarCheck });
    }

    if (isAuthenticated && user?.role === 'user' && bookings) {
      items.push({ name: 'Booked Listings', href: '/booked-listings', icon: User });
    }
    return items;
  };
  const isActive = (path) => location.pathname === path;

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
  <>
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left: Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-xl flex items-center justify-center">
              <Home className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Rentify</span>
          </Link>

          {/* Center: Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {getNavigationItems().map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Right: Notifications + User */}
          <div className="hidden md:flex items-center space-x-1">
            {/* Notification Bell */}
{isAuthenticated && (
  <div className="relative">
    <button
      onClick={() => setShowNotifications(prev => !prev)}
      className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
    >
      <Bell className="w-6 h-6 text-gray-600" />
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white bg-red-600 rounded-full">
          {unreadCount}
        </span>
      )}
    </button>

    {showNotifications && (
      <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-20">
        <div className="flex justify-between items-center px-4 py-2 border-b">
          <span className="font-medium text-gray-700">Notifications</span>
          <button
            onClick={async () => {
               try {
                // Mark all notifications as read on the backend
                 await Promise.all(
                 notificationsData
                .filter(n => !n.isRead)
                .map(n => api.put(`/api/notifications/${n._id}/read`))
               );

                 // ✅ Instantly update frontend state
                  setNotifications(prev =>
                  prev.map(n => ({ ...n, isRead: true }))
              );

                 // ✅ or simpler (since you use useQuery data):
                 // setNotificationsData(notificationsData.map(n => ({ ...n, isRead: true })));

                 // ✅ Refresh bell immediately
                 setShowNotifications(false);
                 } catch (error) {
                 console.error('Error marking notifications as read:', error);
              }
          }}

            className="text-sm text-emerald-600 hover:underline"
          >
            Mark all as read
          </button>
        </div>

        <div className="max-h-60 overflow-y-auto">
          {notificationsData && notificationsData.length > 0 ? (
            notificationsData.map((n) => {
              const senderName = n.sender
                ? `${n.sender.firstName || ''} ${n.sender.lastName || ''}`.trim()
                : 'Someone';
              const message = `${senderName} ${n.message}`;
              return (
                <div
                  key={n._id}
                  className={`px-4 py-2 text-sm border-b hover:bg-gray-100 ${
                    n.isRead ? 'text-gray-500' : 'text-gray-800 font-medium'
                  }`}
                >
                  <div>{message}</div>
                  <div className="text-xs text-gray-400">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-4 py-2 text-sm text-gray-500">No notifications</div>
          )}
        </div>
      </div>
    )}
  </div>
)}


            {/* User Icon */}
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(prev => !prev)}
                  className="flex items-center space-x-1 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{user?.name}</span>
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <Link
                      to="/profile"
                      className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setShowUserMenu(false)}
                    >
                      <User className="w-4 h-4" />
                      <span>Profile</span>
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => handleAuthClick('login')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors"
                >
                  Login
                </button>
                <button
                  onClick={() => handleAuthClick('register')}
                  className="btn-primary text-sm"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            {showMobileMenu ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {showMobileMenu && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 py-2 space-y-1">
            {getNavigationItems().map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.href)
                      ? 'text-emerald-600 bg-emerald-50'
                      : 'text-gray-600 hover:text-emerald-600 hover:bg-emerald-50'
                  }`}
                  onClick={() => setShowMobileMenu(false)}
                >
                  <Icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            {/* Mobile Auth */}
            <div className="pt-4 border-t border-gray-200">
              {isAuthenticated ? (
                <div className="space-y-1">
                  <Link
                    to="/profile"
                    className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                    onClick={() => setShowMobileMenu(false)}
                  >
                    <User className="w-5 h-5" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setShowMobileMenu(false);
                    }}
                    className="flex items-center space-x-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                  >
                    <LogOut className="w-5 h-5" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      handleAuthClick('login');
                      setShowMobileMenu(false);
                    }}
                    className="w-full px-3 py-2 text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors text-left"
                  >
                    Login
                  </button>
                  <button
                    onClick={() => {
                      handleAuthClick('register');
                      setShowMobileMenu(false);
                    }}
                    className="w-full btn-primary text-sm"
                  >
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>

    {/* Auth Modal */}
    {showAuthModal && (
      <AuthModal
        mode={authMode}
        onClose={() => setShowAuthModal(false)}
        onSwitchMode={setAuthMode}
      />
    )}
  </>
);
};

export default Navbar;