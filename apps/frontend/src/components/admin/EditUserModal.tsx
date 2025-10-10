'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { userService } from '@/lib/api/services/user.service';
import { useToast } from '@/lib/contexts/ToastContext';
import { User } from '@/lib/api/types';

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserUpdated: () => void;
  user: User | null;
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  isOpen,
  onClose,
  onUserUpdated,
  user,
}) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    role: 'user' as 'user' | 'admin' | 'manager',
    isActive: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        fullName: user.fullName || '',
        role: user.role || 'user',
        isActive: user.isActive ?? true,
      });
      setErrors({});
    }
  }, [user]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim()) {
      newErrors.username = 'Username is required';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Username must be at least 3 characters';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!formData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Update basic user info
      await userService.updateUser(user._id, {
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        isActive: formData.isActive,
      });

      // Update role separately if it changed
      if (formData.role !== user.role) {
        await userService.updateUserRole(user._id, formData.role);
      }

      showToast({
        type: 'success',
        title: 'Success',
        message: 'User updated successfully!',
      });
      onUserUpdated();
      handleClose();
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error updating user:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update user';
      showToast({
        type: 'error',
        title: 'Error',
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      username: '',
      email: '',
      fullName: '',
      role: 'user',
      isActive: true,
    });
    setErrors({});
    onClose();
  };

  if (!user) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={`Edit User: ${user.username}`}
      size='md'
    >
      <form onSubmit={handleSubmit} className='space-y-4'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <Input
            label='Username'
            value={formData.username}
            onChange={e => handleInputChange('username', e.target.value)}
            error={errors.username}
            required
            placeholder='Enter username'
            disabled={isLoading}
          />

          <Input
            label='Email'
            type='email'
            value={formData.email}
            onChange={e => handleInputChange('email', e.target.value)}
            error={errors.email}
            required
            placeholder='Enter email address'
            disabled={isLoading}
          />
        </div>

        <Input
          label='Full Name'
          value={formData.fullName}
          onChange={e => handleInputChange('fullName', e.target.value)}
          error={errors.fullName}
          required
          placeholder='Enter full name'
          disabled={isLoading}
        />

        <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
          <div>
            <label className='block text-sm font-medium text-gray-300 mb-2'>
              Role
            </label>
            <select
              value={formData.role}
              onChange={e => handleInputChange('role', e.target.value)}
              className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white'
              disabled={isLoading}
            >
              <option value='user'>User</option>
              <option value='manager'>Manager</option>
              <option value='admin'>Admin</option>
            </select>
          </div>

          <div>
            <label className='block text-sm font-medium text-gray-300 mb-2'>
              Status
            </label>
            <select
              value={formData.isActive ? 'active' : 'inactive'}
              onChange={e =>
                handleInputChange('isActive', e.target.value === 'active')
              }
              className='w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white'
              disabled={isLoading}
            >
              <option value='active'>Active</option>
              <option value='inactive'>Inactive</option>
            </select>
          </div>
        </div>

        <div className='flex justify-end space-x-3 pt-4'>
          <Button
            type='button'
            variant='secondary'
            onClick={handleClose}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button type='submit' disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
