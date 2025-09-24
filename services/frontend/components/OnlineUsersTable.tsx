'use client';

import { useState } from 'react';
import { Users, Wifi, WifiOff, Clock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface OnlineUser {
  _id: string;
  username: string;
  email: string;
  isOnline: boolean;
  lastSeen: string;
  currentSessionId: string;
}

export default function OnlineUsersTable() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data for now - will be replaced with real API call
  const mockOnlineUsers: OnlineUser[] = [
    {
      _id: '1',
      username: 'admin',
      email: 'admin@example.com',
      isOnline: true,
      lastSeen: new Date().toISOString(),
      currentSessionId: 'session-123'
    },
    {
      _id: '2',
      username: 'user1',
      email: 'user1@example.com',
      isOnline: true,
      lastSeen: new Date(Date.now() - 5 * 60 * 1000).toISOString(), // 5 minutes ago
      currentSessionId: 'session-456'
    }
  ];

  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <Wifi className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-white text-lg mb-2">Admin Access Required</p>
          <p className="text-gray-400 text-sm">
            Only admin users can view online users
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Online Users</h2>
            <p className="text-gray-400 text-sm">Currently active users</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 bg-green-500/20 px-3 py-1 rounded-full">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-green-400 text-sm font-medium">
            {mockOnlineUsers.length} Online
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-3 px-4 font-semibold text-gray-300">User</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-300">Status</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-300">Last Seen</th>
              <th className="text-left py-3 px-4 font-semibold text-gray-300">Session</th>
            </tr>
          </thead>
          <tbody>
            {mockOnlineUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-center py-8 text-gray-400">
                  <div className="flex flex-col items-center space-y-2">
                    <WifiOff className="w-8 h-8" />
                    <span>No users online</span>
                  </div>
                </td>
              </tr>
            ) : (
              mockOnlineUsers.map((user) => (
                <tr key={user._id} className="border-b border-gray-700 hover:bg-glass-black transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">
                          {user.username.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="text-white font-medium">{user.username}</div>
                        <div className="text-gray-400 text-sm">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${user.isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></div>
                      <span className={`text-sm font-medium ${user.isOnline ? 'text-green-400' : 'text-gray-400'}`}>
                        {user.isOnline ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2 text-gray-400 text-sm">
                      <Clock className="w-4 h-4" />
                      <span>
                        {new Date(user.lastSeen).toLocaleTimeString('vi-VN', { 
                          hour12: false, 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="text-gray-400 text-sm font-mono">
                      {user.currentSessionId.substring(0, 8)}...
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
        <div>
          Showing {mockOnlineUsers.length} online users
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span>Real-time updates</span>
        </div>
      </div>
    </div>
  );
}
