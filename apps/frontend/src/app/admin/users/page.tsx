'use client';

import { AddUserModal } from '@/components/admin/AddUserModal';
import { EditUserModal } from '@/components/admin/EditUserModal';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { LoadingWrapper } from '@/components/ui/LoadingWrapper';
import { userService } from '@/lib/api/services/user.service';
import { User } from '@/lib/api/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { useUsersList } from '@/lib/hooks/useUsersList';
import { useCallback, useState } from 'react';

export default function AdminUsersPage() {
  // ALL HOOKS MUST BE AT THE TOP - NEVER AFTER CONDITIONAL RETURNS!
  const { user } = useAuth();
  const { handleError: _handleError } = useErrorHandler();
  const authLoading = useAuthGuard({ requireAuth: true });
  const {
    users,
    isLoading: usersLoading,
    error: usersError,
    mutate,
  } = useUsersList();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Define callbacks BEFORE any conditional returns
  const handleToggleUserStatus = useCallback(
    async (userId: string, currentStatus: boolean) => {
      try {
        await userService.updateUser(userId, { isActive: !currentStatus });
        mutate();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('❌ [AdminUsers] Error toggling user status:', err);
      }
    },
    [mutate]
  );

  const handleChangeUserRole = useCallback(
    async (userId: string, newRole: string) => {
      try {
        await userService.updateUserRole(userId, newRole);
        mutate();
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('❌ [AdminUsers] Error changing user role:', err);
      }
    },
    [mutate]
  );

  const handleUserCreated = useCallback(() => {
    mutate(); // Refresh the users list
  }, [mutate]);

  const handleUserUpdated = useCallback(() => {
    mutate(); // Refresh the users list
  }, [mutate]);

  const handleEditUser = useCallback((user: User) => {
    setSelectedUser(user);
    setIsEditUserModalOpen(true);
  }, []);

  // NOW conditional returns are safe
  if (usersLoading) {
    return (
      <div className='flex items-center justify-center p-6'>
        <Loading fullScreen text='Loading...' />
      </div>
    );
  }

  // Auth guard check
  if (authLoading) {
    return authLoading;
  }

  if (!user || user.role !== 'admin') {
    return (
      <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-500 mb-4'>
            Access Denied
          </h1>
          <p className='text-gray-300 mb-4'>
            You need admin privileges to access this page.
          </p>
          <Button onClick={() => (window.location.href = '/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Filter users after loading is complete and users array exists
  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && user.isActive) ||
      (statusFilter === 'inactive' && !user.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <LoadingWrapper
      isLoading={usersLoading}
      loadingText='Loading users...'
      error={usersError?.message}
      className='p-6'
    >
      <div className='text-white p-6 h-full'>
        <div className='h-full flex flex-col max-w-7xl mx-auto'>
          <div className='flex justify-between items-center mb-4'>
            <h1 className='text-2xl font-bold'>User Management</h1>
            <div className='flex items-center space-x-4'>
              <div className='text-sm text-gray-400'>
                Total Users: {users.length}
              </div>
              <Button onClick={() => setIsAddUserModalOpen(true)}>
                + Add User
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className='bg-gray-800 rounded-lg p-4 mb-4'>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
              <div>
                <label className='block text-sm font-medium mb-2'>Search</label>
                <input
                  type='text'
                  placeholder='Search by username or email...'
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                />
              </div>
              <div>
                <label className='block text-sm font-medium mb-2'>Role</label>
                <select
                  value={roleFilter}
                  onChange={e => setRoleFilter(e.target.value)}
                  className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='all'>All Roles</option>
                  <option value='admin'>Admin</option>
                  <option value='user'>User</option>
                  <option value='manager'>Manager</option>
                </select>
              </div>
              <div>
                <label className='block text-sm font-medium mb-2'>Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500'
                >
                  <option value='all'>All Status</option>
                  <option value='active'>Active</option>
                  <option value='inactive'>Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className='bg-gray-800 rounded-lg overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead className='bg-gray-700'>
                  <tr>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                      User
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                      Role
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                      Status
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                      Streams
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                      Views
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                      Last Login
                    </th>
                    <th className='px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider'>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-700'>
                  {filteredUsers.map(user => (
                    <tr key={user._id} className='hover:bg-gray-700'>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <div>
                          <div className='text-sm font-medium text-white'>
                            {user.username}
                          </div>
                          <div className='text-sm text-gray-400'>
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <select
                          value={user.role}
                          onChange={e =>
                            handleChangeUserRole(user._id, e.target.value)
                          }
                          className='px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500'
                        >
                          <option value='user'>User</option>
                          <option value='manager'>Manager</option>
                          <option value='admin'>Admin</option>
                        </select>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap'>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            user.isActive
                              ? 'bg-green-600 text-green-100'
                              : 'bg-red-600 text-red-100'
                          }`}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
                        -
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
                        -
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-300'>
                        {user.lastSeen
                          ? new Date(user.lastSeen).toLocaleDateString()
                          : 'Never'}
                      </td>
                      <td className='px-6 py-4 whitespace-nowrap text-sm'>
                        <div className='flex items-center space-x-2'>
                          <button
                            onClick={() => handleEditUser(user)}
                            className='px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium'
                          >
                            Edit
                          </button>
                          <button
                            onClick={() =>
                              handleToggleUserStatus(user._id, user.isActive)
                            }
                            className={`px-3 py-1 rounded text-xs font-medium ${
                              user.isActive
                                ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            {user.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Delete user ${user.username}?`)) {
                                try {
                                  await userService.deleteUser(user._id);
                                  mutate();
                                } catch (err) {
                                  // eslint-disable-next-line no-console
                                  console.error('Delete failed:', err);
                                }
                              }
                            }}
                            className='px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs font-medium'
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {filteredUsers.length === 0 && (
            <div className='text-center py-8'>
              <p className='text-gray-400'>
                No users found matching your criteria.
              </p>
            </div>
          )}
        </div>

        {/* Add User Modal */}
        <AddUserModal
          isOpen={isAddUserModalOpen}
          onClose={() => setIsAddUserModalOpen(false)}
          onUserCreated={handleUserCreated}
        />

        {/* Edit User Modal */}
        <EditUserModal
          isOpen={isEditUserModalOpen}
          onClose={() => {
            setIsEditUserModalOpen(false);
            setSelectedUser(null);
          }}
          onUserUpdated={handleUserUpdated}
          user={selectedUser}
        />
      </div>
    </LoadingWrapper>
  );
}
