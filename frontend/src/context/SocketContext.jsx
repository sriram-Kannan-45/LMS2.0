/**
 * Socket.IO Context
 * Provides real-time communication utilities to React components
 */

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { BACKEND_ORIGIN } from '../api/api';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    if (!token) return;

    // Parse token to get user info (or fetch from auth context)
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    setUserId(user.id);
    setUserRole(user.role);

    // Initialize Socket.IO connection
    const socket = io(import.meta.env.VITE_SOCKET_URL || BACKEND_ORIGIN, {
      auth: {
        token,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      console.log('✅ Socket connected:', socket.id);
      setConnected(true);
    });

    socket.on('disconnect', () => {
      console.log('❌ Socket disconnected');
      setConnected(false);
    });

    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const value = {
    socket: socketRef.current,
    connected,
    userId,
    userRole,
    emit: (event, data) => socketRef.current?.emit(event, data),
    on: (event, handler) => socketRef.current?.on(event, handler),
    off: (event, handler) => socketRef.current?.off(event, handler),
    once: (event, handler) => socketRef.current?.once(event, handler),
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export default SocketContext;
