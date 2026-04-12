import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, KeyRound, CheckCircle, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const { login, forgotPassword } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await login(email, password);
      toast.success('Login successful');
      if (res.role === 'ADMIN') {
        navigate('/admin');
      } else if (res.role === 'VERIFICATOR') {
        navigate('/verificator');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const detail = err.response?.data?.detail || 'Invalid credentials';
      setError(detail);
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotLoading(true);

    try {
      await forgotPassword(forgotEmail);
      setForgotSuccess(true);
      toast.success('New password sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reset email');
    } finally {
      setForgotLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen-header flex items-center justify-center px-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <h1
              className="text-4xl font-bold text-[#111827] mb-4"
              style={{ fontFamily: 'Outfit, sans-serif' }}
              data-testid="forgot-password-title"
            >
              Forgot Password
            </h1>
            <p className="text-[#4b5563]">
              Enter your email and we'll send you a new password
            </p>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
            {forgotSuccess ? (
              <div className="text-center py-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-[#111827] mb-2" data-testid="forgot-password-success">
                  Email Sent!
                </h3>
                <p className="text-[#4b5563] mb-6">
                  If the email exists in our system, a new password has been sent. Please check your inbox.
                </p>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotSuccess(false);
                    setForgotEmail('');
                  }}
                  className="w-full bg-[#e51636] text-white hover:bg-[#c4122f] py-3 rounded-lg transition-all font-medium flex items-center justify-center space-x-2"
                  data-testid="back-to-login-btn"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Login</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                      placeholder="you@example.com"
                      required
                      data-testid="forgot-email-input"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="w-full bg-[#e51636] text-white hover:bg-[#c4122f] py-3 rounded-lg transition-all font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
                  data-testid="forgot-submit-btn"
                >
                  <KeyRound className="h-5 w-5" />
                  <span>{forgotLoading ? 'Sending...' : 'Send New Password'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail('');
                  }}
                  className="w-full text-[#4b5563] hover:text-[#e51636] py-2 transition-colors font-medium flex items-center justify-center space-x-2"
                  data-testid="cancel-forgot-btn"
                >
                  <ArrowLeft className="h-5 w-5" />
                  <span>Back to Login</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen-header flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-bold text-[#111827] mb-4"
            style={{ fontFamily: 'Outfit, sans-serif' }}
            data-testid="login-title"
          >
            Welcome Back
          </h1>
          <p className="text-[#4b5563]">
            Sign in to access your ShelterCare account
          </p>
        </div>

        <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start" data-testid="login-error">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-[#111827] mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                  placeholder="you@example.com"
                  required
                  data-testid="login-email-input"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-[#111827]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-[#e51636] hover:text-[#c4122f] font-medium"
                  data-testid="forgot-password-link"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30 focus:border-[#e51636]"
                  placeholder="••••••••"
                  required
                  data-testid="login-password-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e51636] text-white hover:bg-[#c4122f] py-3 rounded-lg transition-all font-medium flex items-center justify-center space-x-2 disabled:opacity-50"
              data-testid="login-submit-button"
            >
              <LogIn className="h-5 w-5" />
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-[#4b5563]">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#e51636] hover:text-[#c4122f] font-medium" data-testid="login-register-link">
                Register here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
