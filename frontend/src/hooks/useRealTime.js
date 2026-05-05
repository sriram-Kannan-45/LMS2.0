/**
 * Custom Hooks for Real-Time Features
 * useNotifications, useActivityFeed, useAnalytics
 */

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';
import axios from 'axios';

import { BACKEND_ORIGIN } from '../api/api';

const API_BASE = `${BACKEND_ORIGIN}/api`;

/**
 * useNotifications Hook
 * Manages notifications with real-time updates
 */
export const useNotifications = () => {
  const { socket, connected, userId } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch notifications
  const fetchNotifications = useCallback(async (limit = 10, offset = 0) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/notifications`, {
        params: { limit, offset },
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setNotifications(response.data.data);
      setUnreadCount(response.data.unreadCount);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    try {
      await axios.put(
        `${API_BASE}/notifications/${notificationId}/read`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    try {
      await axios.put(
        `${API_BASE}/notifications/read-all`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` } }
      );
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId) => {
    try {
      await axios.delete(`${API_BASE}/notifications/${notificationId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  }, []);

  // Listen for real-time notifications
  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('notification:new', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);
    });

    socket.on('notification:read', ({ notificationId }) => {
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true } : n
        )
      );
    });

    socket.on('notification:markAllRead', () => {
      setUnreadCount(0);
    });

    return () => {
      socket.off('notification:new');
      socket.off('notification:read');
      socket.off('notification:markAllRead');
    };
  }, [socket, connected]);

  // Initial fetch
  useEffect(() => {
    if (connected && userId) {
      fetchNotifications();
    }
  }, [connected, userId, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };
};

/**
 * useActivityFeed Hook
 * Manages activity feed with real-time updates
 */
export const useActivityFeed = () => {
  const { socket, connected, userId } = useSocket();
  const [activities, setActivities] = useState([]);
  const [groupedActivities, setGroupedActivities] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // Fetch activity feed
  const fetchActivityFeed = useCallback(async (limit = 20, offset = 0, filters = {}) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/feed`, {
        params: { limit, offset, ...filters },
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setActivities(response.data.data);
      setHasMore(response.data.data.length === limit);
      setError(null);
    } catch (err) {
      console.error('Error fetching activity feed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch grouped activity feed
  const fetchGroupedActivityFeed = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE}/feed/grouped`, {
        params: filters,
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setGroupedActivities(response.data.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching grouped activity feed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Listen for real-time activities
  useEffect(() => {
    if (!socket || !connected) return;

    socket.on('activity:new', (activity) => {
      setActivities((prev) => [activity, ...prev]);
      // Update grouped if exists
      setGroupedActivities((prev) => {
        const updated = { ...prev };
        if (updated.today) {
          updated.today = [activity, ...updated.today];
        }
        return updated;
      });
    });

    return () => {
      socket.off('activity:new');
    };
  }, [socket, connected]);

  // Initial fetch
  useEffect(() => {
    if (connected && userId) {
      fetchActivityFeed();
    }
  }, [connected, userId, fetchActivityFeed]);

  return {
    activities,
    groupedActivities,
    loading,
    error,
    hasMore,
    fetchActivityFeed,
    fetchGroupedActivityFeed,
  };
};

/**
 * useAnalytics Hook
 * Manages analytics with real-time updates (admin only)
 */
export const useAnalytics = () => {
  const { socket, connected, userRole } = useSocket();
  const [analytics, setAnalytics] = useState(null);
  const [enrollmentTrend, setEnrollmentTrend] = useState([]);
  const [trainerPerformance, setTrainerPerformance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch dashboard analytics
  const fetchDashboardAnalytics = useCallback(async (options = {}) => {
    try {
      if (userRole !== 'ADMIN') {
        throw new Error('Unauthorized: Admin access required');
      }
      setLoading(true);
      const response = await axios.get(`${API_BASE}/admin/analytics`, {
        params: options,
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setAnalytics(response.data.data);
      setEnrollmentTrend(response.data.data.enrollmentTrend);
      setTrainerPerformance(response.data.data.trainerPerformance);
      setError(null);
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userRole]);

  // Fetch enrollment trend
  const fetchEnrollmentTrend = useCallback(async (period = 'daily', days = 30) => {
    try {
      const response = await axios.get(`${API_BASE}/admin/analytics/enrollment-trend`, {
        params: { period, days },
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setEnrollmentTrend(response.data.data);
    } catch (err) {
      console.error('Error fetching enrollment trend:', err);
    }
  }, []);

  // Fetch trainer performance
  const fetchTrainerPerformance = useCallback(async (days = 90, limit = 10) => {
    try {
      const response = await axios.get(`${API_BASE}/admin/analytics/trainer-performance`, {
        params: { days, limit },
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });
      setTrainerPerformance(response.data.data);
    } catch (err) {
      console.error('Error fetching trainer performance:', err);
    }
  }, []);

  // Listen for real-time analytics updates
  useEffect(() => {
    if (!socket || !connected || userRole !== 'ADMIN') return;

    socket.emit('analytics:subscribe', {});

    socket.on('analytics:update', (updatedMetrics) => {
      setAnalytics((prev) => ({ ...prev, ...updatedMetrics }));
    });

    return () => {
      socket.off('analytics:update');
    };
  }, [socket, connected, userRole]);

  // Initial fetch
  useEffect(() => {
    if (connected && userRole === 'ADMIN') {
      fetchDashboardAnalytics();
    }
  }, [connected, userRole, fetchDashboardAnalytics]);

  return {
    analytics,
    enrollmentTrend,
    trainerPerformance,
    loading,
    error,
    fetchDashboardAnalytics,
    fetchEnrollmentTrend,
    fetchTrainerPerformance,
  };
};
