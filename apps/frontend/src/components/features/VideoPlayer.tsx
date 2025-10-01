'use client';

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  streamKey: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streamKey,
  className = '',
  autoPlay = true,
  muted = true,
  controls = true,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const hlsUrl = `${process.env.NEXT_PUBLIC_HLS_URL}/${streamKey}/index.m3u8`;
    
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        console.log('HLS manifest parsed');
        setIsLoading(false);
        setIsLive(true);
        if (autoPlay) {
          video.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error occurred while loading the stream');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error occurred while playing the stream');
              break;
            default:
              setError('An error occurred while loading the stream');
              break;
          }
          setIsLoading(false);
        }
      });

      return () => {
        hls.destroy();
      };
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false);
        setIsLive(true);
        if (autoPlay) {
          video.play().catch(console.error);
        }
      });
      video.addEventListener('error', () => {
        setError('Failed to load the stream');
        setIsLoading(false);
      });
    } else {
      setError('HLS is not supported in this browser');
      setIsLoading(false);
    }
  }, [streamKey, autoPlay]);

  if (error) {
    return (
      <div className={`aspect-video bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center text-red-400">
          <svg className="w-12 h-12 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <video
        ref={videoRef}
        className="w-full h-full rounded-lg"
        autoPlay={autoPlay}
        muted={muted}
        controls={controls}
        playsInline
      />
      
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800 rounded-lg flex items-center justify-center">
          <div className="text-center text-white">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p>Loading stream...</p>
          </div>
        </div>
      )}
      
      {isLive && (
        <div className="absolute top-4 left-4 bg-red-600 text-white px-2 py-1 rounded text-sm font-medium">
          LIVE
        </div>
      )}
    </div>
  );
};
