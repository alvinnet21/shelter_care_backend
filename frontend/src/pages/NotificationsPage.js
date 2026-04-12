import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Bell, Check, Calendar, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const NotificationsPage = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(response.data.notifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await axios.put(
        `${API}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await axios.put(
        `${API}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success('All notifications marked as read');
      fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark all as read');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'BOOKING_CREATED':
        return <Calendar className="h-5 w-5 text-blue-600" />;
      case 'BOOKING_ACCEPTED':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'BOOKING_REJECTED':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Bell className="h-5 w-5 text-[#9ca3af]" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!user) return null;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen-header bg-[#f9fafb]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-[#111827] mb-2"
              style={{ fontFamily: 'Outfit, sans-serif' }}
              data-testid="notifications-title"
            >
              Notifications
            </h1>
            {unreadCount > 0 && (
              <p className="text-[#4b5563]">
                You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="bg-[#f3f4f6] text-[#111827] hover:bg-[#e5e7eb] px-4 py-2 rounded-lg transition-all flex items-center space-x-2"
              data-testid="mark-all-read-button"
            >
              <Check className="h-5 w-5" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-[#4b5563]">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white border border-[#e5e7eb] rounded-xl p-12 text-center">
            <Bell className="h-16 w-16 text-[#9ca3af] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[#111827] mb-2">No notifications</h3>
            <p className="text-[#4b5563]">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`bg-white border border-[#e5e7eb] rounded-xl p-5 transition-all ${
                  !notification.is_read ? 'bg-blue-50/30 border-blue-200' : ''
                }`}
                data-testid={`notification-${notification.id}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-2 rounded-lg ${
                      notification.type === 'BOOKING_ACCEPTED' ? 'bg-green-100' :
                      notification.type === 'BOOKING_REJECTED' ? 'bg-red-100' :
                      notification.type === 'BOOKING_CREATED' ? 'bg-blue-100' :
                      'bg-[#f3f4f6]'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-[#111827] leading-relaxed">
                        {notification.message}
                      </p>
                      <p className="text-sm text-[#9ca3af] mt-1">
                        {formatDate(notification.created_at)}
                      </p>
                    </div>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkRead(notification.id)}
                      className="text-[#e51636] hover:text-[#c4122f] text-sm font-medium flex items-center space-x-1 flex-shrink-0"
                      data-testid={`mark-read-${notification.id}`}
                    >
                      <Check className="h-4 w-4" />
                      <span>Mark read</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
