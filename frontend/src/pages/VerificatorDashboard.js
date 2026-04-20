import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Users, UserCheck, Clock, CheckCircle, XCircle, FileText, Eye, X, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const VerificatorDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('PENDING');
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingId, setProcessingId] = useState(null);
  const [viewingDocument, setViewingDocument] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'VERIFICATOR') {
      navigate('/login');
      return;
    }
    fetchStats();
    fetchProviders();
  }, [user, filterStatus]);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/verificator/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      toast.error('Failed to load statistics');
    }
  };

  const fetchProviders = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API}/verificator/providers`, {
        params: { status: filterStatus },
        headers: { Authorization: `Bearer ${token}` }
      });
      setProviders(response.data.providers);
    } catch (error) {
      console.error('Failed to fetch providers:', error);
      toast.error('Failed to load provider list');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (providerId) => {
    setProcessingId(providerId);
    try {
      await axios.put(
        `${API}/verificator/providers/${providerId}/verify`,
        null,
        {
          params: { action: 'APPROVE' },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Provider verified successfully!');
      fetchStats();
      fetchProviders();
    } catch (error) {
      console.error('Failed to approve provider:', error);
      toast.error('Failed to verify provider');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast.error('Rejection reason is required');
      return;
    }

    setProcessingId(selectedProvider.id);
    try {
      await axios.put(
        `${API}/verificator/providers/${selectedProvider.id}/verify`,
        null,
        {
          params: { action: 'REJECT', reason: rejectReason },
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      toast.success('Provider rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedProvider(null);
      fetchStats();
      fetchProviders();
    } catch (error) {
      console.error('Failed to reject provider:', error);
      toast.error('Failed to reject provider');
    } finally {
      setProcessingId(null);
    }
  };

  const openRejectModal = (provider) => {
    setSelectedProvider(provider);
    setShowRejectModal(true);
  };

  const viewDocument = (provider, docType) => {
    const doc = docType === 'id' ? provider.id_document : provider.police_check;
    if (doc) {
      setViewingDocument({ url: doc, title: docType === 'id' ? 'ID Document' : 'Police Check', name: provider.full_name });
    } else {
      toast.error(`${docType === 'id' ? 'ID document' : 'Police check'} not available`);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1
            className="text-3xl sm:text-4xl font-bold text-[#111827] mb-2"
            style={{ fontFamily: 'Outfit, sans-serif' }}
            data-testid="verificator-dashboard-title"
          >
            Verificator Dashboard
          </h1>
          <p className="text-[#4b5563]">Manage provider shelter verification</p>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div 
              className="bg-white border border-[#e5e7eb] rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] cursor-pointer hover:border-blue-300 transition-all"
              onClick={() => setFilterStatus('')}
              data-testid="stat-total-providers"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">Total Providers</p>
                  <p className="text-3xl font-bold text-[#111827]">{stats.total_providers}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div 
              className={`bg-white border rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] cursor-pointer transition-all ${filterStatus === 'PENDING' ? 'border-yellow-400 ring-2 ring-yellow-100' : 'border-[#e5e7eb] hover:border-yellow-300'}`}
              onClick={() => setFilterStatus('PENDING')}
              data-testid="stat-pending-verification"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">Pending Verification</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending_verification}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>

            <div 
              className={`bg-white border rounded-xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.06)] cursor-pointer transition-all ${filterStatus === 'APPROVED' ? 'border-green-400 ring-2 ring-green-100' : 'border-[#e5e7eb] hover:border-green-300'}`}
              onClick={() => setFilterStatus('APPROVED')}
              data-testid="stat-verified-providers"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-[#9ca3af] uppercase tracking-wider mb-1">Verified</p>
                  <p className="text-3xl font-bold text-green-600">{stats.verified_providers}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="bg-white border border-[#e5e7eb] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.06)] overflow-hidden">
          <div className="flex border-b border-[#e5e7eb]">
            {[
              { value: 'PENDING', label: 'Pending', icon: Clock },
              { value: 'APPROVED', label: 'Approved', icon: CheckCircle },
              { value: 'REJECTED', label: 'Rejected', icon: XCircle },
            ].map((tab) => (
              <button
                key={tab.value}
                onClick={() => setFilterStatus(tab.value)}
                className={`flex-1 px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-all ${
                  filterStatus === tab.value 
                    ? 'bg-[#e51636]/5 text-[#e51636] border-b-2 border-[#e51636]' 
                    : 'text-[#4b5563] hover:bg-[#f9fafb]'
                }`}
                data-testid={`filter-tab-${tab.value || 'all'}`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Providers List */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e51636] mx-auto mb-4"></div>
                <p className="text-[#4b5563]">Loading providers...</p>
              </div>
            ) : providers.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-[#9ca3af] mx-auto mb-4" />
                <p className="text-[#4b5563]">No providers with this status</p>
              </div>
            ) : (
              <div className="space-y-4">
                {providers.map((provider) => (
                  <div 
                    key={provider.id} 
                    className="border border-[#e5e7eb] rounded-lg p-4 hover:border-[#d1d5db] transition-all"
                    data-testid={`provider-card-${provider.id}`}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-[#e51636] flex items-center justify-center text-white font-medium">
                            {provider.full_name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-semibold text-[#111827]">{provider.full_name}</h3>
                            <p className="text-sm text-[#4b5563]">{provider.email}</p>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mt-3">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            provider.verification_status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                            provider.verification_status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {provider.verification_status || 'PENDING'}
                          </span>
                          
                          {provider.id_document && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              ID Uploaded
                            </span>
                          )}

                          {provider.police_check && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 flex items-center gap-1">
                              <ShieldCheck className="h-3 w-3" />
                              Police Check Uploaded
                            </span>
                          )}
                          
                          {provider.created_at && (
                            <span className="text-xs text-[#9ca3af]">
                              Joined: {new Date(provider.created_at).toLocaleDateString('en-US')}
                            </span>
                          )}
                        </div>

                        {provider.verification_status === 'REJECTED' && provider.verification_reason && (
                          <div className="mt-3 p-3 bg-red-50 rounded-lg">
                            <p className="text-sm text-red-700">
                              <span className="font-medium">Rejection reason:</span> {provider.verification_reason}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {provider.id_document && (
                          <button
                            onClick={() => viewDocument(provider, 'id')}
                            className="flex items-center gap-2 px-3 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563] hover:bg-[#f9fafb] transition-all"
                            data-testid={`view-id-${provider.id}`}
                          >
                            <Eye className="h-4 w-4" />
                            View ID
                          </button>
                        )}

                        {provider.police_check && (
                          <button
                            onClick={() => viewDocument(provider, 'police')}
                            className="flex items-center gap-2 px-3 py-2 border border-purple-200 rounded-lg text-purple-700 hover:bg-purple-50 transition-all"
                            data-testid={`view-police-check-${provider.id}`}
                          >
                            <ShieldCheck className="h-4 w-4" />
                            View Police Check
                          </button>
                        )}
                        
                        {provider.verification_status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(provider.id)}
                              disabled={processingId === provider.id}
                              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all disabled:opacity-50"
                              data-testid={`approve-btn-${provider.id}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                              {processingId === provider.id ? 'Processing...' : 'Approve'}
                            </button>
                            <button
                              onClick={() => openRejectModal(provider)}
                              disabled={processingId === provider.id}
                              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
                              data-testid={`reject-btn-${provider.id}`}
                            >
                              <XCircle className="h-4 w-4" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
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
              <h3 className="text-lg font-semibold text-[#111827]">
                {viewingDocument.title} - {viewingDocument.name}
              </h3>
              <button
                onClick={() => setViewingDocument(null)}
                className="text-[#9ca3af] hover:text-[#4b5563]"
                data-testid="close-document-viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-center bg-[#f9fafb] rounded-lg p-4">
              <img
                src={viewingDocument.url}
                alt={viewingDocument.title}
                className="max-w-full max-h-[60vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" data-testid="reject-modal">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-[#111827]">Reject Verification</h3>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedProvider(null);
                }}
                className="text-[#9ca3af] hover:text-[#4b5563]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-[#4b5563] mb-4">
              You are about to reject verification for <span className="font-medium text-[#111827]">{selectedProvider?.full_name}</span>
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-[#4b5563] mb-2">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                className="w-full px-3 py-2 border border-[#e5e7eb] rounded-lg focus:ring-2 focus:ring-[#e51636] focus:border-transparent resize-none"
                rows={4}
                data-testid="reject-reason-input"
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedProvider(null);
                }}
                className="flex-1 px-4 py-2 border border-[#e5e7eb] rounded-lg text-[#4b5563] hover:bg-[#f9fafb] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId || !rejectReason.trim()}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
                data-testid="confirm-reject-btn"
              >
                {processingId ? 'Processing...' : 'Reject Verification'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificatorDashboard;
