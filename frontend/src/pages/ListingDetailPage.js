import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { MapPin, Star, Calendar, ArrowLeft, Send, Lock } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ListingDetailPage = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkInDate, setCheckInDate] = useState('');
  const [checkOutDate, setCheckOutDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);

  useEffect(() => {
    fetchListing();
    fetchBlockedDates();
  }, [id]);

  const fetchListing = async () => {
    try {
      const response = await axios.get(`${API}/listings/${id}`);
      setListing(response.data);
    } catch (error) {
      console.error('Failed to fetch listing:', error);
      toast.error('Failed to load listing details');
      navigate('/listings');
    } finally {
      setLoading(false);
    }
  };

  const fetchBlockedDates = async () => {
    try {
      const response = await axios.get(`${API}/listings/${id}/availability`);
      setBlockedDates(response.data.blocked_dates);
    } catch (error) {
      console.error('Failed to fetch blocked dates:', error);
    }
  };

  // Compute blocked date ranges for display
  const blockedDateInfo = useMemo(() => {
    const accepted = blockedDates.filter(d => d.status === 'ACCEPTED');
    const pending = blockedDates.filter(d => d.status === 'PENDING');
    const manual = blockedDates.filter(d => d.type === 'manual');
    return { accepted, pending, manual, total: blockedDates.length };
  }, [blockedDates]);

  // Check if a date falls within any blocked range
  const isDateBlocked = (dateStr) => {
    const date = new Date(dateStr);
    for (const block of blockedDates) {
      const checkIn = new Date(block.check_in);
      const checkOut = new Date(block.check_out);
      if (date >= checkIn && date < checkOut) return true;
      // For manual blocks, check exact date match
      if (block.type === 'manual' && dateStr === block.check_in) return true;
    }
    return false;
  };

  const handleBooking = async (e) => {
    e.preventDefault();

    if (!user) {
      toast.error('Please login to book a shelter');
      navigate('/login');
      return;
    }

    if (user.role !== 'SEEKER') {
      toast.error('Only shelter seekers can book listings');
      return;
    }

    if (!checkInDate || !checkOutDate) {
      toast.error('Please select check-in and check-out dates');
      return;
    }

    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (checkOut <= checkIn) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    // Client-side check for blocked dates
    if (isDateBlocked(checkInDate) || isDateBlocked(checkOutDate)) {
      toast.error('Selected dates overlap with blocked dates. Please choose different dates.');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(
        `${API}/bookings`,
        {
          listing_id: id,
          check_in_date: new Date(checkInDate).toISOString(),
          check_out_date: new Date(checkOutDate).toISOString()
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Booking request sent successfully!');
      navigate('/bookings');
    } catch (error) {
      console.error('Failed to create booking:', error);
      toast.error(error.response?.data?.detail || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen-header flex items-center justify-center">
        <p className="text-[#4b5563]">Loading...</p>
      </div>
    );
  }

  if (!listing) return null;

  const avgRating = listing.reviews && listing.reviews.length > 0
    ? (listing.reviews.reduce((acc, r) => acc + r.rating, 0) / listing.reviews.length).toFixed(1)
    : 0;

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/listings')}
          className="flex items-center text-[#4b5563] hover:text-[#e51636] mb-6 transition-colors"
          data-testid="back-to-listings"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Listings
        </button>

        <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
            {listing.photos && listing.photos.length > 0 ? (
              listing.photos.map((photo, index) => (
                <img
                  key={index}
                  src={photo}
                  alt={`${listing.title} ${index + 1}`}
                  className="w-full h-64 object-cover rounded-lg"
                />
              ))
            ) : (
              <div className="w-full h-64 bg-[#f3f4f6] rounded-lg flex items-center justify-center">
                <p className="text-[#9ca3af]">No photos available</p>
              </div>
            )}
          </div>

          <div className="p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1
                  className="text-3xl font-bold text-[#111827] mb-2"
                  style={{ fontFamily: 'Outfit, sans-serif' }}
                  data-testid="listing-detail-title"
                >
                  {listing.title}
                </h1>
                <div className="flex items-center text-[#4b5563] mb-2">
                  <MapPin className="h-5 w-5 mr-2" />
                  <span>{listing.address}</span>
                </div>
                <p className="text-[#4b5563]">Hosted by {listing.provider_name}</p>
              </div>
              <div className="flex items-center bg-[#f9fafb] px-4 py-2 rounded-lg">
                <Star className="h-6 w-6 text-yellow-500 fill-current mr-2" />
                <div>
                  <p className="text-2xl font-bold text-[#111827]">{avgRating}</p>
                  <p className="text-xs text-[#4b5563]">({listing.reviews?.length || 0} reviews)</p>
                </div>
              </div>
            </div>

            <div className="border-t border-[#e5e7eb] pt-6 mb-6">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">About this shelter</h2>
              <p className="text-[#4b5563] leading-relaxed">{listing.description}</p>
            </div>

            {/* Blocked Dates Info */}
            {blockedDateInfo.total > 0 && (
              <div className="border-t border-[#e5e7eb] pt-6 mb-6">
                <h2 className="text-xl font-semibold text-[#111827] mb-4 flex items-center gap-2">
                  <Lock className="h-5 w-5 text-[#e51636]" />
                  Blocked Dates
                </h2>
                <div className="space-y-2">
                  {blockedDateInfo.accepted.map((block, i) => (
                    <div key={`accepted-${i}`} className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                      <Calendar className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-800">
                        {new Date(block.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' - '}
                        {new Date(block.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="ml-2 text-xs font-medium bg-red-200 px-2 py-0.5 rounded">Booked</span>
                      </span>
                    </div>
                  ))}
                  {blockedDateInfo.pending.map((block, i) => (
                    <div key={`pending-${i}`} className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">
                      <Calendar className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm text-yellow-800">
                        {new Date(block.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {' - '}
                        {new Date(block.check_out).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="ml-2 text-xs font-medium bg-yellow-200 px-2 py-0.5 rounded">Pending</span>
                      </span>
                    </div>
                  ))}
                  {blockedDateInfo.manual.map((block, i) => (
                    <div key={`manual-${i}`} className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                      <Calendar className="h-4 w-4 text-orange-600" />
                      <span className="text-sm text-orange-800">
                        {new Date(block.check_in).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        <span className="ml-2 text-xs font-medium bg-orange-200 px-2 py-0.5 rounded">Blocked by Provider</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {user && user.role === 'SEEKER' && listing.is_available && (
              <div className="border-t border-[#e5e7eb] pt-6 mb-6">
                <h2 className="text-xl font-semibold text-[#111827] mb-4">Book this shelter</h2>
                {blockedDates.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      Some dates may not be available due to existing bookings or provider blocks. Please check the blocked dates above before booking.
                    </p>
                  </div>
                )}
                <form onSubmit={handleBooking} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-2">
                        Check-in Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                        <input
                          type="date"
                          value={checkInDate}
                          onChange={(e) => setCheckInDate(e.target.value)}
                          min={new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                          required
                          data-testid="check-in-date-input"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-2">
                        Check-out Date
                      </label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                        <input
                          type="date"
                          value={checkOutDate}
                          onChange={(e) => setCheckOutDate(e.target.value)}
                          min={checkInDate || new Date().toISOString().split('T')[0]}
                          className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                          required
                          data-testid="check-out-date-input"
                        />
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-[#e51636] text-white hover:bg-[#c4122f] px-8 py-3 rounded-lg transition-all font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                    data-testid="submit-booking-button"
                  >
                    <Send className="h-5 w-5" />
                    <span>{submitting ? 'Booking...' : 'Request Booking'}</span>
                  </button>
                </form>
              </div>
            )}

            {listing.reviews && listing.reviews.length > 0 && (
              <div className="border-t border-[#e5e7eb] pt-6">
                <h2 className="text-xl font-semibold text-[#111827] mb-4">Reviews</h2>
                <div className="space-y-4">
                  {listing.reviews.map((review) => (
                    <div key={review.id} className="bg-[#f9fafb] rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-medium text-[#111827]">{review.user_name}</p>
                        <div className="flex items-center">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                          ))}
                        </div>
                      </div>
                      <p className="text-[#4b5563]">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ListingDetailPage;
