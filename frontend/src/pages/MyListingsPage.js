import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Home, Edit, Eye, MapPin, Star, CalendarOff, X, Calendar, Plus } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MyListingsPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [selectedListing, setSelectedListing] = useState(null);
  const [blockedDates, setBlockedDates] = useState([]);
  const [newBlockStartDate, setNewBlockStartDate] = useState('');
  const [newBlockEndDate, setNewBlockEndDate] = useState('');
  const [loadingBlock, setLoadingBlock] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'PROVIDER') {
      navigate('/dashboard');
      return;
    }
    fetchListings();
  }, [user]);

  const fetchListings = async () => {
    try {
      const response = await axios.get(`${API}/listings/provider/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setListings(response.data.listings);
    } catch (error) {
      console.error('Failed to fetch listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  };

  const getAverageRating = (reviews) => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, r) => acc + r.rating, 0);
    return (sum / reviews.length).toFixed(1);
  };

  const openBlockModal = async (listing) => {
    setSelectedListing(listing);
    setShowBlockModal(true);
    
    try {
      const response = await axios.get(`${API}/listings/${listing.id}/availability`);
      // Filter only manual blocked dates
      const manualBlocks = response.data.blocked_dates
        .filter(d => d.type === 'manual')
        .map(d => d.check_in);
      setBlockedDates(manualBlocks);
    } catch (error) {
      console.error('Failed to fetch blocked dates:', error);
      setBlockedDates([]);
    }
  };

  const closeBlockModal = () => {
    setShowBlockModal(false);
    setSelectedListing(null);
    setBlockedDates([]);
    setNewBlockDate('');
  };

  const handleBlockDate = async () => {
    if (!newBlockDate || !selectedListing) return;
    
    setLoadingBlock(true);
    try {
      await axios.post(
        `${API}/listings/${selectedListing.id}/block-dates`,
        { dates: [newBlockDate] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlockedDates([...blockedDates, newBlockDate]);
      setNewBlockDate('');
      toast.success('Date blocked successfully');
    } catch (error) {
      console.error('Failed to block date:', error);
      toast.error('Failed to block date');
    } finally {
      setLoadingBlock(false);
    }
  };

  const handleUnblockDate = async (date) => {
    if (!selectedListing) return;
    
    try {
      await axios.post(
        `${API}/listings/${selectedListing.id}/unblock-dates`,
        { dates: [date] },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setBlockedDates(blockedDates.filter(d => d !== date));
      toast.success('Tanggal berhasil di-unblock');
    } catch (error) {
      console.error('Failed to unblock date:', error);
      toast.error('Failed to unblock date');
    }
  };

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#111827] mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
            data-testid="my-listings-title"
          >
            My Listings
          </h1>
          <p className="text-[#4b5563]">
            Manage your shelter listings
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-[#4b5563]">Loading listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
            <Home className="h-16 w-16 text-[#9ca3af] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#111827] mb-2">No listings yet</h3>
            <p className="text-[#4b5563] mb-6">Create your first listing to start helping</p>
            <Link
              to="/listings/create"
              className="inline-block bg-[#e51636] text-white hover:bg-[#c4122f] px-6 py-3 rounded-lg transition-all"
            >
              Create Listing
            </Link>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div></div>
              <Link
                to="/listings/create"
                className="inline-flex items-center gap-2 bg-[#e51636] text-white hover:bg-[#c4122f] px-5 py-2.5 rounded-lg transition-all font-medium"
                data-testid="create-listing-btn"
              >
                <Plus className="h-5 w-5" />Create Listing
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)] card-hover"
                data-testid={`my-listing-card-${listing.id}`}
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
                      <Home className="h-16 w-16 text-[#9ca3af]" />
                    </div>
                  )}
                  <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-sm font-medium ${
                    listing.is_available 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-500 text-white'
                  }`}>
                    {listing.is_available ? 'Available' : 'Unavailable'}
                  </div>
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
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-500 fill-current mr-1" />
                      <span className="font-medium text-[#111827]">
                        {getAverageRating(listing.reviews)}
                      </span>
                      <span className="text-sm text-[#4b5563] ml-1">
                        ({listing.reviews?.length || 0})
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Link
                      to={`/listings/${listing.id}`}
                      className="flex-1 bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] py-2 rounded-lg transition-all flex items-center justify-center space-x-2"
                      data-testid={`view-listing-${listing.id}`}
                    >
                      <Eye className="h-4 w-4" />
                      <span>View</span>
                    </Link>
                    <Link
                      to={`/listings/${listing.id}/edit`}
                      className="flex-1 bg-[#e51636] text-white hover:bg-[#c4122f] py-2 rounded-lg transition-all flex items-center justify-center space-x-2"
                      data-testid={`edit-listing-${listing.id}`}
                    >
                      <Edit className="h-4 w-4" />
                      <span>Edit</span>
                    </Link>
                  </div>
                  <button
                    onClick={() => openBlockModal(listing)}
                    className="w-full mt-2 bg-orange-500 text-white hover:bg-orange-600 py-2 rounded-lg transition-all flex items-center justify-center space-x-2"
                    data-testid={`block-dates-${listing.id}`}
                  >
                    <CalendarOff className="h-4 w-4" />
                    <span>Block Dates</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
          </div>
        )}

        {/* Block Dates Modal */}
        {showBlockModal && selectedListing && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" data-testid="block-dates-modal">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-[#111827]">
                  Block Availability
                </h3>
                <button
                  onClick={closeBlockModal}
                  className="text-[#9ca3af] hover:text-[#4b5563]"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <p className="text-[#4b5563] mb-4">
                Block dates for <span className="font-medium text-[#111827]">{selectedListing.title}</span>
              </p>
              
              {/* Add New Block Date Range */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#4b5563] mb-2">
                  Block Date Range
                </label>
                <div className="flex gap-2 items-center mb-2">
                  <input
                    type="date"
                    value={newBlockStartDate}
                    onChange={(e) => setNewBlockStartDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="flex-1 px-3 py-2 border border-[#e5e7eb] rounded-lg focus:ring-2 focus:ring-[#e51636] focus:border-transparent text-sm"
                    data-testid="block-start-date-input"
                  />
                  <span className="text-[#9ca3af] text-sm">to</span>
                  <input
                    type="date"
                    value={newBlockEndDate}
                    onChange={(e) => setNewBlockEndDate(e.target.value)}
                    min={newBlockStartDate || new Date().toISOString().split('T')[0]}
                    className="flex-1 px-3 py-2 border border-[#e5e7eb] rounded-lg focus:ring-2 focus:ring-[#e51636] focus:border-transparent text-sm"
                    data-testid="block-end-date-input"
                  />
                </div>
                <button
                  onClick={handleBlockDate}
                  disabled={!newBlockStartDate || loadingBlock}
                  className="w-full px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-all disabled:opacity-50"
                  data-testid="add-block-date-btn"
                >
                  {loadingBlock ? 'Blocking...' : 'Block Dates'}
                </button>
              </div>
              
              {/* List of Blocked Dates */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#4b5563] mb-2">
                  Blocked Dates (Manual)
                </label>
                {blockedDates.length === 0 ? (
                  <p className="text-sm text-[#9ca3af] italic">No manually blocked dates</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {blockedDates.sort().map((date) => (
                      <div
                        key={date}
                        className="flex items-center justify-between bg-orange-50 border border-orange-200 rounded-lg px-3 py-2"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-orange-600" />
                          <span className="text-sm text-[#111827]">
                            {new Date(date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </div>
                        <button
                          onClick={() => handleUnblockDate(date)}
                          className="text-red-500 hover:text-red-700 p-1"
                          data-testid={`unblock-${date}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={closeBlockModal}
                  className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563] hover:bg-[#f9fafb] transition-all"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyListingsPage;
