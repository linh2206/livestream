'use client';

import Hls from 'hls.js';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

interface VideoPlayerProps {
  streamKey?: string;
  hlsUrl?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  vodUrl?: string;
  isVod?: boolean;
  isLive?: boolean;
  vodProcessing?: boolean;
  vodProcessingStatus?: string;
  viewerCount?: number;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = React.memo(
  function VideoPlayer({
    streamKey,
    hlsUrl,
    className = '',
    autoPlay = true,
    muted = true,
    controls = true,
    vodUrl,
    isVod = false,
    isLive = false,
    vodProcessing = false,
    vodProcessingStatus,
    viewerCount: _viewerCount = 0,
  }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [_isLiveState, _setIsLiveState] = useState(false);
    const [autoplayBlocked, setAutoplayBlocked] = useState(false);
    const [userInteracted, setUserInteracted] = useState(false);

    // Determine what to show based on stream status
    const shouldShowVod = useMemo(() => {
      // Show VOD if:
      // 1. Stream is not live AND VOD is available
      // 2. VOD processing is completed
      return !isLive && isVod && vodUrl && vodProcessingStatus === 'completed';
    }, [isLive, isVod, vodUrl, vodProcessingStatus]);

    const shouldShowLive = useMemo(() => {
      // Show live stream if:
      // 1. Stream is live
      // 2. VOD is not available or still processing
      return isLive || (!isVod && !vodProcessing);
    }, [isLive, isVod, vodProcessing]);

    // Memoize HLS URL to prevent unnecessary re-renders
    const finalHlsUrl = useMemo(() => {
      if (shouldShowVod && vodUrl) {
        // For VOD, use the serving URL
        if (vodUrl.startsWith('/vod/')) {
          const apiBaseUrl =
            process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9000/api/v1';
          return `${apiBaseUrl}${vodUrl}`;
        }
        return vodUrl;
      }
      if (shouldShowLive) {
        // Priority 1: Use hlsUrl from backend if provided
        if (hlsUrl && hlsUrl.trim() !== '') {
          console.log('[VideoPlayer] Using hlsUrl from backend:', hlsUrl);
          return hlsUrl;
        }

        // Priority 2: Construct from streamKey
        if (streamKey) {
          // Validate streamKey before constructing URL
          if (
            !streamKey ||
            streamKey.trim() === '' ||
            streamKey === 'undefined' ||
            streamKey === 'null'
          ) {
            console.error('[VideoPlayer] Invalid streamKey:', streamKey);
            return null;
          }
          const hlsBaseUrl =
            process.env.NEXT_PUBLIC_HLS_BASE_URL ||
            'http://localhost:9000/api/v1';
          const finalUrl = `${hlsBaseUrl}/hls/${streamKey}`;
          console.log(
            '[VideoPlayer] Constructed URL from streamKey:',
            finalUrl
          );
          return finalUrl;
        }
      }
      return null;
    }, [shouldShowVod, shouldShowLive, streamKey, vodUrl, hlsUrl]);

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
          xhrSetup: (xhr, _url) => {
            // Add cache busting headers
            xhr.setRequestHeader('Cache-Control', 'no-cache');
            xhr.setRequestHeader('Pragma', 'no-cache');

            // Add authentication token if available
            const token = localStorage.getItem('auth_token');
            if (token) {
              xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            // Handle 401 responses
            xhr.addEventListener('load', () => {
              if (xhr.status === 401) {
                // Clear token and redirect to login
                localStorage.removeItem('auth_token');
                if (typeof window !== 'undefined') {
                  window.location.href = '/login';
                }
              }
            });
          },
        });

        hlsRef.current = hls;
        if (finalHlsUrl) {
          // Add cache busting to avoid cache issues
          const cacheBustedUrl = `${finalHlsUrl}?t=${Date.now()}`;
          console.log('[VideoPlayer] Loading HLS source:', {
            streamKey,
            finalHlsUrl,
            cacheBustedUrl,
            isVod,
            isLive,
          });
          hls.loadSource(cacheBustedUrl);
          hls.attachMedia(video);
        } else {
          console.warn('[VideoPlayer] No valid HLS URL available', {
            streamKey,
            hlsUrl,
            isVod,
            isLive,
            shouldShowVod,
            shouldShowLive,
          });
          setError(
            'Stream not ready - waiting for broadcaster to start streaming'
          );
          setIsLoading(false);
        }

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setIsLoading(false);
          // setIsLive(true); // Removed - using prop instead
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
          // setIsLive(true); // Removed - using prop instead
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

        const handleError = (_e: Event) => {
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
    }, [streamKey, autoPlay, hlsUrl, cleanup, finalHlsUrl]);

    const handleUserInteraction = useCallback(() => {
      setUserInteracted(true);
      setAutoplayBlocked(false);
      const video = videoRef.current;
      if (video && video.paused) {
        video.play().catch(() => {
          // Handle play error
        });
      }
    }, []);

    // Show VOD processing state
    if (vodProcessing) {
      return (
        <div
          className={`aspect-video bg-gray-800 rounded-lg flex items-center justify-center ${className}`}
        >
          <div className='text-center'>
            <div className='w-16 h-16 mx-auto mb-4 bg-blue-900/20 rounded-full flex items-center justify-center'>
              <div className='w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
            </div>
            <h3 className='text-lg font-medium text-gray-300 mb-2'>
              Processing VOD
            </h3>
            <p className='text-gray-400 text-sm'>
              Converting stream to video on demand...
            </p>
            <p className='text-gray-500 text-xs mt-2'>
              This may take a few minutes
            </p>
          </div>
        </div>
      );
    }

    // Show VOD if available and stream is offline
    if (shouldShowVod) {
      return (
        <div className={`aspect-video bg-gray-800 rounded-lg ${className}`}>
          <video
            ref={videoRef}
            className='w-full h-full rounded-lg'
            controls={controls}
            autoPlay={autoPlay}
            muted={muted}
            onLoadedData={() => setIsLoading(false)}
            onError={() => setError('Failed to load VOD')}
          >
            <source src={finalHlsUrl || ''} type='video/mp4' />
            Your browser does not support the video tag.
          </video>
          {isLoading && (
            <div className='absolute inset-0 bg-gray-800 rounded-lg flex items-center justify-center'>
              <div className='text-center text-gray-400'>
                <div className='w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4'></div>
                <p>Loading VOD...</p>
              </div>
            </div>
          )}
          {/* VOD indicator */}
          <div className='absolute top-4 left-4 bg-red-600 text-white px-2 py-1 rounded text-xs font-medium'>
            VOD
          </div>
        </div>
      );
    }

    if (error) {
      const isOfflineError =
        error.includes('offline') || error.includes('unavailable');
      const isNetworkError =
        error.includes('Network') || error.includes('connection');
      const _isNotReadyError =
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
        >
          {finalHlsUrl && (
            <source src={finalHlsUrl} type='application/x-mpegURL' />
          )}
          Your browser does not support the video tag.
        </video>

        {/* TikTok-style Live indicator and viewer count */}
        {shouldShowLive && (
          <div className='absolute top-4 left-4 flex items-center space-x-2'>
            {/* Live Badge - TikTok style */}
            <div className='flex items-center space-x-1 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-lg'>
              <div className='w-1.5 h-1.5 bg-white rounded-full animate-pulse'></div>
              <span>LIVE</span>
            </div>

            {/* Viewer Count - TikTok style */}
            <div className='flex items-center space-x-1 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-full text-xs font-medium'>
              <svg className='w-3 h-3' fill='currentColor' viewBox='0 0 20 20'>
                <path d='M10 12a2 2 0 100-4 2 2 0 000 4z' />
                <path
                  fillRule='evenodd'
                  d='M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z'
                  clipRule='evenodd'
                />
              </svg>
              <span>{_viewerCount.toLocaleString()}</span>
            </div>
          </div>
        )}

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
      </div>
    );
  }
);
