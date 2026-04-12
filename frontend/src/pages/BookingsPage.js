import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Calendar, User, CheckCircle, XCircle, Clock, AlertCircle, Star, Ban } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BookingsPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectingBookingId, setRejectingBookingId] = useState(null);
  const [reviewingBookingId, setReviewingBookingId] = useState(null);
  const [reviewData, setReviewData] = useState({ rating: 5, comment: '' });
  const [existingReviews, setExistingReviews] = useState({});
  const [cancellingId, setCancellingId] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBookings();
  }, [user]);

  const fetchBookings = async () => {
    try {
      const response = await axios.get(`${API}/bookings/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(response.data.bookings);
      
      // Fetch existing reviews for accepted bookings
      if (user.role === 'SEEKER') {
        const acceptedBookings = response.data.bookings.filter(b => b.status === 'ACCEPTED');
        for (const booking of acceptedBookings) {
          try {
            const reviewRes = await axios.get(`${API}/bookings/${booking.id}/review`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (reviewRes.data.has_review) {
              setExistingReviews(prev => ({
                ...prev,
                [booking.id]: reviewRes.data.review
              }));
            }
          } catch (err) {
            console.error('Failed to fetch review:', err);
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch bookings:', error);
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (bookingId) => {
    try {
      await axios.put(
        `${API}/bookings/${bookingId}/accept`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Booking accepted!');
      fetchBookings();
    } catch (error) {
      console.error('Failed to accept booking:', error);
      toast.error('Failed to accept booking');
    }
  };

  const handleReject = async (bookingId) => {
    if (!rejectReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await axios.put(
        `${API}/bookings/${bookingId}/reject`,
        { reason: rejectReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Booking rejected');
      setRejectingBookingId(null);
      setRejectReason('');
      fetchBookings();
    } catch (error) {
      console.error('Failed to reject booking:', error);
      toast.error('Failed to reject booking');
    }
  };

  const handleCancel = async (bookingId) => {
    setCancellingId(bookingId);
    try {
      await axios.put(
        `${API}/bookings/${bookingId}/cancel`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Booking cancelled successfully');
      fetchBookings();
    } catch (error) {
      console.error('Failed to cancel booking:', error);
      toast.error(error.response?.data?.detail || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const handleSubmitReview = async (listingId, bookingId) => {
    if (!reviewData.comment.trim()) {
      toast.error('Please write a review comment');
      return;
    }

    try {
      const response = await axios.post(
        `${API}/bookings/${bookingId}/review`,
        {
          rating: reviewData.rating,
          comment: reviewData.comment
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      if (response.data.is_new) {
        toast.success('Review submitted successfully!');
      } else {
        toast.success('Review updated successfully!');
      }
      
      setReviewingBookingId(null);
      setReviewData({ rating: 5, comment: '' });
      fetchBookings();
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error(error.response?.data?.detail || 'Failed to submit review');
    }
  };

  const handleEditReview = async (bookingId) => {
    const existingReview = existingReviews[bookingId];
    if (existingReview) {
      setReviewData({
        rating: existingReview.rating,
        comment: existingReview.comment
      });
    }
    setReviewingBookingId(bookingId);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status) => {
    const config = {
      ACCEPTED: { bg: 'bg-green-100 text-green-800', icon: CheckCircle },
      REJECTED: { bg: 'bg-red-100 text-red-800', icon: XCircle },
      PENDING: { bg: 'bg-yellow-100 text-yellow-800', icon: Clock },
      CANCELLED: { bg: 'bg-gray-100 text-gray-800', icon: Ban }
    };
    const c = config[status] || config.PENDING;
    const Icon = c.icon;
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${c.bg}`}>
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  if (!user) return null;

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1
          className="text-3xl sm:text-4xl font-bold text-[#111827] mb-8"
          style={{ fontFamily: 'Outfit, sans-serif' }}
          data-testid="bookings-title"
        >
          {user.role === 'SEEKER' && 'My Bookings'}
          {user.role === 'PROVIDER' && 'Booking Requests'}
        </h1>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-[#4b5563]">Loading bookings...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
            <Calendar className="h-16 w-16 text-[#9ca3af] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#111827] mb-2">No bookings yet</h3>
            <p className="text-[#4b5563]">Your bookings will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
                data-testid={`booking-${booking.id}`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <h3 className="text-xl font-semibold text-[#111827]">
                        {booking.listing_title}
                      </h3>
                      {getStatusBadge(booking.status)}
                    </div>
                    
                    <div className="space-y-2 text-sm text-[#4b5563]">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2" />
                        <span>
                          {user.role === 'PROVIDER' || user.role === 'VOLUNTEER'
                            ? `Seeker: ${booking.seeker_name}`
                            : 'Your booking'}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>
                          {booking.check_in_date && booking.check_out_date ? (
                            <>Check-in: {formatDate(booking.check_in_date)} | Check-out: {formatDate(booking.check_out_date)}</>
                          ) : (
                            <>Booking Date: {formatDate(booking.booking_date)}</>
                          )}
                        </span>
                      </div>
                      {booking.status === 'REJECTED' && booking.rejection_reason && (
                        <div className="flex items-start bg-red-50 p-3 rounded-lg mt-3">
                          <AlertCircle className="h-4 w-4 mr-2 text-red-600 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-red-800 font-medium text-sm">Rejection Reason:</p>
                            <p className="text-red-700 text-sm">{booking.rejection_reason}</p>
                          </div>
                        </div>
                      )}
                      {booking.status === 'CANCELLED' && (
                        <div className="flex items-start bg-gray-50 p-3 rounded-lg mt-3">
                          <Ban className="h-4 w-4 mr-2 text-gray-600 mt-0.5 flex-shrink-0" />
                          <p className="text-gray-700 text-sm">This booking was cancelled.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seeker: Cancel pending booking */}
                  {user.role === 'SEEKER' && booking.status === 'PENDING' && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="bg-gray-500 text-white hover:bg-gray-600 px-6 py-2 rounded-lg transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                        data-testid={`cancel-booking-${booking.id}`}
                      >
                        <Ban className="h-5 w-5" />
                        <span>{cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}</span>
                      </button>
                    </div>
                  )}

                  {user.role === 'PROVIDER' && booking.status === 'PENDING' && (
                    <div className="flex flex-col gap-2">
                      {rejectingBookingId === booking.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Reason for rejection..."
                            className="px-4 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 w-full"
                            data-testid={`reject-reason-input-${booking.id}`}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleReject(booking.id)}
                              className="flex-1 bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-lg transition-all text-sm"
                              data-testid={`confirm-reject-${booking.id}`}
                            >
                              Confirm Reject
                            </button>
                            <button
                              onClick={() => {
                                setRejectingBookingId(null);
                                setRejectReason('');
                              }}
                              className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300 px-4 py-2 rounded-lg transition-all text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleAccept(booking.id)}
                            className="bg-[#e51636] text-white hover:bg-[#c4122f] px-6 py-2 rounded-lg transition-all flex items-center justify-center space-x-2"
                            data-testid={`accept-booking-${booking.id}`}
                          >
                            <CheckCircle className="h-5 w-5" />
                            <span>Accept</span>
                          </button>
                          <button
                            onClick={() => setRejectingBookingId(booking.id)}
                            className="bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] px-6 py-2 rounded-lg transition-all flex items-center justify-center space-x-2"
                            data-testid={`reject-booking-${booking.id}`}
                          >
                            <XCircle className="h-5 w-5" />
                            <span>Reject</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {user.role === 'SEEKER' && booking.status === 'ACCEPTED' && (
                    <div className="flex flex-col gap-2">
                      {reviewingBookingId === booking.id ? (
                        <div className="space-y-3 bg-[#f9fafb] p-4 rounded-lg">
                          <div>
                            <label className="block text-sm font-medium text-[#111827] mb-2">Rating</label>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setReviewData({ ...reviewData, rating: star })}
                                  className="focus:outline-none"
                                  data-testid={`rating-star-${star}`}
                                >
                                  <Star
                                    className={`h-6 w-6 ${
                                      star <= reviewData.rating
                                        ? 'text-yellow-500 fill-current'
                                        : 'text-[#e5e7eb]'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-[#111827] mb-2">Your Review</label>
                            <textarea
                              value={reviewData.comment}
                              onChange={(e) => setReviewData({ ...reviewData, comment: e.target.value })}
                              placeholder="Share your experience..."
                              className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 min-h-[80px]"
                              data-testid={`review-comment-${booking.id}`}
                            />
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleSubmitReview(booking.listing_id, booking.id)}
                              className="flex-1 bg-[#e51636] text-white hover:bg-[#c4122f] px-4 py-2 rounded-lg transition-all text-sm"
                              data-testid={`submit-review-${booking.id}`}
                            >
                              {existingReviews[booking.id] ? 'Update Review' : 'Submit Review'}
                            </button>
                            <button
                              onClick={() => {
                                setReviewingBookingId(null);
                                setReviewData({ rating: 5, comment: '' });
                              }}
                              className="flex-1 bg-gray-200 text-gray-800 hover:bg-gray-300 px-4 py-2 rounded-lg transition-all text-sm"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditReview(booking.id)}
                            className="bg-[#e51636] text-white hover:bg-[#c4122f] px-6 py-2 rounded-lg transition-all flex items-center justify-center space-x-2"
                            data-testid={`add-review-${booking.id}`}
                          >
                            <Star className="h-5 w-5" />
                            <span>{existingReviews[booking.id] ? 'Edit Review' : 'Add Review'}</span>
                          </button>
                          {existingReviews[booking.id] && (
                            <div className="bg-[#f9fafb] p-3 rounded-lg text-sm">
                              <div className="flex items-center mb-2">
                                {[...Array(existingReviews[booking.id].rating)].map((_, i) => (
                                  <Star key={i} className="h-4 w-4 text-yellow-500 fill-current" />
                                ))}
                              </div>
                              <p className="text-[#4b5563]">{existingReviews[booking.id].comment}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingsPage;
