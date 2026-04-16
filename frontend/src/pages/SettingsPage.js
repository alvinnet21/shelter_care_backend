import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Lock, User, AlertCircle, Camera, Upload, Phone, Calendar, FileText } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SettingsPage = () => {
  const { user, token, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({ full_name: '', date_of_birth: '', description: '', phone_number: '', profile_photo: '' });
  const [passwordData, setPasswordData] = useState({ old_password: '', new_password: '', confirm_password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
      setProfile({
        full_name: res.data.full_name || '',
        date_of_birth: res.data.date_of_birth || '',
        description: res.data.description || '',
        phone_number: res.data.phone_number || '',
        profile_photo: res.data.profile_photo || '',
      });
    } catch (e) { console.error(e); }
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) { toast.error('Only JPG and PNG allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Max 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => setProfile({ ...profile, profile_photo: reader.result });
    reader.readAsDataURL(file);
  };

  const handlePhoneChange = (e) => {
    const val = e.target.value.replace(/[^\d]/g, '');
    setProfile({ ...profile, phone_number: val ? `+61${val}` : '' });
  };

  const phoneDigits = profile.phone_number?.replace('+61', '') || '';

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.put(`${API}/auth/profile`, profile, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Profile updated successfully!');
    } catch (e) { toast.error('Failed to update profile'); }
    finally { setSavingProfile(false); }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    if (passwordData.new_password !== passwordData.confirm_password) { setError('New passwords do not match'); return; }
    if (passwordData.new_password.length < 6) { setError('New password must be at least 6 characters'); return; }
    setSubmitting(true);
    try {
      await axios.put(`${API}/auth/password`, { old_password: passwordData.old_password, new_password: passwordData.new_password }, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Password updated successfully!');
      setPasswordData({ old_password: '', new_password: '', confirm_password: '' });
    } catch (err) { setError(err.response?.data?.detail || 'Failed to update password'); }
    finally { setSubmitting(false); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#111827] mb-8" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="settings-title">Settings</h1>

        <div className="space-y-6">
          {/* Profile Photo */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#111827] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Profile Photo</h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
                {profile.profile_photo ? (
                  <img src={profile.profile_photo} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-[#e5e7eb]" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-[#f3f4f6] flex items-center justify-center border-4 border-[#e5e7eb]"><User className="h-12 w-12 text-[#9ca3af]" /></div>
                )}
                <label htmlFor="photo-upload" className="absolute bottom-0 right-0 bg-[#e51636] rounded-full p-2 cursor-pointer hover:bg-[#c4122f] transition-all">
                  <Camera className="h-4 w-4 text-white" />
                </label>
                <input id="photo-upload" type="file" accept=".jpg,.jpeg,.png" onChange={handlePhotoUpload} className="hidden" data-testid="profile-photo-upload" />
              </div>
              <div>
                <p className="text-sm text-[#4b5563]">Click the camera icon to upload a photo from your computer</p>
                <p className="text-xs text-[#9ca3af]">JPG, PNG - Max 5MB</p>
              </div>
            </div>
          </div>

          {/* Profile Info */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#111827] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                  <input type="text" value={profile.full_name} onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30" data-testid="settings-fullname" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Date of Birth</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                  <input type="date" value={profile.date_of_birth} onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30" data-testid="settings-dob" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">Tell me about yourself</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-[#9ca3af]" />
                  <textarea value={profile.description} onChange={(e) => setProfile({ ...profile, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 min-h-[100px]"
                    placeholder="Tell us about yourself..." data-testid="settings-description" />
                </div>
              </div>

              {/* Phone - only for Provider and Seeker */}
              {(user.role === 'PROVIDER' || user.role === 'SEEKER') && (
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-2">Phone Number</label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                    <span className="absolute left-10 top-1/2 -translate-y-1/2 text-[#4b5563] font-medium">+61</span>
                    <input type="text" value={phoneDigits} onChange={handlePhoneChange}
                      inputMode="numeric" pattern="[0-9]*"
                      className="w-full pl-20 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30"
                      placeholder="412345678" data-testid="settings-phone" />
                  </div>
                  <p className="text-xs text-[#9ca3af] mt-1">
                    {user.role === 'PROVIDER' ? 'Your phone number is only visible on your own profile.' : 'Your phone number will be visible to providers in booking requests.'}
                  </p>
                </div>
              )}

              <div className="pt-2">
                <label className="block text-sm font-medium text-[#4b5563] mb-1">Email</label>
                <p className="text-[#111827]">{user.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#4b5563] mb-1">Role</label>
                <span className="inline-block bg-[#e51636]/10 text-[#e51636] px-3 py-1 rounded-full text-sm font-medium">{user.role}</span>
              </div>

              <button onClick={handleSaveProfile} disabled={savingProfile}
                className="bg-[#e51636] text-white hover:bg-[#c4122f] px-6 py-3 rounded-lg transition-all font-medium disabled:opacity-50" data-testid="save-profile-btn">
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </div>

          {/* Change Password */}
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[#111827] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>Change Password</h2>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 flex items-start" data-testid="password-error">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {['old_password', 'new_password', 'confirm_password'].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-[#111827] mb-2">{field === 'old_password' ? 'Current Password' : field === 'new_password' ? 'New Password' : 'Confirm New Password'}</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                    <input type="password" value={passwordData[field]} onChange={(e) => setPasswordData({ ...passwordData, [field]: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30" placeholder="••••••••" required data-testid={`${field.replace('_', '-')}-input`} />
                  </div>
                </div>
              ))}
              <button type="submit" disabled={submitting} className="bg-[#e51636] text-white hover:bg-[#c4122f] px-6 py-3 rounded-lg transition-all font-medium disabled:opacity-50" data-testid="update-password-button">
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
