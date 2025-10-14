'use client';

import { Stream } from '@/lib/api/types/stream.types';

interface StreamInfoProps {
  stream: Stream;
}

export function StreamInfo({ stream }: StreamInfoProps) {
  return (
    <div className='bg-gray-800 rounded-lg shadow-lg p-6'>
      <h1 className='text-2xl font-bold text-white mb-2'>{stream.title}</h1>

      {stream.description && (
        <p className='text-gray-300 mb-4'>{stream.description}</p>
      )}

      <div className='flex items-center space-x-6 text-sm text-gray-400'>
        <div>
          <span className='font-medium'>Status:</span> {stream.status}
        </div>
        <div>
          <span className='font-medium'>Category:</span>{' '}
          {stream.category || 'General'}
        </div>
        <div>
          <span className='font-medium'>Created:</span>{' '}
          {new Date(stream.createdAt).toLocaleDateString()}
        </div>
      </div>

      {stream.tags && stream.tags.length > 0 && (
        <div className='mt-4'>
          <div className='flex flex-wrap gap-2'>
            {stream.tags.map((tag, index) => (
              <span
                key={index}
                className='px-3 py-1 bg-blue-600 text-blue-100 text-sm rounded-full'
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
