import React, { useEffect, useState } from 'react';
import { useProfileModal } from '../context/ProfileModalContext';
import axios from 'axios';
import { X, User, Calendar, Phone, Home, Star, MapPin } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProfileModal = () => {
  const { profileUserId, closeProfile } = useProfileModal();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (profileUserId) {
      setLoading(true);
      setProfile(null);
      axios.get(`${API}/users/${profileUserId}/profile`)
        .then(res => setProfile(res.data))
        .catch(() => {
          toast.error('Failed to load profile');
          closeProfile();
        })
        .finally(() => setLoading(false));
    }
  }, [profileUserId, closeProfile]);

  if (!profileUserId) return null;

  const formatDOB = (dob) => {
    if (!dob) return '-';
    try {
      return new Date(dob).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeProfile} data-testid="profile-modal-overlay">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()} data-testid="profile-modal">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e51636]"></div>
          </div>
        ) : profile ? (
          <>
            {/* Header with close button */}
            <div className="relative bg-gradient-to-r from-[#e51636] to-[#c4122f] px-6 pt-6 pb-10 rounded-t-2xl">
              <button
                onClick={closeProfile}
                className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
                data-testid="profile-modal-close"
              >
                <X className="h-6 w-6" />
              </button>
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full border-4 border-white overflow-hidden bg-white/20 mb-3">
                  {profile.profile_photo ? (
                    <img src={profile.profile_photo} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="h-10 w-10 text-white" />
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-bold text-white" data-testid="profile-modal-name">
                  {profile.full_name || '-'}
                </h2>
                <span className="mt-1 bg-white/20 text-white px-3 py-0.5 rounded-full text-sm">
                  {profile.role}
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-4">
              {/* Date of Birth */}
              <div className="flex items-center gap-3" data-testid="profile-modal-dob">
                <Calendar className="h-5 w-5 text-[#9ca3af] flex-shrink-0" />
                <div>
                  <p className="text-xs text-[#9ca3af] uppercase">Date of Birth</p>
                  <p className="text-[#111827]">{formatDOB(profile.date_of_birth)}</p>
                </div>
              </div>

              {/* Description */}
              <div data-testid="profile-modal-description">
                <p className="text-xs text-[#9ca3af] uppercase mb-1">Description</p>
                <p className="text-[#4b5563] leading-relaxed">{profile.description || '-'}</p>
              </div>

              {/* Seeker: phone number */}
              {profile.role === 'SEEKER' && (
                <div className="flex items-center gap-3" data-testid="profile-modal-phone">
                  <Phone className="h-5 w-5 text-[#9ca3af] flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#9ca3af] uppercase">Phone</p>
                    <p className="text-[#111827]">{profile.phone_number || '-'}</p>
                  </div>
                </div>
              )}

              {/* Seeker: provider reviews */}
              {profile.role === 'SEEKER' && (
                <div data-testid="profile-modal-provider-reviews">
                  <p className="text-xs text-[#9ca3af] uppercase mb-2">Reviews from Providers</p>
                  {profile.provider_reviews && profile.provider_reviews.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {profile.provider_reviews.map((review) => (
                        <div key={review.id} className="bg-[#f9fafb] rounded-lg p-3 min-w-[240px] max-w-[280px] flex-shrink-0 border border-[#e5e7eb]" data-testid={`profile-modal-provider-review-${review.id}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs overflow-hidden flex-shrink-0">
                              {review.provider_photo ? (
                                <img src={review.provider_photo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                review.provider_name?.charAt(0).toUpperCase()
                              )}
                            </div>
                            <p className="font-medium text-[#111827] text-sm truncate">{review.provider_name}</p>
                            <div className="flex items-center ml-auto flex-shrink-0">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 text-yellow-500 fill-current" />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-[#4b5563] line-clamp-2">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#4b5563] text-sm">-</p>
                  )}
                </div>
              )}

              {/* Provider: listings */}
              {profile.role === 'PROVIDER' && (
                <div data-testid="profile-modal-listings">
                  <p className="text-xs text-[#9ca3af] uppercase mb-2">Shelter Listings</p>
                  {profile.listings && profile.listings.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {profile.listings.map((listing) => (
                        <div key={listing.id} className="border border-[#e5e7eb] rounded-lg overflow-hidden" data-testid={`profile-modal-listing-${listing.id}`}>
                          <div className="h-24 bg-[#f3f4f6]">
                            {listing.photos?.[0] ? (
                              <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Home className="h-6 w-6 text-[#9ca3af]" />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="font-medium text-[#111827] text-sm truncate">{listing.title}</p>
                            <div className="flex items-center text-xs text-[#4b5563]">
                              <MapPin className="h-3 w-3 mr-1" />
                              <span className="truncate">{listing.address || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#4b5563] text-sm">-</p>
                  )}
                </div>
              )}

              {/* Provider: last reviews */}
              {profile.role === 'PROVIDER' && (
                <div data-testid="profile-modal-reviews">
                  <p className="text-xs text-[#9ca3af] uppercase mb-2">Reviews</p>
                  {profile.last_reviews && profile.last_reviews.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {profile.last_reviews.map((review) => (
                        <div key={review.id} className="bg-[#f9fafb] rounded-lg p-3 min-w-[240px] max-w-[280px] flex-shrink-0 border border-[#e5e7eb]" data-testid={`profile-modal-review-${review.id}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-7 h-7 rounded-full bg-[#e51636] flex items-center justify-center text-white text-xs overflow-hidden flex-shrink-0">
                              {review.seeker_photo ? (
                                <img src={review.seeker_photo} alt="" className="w-full h-full object-cover" />
                              ) : (
                                review.seeker_name?.charAt(0).toUpperCase()
                              )}
                            </div>
                            <p className="font-medium text-[#111827] text-sm truncate">{review.seeker_name}</p>
                            <div className="flex items-center ml-auto flex-shrink-0">
                              {[...Array(review.rating)].map((_, i) => (
                                <Star key={i} className="h-3 w-3 text-yellow-500 fill-current" />
                              ))}
                            </div>
                          </div>
                          <p className="text-sm text-[#4b5563] line-clamp-2">{review.comment}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[#4b5563] text-sm">-</p>
                  )}
                </div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
};

export default ProfileModal;
