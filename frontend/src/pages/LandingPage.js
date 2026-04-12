import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Heart, Users, Home as HomeIcon, ArrowRight, Star } from 'lucide-react';

const LandingPage = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      <div
        className="relative h-[600px] flex items-center"
        style={{
          backgroundImage: 'url(https://images.pexels.com/photos/3184393/pexels-photo-3184393.jpeg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/70 to-transparent"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl tracking-tight leading-none font-bold text-[#111827] mb-6"
            style={{ fontFamily: 'Outfit, sans-serif' }}
            data-testid="hero-title"
          >
            A Safe Place for Everyone
          </h1>
          <p className="text-xl text-[#4b5563] mb-8 max-w-2xl leading-relaxed">
            Connecting shelter providers with those in need. Building a compassionate community where everyone has a place to call home.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to={user ? "/listings" : "/register"}
              className="bg-[#e51636] text-white hover:bg-[#c4122f] px-8 py-4 rounded-lg transition-all font-medium text-lg inline-flex items-center space-x-2"
              data-testid="cta-find-shelter"
            >
              <HomeIcon className="h-5 w-5" />
              <span>Register</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-snug font-semibold text-[#111827] mb-4"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            Our Mission
          </h2>
          <p className="text-lg text-[#4b5563] max-w-3xl mx-auto leading-relaxed">
            ShelterLink bridges the gap between those offering shelter and those seeking it. We believe everyone deserves dignity, safety, and a warm place to rest.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-20">
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] card-hover" data-testid="feature-seekers">
            <div className="w-16 h-16 bg-[#e51636]/10 rounded-lg flex items-center justify-center mb-6">
              <HomeIcon className="h-8 w-8 text-[#e51636]" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              For Shelter Seekers
            </h3>
            <p className="text-[#4b5563] leading-relaxed">
              Browse available shelters, connect with caring providers, and find a safe place to stay when you need it most.
            </p>
          </div>

          <div className="bg-white border border-[#e5e7eb] rounded-xl p-8 shadow-[0_8px_32px_rgba(0,0,0,0.06)] card-hover" data-testid="feature-providers">
            <div className="w-16 h-16 bg-[#e51636]/10 rounded-lg flex items-center justify-center mb-6">
              <Heart className="h-8 w-8 text-[#e51636]" />
            </div>
            <h3 className="text-xl font-semibold text-[#111827] mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
              For Providers
            </h3>
            <p className="text-[#4b5563] leading-relaxed">
              Share your spare room or property. Make a real difference by providing shelter to those who need it.
            </p>
          </div>
        </div>

        <div
          className="relative rounded-xl overflow-hidden mb-20"
          style={{
            backgroundImage: 'url(https://images.pexels.com/photos/6646926/pexels-photo-6646926.jpeg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          }}
        >
          <div className="bg-[#111827]/70 backdrop-blur-sm px-8 py-16 text-center">
            <h2
              className="text-3xl sm:text-4xl font-bold text-white mb-6"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Together, We Can Make a Difference
            </h2>
            <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
              Join our community of compassionate individuals working to end homelessness, one shelter at a time.
            </p>
            {!user && (
              <Link
                to="/register"
                className="bg-[#e51636] text-white hover:bg-[#c4122f] px-8 py-4 rounded-lg transition-all font-medium text-lg inline-block"
                data-testid="cta-join-now"
              >
                Join ShelterLink Today
              </Link>
            )}
          </div>
        </div>

        <div className="text-center">
          <h2
            className="text-2xl sm:text-3xl lg:text-4xl tracking-tight leading-snug font-semibold text-[#111827] mb-12"
            style={{ fontFamily: 'Outfit, sans-serif' }}
          >
            What Our Community Says
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-8">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                ))}
              </div>
              <p className="text-[#4b5563] mb-4 leading-relaxed italic">
                "ShelterCare helped me find a safe place when I needed it most. The providers are caring and the process is simple."
              </p>
              <p className="text-sm font-medium text-[#111827]">- Sarah M., Shelter Seeker</p>
            </div>
            <div className="bg-[#f9fafb] border border-[#e5e7eb] rounded-xl p-8">
              <div className="flex items-center mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 text-yellow-500 fill-current" />
                ))}
              </div>
              <p className="text-[#4b5563] mb-4 leading-relaxed italic">
                "Providing shelter through this platform has been incredibly rewarding. I'm glad I can help make a difference."
              </p>
              <p className="text-sm font-medium text-[#111827]">- John D., Provider</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
