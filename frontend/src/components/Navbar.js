import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, LogOut, Bell, Settings, LayoutDashboard, Shield, UserCheck } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  // Determine dashboard link based on user role
  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'VERIFICATOR') return '/verificator';
    return '/dashboard';
  };

  const getDashboardLabel = () => {
    if (!user) return 'Dashboard';
    if (user.role === 'ADMIN') return 'Admin Panel';
    if (user.role === 'VERIFICATOR') return 'Verificator Panel';
    return 'Dashboard';
  };

  const getDashboardIcon = () => {
    if (!user) return LayoutDashboard;
    if (user.role === 'ADMIN') return Shield;
    if (user.role === 'VERIFICATOR') return UserCheck;
    return LayoutDashboard;
  };

  const DashboardIcon = getDashboardIcon();

  return (
    <nav className="bg-white/80 backdrop-blur-xl border-b border-[#e5e7eb]/50 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link to="/" className="flex items-center space-x-2" data-testid="nav-logo">
            <Home className="h-8 w-8 text-[#e51636]" />
            <span className="text-2xl font-bold text-[#111827]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              ShelterLink
            </span>
          </Link>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <Link
                  to={getDashboardLink()}
                  className="flex items-center space-x-1 text-[#4b5563] hover:text-[#e51636] transition-colors"
                  data-testid="nav-dashboard"
                >
                  <DashboardIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">{getDashboardLabel()}</span>
                </Link>
                <Link
                  to="/notifications"
                  className="flex items-center space-x-1 text-[#4b5563] hover:text-[#e51636] transition-colors"
                  data-testid="nav-notifications"
                >
                  <Bell className="h-5 w-5" />
                  <span className="hidden sm:inline">Notifications</span>
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center space-x-1 text-[#4b5563] hover:text-[#e51636] transition-colors"
                  data-testid="nav-settings"
                >
                  <Settings className="h-5 w-5" />
                  <span className="hidden sm:inline">Settings</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 bg-[#e51636] text-white hover:bg-[#c4122f] px-4 py-2 rounded-lg transition-all"
                  data-testid="nav-logout"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-[#4b5563] hover:text-[#e51636] transition-colors"
                  data-testid="nav-login"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-[#e51636] text-white hover:bg-[#c4122f] px-6 py-2 rounded-lg transition-all"
                  data-testid="nav-register"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
