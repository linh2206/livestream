'use client';

import { StreamList } from '@/components/features/StreamList';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';
import { Play, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Auth guard
  const authLoading = useAuthGuard({ requireAuth: true });

  if (authLoading) {
    return authLoading;
  }

  return (
    <div className='min-h-screen bg-gray-900'>
      <Header />
      <div className='flex'>
        <Sidebar />
        <main className='flex-1 p-6'>
          <div className='max-w-7xl mx-auto'>
            {/* Welcome Section */}
            <div className='mb-8'>
              <h1 className='text-3xl font-bold text-white mb-2'>
                Welcome back, {user?.username || 'User'}! 👋
              </h1>
              <p className='text-gray-400'>
                Discover live streams and connect with creators
              </p>
            </div>

            {/* Quick Actions */}
            <div className='grid grid-cols-1 md:grid-cols-2 gap-6 mb-8'>
              <Card>
                <div className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-lg font-semibold text-white mb-2'>
                        Start Streaming
                      </h3>
                      <p className='text-gray-400 text-sm mb-4'>
                        Create a new stream and go live
                      </p>
                      <Button
                        onClick={() => router.push('/stream/create')}
                        className='bg-blue-600 hover:bg-blue-700'
                      >
                        <Plus className='h-4 w-4 mr-2' />
                        Create Stream
                      </Button>
                    </div>
                    <div className='text-blue-400'>
                      <Play className='h-12 w-12' />
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className='p-6'>
                  <div className='flex items-center justify-between'>
                    <div>
                      <h3 className='text-lg font-semibold text-white mb-2'>
                        Browse Streams
                      </h3>
                      <p className='text-gray-400 text-sm mb-4'>
                        Discover live streams from other creators
                      </p>
                      <Button
                        onClick={() => router.push('/streams')}
                        variant='secondary'
                      >
                        <Play className='h-4 w-4 mr-2' />
                        View All Streams
                      </Button>
                    </div>
                    <div className='text-green-400'>
                      <Play className='h-12 w-12' />
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Stream List */}
            <div>
              <h2 className='text-xl font-semibold text-white mb-4'>
                Recent Streams
              </h2>
              <StreamList />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
