import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { Users, Calendar, Home, Shield, ListOrdered, Trash2, Eye, UserCheck, X } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') { navigate('/login'); return; }
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'listings') fetchListings();
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } });
      setStats(res.data);
    } catch (e) { toast.error('Failed to load stats'); }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      setUsers(res.data.users);
    } catch (e) { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };

  const fetchListings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/listings`, { headers: { Authorization: `Bearer ${token}` } });
      setListings(res.data.listings);
    } catch (e) { toast.error('Failed to load listings'); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) return;
    try {
      await axios.put(`${API}/admin/users/${userId}/delete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('User deleted successfully');
      fetchUsers();
      fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to delete user'); }
  };

  const handleDeleteListing = async (listingId, title) => {
    if (!window.confirm(`Are you sure you want to take down "${title}"?`)) return;
    try {
      await axios.put(`${API}/admin/listings/${listingId}/delete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Listing taken down successfully');
      fetchListings();
      fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed to take down listing'); }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#111827] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="admin-dashboard-title">
            Admin Dashboard
          </h1>
          <p className="text-[#4b5563]">System overview and management</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[
              { label: 'Total Users', value: stats.total_users, icon: Users, color: 'blue' },
              { label: 'Total Bookings', value: stats.total_bookings, icon: Calendar, color: 'green' },
              { label: 'Total Listings', value: stats.total_listings, icon: Home, color: 'purple' },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-sm" data-testid={`stat-${s.label.toLowerCase().replace(/\s/g, '-')}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">{s.label}</p>
                    <p className="text-3xl font-bold text-[#111827]">{s.value}</p>
                  </div>
                  <div className={`w-12 h-12 bg-${s.color}-100 rounded-lg flex items-center justify-center`}>
                    <s.icon className={`h-6 w-6 text-${s.color}-600`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-sm overflow-hidden">
          <div className="flex border-b border-[#e5e7eb]">
            {[
              { key: 'overview', label: 'Overview', icon: Shield },
              { key: 'users', label: 'User Management', icon: Users },
              { key: 'listings', label: 'Listing Management', icon: ListOrdered },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === tab.key ? 'bg-[#e51636]/5 text-[#e51636] border-b-2 border-[#e51636]' : 'text-[#4b5563] hover:bg-[#f9fafb]'}`}
                data-testid={`admin-tab-${tab.key}`}>
                <tab.icon className="h-4 w-4" />{tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* Overview */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                <Link to="/verificator" className="block bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-md transition-all" data-testid="admin-verificator-link">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-[#e51636]/10 rounded-lg flex items-center justify-center">
                      <UserCheck className="h-6 w-6 text-[#e51636]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827]">Verificator Panel</h3>
                      <p className="text-sm text-[#4b5563]">Verify and manage provider accounts</p>
                    </div>
                  </div>
                </Link>
                <button onClick={() => setActiveTab('users')} className="w-full text-left bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-md transition-all" data-testid="admin-user-mgmt-link">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827]">User Management</h3>
                      <p className="text-sm text-[#4b5563]">View and manage all users</p>
                    </div>
                  </div>
                </button>
                <button onClick={() => setActiveTab('listings')} className="w-full text-left bg-white border border-[#e5e7eb] rounded-xl p-6 hover:shadow-md transition-all" data-testid="admin-listing-mgmt-link">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Home className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#111827]">Listing Management</h3>
                      <p className="text-sm text-[#4b5563]">View and take down listings</p>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {/* User Management */}
            {activeTab === 'users' && (
              <div>
                {loading ? <p className="text-center py-8 text-[#4b5563]">Loading users...</p> : (
                  <div className="space-y-3">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center justify-between border border-[#e5e7eb] rounded-lg p-4" data-testid={`admin-user-${u.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#e51636] flex items-center justify-center text-white font-medium overflow-hidden">
                            {u.profile_photo ? <img src={u.profile_photo} alt="" className="w-full h-full object-cover" /> : u.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-[#111827]">{u.full_name}</p>
                            <p className="text-sm text-[#4b5563]">{u.email}</p>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${u.role === 'PROVIDER' ? 'bg-blue-100 text-blue-800' : u.role === 'SEEKER' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{u.role}</span>
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/profile/${u.id}`} className="px-3 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563] hover:bg-[#f9fafb] transition-all" data-testid={`view-user-${u.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                          {u.role !== 'ADMIN' && (
                            <button onClick={() => handleDeleteUser(u.id, u.full_name)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all" data-testid={`delete-user-${u.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {users.length === 0 && <p className="text-center py-8 text-[#4b5563]">No users found</p>}
                  </div>
                )}
              </div>
            )}

            {/* Listing Management */}
            {activeTab === 'listings' && (
              <div>
                {loading ? <p className="text-center py-8 text-[#4b5563]">Loading listings...</p> : (
                  <div className="space-y-3">
                    {listings.map(l => (
                      <div key={l.id} className={`flex items-center justify-between border rounded-lg p-4 ${l.deleted_at ? 'border-red-200 bg-red-50/50' : 'border-[#e5e7eb]'}`} data-testid={`admin-listing-${l.id}`}>
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-lg bg-[#f3f4f6] overflow-hidden flex-shrink-0">
                            {l.photos?.[0] ? <img src={l.photos[0]} alt="" className="w-full h-full object-cover" /> : <Home className="h-6 w-6 text-[#9ca3af] m-3" />}
                          </div>
                          <div>
                            <p className="font-medium text-[#111827]">{l.title}</p>
                            <p className="text-sm text-[#4b5563]">{l.address}{l.suburb ? `, ${l.suburb}` : ''}{l.postcode ? ` ${l.postcode}` : ''}</p>
                            <p className="text-xs text-[#9ca3af]">By {l.provider_name}</p>
                          </div>
                          {l.deleted_at && <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">Taken Down</span>}
                        </div>
                        <div className="flex gap-2">
                          <Link to={`/listings/${l.id}`} className="px-3 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563] hover:bg-[#f9fafb]">
                            <Eye className="h-4 w-4" />
                          </Link>
                          {!l.deleted_at && (
                            <button onClick={() => handleDeleteListing(l.id, l.title)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all" data-testid={`takedown-listing-${l.id}`}>
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {listings.length === 0 && <p className="text-center py-8 text-[#4b5563]">No listings found</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
