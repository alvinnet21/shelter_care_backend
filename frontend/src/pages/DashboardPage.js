import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Home, Calendar, Users, Plus, Eye, Star, TrendingUp, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const DashboardPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [listings, setListings] = useState([]);
  const [recommendedListings, setRecommendedListings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const bookingsRes = await axios.get(`${API}/bookings/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(bookingsRes.data.bookings);

      if (user.role === 'PROVIDER') {
        const listingsRes = await axios.get(`${API}/listings/provider/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setListings(listingsRes.data.listings);
      }

      // Fetch recommended listings for seekers
      if (user.role === 'SEEKER') {
        const recommendedRes = await axios.get(`${API}/listings/recommended`);
        setRecommendedListings(recommendedRes.data.listings.slice(0, 4));
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  const getDashboardStats = () => {
    if (user.role === 'SEEKER') {
      const pending = bookings.filter(b => b.status === 'PENDING').length;
      const accepted = bookings.filter(b => b.status === 'ACCEPTED').length;
      return [
        { label: 'Total Bookings', value: bookings.length, icon: Calendar },
        { label: 'Pending', value: pending, icon: Calendar },
        { label: 'Accepted', value: accepted, icon: Calendar }
      ];
    } else if (user.role === 'PROVIDER') {
      const pending = bookings.filter(b => b.status === 'PENDING').length;
      return [
        { label: 'My Listings', value: listings.length, icon: Home },
        { label: 'Incoming Requests', value: pending, icon: Calendar },
        { label: 'Total Bookings', value: bookings.length, icon: Calendar }
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#111827] mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
            data-testid="dashboard-title"
          >
            Welcome back, {user.full_name}!
          </h1>
          <p className="text-[#4b5563]">
            {user.role === 'SEEKER' && 'Browse shelters and manage your bookings'}
            {user.role === 'PROVIDER' && 'Manage your listings and booking requests'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {getDashboardStats().map((stat, index) => (
            <div
              key={index}
              className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
              data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">
                    {stat.label}
                  </p>
                  <p className="text-3xl font-bold text-[#111827]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                    {stat.value}
                  </p>
                </div>
                <div className="w-12 h-12 bg-[#e51636]/10 rounded-lg flex items-center justify-center">
                  <stat.icon className="h-6 w-6 text-[#e51636]" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2
                className="text-2xl font-semibold text-[#111827]"
                style={{ fontFamily: 'Outfit, sans-serif' }}
              >
                Quick Actions
              </h2>
            </div>
            <div className="space-y-4">
              {user.role === 'SEEKER' && (
                <Link
                  to="/listings"
                  className="block bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-[0_12px_48px_rgba(229,22,54,0.1)] transition-all card-hover"
                  data-testid="action-browse-listings"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[#e51636]/10 rounded-lg flex items-center justify-center">
                      <Home className="h-6 w-6 text-[#e51636]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827]">Browse Shelters</h3>
                      <p className="text-sm text-[#4b5563]">Find available shelter listings</p>
                    </div>
                  </div>
                </Link>
              )}
              {user.role === 'PROVIDER' && (
                <>
                  <Link
                    to="/listings/create"
                    className="block bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-[0_12px_48px_rgba(229,22,54,0.1)] transition-all card-hover"
                    data-testid="action-create-listing"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#e51636]/10 rounded-lg flex items-center justify-center">
                        <Plus className="h-6 w-6 text-[#e51636]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#111827]">Create New Listing</h3>
                        <p className="text-sm text-[#4b5563]">Share your available space</p>
                      </div>
                    </div>
                  </Link>
                  <Link
                    to="/listings/my"
                    className="block bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-[0_12px_48px_rgba(229,22,54,0.1)] transition-all card-hover"
                    data-testid="action-my-listings"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-[#e51636]/10 rounded-lg flex items-center justify-center">
                        <Home className="h-6 w-6 text-[#e51636]" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-[#111827]">My Listings</h3>
                        <p className="text-sm text-[#4b5563]">Manage your shelter listings</p>
                      </div>
                    </div>
                  </Link>
                </>
              )}
              <Link
                to="/bookings"
                className="block bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-[0_12px_48px_rgba(229,22,54,0.1)] transition-all card-hover"
                data-testid="action-view-bookings"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-[#e51636]/10 rounded-lg flex items-center justify-center">
                    <Eye className="h-6 w-6 text-[#e51636]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#111827]">View Bookings</h3>
                    <p className="text-sm text-[#4b5563]">Manage your booking requests</p>
                  </div>
                </div>
              </Link>
            </div>
          </div>

          <div>
            <h2
              className="text-2xl font-semibold text-[#111827] mb-4"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Recent Activity
            </h2>
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-6">
              {loading ? (
                <p className="text-[#4b5563] text-center py-8">Loading...</p>
              ) : bookings.length > 0 ? (
                <div className="space-y-4">
                  {bookings.slice(0, 5).map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between py-3 border-b border-[#e5e7eb] last:border-0">
                      <div>
                        <p className="font-medium text-[#111827]">{booking.listing_title}</p>
                        <p className="text-sm text-[#4b5563]">
                          {user.role === 'PROVIDER' ? booking.seeker_name : 'Your booking'}
                        </p>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          booking.status === 'ACCEPTED'
                            ? 'bg-green-100 text-green-800'
                            : booking.status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {booking.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#4b5563] text-center py-8">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Recommended Shelters Section for Seekers */}
        {user.role === 'SEEKER' && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-[#e51636]" />
                <h2
                  className="text-2xl font-semibold text-[#111827]"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                >
                  Recommended Shelters
                </h2>
              </div>
              <Link 
                to="/listings" 
                className="text-[#e51636] hover:text-[#c4122f] text-sm font-medium"
              >
                View All
              </Link>
            </div>
            
            {loading ? (
              <div className="text-center py-8">
                <p className="text-[#4b5563]">Loading recommendations...</p>
              </div>
            ) : recommendedListings.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {recommendedListings.map((listing) => (
                  <Link
                    key={listing.id}
                    to={`/listings/${listing.id}`}
                    className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden hover:shadow-[0_12px_48px_rgba(229,22,54,0.1)] transition-all card-hover"
                    data-testid={`recommended-listing-${listing.id}`}
                  >
                    <div className="aspect-video relative">
                      {listing.photos && listing.photos.length > 0 ? (
                        <img
                          src={listing.photos[0]}
                          alt={listing.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-[#f3f4f6] flex items-center justify-center">
                          <Home className="h-12 w-12 text-[#9ca3af]" />
                        </div>
                      )}
                      {listing.recommendation_score > 0 && (
                        <div className="absolute top-2 right-2 bg-[#e51636] text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          Top Rated
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold text-[#111827] mb-1 truncate">{listing.title}</h3>
                      <div className="flex items-center text-sm text-[#4b5563] mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="truncate">{listing.address}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-sm font-medium text-[#111827]">
                            {listing.average_rating || 0}
                          </span>
                          <span className="text-xs text-[#9ca3af]">
                            ({listing.review_count || 0} reviews)
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 text-center">
                <Home className="h-12 w-12 text-[#9ca3af] mx-auto mb-4" />
                <p className="text-[#4b5563]">No recommended shelters available yet</p>
                <Link 
                  to="/listings" 
                  className="inline-block mt-4 text-[#e51636] hover:text-[#c4122f] font-medium"
                >
                  Browse All Listings
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
