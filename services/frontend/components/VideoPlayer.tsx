'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  isAuthenticated?: boolean;
}

export default function VideoPlayer({ isAuthenticated = false }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Use backend API for HLS URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://183.182.104.226:24190';
    const streamName = process.env.NEXT_PUBLIC_STREAM_NAME || 'stream';
    const hlsUrl = `${apiBaseUrl}/rtmp/hls/${streamName}/index.m3u8`;

    let hls: Hls | null = null;

    if (Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 5,
        startLevel: -1,
        capLevelToPlayerSize: true,
        testBandwidth: true,
        debug: false,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setError(null);
        // Auto-play when manifest is ready and user is authenticated
        if (isAuthenticated && video.paused) {
          video.play().catch(err => {
            // Auto-play might be blocked by browser, that's okay
          });
        }
      });

      hls.on(Hls.Events.ERROR, (event, data) => {
        console.error('❌ HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (data.details === 'manifestLoadError') {
                console.log('📺 No stream available yet');
                setError('No stream available. Start streaming to see content.');
              } else {
                console.log('🔄 Fatal network error, trying to recover...');
                hls?.startLoad();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('🔄 Fatal media error, trying to recover...');
              hls?.recoverMediaError();
              break;
            default:
              console.log('💥 Fatal error, destroying HLS...');
              hls?.destroy();
              setError('Stream not available');
              break;
          }
        }
      });

      hls.on(Hls.Events.FRAG_LOADED, () => {
        // Stream is working
        setError(null);
      });

    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = hlsUrl;
      video.addEventListener('loadedmetadata', () => {
        setError(null);
        // Auto-play when metadata is loaded (Safari) and user is authenticated
        if (isAuthenticated && video.paused) {
          video.play().catch(err => {
            // Auto-play might be blocked by browser, that's okay
          });
        }
      });
      video.addEventListener('error', () => {
        setError('Failed to load stream');
      });
    } else {
      setError('HLS not supported in this browser');
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, []);

  // Auto-play when user becomes authenticated
  useEffect(() => {
    const video = videoRef.current;
    if (video && isAuthenticated && video.paused) {
      video.play().catch(err => {
        // Auto-play might be blocked by browser, that's okay
      });
    }
  }, [isAuthenticated]);

  // Auto-play when video is ready and user is authenticated
  useEffect(() => {
    const video = videoRef.current;
    if (video && isAuthenticated && video.readyState >= 2 && video.paused) {
      video.play().catch(err => {
        // Auto-play might be blocked by browser, that's okay
      });
    }
  }, [isAuthenticated]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };


  if (error) {
    return (
      <div className="relative w-full aspect-video bg-gray-900 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-gray-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-white text-lg mb-2">Stream Offline</p>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onError={() => setError('Failed to load stream')}
      />
      
      {/* Play/Pause overlay */}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center">
          <button
            onClick={togglePlay}
            className="bg-black bg-opacity-50 hover:bg-opacity-70 rounded-full p-4 transition-all"
          >
            <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}

    </div>
  );
}
