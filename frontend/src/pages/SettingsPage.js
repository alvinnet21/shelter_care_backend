import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, AlertCircle, Camera, Check } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SettingsPage = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [passwordData, setPasswordData] = useState({
    old_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [profilePhoto, setProfilePhoto] = useState(user?.profile_photo || '');
  const [photoUrl, setPhotoUrl] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [updatingPhoto, setUpdatingPhoto] = useState(false);

  if (!user) {
    navigate('/login');
    return null;
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    setSubmitting(true);

    try {
      await axios.put(
        `${API}/auth/password`,
        {
          old_password: passwordData.old_password,
          new_password: passwordData.new_password
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('Password updated successfully!');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update password');
      toast.error('Failed to update password');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdatePhoto = async () => {
    if (!photoUrl.trim()) {
      toast.error('Please enter a photo URL');
      return;
    }

    setUpdatingPhoto(true);

    try {
      await axios.put(
        `${API}/auth/profile`,
        { profile_photo: photoUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProfilePhoto(photoUrl);
      setPhotoUrl('');
      toast.success('Profile photo updated!');
      window.location.reload();
    } catch (error) {
      console.error('Failed to update photo:', error);
      toast.error('Failed to update photo');
    } finally {
      setUpdatingPhoto(false);
    }
  };

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1
          className="text-3xl sm:text-4xl font-bold text-[#111827] mb-8"
          style={{ fontFamily: 'Outfit, sans-serif' }}
          data-testid="settings-title"
        >
          Settings
        </h1>

        <div className="space-y-6">
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <h2 className="text-xl font-semibold text-[#111827] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Profile Photo
            </h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
                {profilePhoto ? (
                  <img
                    src={profilePhoto}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-4 border-[#e5e7eb]"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#f3f4f6] flex items-center justify-center border-4 border-[#e5e7eb]">
                    <User className="h-12 w-12 text-[#9ca3af]" />
                  </div>
                )}
                <div className="absolute bottom-0 right-0 bg-[#e51636] rounded-full p-2">
                  <Camera className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={photoUrl}
                    onChange={(e) => setPhotoUrl(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                    className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                    data-testid="profile-photo-url-input"
                  />
                  <button
                    onClick={handleUpdatePhoto}
                    disabled={updatingPhoto}
                    className="bg-[#e51636] text-white hover:bg-[#c4122f] px-6 py-2 rounded-lg transition-all disabled:opacity-50"
                    data-testid="update-photo-button"
                  >
                    {updatingPhoto ? 'Updating...' : 'Update'}
                  </button>
                </div>
                <p className="text-sm text-[#4b5563] mt-2">
                  Enter a URL to your profile photo
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <h2 className="text-xl font-semibold text-[#111827] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Profile Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#4b5563] mb-1">
                  Full Name
                </label>
                <div className="flex items-center space-x-2 text-[#111827]">
                  <User className="h-5 w-5 text-[#9ca3af]" />
                  <span>{user.full_name}</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4b5563] mb-1">
                  Email
                </label>
                <p className="text-[#111827]">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4b5563] mb-1">
                  Role
                </label>
                <span className="inline-block bg-[#e51636]/10 text-[#e51636] px-3 py-1 rounded-full text-sm font-medium">
                  {user.role}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            <h2 className="text-xl font-semibold text-[#111827] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Change Password
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start" data-testid="password-error">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                  <input
                    type="password"
                    value={passwordData.old_password}
                    onChange={(e) => setPasswordData({ ...passwordData, old_password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                    placeholder="••••••••"
                    required
                    data-testid="old-password-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                  <input
                    type="password"
                    value={passwordData.new_password}
                    onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                    placeholder="••••••••"
                    required
                    data-testid="new-password-input"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                  <input
                    type="password"
                    value={passwordData.confirm_password}
                    onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                    placeholder="••••••••"
                    required
                    data-testid="confirm-password-input"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="bg-[#e51636] text-white hover:bg-[#c4122f] px-6 py-3 rounded-lg transition-all font-medium disabled:opacity-50"
                data-testid="update-password-button"
              >
                {submitting ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
