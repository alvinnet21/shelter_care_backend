import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ImageUploader from '../components/ImageUploader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const EditListingPage = () => {
  const { id } = useParams();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    suburb: '',
    postcode: '',
    is_available: true
  });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'PROVIDER') {
      navigate('/dashboard');
      return;
    }
    fetchListing();
  }, [id, user]);

  const fetchListing = async () => {
    try {
      const response = await axios.get(`${API}/listings/${id}`);
      const listing = response.data;
      
      if (listing.provider_id !== user.id) {
        toast.error('You can only edit your own listings');
        navigate('/dashboard');
        return;
      }

      setFormData({
        title: listing.title,
        description: listing.description,
        address: listing.address,
        suburb: listing.suburb || '',
        postcode: listing.postcode || '',
        is_available: listing.is_available
      });
      setImages(listing.photos || []);
    } catch (error) {
      console.error('Failed to fetch listing:', error);
      toast.error('Failed to load listing');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setSubmitting(true);

    try {
      await axios.put(
        `${API}/listings/${id}`,
        {
          ...formData,
          photos: images
        },
        { 
          headers: { Authorization: `Bearer ${token}` },
          params: formData
        }
      );
      toast.success('Listing updated successfully!');
      navigate('/listings/my');
    } catch (error) {
      console.error('Failed to update listing:', error);
      toast.error('Failed to update listing');
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

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/listings/my')}
          className="flex items-center text-[#4b5563] hover:text-[#e51636] mb-6 transition-colors"
          data-testid="back-to-listings"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to My Listings
        </button>

        <h1
          className="text-3xl sm:text-4xl font-bold text-[#111827] mb-8"
          style={{ fontFamily: 'Outfit, sans-serif' }}
          data-testid="edit-listing-title"
        >
          Edit Listing
        </h1>

        <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Listing Title
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                placeholder="Cozy room in quiet neighborhood"
                required
                data-testid="edit-listing-title-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                placeholder="123 Main St"
                required
                data-testid="edit-listing-address-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Suburb</label>
                <input type="text" value={formData.suburb} onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30" placeholder="Parramatta" required data-testid="edit-listing-suburb-input" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Postcode</label>
                <input type="text" value={formData.postcode} onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30" placeholder="2150" required data-testid="edit-listing-postcode-input" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636] min-h-[150px]"
                placeholder="Describe your shelter space, amenities, and what makes it welcoming..."
                required
                data-testid="edit-listing-description-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Photos (Max 5 images)
              </label>
              <ImageUploader images={images} setImages={setImages} maxImages={5} />
            </div>

            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                  className="w-4 h-4 text-[#e51636] border-[#e5e7eb] rounded focus:ring-[#e51636]"
                  data-testid="edit-listing-available-checkbox"
                />
                <span className="text-[#111827]">Mark as available</span>
              </label>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-[#e51636] text-white hover:bg-[#c4122f] py-3 rounded-lg transition-all font-medium disabled:opacity-50"
                data-testid="update-listing-button"
              >
                {submitting ? 'Updating...' : 'Update Listing'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/listings/my')}
                className="px-8 bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] py-3 rounded-lg transition-all font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditListingPage;
