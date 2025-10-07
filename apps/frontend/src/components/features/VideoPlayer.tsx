'use client';

import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  streamKey?: string;
  hlsUrl?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = React.memo(
  function VideoPlayer({
    streamKey,
    hlsUrl,
    className = '',
    autoPlay = true,
    muted = true,
    controls = true,
  }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isLive, setIsLive] = useState(false);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);

    // Memoize HLS URL to prevent unnecessary re-renders
    const finalHlsUrl = useMemo(() => {
      if (streamKey) {
        const hlsBaseUrl =
          process.env.NEXT_PUBLIC_HLS_BASE_URL ||
          'http://localhost:9000/api/v1';
        return `${hlsBaseUrl}/hls/${streamKey}`;
      }
      return null;
    }, [hlsUrl, streamKey]);

    // Cleanup function
    const cleanup = useCallback(() => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }, []);

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Cleanup previous instance
      cleanup();

      if (Hls.isSupported()) {
        const hls = new Hls({
          // Optimized configuration for stable streaming
          enableWorker: true,
          lowLatencyMode: false, // Disable for better buffering
          backBufferLength: 30, // Increased for stability
          maxBufferLength: 60, // Increased for stability
          maxMaxBufferLength: 120, // Increased for stability

          // Live streaming specific settings - Stable
          liveSyncDurationCount: 3, // Increased for stability
          liveMaxLatencyDurationCount: 5, // Increased for stability
          liveBackBufferLength: 0,
          liveDurationInfinity: true,

          // Buffer management - Optimized
          maxBufferHole: 0.1, // Reduced for better continuity
          highBufferWatchdogPeriod: 1, // More frequent checks
          nudgeOffset: 0.05, // Smaller nudge for smoother playback
          nudgeMaxRetry: 5, // More retries
          maxFragLookUpTolerance: 0.1, // Reduced tolerance

          // Timeout settings - Optimized for live streaming
          fragLoadingTimeOut: 10000, // Reduced timeout
          manifestLoadingTimeOut: 5000, // Reduced timeout
          levelLoadingTimeOut: 5000, // Reduced timeout

          // Retry configuration - Optimized
          // retryDelay: 500,                   // Faster retry (deprecated)
          // maxRetryDelay: 2000,               // Reduced max retry delay (deprecated)

          // Performance settings
          enableSoftwareAES: true,
          startLevel: -1,
          capLevelToPlayerSize: false,
          capLevelOnFPSDrop: false,

          // Custom loader for authentication
          xhrSetup: (xhr, url) => {
            // Add cache busting headers
            xhr.setRequestHeader('Cache-Control', 'no-cache');
            xhr.setRequestHeader('Pragma', 'no-cache');

            // Add authentication token if available
            const token = localStorage.getItem('auth_token');
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }
          },
        });

        hlsRef.current = hls;
        if (finalHlsUrl) {
          // Add cache busting to avoid cache issues
          const cacheBustedUrl = `${finalHlsUrl}?t=${Date.now()}`;
          hls.loadSource(cacheBustedUrl);
          hls.attachMedia(video);
        } else {
          setError(
            'Stream not ready - waiting for broadcaster to start streaming'
          );
          setIsLoading(false);
        }

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          setIsLive(true);
          setError(null);
          if (autoPlay) {
            // Handle autoplay policy
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                // Don't treat autoplay prevention as an error
                if (error.name === 'NotAllowedError') {
                  setAutoplayBlocked(true);
                }
              });
            }
          }
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          // Handle non-fatal errors (like fragLoadError) more gracefully
          if (!data.fatal) {
            // For fragLoadError, try to recover
            if (
              data.type === Hls.ErrorTypes.NETWORK_ERROR &&
              data.details === 'fragLoadError'
            ) {
              hls.startLoad();
              return;
            }

            // For buffer stall, try to recover
            if (
              data.type === Hls.ErrorTypes.MEDIA_ERROR &&
              data.details === 'bufferStalledError'
            ) {
              // Try to seek to current time to trigger buffer refill
              if (video && !isNaN(video.currentTime)) {
                const currentTime = video.currentTime;
                video.currentTime = currentTime + 0.1;
              }
              hls.startLoad();
              return;
            }

            // For manifest load errors, try to reload
            if (
              data.type === Hls.ErrorTypes.NETWORK_ERROR &&
              data.details === 'manifestLoadError'
            ) {
              setTimeout(() => {
                hls.startLoad();
              }, 1000);
              return;
            }

            // For other non-fatal errors, don't show error UI
            return;
          }

          // Handle fatal errors
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (
                data.details === 'manifestLoadError' ||
                data.details === 'manifestParsingError' ||
                data.details === 'manifestLoadTimeOut' ||
                data.details === 'levelLoadError'
              ) {
                setError('Stream is currently offline');
              } else {
                setError('Network connection issue');
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Stream playback error');
              break;
            default:
              setError('Stream is currently unavailable');
              break;
          }
          setIsLoading(false);
          cleanup();
        });

        return cleanup;
      } else if (
        video.canPlayType('application/vnd.apple.mpegurl') &&
        finalHlsUrl
      ) {
        // Safari native HLS support
        video.src = finalHlsUrl;

        const handleLoadedMetadata = () => {
          setIsLoading(false);
          setIsLive(true);
          setError(null);
          if (autoPlay) {
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise.catch(error => {
                if (error.name === 'NotAllowedError') {
                  setAutoplayBlocked(true);
                } else {
                }
              });
            }
          }
        };

        const handleError = (e: Event) => {
          const videoError = video.error;
          if (videoError) {
            switch (videoError.code) {
              case 1: // MEDIA_ERR_ABORTED
                setError('Stream loading was aborted');
                break;
              case 2: // MEDIA_ERR_NETWORK
                setError('Stream is currently offline');
                break;
              case 3: // MEDIA_ERR_DECODE
                setError('Stream playback error');
                break;
              case 4: // MEDIA_ERR_SRC_NOT_SUPPORTED
                setError('Stream format not supported');
                break;
              default:
                setError('Stream is currently offline');
                break;
            }
          } else {
            setError('Stream is currently offline');
          }
          setIsLoading(false);
        };

        video.addEventListener('loadedmetadata', handleLoadedMetadata);
        video.addEventListener('error', handleError);

        return () => {
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('error', handleError);
        };
      } else {
        setError('HLS is not supported in this browser');
        setIsLoading(false);
      }
    }, [streamKey, autoPlay, hlsUrl, cleanup]);

    const handleUserInteraction = useCallback(() => {
      setUserInteracted(true);
      setAutoplayBlocked(false);
      const video = videoRef.current;
      if (video && video.paused) {
        video.play().catch(() => {});
      }
    }, []);

    if (error) {
      const isOfflineError =
        error.includes('offline') || error.includes('unavailable');
      const isNetworkError =
        error.includes('Network') || error.includes('connection');
      const isNotReadyError =
        error.includes('not ready') ||
        error.includes('waiting for broadcaster');

      return (
        <div
          className={`aspect-video bg-gray-800 rounded-lg flex items-center justify-center ${className}`}
        >
          <div className='text-center'>
            {isOfflineError ? (
              <>
                <div className='w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center'>
                  <svg
                    className='w-8 h-8 text-gray-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z'
                    />
                  </svg>
                </div>
                <h3 className='text-lg font-medium text-gray-300 mb-2'>
                  Stream Offline
                </h3>
                <p className='text-gray-400 text-sm'>
                  The stream is currently not available
                </p>
                <p className='text-gray-500 text-xs mt-2'>
                  Please check back later or contact the streamer
                </p>
              </>
            ) : isNetworkError ? (
              <>
                <div className='w-16 h-16 mx-auto mb-4 bg-yellow-900/20 rounded-full flex items-center justify-center'>
                  <svg
                    className='w-8 h-8 text-yellow-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z'
                    />
                  </svg>
                </div>
                <h3 className='text-lg font-medium text-yellow-300 mb-2'>
                  Connection Issue
                </h3>
                <p className='text-gray-400 text-sm'>{error}</p>
                <p className='text-gray-500 text-xs mt-2'>
                  Please check your internet connection
                </p>
              </>
            ) : (
              <>
                <div className='w-16 h-16 mx-auto mb-4 bg-red-900/20 rounded-full flex items-center justify-center'>
                  <svg
                    className='w-8 h-8 text-red-400'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                    />
                  </svg>
                </div>
                <h3 className='text-lg font-medium text-red-300 mb-2'>
                  Stream Error
                </h3>
                <p className='text-gray-400 text-sm'>{error}</p>
              </>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className={`relative ${className}`}>
        <video
          ref={videoRef}
          className='w-full h-full rounded-lg'
          autoPlay={autoPlay && !autoplayBlocked}
          muted={muted}
          controls={controls}
          playsInline
          onClick={handleUserInteraction}
        />

        {isLoading && (
          <div className='absolute inset-0 bg-gray-800 rounded-lg flex items-center justify-center'>
            <div className='text-center text-white'>
              <div className='w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2'></div>
              <p>Loading stream...</p>
            </div>
          </div>
        )}

        {autoplayBlocked && !userInteracted && (
          <div
            className='absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center cursor-pointer'
            onClick={handleUserInteraction}
          >
            <div className='text-center text-white'>
              <div className='w-16 h-16 mx-auto mb-4 bg-blue-600 rounded-full flex items-center justify-center'>
                <svg
                  className='w-8 h-8'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path d='M8 5v10l8-5-8-5z' />
                </svg>
              </div>
              <h3 className='text-lg font-medium mb-2'>Click to Play Stream</h3>
              <p className='text-gray-300 text-sm'>
                Browser autoplay is disabled
              </p>
            </div>
          </div>
        )}

        {isLive && !autoplayBlocked && (
          <div className='absolute top-4 left-4 bg-red-600 text-white px-2 py-1 rounded text-sm font-medium'>
            LIVE
          </div>
        )}
      </div>
    );
  }
);
