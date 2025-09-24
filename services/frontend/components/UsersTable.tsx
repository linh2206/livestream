'use client';

import { useState } from 'react';
import { Users, Mail, Calendar, UserCheck, UserX, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { userService, User, CreateUserRequest, UpdateUserRequest } from '../lib/api';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../contexts/AuthContext';

export default function UsersTable() {
  const { users, isLoading: loading, isError: swrError, mutate } = useUsers();
  const { user, isAuthenticated, isAdmin, login, logout } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: '', email: '' });
  const [editUser, setEditUser] = useState({ username: '', email: '' });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await login({ username: loginForm.username, password: loginForm.password });
      setError(null);
      // Refresh users data after login
      mutate();
    } catch (err) {
      console.error('Error logging in:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
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

  const createUser = async () => {
    if (!isAuthenticated) {
      setError('Please login first to create users');
      return;
    }

    try {
      const userData: CreateUserRequest = {
        username: newUser.username,
        email: newUser.email,
        password: 'defaultPassword123', // You might want to add a password field
      };
      
      await userService.createUser(userData);
      setNewUser({ username: '', email: '' });
      setShowAddForm(false);
      // Refresh users data
      mutate();
    } catch (err) {
      console.error('Error creating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to create user');
    }
  };

  const updateUser = async (userId: string) => {
    if (!isLoggedIn || !token) {
      setError('Please login first to update users');
      return;
    }

    try {
      const userData: UpdateUserRequest = {
        username: editUser.username,
        email: editUser.email,
      };
      
      await userService.updateUser(userId, userData);
      setEditingUser(null);
      setEditUser({ username: '', email: '' });
      // Refresh users data
      mutate();
    } catch (err) {
      console.error('Error updating user:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user');
    }
  };

  const deleteUser = async (userId: string) => {
    if (!isLoggedIn || !token) {
      setError('Please login first to delete users');
      return;
    }

    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await userService.deleteUser(userId);
      // Refresh users data
      mutate();
    } catch (err) {
      console.error('Error deleting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user._id);
    setEditUser({ username: user.username, email: user.email });
  };

  const cancelEdit = () => {
    setEditingUser(null);
    setEditUser({ username: '', email: '' });
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

  if (swrError || error) {
    return (
      <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
        <div className="text-center">
          <div className="text-red-400 mb-4">
            <UserX className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-white text-lg mb-2">Error Loading Users</p>
          <p className="text-gray-400 text-sm mb-4">{error || swrError?.message}</p>
          <button
            onClick={() => mutate()}
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
        <div className="flex items-center space-x-4">
          <div className="text-gray-400 text-sm">
            Total: {users.length} users
          </div>
          {!isLoggedIn ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                placeholder="Username"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="px-3 py-1 bg-black/30 text-white rounded text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="px-3 py-1 bg-black/30 text-white rounded text-sm"
              />
              <button
                onClick={login}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
              >
                Login
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-green-400 text-sm">Logged in</span>
              <button
                onClick={() => {
                  setIsLoggedIn(false);
                  setToken(null);
                }}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
              >
                Logout
              </button>
            </div>
          )}
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
          onClick={() => mutate()}
          className="text-primary-400 hover:text-primary-300 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  );
}
