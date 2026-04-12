console.log('ADMIN DASHBOARD KE RENDER');
import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, UserCheck, UserX, Calendar, Home, Shield } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUsers, setShowUsers] = useState(false);

  useEffect(() => {
    console.log('FETCH');
    fetchStats();
  }, [user]);

  const fetchStats = async () => {
    console.log('FETCH');
    try {
      const response = await axios.get(`${API}/admin/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${API}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data.users);
      setShowUsers(true);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      toast.error('Failed to load users');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#111827] mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
            data-testid="admin-dashboard-title"
          >
            Admin Dashboard
          </h1>
          <p className="text-[#4b5563]">Platform overview and user management</p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-[#4b5563]">Loading statistics...</p>
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">Total Users</p>
                    <p className="text-3xl font-bold text-[#111827]">{stats.total_users}</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">Total Seekers</p>
                    <p className="text-3xl font-bold text-[#111827]">{stats.total_seekers}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">Total Bookings</p>
                    <p className="text-3xl font-bold text-[#111827]">{stats.total_bookings}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">Total Providers</p>
                    <p className="text-3xl font-bold text-[#111827]">{stats.total_providers}</p>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Home className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">Pending Verification</p>
                    <p className="text-3xl font-bold text-yellow-600">{stats.pending_verification}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <UserX className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">Verified Providers</p>
                    <p className="text-3xl font-bold text-green-600">{stats.verified_providers}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-[#111827]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  User Management
                </h2>
                <button
                  onClick={fetchUsers}
                  className="bg-[#e51636] text-white hover:bg-[#c4122f] px-4 py-2 rounded-lg transition-all"
                  data-testid="view-all-users-button"
                >
                  {showUsers ? 'Refresh Users' : 'View All Users'}
                </button>
              </div>

              {showUsers && users.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#e5e7eb]">
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#4b5563]">Name</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#4b5563]">Email</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#4b5563]">Role</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#4b5563]">Status</th>
                        <th className="text-left py-3 px-4 text-sm font-medium text-[#4b5563]">Joined</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u) => (
                        <tr key={u.id} className="border-b border-[#e5e7eb] hover:bg-[#f9fafb]">
                          <td className="py-3 px-4 text-sm text-[#111827]">{u.full_name}</td>
                          <td className="py-3 px-4 text-sm text-[#4b5563]">{u.email}</td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              u.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                              u.role === 'VERIFICATOR' ? 'bg-purple-100 text-purple-800' :
                              u.role === 'PROVIDER' ? 'bg-blue-100 text-blue-800' :
                              'bg-green-100 text-green-800'
                            }`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {u.role === 'PROVIDER' && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                u.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {u.is_verified ? 'Verified' : u.verification_status || 'Pending'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-sm text-[#4b5563]">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-20">
            <p className="text-[#4b5563]">Failed to load statistics</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
