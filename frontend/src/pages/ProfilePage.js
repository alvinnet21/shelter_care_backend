import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { User, MapPin, Star, Home, Calendar, ArrowLeft, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/users/${id}/profile`);
      setProfile(res.data);
    } catch (e) {
      toast.error('Failed to load profile');
      navigate(-1);
    } finally { setLoading(false); }
  };

  if (loading) return <div className="min-h-screen-header flex items-center justify-center"><p className="text-[#4b5563]">Loading...</p></div>;
  if (!profile) return null;

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate(-1)} className="flex items-center text-[#4b5563] hover:text-[#e51636] mb-6 transition-colors" data-testid="back-btn">
          <ArrowLeft className="h-5 w-5 mr-2" />Back
        </button>

        <div className="bg-white border border-[#e5e7eb] rounded-xl overflow-hidden shadow-sm">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#e51636] to-[#c4122f] px-8 py-10 text-center">
            <div className="w-24 h-24 rounded-full mx-auto border-4 border-white overflow-hidden bg-white/20 mb-4">
              {profile.profile_photo ? (
                <img src={profile.profile_photo} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><User className="h-12 w-12 text-white" /></div>
              )}
            </div>
            <h1 className="text-2xl font-bold text-white" data-testid="profile-name">{profile.full_name}</h1>
            <span className="inline-block mt-2 bg-white/20 text-white px-3 py-1 rounded-full text-sm">{profile.role}</span>
          </div>

          {/* Info */}
          <div className="p-8 space-y-6">
            {profile.date_of_birth && (
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-[#9ca3af]" />
                <div>
                  <p className="text-xs text-[#9ca3af] uppercase">Date of Birth</p>
                  <p className="text-[#111827]">{new Date(profile.date_of_birth).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
            )}

            {profile.description && (
              <div>
                <p className="text-xs text-[#9ca3af] uppercase mb-2">About</p>
                <p className="text-[#4b5563] leading-relaxed">{profile.description}</p>
              </div>
            )}

            {/* Seeker: show phone */}
            {profile.role === 'SEEKER' && profile.phone_number && (
              <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-[#9ca3af]" />
                <div>
                  <p className="text-xs text-[#9ca3af] uppercase">Phone</p>
                  <p className="text-[#111827]">{profile.phone_number}</p>
                </div>
              </div>
            )}

            {/* Provider: show listings */}
            {profile.role === 'PROVIDER' && profile.listings && profile.listings.length > 0 && (
              <div>
                <p className="text-xs text-[#9ca3af] uppercase mb-3">Shelter Listings</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {profile.listings.map((listing) => (
                    <Link key={listing.id} to={`/listings/${listing.id}`} className="border border-[#e5e7eb] rounded-lg overflow-hidden hover:shadow-md transition-all" data-testid={`profile-listing-${listing.id}`}>
                      <div className="h-32 bg-[#f3f4f6]">
                        {listing.photos?.[0] ? <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Home className="h-8 w-8 text-[#9ca3af]" /></div>}
                      </div>
                      <div className="p-3">
                        <p className="font-medium text-[#111827] truncate">{listing.title}</p>
                        <div className="flex items-center text-xs text-[#4b5563]"><MapPin className="h-3 w-3 mr-1" /><span className="truncate">{listing.address}</span></div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Provider: last 3 reviews */}
            {profile.role === 'PROVIDER' && profile.last_reviews && profile.last_reviews.length > 0 && (
              <div>
                <p className="text-xs text-[#9ca3af] uppercase mb-3">Recent Reviews</p>
                <div className="space-y-3">
                  {profile.last_reviews.map((review) => (
                    <div key={review.id} className="bg-[#f9fafb] rounded-lg p-4" data-testid={`profile-review-${review.id}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-[#e51636] flex items-center justify-center text-white text-sm overflow-hidden">
                          {review.seeker_photo ? <img src={review.seeker_photo} alt="" className="w-full h-full object-cover" /> : review.seeker_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-[#111827] text-sm">{review.seeker_name}</p>
                          <div className="flex items-center">
                            {[...Array(review.rating)].map((_, i) => <Star key={i} className="h-3 w-3 text-yellow-500 fill-current" />)}
                          </div>
                        </div>
                      </div>
                      <p className="text-sm text-[#4b5563]">{review.comment}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {profile.role === 'PROVIDER' && (!profile.listings || profile.listings.length === 0) && (!profile.last_reviews || profile.last_reviews.length === 0) && (
              <div className="text-center py-8">
                <Home className="h-12 w-12 text-[#9ca3af] mx-auto mb-4" />
                <p className="text-[#4b5563]">No listings or reviews yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
