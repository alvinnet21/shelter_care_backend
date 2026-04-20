import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Plus, Upload, X, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import ImageUploader from '../components/ImageUploader';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CreateListingPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    suburb: '',
    postcode: ''
  });
  const [images, setImages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!user || user.role !== 'PROVIDER') {
      toast.error('Only providers can create listings');
      return;
    }

    if (images.length === 0) {
      toast.error('Please add at least one image');
      return;
    }

    setSubmitting(true);

    try {
      await axios.post(
        `${API}/listings`,
        {
          ...formData,
          photos: images
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Listing created successfully!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to create listing:', error);
      toast.error('Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user || user.role !== 'PROVIDER') {
    return (
      <div className="min-h-screen-header flex items-center justify-center">
        <p className="text-[#4b5563]">Only providers can create listings</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => navigate('/listings/my')} className="flex items-center text-[#4b5563] hover:text-[#e51636] mb-4 transition-colors" data-testid="back-to-listings">
          <ArrowLeft className="h-5 w-5 mr-2" />Back to My Listings
        </button>
        <h1
          className="text-3xl sm:text-4xl font-bold text-[#111827] mb-8"
          style={{ fontFamily: 'Outfit, sans-serif' }}
          data-testid="create-listing-title"
        >
          Create New Listing
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
                data-testid="listing-title-input"
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
                data-testid="listing-address-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Suburb
                </label>
                <input
                  type="text"
                  value={formData.suburb}
                  onChange={(e) => setFormData({ ...formData, suburb: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                  placeholder="Parramatta"
                  required
                  data-testid="listing-suburb-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Postcode
                </label>
                <input
                  type="text"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value })}
                  className="w-full px-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                  placeholder="2150"
                  required
                  data-testid="listing-postcode-input"
                />
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
                data-testid="listing-description-input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Photos (Max 5 images)
              </label>
              <ImageUploader images={images} setImages={setImages} maxImages={5} />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#e51636] text-white hover:bg-[#c4122f] py-3 rounded-lg transition-all font-medium disabled:opacity-50"
              data-testid="submit-listing-button"
            >
              {submitting ? 'Creating...' : 'Create Listing'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CreateListingPage;
