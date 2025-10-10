'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { userService } from '@/lib/api/services/user.service';
import { useToast } from '@/lib/contexts/ToastContext';
import React, { useState } from 'react';

interface AddUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUserCreated: () => void;
}

export const AddUserModal: React.FC<AddUserModalProps> = ({
  isOpen,
  onClose,
  onUserCreated,
}) => {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    fullName: '',
    password: '',
    confirmPassword: '',
    role: 'user' as 'user' | 'admin' | 'manager',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      await userService.createUser({
        username: formData.username,
        email: formData.email,
        fullName: formData.fullName,
        password: formData.password,
        role: formData.role,
      });

      showToast({
        type: 'success',
        title: 'Success',
        message: 'User created successfully!',
      });
      onUserCreated();
      handleClose();
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Error creating user:', error);
      const errorMessage =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message || 'Failed to create user';
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
      password: '',
      confirmPassword: '',
      role: 'user',
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title='Add New User' size='md'>
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
          <Input
            label='Password'
            type='password'
            value={formData.password}
            onChange={e => handleInputChange('password', e.target.value)}
            error={errors.password}
            required
            placeholder='Enter password'
            disabled={isLoading}
          />

          <Input
            label='Confirm Password'
            type='password'
            value={formData.confirmPassword}
            onChange={e => handleInputChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            required
            placeholder='Confirm password'
            disabled={isLoading}
          />
        </div>

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
            {isLoading ? 'Creating...' : 'Create User'}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
