import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { MapPin, Star, Eye, Home as HomeIcon, Search, Map } from 'lucide-react';
import { toast } from 'sonner';
import MapView from '../components/MapView';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ListingsPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [filteredListings, setFilteredListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid');

  useEffect(() => {
    fetchListings();
  }, []);

  useEffect(() => {
    filterListings();
  }, [searchTerm, listings]);

  const fetchListings = async () => {
    try {
      const response = await axios.get(`${API}/listings?available_only=false`);
      setListings(response.data.listings);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const filterListings = () => {
    let filtered = [...listings];
    if (searchTerm) {
      filtered = filtered.filter(l =>
        l.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredListings(filtered);
  };

  const getAverageRating = (reviews) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#111827] mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
            data-testid="listings-title"
          >
            Available Shelters
          </h1>
          <p className="text-[#4b5563]">
            Browse through available shelter listings and find a safe place
          </p>
        </div>

        <div className="mb-6 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by title, location, or description..."
              className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
              data-testid="search-listings-input"
            />
          </div>

          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-4">
              <p className="text-sm text-[#4b5563]">
                Showing {filteredListings.length} of {listings.length} shelters
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-lg transition-all ${
                    viewMode === 'grid'
                      ? 'bg-[#e51636] text-white'
                      : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb]'
                  }`}
                  data-testid="view-grid-button"
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`px-4 py-2 rounded-lg transition-all flex items-center space-x-2 ${
                    viewMode === 'map'
                      ? 'bg-[#e51636] text-white'
                      : 'bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb]'
                  }`}
                  data-testid="view-map-button"
                >
                  <Map className="h-4 w-4" />
                  <span>Map</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-[#4b5563]">Loading shelters...</p>
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
            <HomeIcon className="h-16 w-16 text-[#9ca3af] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#111827] mb-2">
              {searchTerm ? 'No shelters match your search' : 'No shelters available'}
            </h3>
            <p className="text-[#4b5563]">
              {searchTerm ? 'Try different keywords' : 'Check back later for new listings'}
            </p>
          </div>
        ) : viewMode === 'map' ? (
          <MapView
            listings={filteredListings}
            onMarkerClick={(listingId) => navigate(`/listings/${listingId}`)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredListings.map((listing) => (
              <Link
                key={listing.id}
                to={`/listings/${listing.id}`}
                className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)] card-hover"
                data-testid={`listing-card-${listing.id}`}
              >
                <div className="relative h-48 bg-[#f3f4f6]">
                  {listing.photos && listing.photos.length > 0 ? (
                    <img
                      src={listing.photos[0]}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <HomeIcon className="h-16 w-16 text-[#9ca3af]" />
                    </div>
                  )}
                  {listing.is_available && (
                    <div className="absolute top-4 right-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                      Available
                    </div>
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-[#111827] mb-2">
                    {listing.title}
                  </h3>
                  <div className="flex items-center text-sm text-[#4b5563] mb-3">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{listing.address}</span>
                  </div>
                  <p className="text-[#4b5563] mb-4 line-clamp-2">
                    {listing.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-500 fill-current mr-1" />
                      <span className="font-medium text-[#111827]">
                        {getAverageRating(listing.reviews)}
                      </span>
                      <span className="text-sm text-[#4b5563] ml-1">
                        ({listing.reviews?.length || 0})
                      </span>
                    </div>
                    <div className="flex items-center text-[#e51636]">
                      <Eye className="h-5 w-5 mr-1" />
                      <span className="font-medium">View Details</span>
                    </div>
                  </div>
                  <p className="text-sm text-[#4b5563] mt-3">
                    Hosted by {listing.provider_name}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingsPage;
