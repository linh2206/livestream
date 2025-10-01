'use client';

import { useAuth } from '@/contexts/AuthContext';
import { StreamList } from '@/components/features/StreamList';
import { LoginForm } from '@/components/features/LoginForm';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Loading } from '@/components/ui/Loading';

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <Loading fullScreen text="Loading..." />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gradient mb-2">
              Livestream Platform
            </h1>
            <p className="text-gray-400">
              Sign in to start streaming and watching
            </p>
          </div>
          <LoginForm />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">
                Welcome back, {user.username}!
              </h1>
              <p className="text-gray-400">
                Discover live streams and connect with creators
              </p>
            </div>
            <StreamList />
          </div>
        </main>
      </div>
    </div>
  );
}
