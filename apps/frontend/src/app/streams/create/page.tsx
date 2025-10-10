'use client';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Loading } from '@/components/ui/Loading';
import { streamService } from '@/lib/api/services/stream.service';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import {
  commonValidationRules,
  useFormValidation,
} from '@/lib/hooks/useFormValidation';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function CreateStreamPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showLoading } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    streamKey: '',
    streamType: '', // 'camera' or 'screen'
  });
  const [loading, setLoading] = useState(false);
  const [showStreamOptions, setShowStreamOptions] = useState(false);

  const validationRules = {
    title: commonValidationRules.streamTitle,
    description: commonValidationRules.streamDescription,
    category: { required: false, maxLength: 50 },
    tags: { required: false, maxLength: 200 },
    streamKey: { required: true, minLength: 3, maxLength: 50 },
    streamType: { required: true },
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

    // If stream key is provided, show stream options
    if (formData.streamKey && !formData.streamType) {
      setShowStreamOptions(true);
      setLoading(false);
      return;
    }

    showLoading('Creating Stream', 'Setting up your stream...');

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

      const streamData = {
        title: formData.title || `${user?.username}'s Stream`,
        description: formData.description || `Live stream by ${user?.username}`,
        category: formData.category,
        tags: tagsArray,
        streamKey: formData.streamKey,
        streamType: formData.streamType,
      };

      const newStream = await streamService.createStream(streamData);

      showSuccess('Stream Created!', 'Your stream is ready to go live! 🚀', {
        action: {
          label: 'Start Streaming',
          onClick: () => router.push(`/streams/${newStream._id}/stream`),
        },
      });

      // Redirect to the streaming page after a short delay
      setTimeout(() => {
        router.push(`/streams/${newStream._id}/stream`);
      }, 2000);
    } catch (err: unknown) {
      const error = err as {
        response?: { status: number; data?: { message?: string } };
      };

      // Handle specific error cases
      if (error.response?.status === 401) {
        showError(
          'Authentication Required',
          'Please log in again to create streams.'
        );
        router.push('/login');
      } else if (error.response?.status === 404) {
        showError(
          'User Not Found',
          'Your account could not be found. Please log in again.'
        );
        router.push('/login');
      } else if (error.response?.status === 403) {
        showError(
          'Access Denied',
          'You do not have permission to create streams.'
        );
      } else {
        const errorMessage =
          error.response?.data?.message || 'Failed to create stream';
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

                <Input
                  label='Stream Key'
                  name='streamKey'
                  value={formData.streamKey}
                  onChange={handleInputChange}
                  error={errors.streamKey}
                  required
                  placeholder='Enter your stream key'
                />

                {showStreamOptions && (
                  <div className='space-y-4'>
                    <h3 className='text-lg font-semibold text-white'>
                      Choose Stream Type
                    </h3>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                      <button
                        type='button'
                        onClick={() =>
                          setFormData({ ...formData, streamType: 'camera' })
                        }
                        className={`p-6 border-2 rounded-lg text-left transition-colors ${
                          formData.streamType === 'camera'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <div className='flex items-center space-x-3'>
                          <div className='w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center'>
                            <svg
                              className='w-6 h-6 text-white'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z'
                              />
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M15 13a3 3 0 11-6 0 3 3 0 016 0z'
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className='font-semibold text-white'>
                              Camera Stream
                            </h4>
                            <p className='text-sm text-gray-400'>
                              Stream using your webcam
                            </p>
                          </div>
                        </div>
                      </button>

                      <button
                        type='button'
                        onClick={() =>
                          setFormData({ ...formData, streamType: 'screen' })
                        }
                        className={`p-6 border-2 rounded-lg text-left transition-colors ${
                          formData.streamType === 'screen'
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <div className='flex items-center space-x-3'>
                          <div className='w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center'>
                            <svg
                              className='w-6 h-6 text-white'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                              />
                            </svg>
                          </div>
                          <div>
                            <h4 className='font-semibold text-white'>
                              Screen Share
                            </h4>
                            <p className='text-sm text-gray-400'>
                              Share your screen or application
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                )}

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
                    1. Enter Stream Key
                  </h4>
                  <p className='text-sm'>
                    Enter your custom stream key or leave empty for
                    auto-generated key.
                  </p>
                </div>
                <div>
                  <h4 className='font-medium text-white mb-2'>
                    2. Choose Stream Type
                  </h4>
                  <p className='text-sm'>
                    Select Camera for webcam streaming or Screen Share for
                    screen recording.
                  </p>
                </div>
                <div>
                  <h4 className='font-medium text-white mb-2'>
                    3. Start Web Streaming
                  </h4>
                  <p className='text-sm'>
                    Click &quot;Create Stream&quot; to go to the streaming page
                    and start broadcasting directly from your browser.
                  </p>
                </div>
                <div>
                  <h4 className='font-medium text-white mb-2'>
                    4. Alternative: Use OBS
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
