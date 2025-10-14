'use client';

import { Stream } from '@/lib/api/types/stream.types';

interface StreamPlayerProps {
  stream: Stream;
}

export function StreamPlayer({ stream }: StreamPlayerProps) {
  return (
    <div className='relative bg-black aspect-video'>
      <div className='absolute inset-0 flex items-center justify-center'>
        <div className='text-center text-white'>
          <div className='w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mx-auto mb-4'>
            <div className='w-6 h-6 bg-white rounded-sm'></div>
          </div>
          <h3 className='text-xl font-semibold mb-2'>{stream.title}</h3>
          <p className='text-gray-300'>Stream is {stream.status}</p>
        </div>
      </div>

      {/* Stream URL overlay for actual video player */}
      {stream.streamUrl && (
        <div className='absolute inset-0'>
          <video
            className='w-full h-full object-cover'
            controls
            autoPlay
            muted
            src={stream.streamUrl}
          />
        </div>
      )}
    </div>
  );
}
