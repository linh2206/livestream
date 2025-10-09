'use client';

import { VodList } from '@/components/features/VodList';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useState } from 'react';

const categories = [
  'All',
  'Gaming',
  'Music',
  'Education',
  'Entertainment',
  'Sports',
  'Technology',
  'Art',
  'Cooking',
  'Travel',
];

export default function VodPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  return (
    <div className='min-h-screen bg-gray-900'>
      <Header />
      <div className='flex'>
        <Sidebar />
        <main className='flex-1 p-6'>
          <div className='max-w-7xl mx-auto'>
            {/* Header */}
            <div className='mb-8'>
              <h1 className='text-3xl font-bold text-white mb-2'>
                Video Library
              </h1>
              <p className='text-gray-400'>
                Browse and watch recorded streams from creators
              </p>
            </div>

            {/* Category Filter */}
            <Card className='mb-8'>
              <div className='p-4'>
                <h3 className='text-lg font-semibold text-white mb-4'>
                  Categories
                </h3>
                <div className='flex flex-wrap gap-2'>
                  {categories.map(category => (
                    <Button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      variant={
                        selectedCategory === category ? 'primary' : 'secondary'
                      }
                      size='sm'
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>

            {/* VOD List */}
            <VodList
              category={
                selectedCategory === 'All' ? undefined : selectedCategory
              }
              limit={12}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
