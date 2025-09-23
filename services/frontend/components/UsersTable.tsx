'use client';

import { useState, useEffect } from 'react';
import { Users, Mail, Calendar, UserCheck, UserX } from 'lucide-react';

interface User {
  _id: string;
  username: string;
  email: string;
  avatar: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function UsersTable() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      if (!apiUrl) {
        throw new Error('NEXT_PUBLIC_API_URL environment variable is not set');
      }
      const response = await fetch(`${apiUrl}/users`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          <span className="ml-2 text-white">Loading users...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <UserX className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-white text-lg mb-2">Error Loading Users</p>
          <p className="text-gray-400 text-sm mb-4">{error}</p>
          <button
            onClick={fetchUsers}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="w-6 h-6 text-white" />
          <h2 className="text-2xl font-bold text-white">Registered Users</h2>
        </div>
        <div className="text-gray-400 text-sm">
          Total: {users.length} users
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-white">
          <thead>
            <tr className="border-b border-gray-600">
              <th className="text-left py-3 px-4 font-semibold">User</th>
              <th className="text-left py-3 px-4 font-semibold">Email</th>
              <th className="text-left py-3 px-4 font-semibold">Status</th>
              <th className="text-left py-3 px-4 font-semibold">Joined</th>
              <th className="text-left py-3 px-4 font-semibold">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-400">
                  No users found
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user._id} className="border-b border-gray-700 hover:bg-glass-black transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.username}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-white text-sm font-bold">
                            {user.username.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{user.username}</div>
                        <div className="text-gray-400 text-xs">ID: {user._id.slice(-6)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300">{user.email}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {user.isActive ? (
                        <>
                          <UserCheck className="w-4 h-4 text-green-400" />
                          <span className="text-green-400">Active</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4 text-red-400" />
                          <span className="text-red-400">Inactive</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-300 text-sm">
                        {formatDate(user.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-gray-400 text-sm">
                      {formatDate(user.updatedAt)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
        <div>
          Showing {users.length} of {users.length} users
        </div>
        <button
          onClick={fetchUsers}
          className="text-primary-400 hover:text-primary-300 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
