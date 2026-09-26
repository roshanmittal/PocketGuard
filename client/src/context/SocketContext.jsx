import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const { user, token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [latestToast, setLatestToast] = useState(null);

  // Financial listeners registered by components (e.g. Dashboard, Lending, Chat)
  const financialListeners = useRef(new Set());

  // Load initial notifications when logged in
  useEffect(() => {
    if (token) {
      loadNotifications();
    } else {
      setNotifications([]);
      setUnreadNotifCount(0);
    }
  }, [token]);

  const loadNotifications = async () => {
    try {
      const res = await notificationService.getNotifications();
      if (res.success && res.data) {
        setNotifications(res.data.notifications);
        setUnreadNotifCount(res.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  };

  const markNotificationsRead = async () => {
    try {
      await notificationService.markAllAsRead();
      setUnreadNotifCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark notifications read:', err);
    }
  };

  // Setup Socket connection
  useEffect(() => {
    if (!token || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Connect to server
    const newSocket = io({
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket connected successfully with ID:', newSocket.id);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
      console.log('Socket disconnected');
    });

    // Online status list
    newSocket.on('users:online_list', (ids) => {
      setOnlineUserIds(new Set(ids));
    });

    newSocket.on('user:status', ({ userId, status, onlineUserIds: currentOnline }) => {
      if (currentOnline) {
        setOnlineUserIds(new Set(currentOnline));
      } else {
        setOnlineUserIds((prev) => {
          const next = new Set(prev);
          if (status === 'online') next.add(userId);
          else next.delete(userId);
          return next;
        });
      }
    });

    // Real-time notifications
    newSocket.on('notification:new', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnreadNotifCount((prev) => prev + 1);
      setLatestToast({
        title: notif.title,
        message: notif.message,
        type: 'info',
      });
    });

    // Real-time financial updates
    newSocket.on('wallet:update', (data) => {
      financialListeners.current.forEach((cb) => cb('wallet', data));
    });

    newSocket.on('lending:update', (data) => {
      financialListeners.current.forEach((cb) => cb('lending', data));
    });

    newSocket.on('transaction:new', (tx) => {
      financialListeners.current.forEach((cb) => cb('transaction', tx));
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [token, user?._id]);

  // Subscribe callback for financial changes (used by pages to re-fetch without reload)
  const subscribeToFinancialUpdates = (callback) => {
    financialListeners.current.add(callback);
    return () => {
      financialListeners.current.delete(callback);
    };
  };

  const isUserOnline = (userId) => {
    if (!userId) return false;
    return onlineUserIds.has(userId.toString());
  };

  const dismissToast = () => setLatestToast(null);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUserIds,
        isUserOnline,
        notifications,
        unreadNotifCount,
        markNotificationsRead,
        refreshNotifications: loadNotifications,
        subscribeToFinancialUpdates,
        latestToast,
        dismissToast,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
