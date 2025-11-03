import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';

// Components
import Navbar from './components/layout/Navbar';
import LoadingSpinner from './components/ui/LoadingSpinner';

// Pages
import HomePage from './pages/HomePage';
import ListingsPage from './pages/ListingsPage';
import ListingDetailPage from './pages/ListingDetailPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import MyListingsPage from './pages/MyListingsPage';
import NotFoundPage from './pages/NotFoundPage';
import EditListingPage from './pages/EditListingPage';
import BookingReturnPage from './pages/BookingReturnPage';
import BookedListingsPage from './pages/BookedListingsPage';
import TenantMonitoringPage from './pages/TenantMonitoringPage';



function App() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/listings" element={<ListingsPage />} />
          <Route path="/listings/:id" element={<ListingDetailPage />} />
          <Route path="/listing/:id" element={<ListingDetailPage />} />
          <Route path="/edit-listing/:id" element={<EditListingPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/my-listings" element={<MyListingsPage />} />
          <Route path="*" element={<NotFoundPage />} />
          <Route path="/booking-return" element={<BookingReturnPage />} />
          <Route path="/booked-listings" element={<BookedListingsPage />} />
          <Route path="/tenant-monitoring" element={<TenantMonitoringPage />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;