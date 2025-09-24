'use client';

import { useState } from 'react';
import { Users, Mail, Calendar, UserCheck, UserX, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { userService, User, CreateUserRequest, UpdateUserRequest } from '../lib/api';
import { useUsers } from '../hooks/useUsers';
import { useAuth } from '../contexts/AuthContext';

export default function UsersTable() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { users, total, totalPages, isLoading: loading, isError: swrError, mutate } = useUsers(currentPage, itemsPerPage, searchTerm);
  const { user, isAuthenticated, isAdmin, login, logout } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [newUser, setNewUser] = useState({ username: '', email: '' });
  const [editUser, setEditUser] = useState({ username: '', email: '' });
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    try {
      await login(loginForm.username, loginForm.password);
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
    if (!isAuthenticated) {
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
    if (!isAuthenticated) {
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

  // Pagination logic
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
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

  // Only show for admin users
  if (!isAuthenticated || !isAdmin) {
    return (
      <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <Users className="w-16 h-16 mx-auto" />
          </div>
          <p className="text-white text-lg mb-2">Admin Access Required</p>
          <p className="text-gray-400 text-sm mb-4">
            {!isAuthenticated ? 'Please login to access user management' : 'Only admin users can manage users'}
          </p>
          {!isAuthenticated && (
            <div className="flex items-center justify-center space-x-2">
              <input
                type="text"
                placeholder="Username"
                value={loginForm.username}
                onChange={(e) => setLoginForm(prev => ({ ...prev, username: e.target.value }))}
                className="px-3 py-2 bg-black/30 text-white rounded text-sm"
              />
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                className="px-3 py-2 bg-black/30 text-white rounded text-sm"
              />
              <button
                onClick={handleLogin}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
              >
                Login
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Users className="w-6 h-6 text-white" />
          <h2 className="text-2xl font-bold text-white">User Management</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-gray-400 text-sm">
            Total: {users.length} users
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-green-400 text-sm">Admin: {user?.username}</span>
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
            >
              <Plus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>
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
              <th className="text-left py-3 px-4 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-gray-400">
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
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      {editingUser === user._id ? (
                        <>
                          <button
                            onClick={() => updateUser(user._id)}
                            className="bg-green-600 hover:bg-green-700 text-white p-1 rounded"
                            title="Save"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="bg-gray-600 hover:bg-gray-700 text-white p-1 rounded"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(user)}
                            className="bg-blue-600 hover:bg-blue-700 text-white p-1 rounded"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteUser(user._id)}
                            className="bg-red-600 hover:bg-red-700 text-white p-1 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-400">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} users
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
            >
              Previous
            </button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`px-3 py-2 rounded-lg transition-all duration-200 ${
                      currentPage === pageNum
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700/50 hover:bg-gray-600/50 text-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-2 bg-gray-700/50 hover:bg-gray-600/50 disabled:bg-gray-800/50 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-all duration-200"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex justify-between items-center text-sm text-gray-400">
        <div>
          {totalPages <= 1 ? `Showing ${total} users` : ''}
        </div>
        <button
          onClick={() => mutate()}
          className="text-primary-400 hover:text-primary-300 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Add User Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[999999] p-4">
          <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-lg border border-gray-700/50 shadow-2xl transform animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                  Add New User
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewUser({ username: '', email: '' });
                }}
                className="w-8 h-8 bg-gray-700/50 hover:bg-gray-600/50 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            
            {/* Form */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-gray-300 text-sm font-medium">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={newUser.username}
                    onChange={(e) => setNewUser(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/80 backdrop-blur-sm rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 border border-gray-600/50 transition-all duration-200"
                    placeholder="Enter username"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-gray-300 text-sm font-medium">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/80 backdrop-blur-sm rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500/50 focus:border-green-500/50 border border-gray-600/50 transition-all duration-200"
                    placeholder="Enter email address"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewUser({ username: '', email: '' });
                }}
                className="px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-2xl transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={createUser}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl transition-all duration-200 flex items-center space-x-2 font-medium transform hover:scale-105 shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>Add User</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-transparent flex items-center justify-center z-[999999] p-4">
          <div className="bg-gradient-to-br from-gray-900/95 to-gray-800/95 backdrop-blur-xl rounded-3xl p-8 w-full max-w-lg border border-gray-700/50 shadow-2xl transform animate-in fade-in-0 zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <Edit className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                  Edit User
                </h3>
              </div>
              <button
                onClick={cancelEdit}
                className="w-8 h-8 bg-gray-700/50 hover:bg-gray-600/50 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110"
              >
                <X className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            
            {/* Form */}
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-gray-300 text-sm font-medium">Username</label>
                <div className="relative">
                  <input
                    type="text"
                    value={editUser.username}
                    onChange={(e) => setEditUser(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/80 backdrop-blur-sm rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 border border-gray-600/50 transition-all duration-200"
                    placeholder="Enter username"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-gray-300 text-sm font-medium">Email</label>
                <div className="relative">
                  <input
                    type="email"
                    value={editUser.email}
                    onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/80 backdrop-blur-sm rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 border border-gray-600/50 transition-all duration-200"
                    placeholder="Enter email address"
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={cancelEdit}
                className="px-6 py-3 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 rounded-2xl transition-all duration-200 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => updateUser(editingUser)}
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-2xl transition-all duration-200 flex items-center space-x-2 font-medium transform hover:scale-105 shadow-lg"
              >
                <Save className="w-4 h-4" />
                <span>Update User</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
