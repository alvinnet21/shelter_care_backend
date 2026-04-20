import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProfileModal } from '../context/ProfileModalContext';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Users, Calendar, Home, ListOrdered, Trash2, Eye, Search, CheckCircle, XCircle, FileText, ShieldCheck, X, UserPlus, Ban, Unlock, ClipboardList, Clock, History, Phone, Mail, Lock, CalendarCheck } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AdminDashboard = () => {
  const { user, token } = useAuth();
  const { openProfile } = useProfileModal();
  const navigate = useNavigate();
  const location = useLocation();
  const [stats, setStats] = useState(null);
  const initialTab = location.state?.tab || 'users';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [users, setUsers] = useState([]);
  const [listings, setListings] = useState([]);
  const [adminBookings, setAdminBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [listingSearch, setListingSearch] = useState('');
  const [bookingSearch, setBookingSearch] = useState('');
  const [bookingFilter, setBookingFilter] = useState('all');

  // Provider verification
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);

  // Add User modal
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', full_name: '', password: '', role: 'SEEKER', phone_number: '' });

  useEffect(() => {
    if (!user || user.role !== 'ADMIN') { navigate('/login'); return; }
    fetchStats();
  }, [user]);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'listings') fetchListings();
    if (activeTab === 'bookings') fetchAdminBookings();
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

  const fetchAdminBookings = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/admin/bookings`, { headers: { Authorization: `Bearer ${token}` } });
      setAdminBookings(res.data.bookings);
    } catch (e) { toast.error('Failed to load bookings'); }
    finally { setLoading(false); }
  };

  const handleDeleteUser = async (userId, userName) => {
    if (!window.confirm(`Are you sure you want to delete ${userName}?`)) return;
    try {
      await axios.put(`${API}/admin/users/${userId}/delete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('User deleted'); fetchUsers(); fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleSuspend = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/suspend`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('User suspended'); fetchUsers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleUnsuspend = async (userId) => {
    try {
      await axios.put(`${API}/admin/users/${userId}/unsuspend`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('User unsuspended'); fetchUsers();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleDeleteListing = async (listingId, title) => {
    if (!window.confirm(`Take down "${title}"?`)) return;
    try {
      await axios.put(`${API}/admin/listings/${listingId}/delete`, {}, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('Listing taken down'); fetchListings(); fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const handleApprove = async (providerId) => {
    setProcessingId(providerId);
    try {
      await axios.put(`${API}/verificator/providers/${providerId}/verify`, null, { params: { action: 'APPROVE' }, headers: { Authorization: `Bearer ${token}` } });
      toast.success('Provider approved!'); fetchUsers(); fetchStats();
    } catch (e) { toast.error('Failed'); }
    finally { setProcessingId(null); }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) { toast.error('Reason required'); return; }
    setProcessingId(selectedProvider.id);
    try {
      await axios.put(`${API}/verificator/providers/${selectedProvider.id}/verify`, null, { params: { action: 'REJECT', reason: rejectReason }, headers: { Authorization: `Bearer ${token}` } });
      toast.success('Provider rejected'); setShowRejectModal(false); setRejectReason(''); setSelectedProvider(null); fetchUsers();
    } catch (e) { toast.error('Failed'); }
    finally { setProcessingId(null); }
  };

  const handleAddUser = async () => {
    if (!newUser.email || !newUser.full_name || !newUser.password) { toast.error('Fill all required fields'); return; }
    try {
      await axios.post(`${API}/admin/users`, newUser, { headers: { Authorization: `Bearer ${token}` } });
      toast.success('User created!'); setShowAddUser(false); setNewUser({ email: '', full_name: '', password: '', role: 'SEEKER', phone_number: '' }); fetchUsers(); fetchStats();
    } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
  };

  const viewDocument = (u, docType) => {
    const doc = docType === 'id' ? u.id_document : u.police_check;
    if (doc) setViewingDocument({ url: doc, title: docType === 'id' ? 'ID Document' : 'Police Check', name: u.full_name });
    else toast.error('Not available');
  };

  const filteredUsers = users.filter(u => u.full_name?.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredListings = listings.filter(l =>
    l.title?.toLowerCase().includes(listingSearch.toLowerCase()) ||
    l.address?.toLowerCase().includes(listingSearch.toLowerCase()) ||
    (l.suburb && l.suburb.toLowerCase().includes(listingSearch.toLowerCase())) ||
    (l.postcode && l.postcode.toLowerCase().includes(listingSearch.toLowerCase()))
  );

  const today = new Date().toISOString();
  const getFilteredBookings = () => {
    let filtered = adminBookings.filter(b =>
      (b.seeker_name?.toLowerCase().includes(bookingSearch.toLowerCase()) || b.provider_name?.toLowerCase().includes(bookingSearch.toLowerCase()))
    );
    if (bookingFilter === 'upcoming') filtered = filtered.filter(b => b.status === 'ACCEPTED' && b.check_out_date >= today);
    if (bookingFilter === 'history') filtered = filtered.filter(b => b.status === 'ACCEPTED' && b.check_out_date < today);
    if (bookingFilter === 'pending') filtered = filtered.filter(b => b.status === 'PENDING');
    return filtered;
  };
  const filteredBookings = getFilteredBookings();

  const formatDate = (d) => { try { return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }); } catch { return d; } };

  if (!user) return null;

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#111827] mb-2" style={{ fontFamily: 'Outfit, sans-serif' }} data-testid="admin-dashboard-title">Admin Dashboard</h1>
          <p className="text-[#4b5563]">System overview and management</p>
        </div>

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
              { key: 'users', label: 'User Management', icon: Users },
              { key: 'listings', label: 'Listing Management', icon: ListOrdered },
              { key: 'bookings', label: 'Booking Management', icon: ClipboardList },
            ].map(tab => (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${activeTab === tab.key ? 'bg-[#e51636]/5 text-[#e51636] border-b-2 border-[#e51636]' : 'text-[#4b5563] hover:bg-[#f9fafb]'}`}
                data-testid={`admin-tab-${tab.key}`}>
                <tab.icon className="h-4 w-4" />{tab.label}
              </button>
            ))}
          </div>

          <div className="p-6">
            {/* ========== USER MANAGEMENT ========== */}
            {activeTab === 'users' && (
              <div>
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                    <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                      placeholder="Search by name..." className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30" data-testid="admin-user-search" />
                  </div>
                  <button onClick={() => setShowAddUser(true)} className="flex items-center gap-2 px-5 py-3 bg-[#e51636] text-white rounded-lg hover:bg-[#c4122f] transition-all font-medium" data-testid="add-user-btn">
                    <UserPlus className="h-5 w-5" />Add User
                  </button>
                </div>
                {loading ? <p className="text-center py-8 text-[#4b5563]">Loading...</p> : (
                  <div className="space-y-3">
                    {filteredUsers.map(u => (
                      <div key={u.id} className="border border-[#e5e7eb] rounded-lg p-4" data-testid={`admin-user-${u.id}`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-[#e51636] flex items-center justify-center text-white font-medium overflow-hidden flex-shrink-0">
                              {u.profile_photo ? <img src={u.profile_photo} alt="" className="w-full h-full object-cover" /> : u.full_name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-[#111827]">{u.full_name}</p>
                              <p className="text-sm text-[#4b5563]">{u.email}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${u.role === 'PROVIDER' ? 'bg-blue-100 text-blue-800' : u.role === 'SEEKER' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{u.role}</span>
                            {u.role === 'PROVIDER' && (
                              <span className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${u.verification_status === 'APPROVED' ? 'bg-green-100 text-green-800' : u.verification_status === 'REJECTED' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>{u.verification_status || 'PENDING'}</span>
                            )}
                            {u.is_suspended && <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 flex-shrink-0">SUSPENDED</span>}
                          </div>
                          <div className="flex gap-2 flex-shrink-0 ml-3 flex-wrap">
                            {u.role === 'PROVIDER' && u.id_document && (
                              <button onClick={() => viewDocument(u, 'id')} className="flex items-center gap-1 px-3 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563] hover:bg-[#f9fafb] text-xs" data-testid={`view-id-${u.id}`}><FileText className="h-4 w-4" />ID</button>
                            )}
                            {u.role === 'PROVIDER' && u.police_check && (
                              <button onClick={() => viewDocument(u, 'police')} className="flex items-center gap-1 px-3 py-2 border border-purple-200 rounded-lg text-purple-700 hover:bg-purple-50 text-xs" data-testid={`view-police-check-${u.id}`}><ShieldCheck className="h-4 w-4" />Police</button>
                            )}
                            {u.role === 'PROVIDER' && u.verification_status === 'PENDING' && (
                              <>
                                <button onClick={() => handleApprove(u.id)} disabled={processingId === u.id} className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-xs" data-testid={`approve-provider-${u.id}`}><CheckCircle className="h-4 w-4" />Accept</button>
                                <button onClick={() => { setSelectedProvider(u); setShowRejectModal(true); }} disabled={processingId === u.id} className="flex items-center gap-1 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-xs" data-testid={`reject-provider-${u.id}`}><XCircle className="h-4 w-4" />Reject</button>
                              </>
                            )}
                            {/* Suspend/Unsuspend */}
                            {u.role !== 'ADMIN' && !u.is_suspended && (
                              <button onClick={() => handleSuspend(u.id)} className="flex items-center gap-1 px-3 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-xs" data-testid={`suspend-user-${u.id}`}><Ban className="h-4 w-4" />Suspend</button>
                            )}
                            {u.role !== 'ADMIN' && u.is_suspended && (
                              <button onClick={() => handleUnsuspend(u.id)} className="flex items-center gap-1 px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-xs" data-testid={`unsuspend-user-${u.id}`}><Unlock className="h-4 w-4" />Unsuspend</button>
                            )}
                            <button onClick={() => openProfile(u.id)} className="px-3 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563] hover:bg-[#f9fafb]" data-testid={`view-user-${u.id}`}><Eye className="h-4 w-4" /></button>
                            {u.role !== 'ADMIN' && (
                              <button onClick={() => handleDeleteUser(u.id, u.full_name)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" data-testid={`delete-user-${u.id}`}><Trash2 className="h-4 w-4" /></button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {filteredUsers.length === 0 && <p className="text-center py-8 text-[#4b5563]">{userSearch ? 'No users match your search' : 'No users found'}</p>}
                  </div>
                )}
              </div>
            )}

            {/* ========== LISTING MANAGEMENT ========== */}
            {activeTab === 'listings' && (
              <div>
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                  <input type="text" value={listingSearch} onChange={(e) => setListingSearch(e.target.value)}
                    placeholder="Search by title, address, suburb, postcode..." className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30" data-testid="admin-listing-search" />
                </div>
                {loading ? <p className="text-center py-8 text-[#4b5563]">Loading...</p> : (
                  <div className="space-y-3">
                    {filteredListings.map(l => (
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
                          <button onClick={() => navigate(`/listings/${l.id}`, { state: { from: 'admin', tab: 'listings' } })} className="px-3 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563] hover:bg-[#f9fafb]" data-testid={`view-listing-${l.id}`}><Eye className="h-4 w-4" /></button>
                          {!l.deleted_at && (
                            <button onClick={() => handleDeleteListing(l.id, l.title)} className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100" data-testid={`takedown-listing-${l.id}`}><Trash2 className="h-4 w-4" /></button>
                          )}
                        </div>
                      </div>
                    ))}
                    {filteredListings.length === 0 && <p className="text-center py-8 text-[#4b5563]">No listings found</p>}
                  </div>
                )}
              </div>
            )}

            {/* ========== BOOKING MANAGEMENT ========== */}
            {activeTab === 'bookings' && (
              <div>
                <div className="mb-4 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#9ca3af]" />
                  <input type="text" value={bookingSearch} onChange={(e) => setBookingSearch(e.target.value)}
                    placeholder="Search by seeker or provider name..." className="w-full pl-10 pr-4 py-3 border border-[#e5e7eb] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#e51636]/30" data-testid="admin-booking-search" />
                </div>
                <div className="flex gap-2 mb-4 flex-wrap">
                  {[
                    { key: 'all', label: 'All', icon: ClipboardList },
                    { key: 'upcoming', label: 'Upcoming', icon: CalendarCheck },
                    { key: 'history', label: 'History', icon: History },
                    { key: 'pending', label: 'Pending', icon: Clock },
                  ].map(f => (
                    <button key={f.key} onClick={() => setBookingFilter(f.key)}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${bookingFilter === f.key ? 'bg-[#e51636] text-white' : 'bg-white border border-[#e5e7eb] text-[#4b5563] hover:bg-[#f9fafb]'}`}
                      data-testid={`booking-filter-${f.key}`}>
                      <f.icon className="h-4 w-4" />{f.label}
                    </button>
                  ))}
                </div>
                {loading ? <p className="text-center py-8 text-[#4b5563]">Loading...</p> : (
                  <div className="space-y-3">
                    {filteredBookings.map(b => (
                      <div key={b.id} className="border border-[#e5e7eb] rounded-lg p-4" data-testid={`admin-booking-${b.id}`}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-[#111827]">{b.listing_title}</h4>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${b.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' : b.status === 'REJECTED' ? 'bg-red-100 text-red-800' : b.status === 'CANCELLED' ? 'bg-gray-100 text-gray-800' : 'bg-yellow-100 text-yellow-800'}`}>{b.status}</span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-[#4b5563]">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-[#9ca3af]" />
                            <span><span className="font-medium">Seeker:</span> {b.seeker_name} {b.seeker_email ? `(${b.seeker_email})` : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Home className="h-4 w-4 text-[#9ca3af]" />
                            <span><span className="font-medium">Provider:</span> {b.provider_name || '-'} {b.provider_email ? `(${b.provider_email})` : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-[#9ca3af]" />
                            <span>{formatDate(b.check_in_date)} - {formatDate(b.check_out_date)}</span>
                          </div>
                          {b.seeker_phone && (
                            <div className="flex items-center gap-2">
                              <Phone className="h-4 w-4 text-[#9ca3af]" />
                              <span>{b.seeker_phone}</span>
                            </div>
                          )}
                        </div>
                        {b.notes && (
                          <div className="mt-2 bg-blue-50 p-2 rounded-lg text-sm text-blue-700"><span className="font-medium">Notes:</span> {b.notes}</div>
                        )}
                        {b.rejection_reason && (
                          <div className="mt-2 bg-red-50 p-2 rounded-lg text-sm text-red-700"><span className="font-medium">Reason:</span> {b.rejection_reason}</div>
                        )}
                      </div>
                    ))}
                    {filteredBookings.length === 0 && <p className="text-center py-8 text-[#4b5563]">No bookings found</p>}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full p-6 shadow-2xl" data-testid="document-viewer-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#111827]">{viewingDocument.title} - {viewingDocument.name}</h3>
              <button onClick={() => setViewingDocument(null)} className="text-[#9ca3af] hover:text-[#4b5563]" data-testid="close-document-viewer"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex justify-center bg-[#f9fafb] rounded-lg p-4">
              <img src={viewingDocument.url} alt={viewingDocument.title} className="max-w-full max-h-[60vh] object-contain rounded-lg" />
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" data-testid="reject-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#111827]">Reject Provider</h3>
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); setSelectedProvider(null); }} className="text-[#9ca3af] hover:text-[#4b5563]"><X className="h-5 w-5" /></button>
            </div>
            <p className="text-[#4b5563] mb-4">Reject <span className="font-medium text-[#111827]">{selectedProvider?.full_name}</span></p>
            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg mb-4 resize-none" rows={3} data-testid="reject-reason-input" />
            <div className="flex gap-3">
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563]">Cancel</button>
              <button onClick={handleReject} disabled={!rejectReason.trim()} className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50" data-testid="confirm-reject-btn">Reject</button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" data-testid="add-user-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#111827]">Add New User</h3>
              <button onClick={() => setShowAddUser(false)} className="text-[#9ca3af] hover:text-[#4b5563]"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">Role</label>
                <div className="flex gap-2">
                  {['SEEKER', 'PROVIDER', 'VERIFICATOR'].map(r => (
                    <button key={r} type="button" onClick={() => setNewUser({ ...newUser, role: r })}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all ${newUser.role === r ? 'border-[#e51636] bg-[#e51636]/5 text-[#e51636]' : 'border-[#e5e7eb] text-[#4b5563]'}`}
                      data-testid={`new-user-role-${r.toLowerCase()}`}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">Full Name *</label>
                <input type="text" value={newUser.full_name} onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg" placeholder="Full Name" data-testid="new-user-name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">Email *</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg" placeholder="email@example.com" data-testid="new-user-email" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">Password *</label>
                <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg" placeholder="Min 6 characters" data-testid="new-user-password" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">Phone (+61)</label>
                <input type="text" value={newUser.phone_number.replace('+61', '')}
                  onChange={(e) => { const v = e.target.value.replace(/[^\d]/g, ''); setNewUser({ ...newUser, phone_number: v ? `+61${v}` : '' }); }}
                  inputMode="numeric" className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg" placeholder="412345678" data-testid="new-user-phone" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddUser(false)} className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563]">Cancel</button>
                <button onClick={handleAddUser} className="flex-1 px-4 py-2 bg-[#e51636] text-white rounded-lg hover:bg-[#c4122f]" data-testid="confirm-add-user-btn">Create User</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
