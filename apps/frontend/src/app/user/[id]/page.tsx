'use client';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { userService } from '@/lib/api/services/user.service';
import { User } from '@/lib/api/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const authLoading = useAuthGuard({ requireAuth: true });
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (params.id) {
      fetchUser(params.id as string);
    }
  }, [params.id]);

  const fetchUser = async (id: string) => {
    try {
      setLoading(true);
      const userData = await userService.getUser(id);
      setUser(userData);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Failed to fetch user');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return <Loading fullScreen text='Loading...' />;
  }

  if (error) {
    return (
      <div className='min-h-screen bg-gray-900'>
        <Header />
        <div className='flex'>
          <Sidebar />
          <main className='flex-1 p-6'>
            <div className='max-w-7xl mx-auto'>
              <Card className='max-w-md mx-auto'>
                <div className='text-center text-red-400 p-8'>
                  <p>{error}</p>
                  <Button
                    onClick={() => router.push('/dashboard')}
                    className='mt-4'
                  >
                    Go Back
                  </Button>
                </div>
              </Card>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Loading fullScreen text='Loading user...' />;
  }

  return (
    <div className='min-h-screen bg-gray-900'>
      <Header />
      <div className='flex'>
        <Sidebar />
        <main className='flex-1 p-6'>
          <div className='max-w-4xl mx-auto'>
            <div className='mb-6'>
              <Button
                onClick={() => router.push('/dashboard')}
                variant='secondary'
                size='sm'
              >
                ← Back to Dashboard
              </Button>
            </div>

            <Card className='p-8'>
              <div className='flex items-center space-x-6'>
                <div className='w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold'>
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className='flex-1'>
                  <h1 className='text-3xl font-bold text-white mb-2'>
                    {user.fullName || user.username}
                  </h1>
                  <p className='text-gray-400 mb-2'>@{user.username}</p>
                  <div className='flex items-center space-x-4'>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        user.role === 'admin'
                          ? 'bg-red-900 text-red-300'
                          : user.role === 'manager'
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-green-900 text-green-300'
                      }`}
                    >
                      {user.role}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        user.isActive
                          ? 'bg-green-900 text-green-300'
                          : 'bg-gray-700 text-gray-300'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              <div className='mt-8 grid grid-cols-1 md:grid-cols-2 gap-6'>
                <div>
                  <h3 className='text-lg font-semibold text-white mb-4'>
                    Profile Information
                  </h3>
                  <div className='space-y-3'>
                    <div>
                      <label className='text-sm text-gray-400'>Email</label>
                      <p className='text-white'>{user.email}</p>
                    </div>
                    <div>
                      <label className='text-sm text-gray-400'>Full Name</label>
                      <p className='text-white'>
                        {user.fullName || 'Not provided'}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm text-gray-400'>
                        Member Since
                      </label>
                      <p className='text-white'>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm text-gray-400'>
                        Last Updated
                      </label>
                      <p className='text-white'>
                        {new Date(user.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className='text-lg font-semibold text-white mb-4'>
                    Account Status
                  </h3>
                  <div className='space-y-3'>
                    <div>
                      <label className='text-sm text-gray-400'>
                        Email Verified
                      </label>
                      <p
                        className={`${user.isEmailVerified ? 'text-green-400' : 'text-red-400'}`}
                      >
                        {user.isEmailVerified ? 'Yes' : 'No'}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm text-gray-400'>
                        Online Status
                      </label>
                      <p
                        className={`${user.isOnline ? 'text-green-400' : 'text-gray-400'}`}
                      >
                        {user.isOnline ? 'Online' : 'Offline'}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm text-gray-400'>Last Seen</label>
                      <p className='text-white'>
                        {user.lastSeen
                          ? new Date(user.lastSeen).toLocaleString()
                          : 'Never'}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm text-gray-400'>Provider</label>
                      <p className='text-white capitalize'>{user.provider}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
