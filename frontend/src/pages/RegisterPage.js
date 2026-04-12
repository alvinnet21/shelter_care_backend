import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Mail, Lock, User, FileText, AlertCircle, Upload, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    password: '',
    confirm_password: '',
    role: 'SEEKER',
    question_answer: '',
    id_document: '',
    police_check: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (formData.role === 'PROVIDER' && !formData.id_document) {
      setError('ID document is required for providers');
      return;
    }

    if (formData.role === 'PROVIDER' && !formData.police_check) {
      setError('Police Check document is required for providers');
      return;
    }

    setLoading(true);

    try {
      await register(
        formData.email,
        formData.full_name,
        formData.password,
        formData.role,
        formData.role === 'SEEKER' ? formData.question_answer : null,
        formData.role === 'PROVIDER' ? formData.id_document : null,
        formData.role === 'PROVIDER' ? formData.police_check : null
      );
      
      if (formData.role === 'PROVIDER') {
        toast.success('Registration successful! Your account is pending verification. Please login after approved.');
      } else {
        toast.success('Registration successful! Please login.');
      }
      
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.detail || 'Registration failed');
      toast.error('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e, fieldName) => {
    const file = e.target.files[0];
    if (file) {
      if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
        toast.error('Only JPG and PNG files are allowed');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        setFormData({ ...formData, [fieldName]: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderUploadField = (fieldName, label, description, testIdPrefix) => (
    <div>
      <label className="block text-sm font-medium text-[#111827] mb-2">
        {label} *
      </label>
      <p className="text-xs text-[#4b5563] mb-3">
        {description}
      </p>
      <div className="border-2 border-dashed border-[#e5e7eb] rounded-lg p-6 text-center hover:border-[#e51636]/50 transition-colors">
        <input
          type="file"
          accept=".jpg,.jpeg,.png"
          onChange={(e) => handleFileUpload(e, fieldName)}
          className="hidden"
          id={`${testIdPrefix}-upload`}
          data-testid={`${testIdPrefix}-upload`}
        />
        <label
          htmlFor={`${testIdPrefix}-upload`}
          className="cursor-pointer flex flex-col items-center"
        >
          {formData[fieldName] ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img
                  src={formData[fieldName]}
                  alt={`${label} Preview`}
                  className="max-h-48 rounded-lg border border-[#e5e7eb]"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setFormData({ ...formData, [fieldName]: '' });
                  }}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                  data-testid={`remove-${testIdPrefix}`}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-green-600 font-medium">
                {label} uploaded
              </p>
              <p className="text-xs text-[#4b5563]">Click to change</p>
            </div>
          ) : (
            <>
              {fieldName === 'police_check' ? (
                <ShieldCheck className="h-12 w-12 text-[#9ca3af] mb-3" />
              ) : (
                <Upload className="h-12 w-12 text-[#9ca3af] mb-3" />
              )}
              <p className="text-sm font-medium text-[#111827] mb-1">
                Click to upload {label.toLowerCase()}
              </p>
              <p className="text-xs text-[#4b5563]">
                JPG, PNG - Max 5MB
              </p>
            </>
          )}
        </label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen-header flex items-center justify-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold text-[#111827] mb-4"
            style={{ fontFamily: 'Outfit, sans-serif' }}
            data-testid="register-title"
          >
            Join ShelterCare
          </h1>
          <p className="text-[#4b5563]">
            Create an account to start making a difference
          </p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start" data-testid="register-error">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-4">
                {['SEEKER', 'PROVIDER'].map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setFormData({ ...formData, role })}
                    className={`py-3 px-4 rounded-lg border-2 transition-all ${
                      formData.role === role
                        ? 'border-[#e51636] bg-[#e51636]/5 text-[#e51636]'
                        : 'border-[#e5e7eb] text-[#4b5563] hover:border-[#e51636]/50'
                    }`}
                    data-testid={`register-role-${role.toLowerCase()}`}
                  >
                    {role === 'SEEKER' && 'Shelter Seeker'}
                    {role === 'PROVIDER' && 'Shelter Provider'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                  placeholder="John Doe"
                  required
                  data-testid="register-fullname-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                  placeholder="you@example.com"
                  required
                  data-testid="register-email-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                  placeholder="••••••••"
                  required
                  data-testid="register-password-input"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                <input
                  type="password"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                  placeholder="••••••••"
                  required
                  data-testid="register-confirm-password-input"
                />
              </div>
            </div>

            {formData.role === 'SEEKER' && (
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-2">
                  Tell us about your situation (Optional)
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-5 w-5 text-[#9ca3af]" />
                  <textarea
                    value={formData.question_answer}
                    onChange={(e) => setFormData({ ...formData, question_answer: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636] min-h-[100px]"
                    placeholder="This helps providers understand your needs better..."
                    data-testid="register-question-textarea"
                  />
                </div>
              </div>
            )}

            {formData.role === 'PROVIDER' && (
              <>
                {renderUploadField(
                  'id_document',
                  'ID Document (Required for Verification)',
                  'Upload a photo of your ID card or driver\'s license. Only JPG and PNG formats accepted.',
                  'id-document'
                )}
                {renderUploadField(
                  'police_check',
                  'Police Check (Required for Verification)',
                  'Upload your police check certificate. Only JPG and PNG formats accepted.',
                  'police-check'
                )}
                <p className="text-xs text-[#e51636]">
                  * Your account will be pending verification until approved by our team
                </p>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e51636] text-white hover:bg-[#c4122f] py-3 rounded-lg transition-all font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
              data-testid="register-submit-button"
            >
              <UserPlus className="h-5 w-5" />
              <span>{loading ? 'Creating account...' : 'Create Account'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#4b5563]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#e51636] hover:text-[#c4122f] font-medium" data-testid="register-login-link">
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
