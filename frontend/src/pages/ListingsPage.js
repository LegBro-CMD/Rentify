import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { Search, ListFilter as Filter, MapPin, Users, Bed, Bath, Star } from 'lucide-react';
import axios from 'axios';
import LoadingSpinner from '../components/ui/LoadingSpinner';

const ListingsPage = () => {
  const [filters, setFilters] = useState({
    search: '',
    minPrice: '',
    maxPrice: '',
    propertyType: '',
    amenities: [],
    sort: 'createdAt',
    order: 'desc'
  });

  const [showFilters, setShowFilters] = useState(false);

  const { data: listingsData, isLoading, error } = useQuery(
    ['listings', filters],
    async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== '') {
          if (Array.isArray(value)) {
            value.forEach(v => params.append(key, v));
          } else {
            params.append(key, value);
          }
        }
      });
      
      const response = await axios.get(`/api/listings?${params}`);
      return response.data;
    },
    {
      keepPreviousData: true
    }
  );

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAmenityToggle = (amenity) => {
    setFilters(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const amenityOptions = [
    'WiFi', 'Kitchen', 'Parking', 'Air Conditioning', 
    'Pool', 'Gym', 'Balcony', 'Laundry'
  ];

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600">
            {error.response?.data?.message || 'Failed to load listings'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Browse Properties
          </h1>
          <p className="text-gray-600">
            Find your perfect rental space from our curated collection
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-80">
            <div className="bg-white rounded-xl shadow-md p-6 sticky top-24">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                  <Filter className="w-5 h-5 mr-2 text-emerald-600" />
                  Filters
                </h2>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="lg:hidden btn-secondary text-sm"
                >
                  {showFilters ? 'Hide' : 'Show'}
                </button>
              </div>

              <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Search */}
                <div>
                  <label className="form-label">Search</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Location or property name"
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="form-input pl-10"
                    />
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <label className="form-label">Price Range</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                      className="form-input"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                      className="form-input"
                    />
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="form-label">Property Type</label>
                  <select
                    value={filters.propertyType}
                    onChange={(e) => handleFilterChange('propertyType', e.target.value)}
                    className="form-input"
                  >
                    <option value="">All Types</option>
                    <option value="apartment">Apartment</option>
                    <option value="house">House</option>
                    <option value="studio">Studio</option>
                    <option value="condo">Condo</option>
                    <option value="loft">Loft</option>
                  </select>
                </div>

                {/* Amenities */}
                <div>
                  <label className="form-label">Amenities</label>
                  <div className="space-y-2">
                    {amenityOptions.map(amenity => (
                      <label key={amenity} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={filters.amenities.includes(amenity)}
                          onChange={() => handleAmenityToggle(amenity)}
                          className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{amenity}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Sort */}
                <div>
                  <label className="form-label">Sort By</label>
                  <select
                    value={`${filters.sort}-${filters.order}`}
                    onChange={(e) => {
                      const [sort, order] = e.target.value.split('-');
                      handleFilterChange('sort', sort);
                      handleFilterChange('order', order);
                    }}
                    className="form-input"
                  >
                    <option value="createdAt-desc">Newest First</option>
                    <option value="price-asc">Price: Low to High</option>
                    <option value="price-desc">Price: High to Low</option>
                    <option value="rating-desc">Highest Rated</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Listings Grid */}
          <div className="flex-1">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <p className="text-gray-600">
                    {listingsData?.data?.length || 0} properties found
                  </p>
                </div>

                {listingsData?.data?.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🏠</div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      No properties found
                    </h3>
                    <p className="text-gray-600">
                      Try adjusting your filters to see more results
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {listingsData?.data?.map((listing) => (
                      <div
                        key={listing._id}
                        className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                      >
                        <div className="relative h-48">
                          <img
                            src={listing.images?.[0]?.url || 'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg'}
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg">
                            <span className="text-emerald-600 font-semibold">
                              {formatPrice(listing.price)}
                            </span>
                            <span className="text-gray-500 text-sm">/night</span>
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

                          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                            {listing.description}
                          </p>

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

                          <div className="flex flex-wrap gap-1 mb-4">
                            {listing.amenities?.slice(0, 3).map((amenity, index) => (
                              <span
                                key={index}
                                className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full text-xs"
                              >
                                {amenity}
                              </span>
                            ))}
                            {listing.amenities?.length > 3 && (
                              <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded-full text-xs">
                                +{listing.amenities.length - 3} more
                              </span>
                            )}
                          </div>

                          <button className="w-full btn-primary">
                            View Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingsPage;