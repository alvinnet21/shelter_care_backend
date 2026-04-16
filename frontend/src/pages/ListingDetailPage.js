import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { MapPin, Star, Calendar as CalendarIcon, ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { format, eachDayOfInterval, parseISO, isWithinInterval, isBefore, startOfDay } from 'date-fns';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ListingDetailPage = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);

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

  // Build array of disabled Date objects from blocked ranges
  const disabledDays = useMemo(() => {
    const days = [];
    for (const block of blockedDates) {
      try {
        const checkIn = startOfDay(parseISO(block.check_in));
        const checkOut = startOfDay(parseISO(block.check_out));
        if (block.type === 'manual') {
          days.push(checkIn);
        } else {
          const range = eachDayOfInterval({ start: checkIn, end: checkOut });
          // exclude the checkout day itself for bookings (checkout day is available)
          range.forEach((d, idx) => {
            if (idx < range.length - 1) {
              days.push(d);
            }
          });
        }
      } catch (e) {
        // skip invalid dates
      }
    }
    // Also disable past dates
    days.push({ before: startOfDay(new Date()) });
    return days;
  }, [blockedDates]);

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

    if (checkOutDate <= checkInDate) {
      toast.error('Check-out date must be after check-in date');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(
        `${API}/bookings`,
        {
          listing_id: id,
          check_in_date: checkInDate.toISOString(),
          check_out_date: checkOutDate.toISOString()
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
                  <span>{listing.address}{listing.suburb ? `, ${listing.suburb}` : ''}{listing.postcode ? ` ${listing.postcode}` : ''}</span>
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

            {/* Who owns this space */}
            <div className="border-t border-[#e5e7eb] pt-6 mb-6">
              <h2 className="text-xl font-semibold text-[#111827] mb-4">Who owns this space</h2>
              <Link to={`/profile/${listing.provider_id}`} className="flex items-center gap-4 p-4 bg-[#f9fafb] rounded-lg hover:bg-[#f3f4f6] transition-all" data-testid="provider-profile-link">
                <div className="w-14 h-14 rounded-full bg-[#e51636] flex items-center justify-center text-white font-bold text-xl overflow-hidden flex-shrink-0">
                  {listing.provider_photo ? <img src={listing.provider_photo} alt="" className="w-full h-full object-cover" /> : listing.provider_name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-[#111827] hover:text-[#e51636] transition-colors">{listing.provider_name}</p>
                  <p className="text-sm text-[#4b5563]">View profile</p>
                </div>
              </Link>
            </div>

            <div className="border-t border-[#e5e7eb] pt-6 mb-6">
              <h2 className="text-xl font-semibold text-[#111827] mb-3">About this shelter</h2>
              <p className="text-[#4b5563] leading-relaxed">{listing.description}</p>
            </div>

            {user && user.role === 'SEEKER' && listing.is_available && (
              <div className="border-t border-[#e5e7eb] pt-6 mb-6">
                <h2 className="text-xl font-semibold text-[#111827] mb-4">Book this shelter</h2>
                {blockedDates.length > 0 && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <p className="text-sm text-yellow-800">
                      Some dates are unavailable. Blocked dates are greyed out in the calendar.
                    </p>
                  </div>
                )}
                <form onSubmit={handleBooking} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Check-in Date Picker */}
                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-2">
                        Check-in Date
                      </label>
                      <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center px-4 py-3 border border-[#e5e7eb] rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636] bg-white"
                            data-testid="check-in-date-input"
                          >
                            <CalendarIcon className="h-5 w-5 text-[#9ca3af] mr-3" />
                            <span className={checkInDate ? 'text-[#111827]' : 'text-[#9ca3af]'}>
                              {checkInDate ? format(checkInDate, 'MMM dd, yyyy') : 'Select check-in date'}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={checkInDate}
                            onSelect={(date) => {
                              setCheckInDate(date);
                              setCheckInOpen(false);
                              if (checkOutDate && date && checkOutDate <= date) {
                                setCheckOutDate(null);
                              }
                            }}
                            disabled={disabledDays}
                            initialFocus
                            classNames={{
                              day_disabled: "text-[#d1d5db] opacity-30 line-through cursor-not-allowed bg-red-50",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Check-out Date Picker */}
                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-2">
                        Check-out Date
                      </label>
                      <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className="w-full flex items-center px-4 py-3 border border-[#e5e7eb] rounded-lg text-left focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636] bg-white"
                            data-testid="check-out-date-input"
                          >
                            <CalendarIcon className="h-5 w-5 text-[#9ca3af] mr-3" />
                            <span className={checkOutDate ? 'text-[#111827]' : 'text-[#9ca3af]'}>
                              {checkOutDate ? format(checkOutDate, 'MMM dd, yyyy') : 'Select check-out date'}
                            </span>
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={checkOutDate}
                            onSelect={(date) => {
                              setCheckOutDate(date);
                              setCheckOutOpen(false);
                            }}
                            disabled={[
                              ...disabledDays,
                              ...(checkInDate ? [{ before: checkInDate }] : [])
                            ]}
                            initialFocus
                            classNames={{
                              day_disabled: "text-[#d1d5db] opacity-30 line-through cursor-not-allowed bg-red-50",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Selected dates summary */}
                  {checkInDate && checkOutDate && (
                    <div className="bg-[#f0fdf4] border border-green-200 rounded-lg p-3">
                      <p className="text-sm text-green-800">
                        <span className="font-medium">Selected:</span> {format(checkInDate, 'MMM dd, yyyy')} to {format(checkOutDate, 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting || !checkInDate || !checkOutDate}
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
