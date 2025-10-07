'use client';

import React from 'react';
import { StreamList } from '@/components/features/StreamList';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';

export default function StreamsPage() {
  return (
    <div className='min-h-screen bg-gray-900'>
      <Header />
      <div className='flex'>
        <Sidebar />
        <main className='flex-1 p-6'>
          <div className='max-w-7xl mx-auto'>
            <div className='mb-8'>
              <h1 className='text-3xl font-bold text-white mb-2'>
                All Streams
              </h1>
              <p className='text-gray-400'>
                Discover and watch live streams from creators around the world
              </p>
            </div>
            <StreamList />
          </div>
        </main>
      </div>
    </div>
  );
}
