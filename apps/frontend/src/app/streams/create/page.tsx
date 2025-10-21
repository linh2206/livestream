'use client';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { streamService } from '@/lib/api/services/stream.service';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import {
  commonValidationRules,
  useFormValidation,
} from '@/lib/hooks/useFormValidation';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';

export default function CreateStreamPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { showSuccess, showError, showLoading } = useToast();
  const { handleError } = useErrorHandler();

  // Auth guard - tự động redirect nếu chưa login
  const authLoading = useAuthGuard({ requireAuth: true });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    tags: '',
    streamKey: '',
    streamType: 'camera' as 'camera' | 'screen', // Default to camera
  });
  const [loading, setLoading] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  const validationRules = {
    title: commonValidationRules.streamTitle,
    description: commonValidationRules.streamDescription,
    category: commonValidationRules.category,
    tags: commonValidationRules.tags,
    streamKey: commonValidationRules.streamKey,
    streamType: commonValidationRules.streamType,
  };

  const {
    errors,
    validateForm: _validateForm,
    validateSingleField,
    clearErrors,
  } = useFormValidation(validationRules);

  // Load draft on component mount
  React.useEffect(() => {
    const savedDraft = localStorage.getItem('stream-draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setFormData(draft);
        setIsDraft(true);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.warn('Failed to load draft:', error);
      }
    }
  }, []);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + Enter to submit
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (!loading) {
          const form = document.querySelector('form');
          if (form) {
            form.requestSubmit();
          }
        }
      }
      // Escape to cancel
      if (e.key === 'Escape') {
        router.back();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [loading, router]);

  // Nếu đang check auth, hiển thị loading
  if (authLoading) {
    return authLoading;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent double submission
    if (loading) return;

    setLoading(true);
    clearErrors();
    setIsDraft(false);

    // Validate required fields only
    const requiredFields = ['title'];
    const hasRequiredErrors = requiredFields.some(field => {
      const value = formData[field as keyof typeof formData];
      return !value || value.trim() === '';
    });

    if (hasRequiredErrors) {
      setLoading(false);
      showError(
        'Required Fields Missing',
        'Please fill in the stream title at minimum',
        {
          replaceType: 'loading',
        }
      );
      return;
    }

    // Show loading with progress indication
    showLoading('Creating Stream', 'Setting up your stream...');

    try {
      const tagsArray = formData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);

      const streamData = {
        title: formData.title.trim(),
        description:
          formData.description?.trim() || `Live stream by ${user?.username}`,
        category: formData.category?.trim() || 'General',
        tags: tagsArray,
        streamKey: formData.streamKey?.trim() || undefined,
        streamType: formData.streamType,
      };

      const newStream = await streamService.createStream(streamData);

      // Clear draft on success
      clearDraft();

      // Success notification with action
      showSuccess('Stream Created!', 'Your stream is ready to go live! 🚀', {
        replaceType: 'loading',
        duration: 4000,
        action: {
          label: 'Start Streaming',
          onClick: () => router.push(`/streams/${newStream._id}/stream`),
        },
      });

      // Auto redirect to streaming page
      setTimeout(() => {
        router.push(`/streams/${newStream._id}/stream`);
      }, 2000);
    } catch (err: unknown) {
      // Enhanced error handling
      if (err && typeof err === 'object' && 'response' in err) {
        const apiError = err as { response: { data: { message?: string } } };
        const errorMessage =
          apiError.response?.data?.message || 'Failed to create stream';
        showError('Creation Failed', errorMessage, {
          replaceType: 'loading',
        });
      } else {
        handleError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));

    // Real-time validation
    validateSingleField(name, value);

    // Auto-save draft to localStorage
    const draftData = {
      ...formData,
      [name]: value,
    };
    localStorage.setItem('stream-draft', JSON.stringify(draftData));
    setIsDraft(true);
  };

  // Clear draft when stream is created successfully
  const clearDraft = () => {
    localStorage.removeItem('stream-draft');
    setIsDraft(false);
  };

  return (
    <div className='min-h-screen bg-gray-900'>
      <Header />
      <div className='flex'>
        <Sidebar />
        <main className='flex-1 p-6'>
          <div className='max-w-4xl mx-auto'>
            <div className='mb-8'>
              <div className='flex items-center justify-between mb-2'>
                <h1 className='text-3xl font-bold text-white'>
                  Create New Stream
                </h1>
                {isDraft && (
                  <div className='flex items-center space-x-2'>
                    <span className='text-sm text-yellow-400'>Draft saved</span>
                    <button
                      type='button'
                      onClick={clearDraft}
                      className='text-xs text-gray-400 hover:text-white underline'
                    >
                      Clear draft
                    </button>
                  </div>
                )}
              </div>
              <p className='text-gray-400'>
                Set up your live stream and start broadcasting to your audience
              </p>
              <p className='text-xs text-gray-500 mt-1'>
                💡 Tip: Use Ctrl+Enter to submit quickly, Escape to cancel
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

                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-gray-300'>
                    Category
                  </label>
                  <select
                    name='category'
                    value={formData.category}
                    onChange={handleInputChange}
                    className='w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  >
                    <option value=''>Select category...</option>
                    <option value='Gaming'>Gaming</option>
                    <option value='Music'>Music</option>
                    <option value='Education'>Education</option>
                    <option value='Entertainment'>Entertainment</option>
                    <option value='Technology'>Technology</option>
                    <option value='Sports'>Sports</option>
                    <option value='News'>News</option>
                    <option value='Art'>Art</option>
                    <option value='Cooking'>Cooking</option>
                    <option value='Travel'>Travel</option>
                    <option value='Other'>Other</option>
                  </select>
                  {errors.category && (
                    <p className='text-red-500 text-sm'>{errors.category}</p>
                  )}
                </div>

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

                <div className='space-y-2'>
                  <label className='block text-sm font-medium text-gray-300'>
                    Stream Type *
                  </label>
                  <select
                    name='streamType'
                    value={formData.streamType}
                    onChange={handleInputChange}
                    className='w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    required
                  >
                    <option value=''>Select stream type...</option>
                    <option value='camera'>Camera Stream</option>
                    <option value='screen'>Screen Share</option>
                  </select>
                  {errors.streamType && (
                    <p className='text-red-500 text-sm'>{errors.streamType}</p>
                  )}
                </div>

                <div className='flex gap-4'>
                  <Button
                    type='submit'
                    loading={loading}
                    disabled={loading}
                    className='flex-1'
                  >
                    {loading ? 'Creating Stream...' : 'Create Stream'}
                  </Button>
                  <Button
                    type='button'
                    variant='secondary'
                    onClick={() => router.back()}
                    disabled={loading}
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
                    where you can choose Camera or Screen Share and start
                    broadcasting directly from your browser.
                  </p>
                </div>
                <div>
                  <h4 className='font-medium text-white mb-2'>
                    4. Alternative: Use OBS
                  </h4>
                  <p className='text-sm'>
                    <strong>Server:</strong>{' '}
                    {process.env.NEXT_PUBLIC_RTMP_URL ||
                      'rtmp://localhost:1935/live'}
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
