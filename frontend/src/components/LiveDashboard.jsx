import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import { BACKEND_ORIGIN } from '../api/api';

const Dashboard = ({ user }) => {
  const [stats, setStats] = useState({
    totalActiveUsers: 0,
    activeSessionsCount: 0,
    timestamp: null
  });

  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
    // Only connect if admin
    if (user?.role !== 'ADMIN') return;

    const socket = io(import.meta.env.VITE_SOCKET_URL || BACKEND_ORIGIN, {
      auth: { token: user.token }
    });

    socket.emit('analytics:subscribe');

    socket.on('dashboard-update', (data) => {
      setStats(data);
      
      // Keep last 20 data points for a simple chart
      setHistoricalData(prev => {
        const newData = [...prev, { time: new Date(data.timestamp).toLocaleTimeString(), users: data.totalActiveUsers }];
        if (newData.length > 20) return newData.slice(newData.length - 20);
        return newData;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  if (user?.role !== 'ADMIN') {
    return <div className="p-8 text-center text-gray-500">Analytics are restricted to Administrators.</div>;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Real-Time Live Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Live Participants</span>
          <span className="text-4xl font-bold text-indigo-600">
            {stats.totalActiveUsers}
          </span>
          <span className="text-xs text-green-500 mt-2 flex items-center">
            <span className="w-2 h-2 rounded-full bg-green-500 mr-1 animate-pulse"></span> Live Update
          </span>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Active Sessions</span>
          <span className="text-4xl font-bold text-emerald-600">
            {stats.activeSessionsCount}
          </span>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <span className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-2">Last Update</span>
          <span className="text-lg font-medium text-gray-700 mt-auto">
            {stats.timestamp ? new Date(stats.timestamp).toLocaleTimeString() : 'Waiting...'}
          </span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Active Users Trend</h3>
        
        {/* Simple CSS-based bar chart for demonstration. 
            In a real app, use Recharts or Chart.js here. */}
        <div className="h-64 flex items-end gap-2 border-b border-gray-200 pb-2">
          {historicalData.length === 0 ? (
            <div className="w-full text-center text-gray-400 self-center">Waiting for data...</div>
          ) : (
            historicalData.map((d, i) => {
              // Calculate height relative to max value (minimum 100 for scale)
              const maxVal = Math.max(10, ...historicalData.map(data => data.users));
              const heightPct = Math.max(5, (d.users / maxVal) * 100);
              
              return (
                <div key={i} className="flex-1 flex flex-col items-center group relative">
                  <div 
                    className="w-full bg-indigo-200 hover:bg-indigo-400 rounded-t-sm transition-all duration-300"
                    style={{ height: `${heightPct}%` }}
                  ></div>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1 hidden group-hover:block bg-gray-800 text-white text-xs py-1 px-2 rounded whitespace-nowrap z-10">
                    {d.users} users @ {d.time}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
