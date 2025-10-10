'use client';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  commonValidationRules,
  useFormValidation,
} from '@/lib/hooks/useFormValidation';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export const LoginForm: React.FC = () => {
  const [usernameOrEmail, setUsernameOrEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');

  const router = useRouter();
  const { login, register } = useAuth();
  const { showSuccess, showError } = useToast();

  // Validation rules based on form mode
  const registerValidationRules = {
    username: commonValidationRules.username,
    email: commonValidationRules.email,
    password: commonValidationRules.password,
    fullName: commonValidationRules.fullName,
  };

  const loginValidationRules = {
    usernameOrEmail: commonValidationRules.usernameOrEmail,
    password: commonValidationRules.password,
  };

  const {
    errors,
    validateSingleField,
    validateForm,
    clearErrors,
    clearFieldError,
  } = useFormValidation(
    isRegister ? registerValidationRules : loginValidationRules
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prepare form data
    const formData = isRegister
      ? { username, email, password, fullName }
      : { usernameOrEmail, password };

    // Validate form first
    if (!validateForm(formData as unknown as Record<string, string>)) {
      showError('Validation Error', 'Please fix the errors below');
      return;
    }

    setLoading(true);
    clearErrors();

    try {
      if (isRegister) {
        await register({ username, email, password, fullName });
        showSuccess('Account Created!', 'Welcome to Livestream Platform! 🎉');
        // Wait a bit for state to update then redirect
        setTimeout(() => router.push('/dashboard'), 500);
      } else {
        await login({ usernameOrEmail, password });
        showSuccess('Welcome Back!', 'You have been successfully logged in ✨');
        // Wait a bit for state to update then redirect
        setTimeout(() => router.push('/dashboard'), 500);
      }
    } catch (err: unknown) {
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'An error occurred';
      showError('Authentication Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (
    field: string,
    value: string,
    setter: (value: string) => void
  ) => {
    setter(value);
    clearFieldError(field);

    // Real-time validation
    const error = validateSingleField(field, value);
    if (error) {
      // Don't show error immediately, wait for blur or submit
    }
  };

  return (
    <div className='bg-gray-800 rounded-lg border border-gray-700 p-6'>
      <div className='text-center mb-6'>
        <h2 className='text-2xl font-bold text-white mb-2'>
          {isRegister ? 'Create Account' : 'Sign In'}
        </h2>
        <p className='text-gray-400'>
          {isRegister ? 'Join the livestream community' : 'Welcome back!'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4' noValidate>
        {isRegister && (
          <>
            <Input
              label='Username'
              value={username}
              onChange={e =>
                handleFieldChange('username', e.target.value, setUsername)
              }
              error={errors.username}
              required
              placeholder='Enter your username'
            />
            <Input
              label='Full Name'
              value={fullName}
              onChange={e =>
                handleFieldChange('fullName', e.target.value, setFullName)
              }
              error={errors.fullName}
              placeholder='Enter your full name'
            />
          </>
        )}

        <Input
          label={isRegister ? 'Email' : 'Username or Email'}
          type={isRegister ? 'email' : 'text'}
          value={isRegister ? email : usernameOrEmail}
          onChange={e =>
            isRegister
              ? handleFieldChange('email', e.target.value, setEmail)
              : handleFieldChange(
                  'usernameOrEmail',
                  e.target.value,
                  setUsernameOrEmail
                )
          }
          error={isRegister ? errors.email : errors.usernameOrEmail}
          required
          placeholder={
            isRegister ? 'Enter your email' : 'Enter your username or email'
          }
        />

        <Input
          label='Password'
          type='password'
          value={password}
          onChange={e =>
            handleFieldChange('password', e.target.value, setPassword)
          }
          error={errors.password}
          required
          placeholder='Enter your password'
        />

        <div className='mt-6'>
          <Button
            type='button'
            onClick={handleSubmit}
            loading={loading}
            fullWidth
            size='lg'
          >
            {isRegister ? 'Create Account' : 'Sign In'}
          </Button>
        </div>
      </form>

      <div className='mt-6 text-center'>
        <button
          type='button'
          onClick={() => setIsRegister(!isRegister)}
          className='text-blue-400 hover:text-blue-300 text-sm'
        >
          {isRegister
            ? 'Already have an account? Sign in'
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </div>
  );
};
