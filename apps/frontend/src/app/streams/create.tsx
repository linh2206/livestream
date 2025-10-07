'use client';

import React, { useState } from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Loading } from '@/components/ui/Loading';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { streamService } from '@/lib/api/services/stream.service';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  useFormValidation,
  commonValidationRules,
} from '@/lib/hooks/useFormValidation';
import { useRouter } from 'next/navigation';

export default function CreateStreamPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showLoading } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
  });
  const [loading, setLoading] = useState(false);

  const validationRules = {
    title: commonValidationRules.streamTitle,
    description: commonValidationRules.streamDescription,
    category: { required: false, maxLength: 50 },
    tags: { required: false, maxLength: 200 },
  };

  const { errors, validateForm, clearErrors } =
    useFormValidation(validationRules);

  if (isLoading) {
    return <Loading fullScreen text='Loading...' />;
  }

  if (!user) {
    // Redirect to login if not authenticated
    router.push('/login');
    return <Loading fullScreen text='Redirecting to login...' />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearErrors();

    // Validate form
    if (!validateForm(formData)) {
      setLoading(false);
      showError('Validation Error', 'Please fix the errors below');
      return;
    }

    const loadingToastId = showLoading(
      'Creating Stream',
      'Setting up your stream...'
    );

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

      const streamData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        tags: tagsArray,
      };

      const newStream = await streamService.createStream(streamData);

      showSuccess('Stream Created!', 'Your stream is ready to go live! 🚀', {
        action: {
          label: 'Go to Stream',
          onClick: () => router.push(`/stream/${newStream._id}`),
        },
      });

      // Redirect to the new stream page after a short delay
      setTimeout(() => {
        router.push(`/stream/${newStream._id}`);
      }, 2000);
    } catch (err: any) {
      console.error('Failed to create stream:', err);

      // Handle specific error cases
      if (err.response?.status === 401) {
        showError(
          'Authentication Required',
          'Please log in again to create streams.'
        );
        router.push('/login');
      } else if (err.response?.status === 404) {
        showError(
          'User Not Found',
          'Your account could not be found. Please log in again.'
        );
        router.push('/login');
      } else if (err.response?.status === 403) {
        showError(
          'Access Denied',
          'You do not have permission to create streams.'
        );
      } else {
        const errorMessage =
          err.response?.data?.message || 'Failed to create stream';
        showError('Creation Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <div className='min-h-screen bg-gray-900'>
      <Header />
      <div className='flex'>
        <Sidebar />
        <main className='flex-1 p-6'>
          <div className='max-w-4xl mx-auto'>
            <div className='mb-8'>
              <h1 className='text-3xl font-bold text-white mb-2'>
                Create New Stream
              </h1>
              <p className='text-gray-400'>
                Set up your live stream and start broadcasting to your audience
              </p>
            </div>

            <Card>
              <form onSubmit={handleSubmit} className='space-y-6'>
                <Input
                  label='Stream Title'
                  name='title'
                  value={formData.title}
                  onChange={handleInputChange}
                  error={errors.title}
                  required
                  placeholder='Enter your stream title'
                />

                <Input
                  label='Stream Description'
                  name='description'
                  value={formData.description}
                  onChange={handleInputChange}
                  error={errors.description}
                  placeholder='Describe your stream content'
                  textarea
                  rows={4}
                />

                <Input
                  label='Category'
                  name='category'
                  value={formData.category}
                  onChange={handleInputChange}
                  error={errors.category}
                  placeholder='e.g., Gaming, Music, Education'
                />

                <Input
                  label='Tags (comma-separated)'
                  name='tags'
                  value={formData.tags}
                  onChange={handleInputChange}
                  error={errors.tags}
                  placeholder='gaming, live, tutorial, fun'
                />

                <div className='flex gap-4'>
                  <Button
                    type='submit'
                    loading={loading}
                    disabled={loading}
                    className='flex-1'
                  >
                    Create Stream
                  </Button>
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={() => router.back()}
                    className='flex-1'
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Card>

            <Card className='mt-8'>
              <h3 className='text-lg font-semibold text-white mb-4'>
                Streaming Instructions
              </h3>
              <div className='space-y-4 text-gray-300'>
                <div>
                  <h4 className='font-medium text-white mb-2'>
                    1. Get your Stream Key
                  </h4>
                  <p className='text-sm'>
                    After creating the stream, you&apos;ll receive a unique
                    stream key.
                  </p>
                </div>
                <div>
                  <h4 className='font-medium text-white mb-2'>
                    2. Configure your streaming software
                  </h4>
                  <p className='text-sm'>
                    Use OBS Studio, XSplit, or any RTMP-compatible software.
                  </p>
                </div>
                <div>
                  <h4 className='font-medium text-white mb-2'>
                    3. Stream Settings
                  </h4>
                  <p className='text-sm'>
                    <strong>Server:</strong>{' '}
                    {process.env.NEXT_PUBLIC_RTMP_URL ||
                      'rtmp://localhost:1935'}
                    /live
                    <br />
                    <strong>Stream Key:</strong> [Your unique stream key]
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
