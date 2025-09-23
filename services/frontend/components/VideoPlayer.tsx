'use client';

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
  streamName?: string;
}

export default function VideoPlayer({ streamName }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fragmentErrorCount, setFragmentErrorCount] = useState(0);
  const [showPopup, setShowPopup] = useState(false);
  const [subtitle, setSubtitle] = useState('');
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Use backend API for HLS URL
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
    const defaultStreamName = process.env.NEXT_PUBLIC_STREAM_NAME || 'stream';
    const currentStreamName = streamName || defaultStreamName;
    
    if (!apiBaseUrl) {
      console.error('Missing environment variable: NEXT_PUBLIC_API_URL');
      return;
    }
    
    const hlsUrl = `${apiBaseUrl}/rtmp/hls/${currentStreamName}`;
    console.log('🎥 Loading HLS stream:', hlsUrl);

    // Test HLS stream availability first
    const testHlsStream = async () => {
      try {
        const response = await fetch(hlsUrl, { method: 'HEAD' });
        if (!response.ok) {
          console.log('📺 HLS stream not available yet');
          setError('No stream available. Start streaming to see content.');
          return false;
        }
        return true;
      } catch (error) {
        console.log('📺 HLS stream test failed:', error);
        setError('No stream available. Start streaming to see content.');
        return false;
      }
    };

    // Initialize HLS player
    const initHlsPlayer = async () => {
      const isStreamAvailable = await testHlsStream();
      if (!isStreamAvailable) return null;

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
          // Better error handling
          fragLoadingTimeOut: 20000,
          manifestLoadingTimeOut: 10000,
          levelLoadingTimeOut: 10000,
          // Retry configuration - reduce retries to avoid spam
          fragLoadingMaxRetry: 1,
          manifestLoadingMaxRetry: 1,
          levelLoadingMaxRetry: 1,
          // Fragment error handling
          fragLoadingMaxRetryTimeout: 5000,
          // CORS handling
          xhrSetup: function(xhr, url) {
            xhr.withCredentials = false;
            // Add timeout for individual requests
            xhr.timeout = 10000;
          },
          // Skip corrupted fragments - removed as not supported in HLS.js
          // Better fragment handling for discontinuity
          maxFragLookUpTolerance: 1.0,
          // Disable some problematic features for live streams
          enableSoftwareAES: false,
          // Better live stream handling
          liveBackBufferLength: 0,
          // Handle discontinuity better
          maxBufferHole: 1.0,
          // More tolerant to errors
          maxBufferSize: 60 * 1000 * 1000, // 60MB
          // Better error recovery
          maxMaxBufferLength: 120,
          // More aggressive error handling - no retries
          fragLoadingMaxRetry: 0,
          manifestLoadingMaxRetry: 0,
          levelLoadingMaxRetry: 0
        });

        hls.loadSource(hlsUrl);
        hls.attachMedia(video);

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('✅ HLS manifest parsed, ready for playback');
          setError(null);
          setSubtitle('✅ Stream ready - Click to play');
          setTimeout(() => setSubtitle(''), 3000);
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          // Completely ignore fragParsingError - it's common and non-fatal
          if (data.details === 'fragParsingError') {
            setFragmentErrorCount(prev => prev + 1);
            // Only log every 50th error to reduce spam
            if (fragmentErrorCount % 50 === 0) {
              console.log('⚠️ Fragment parsing errors (ignored):', fragmentErrorCount);
              // Show subtitle for fragment errors
              setSubtitle('⚠️ Stream buffering... Please wait');
              setTimeout(() => setSubtitle(''), 2000);
            }
            return; // Don't log or handle further
          }
          
          console.error('❌ HLS error:', data);
          
          // Handle other non-fatal errors
          if (!data.fatal) {
            console.log('⚠️ Non-fatal HLS error, continuing...');
            
            // Track other fragment errors
            if (data.details === 'fragLoadError') {
              setFragmentErrorCount(prev => prev + 1);
              
              // Only log every 20th error to reduce spam
              if (fragmentErrorCount % 20 === 0) {
                console.log('⚠️ Fragment load errors detected:', fragmentErrorCount, 'errors so far');
              }
              
              // If too many fragment errors, show warning
              if (fragmentErrorCount > 100) {
                console.log('⚠️ Many fragment errors detected, stream may be unstable');
              }
            }
            return;
          }
          
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
          // Reset fragment error count when fragments load successfully
          setFragmentErrorCount(0);
          // Show success subtitle occasionally
          if (Math.random() < 0.1) { // 10% chance
            setSubtitle('🎥 Stream quality: Good');
            setTimeout(() => setSubtitle(''), 1500);
          }
        });

        // Handle fragment parsing errors gracefully - using ERROR event instead
        // FRAG_PARSING_ERROR is not available in this HLS.js version

        // Handle fragment loading errors - using ERROR event instead
        // FRAG_LOAD_ERROR is not available in this HLS.js version

      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS support
        video.src = hlsUrl;
        video.addEventListener('loadedmetadata', () => {
          console.log('✅ HLS manifest loaded, ready for playback');
          setError(null);
        });
        video.addEventListener('error', () => {
          setError('Failed to load stream');
        });
      } else {
        setError('HLS not supported in this browser');
      }

      return hls;
    };

    // Initialize player
    let cleanup: (() => void) | null = null;
    initHlsPlayer().then((hls) => {
      cleanup = () => {
        if (hls) {
          hls.destroy();
        }
      };
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [streamName]);

  // Auto-show subtitle and popup when stream starts
  useEffect(() => {
    if (isPlaying) {
      setSubtitle('🎬 Live Stream Started - Welcome to LiveStream App!');
      setShowPopup(true);
      
      // Auto-hide popup after 3 seconds
      const timer = setTimeout(() => {
        setShowPopup(false);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isPlaying]);

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
      
      {/* Subtitle overlay */}
      {subtitle && (
        <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-black bg-opacity-80 text-white px-4 py-2 rounded-lg text-lg font-medium max-w-md text-center">
            {subtitle}
          </div>
        </div>
      )}
      
      {/* Mini popup */}
      {showPopup && (
        <div className="absolute top-4 right-4 z-10">
          <div className="bg-blue-600 bg-opacity-90 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Live Stream Active</span>
            </div>
          </div>
        </div>
      )}
      
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
      
      {/* Fragment error indicator */}
      {fragmentErrorCount > 0 && (
        <div className="absolute top-4 left-4 bg-red-500 bg-opacity-80 text-white px-2 py-1 rounded text-xs">
          Fragments: {fragmentErrorCount}
        </div>
      )}
    </div>
  );
}
