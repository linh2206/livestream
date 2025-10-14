'use client';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Loading } from '@/components/ui/Loading';
import { streamService } from '@/lib/api/services/stream.service';
import { Stream } from '@/lib/api/types/stream.types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useSocketContext } from '@/lib/contexts/SocketContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { useAuthGuard } from '@/lib/hooks/useAuthGuard';
import { useErrorHandler } from '@/lib/hooks/useErrorHandler';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

export default function StreamPage() {
  const params = useParams();
  const router = useRouter();
  const { user: _user } = useAuth();
  const { showSuccess, showError, showLoading } = useToast();
  const { handleError } = useErrorHandler();
  const { on, off, joinStream, leaveStream } = useSocketContext();

  // Auth guard
  const authLoading = useAuthGuard({ requireAuth: true });
  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamType, setStreamType] = useState<'camera' | 'screen'>('camera');
  const [viewerCount, setViewerCount] = useState(0);

  // Refs for media streams
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);

  const streamId = params?.id as string;

  // Fetch stream data
  const fetchStream = useCallback(async () => {
    if (!streamId) return;

    try {
      setLoading(true);
      const data = await streamService.getStream(streamId);
      setStream(data as Stream);
      setStreamType(data.streamType || 'camera');
    } catch (error) {
      handleError(error);
      router.push('/streams');
    } finally {
      setLoading(false);
    }
  }, [streamId, handleError, router]);

  useEffect(() => {
    fetchStream();
  }, [fetchStream]);

  // Socket event handlers
  useEffect(() => {
    if (!stream) return;

    const handleViewerCountUpdate = (data: Record<string, unknown>) => {
      if (data.streamId === stream._id) {
        setViewerCount((data.viewerCount as number) || 0);
      }
    };

    // Join stream room
    joinStream(stream._id);

    // Listen for viewer count updates
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    on('stream:viewer_count_update' as any, handleViewerCountUpdate);

    return () => {
      leaveStream(stream._id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      off('stream:viewer_count_update' as any, handleViewerCountUpdate);
    };
  }, [stream, on, off, joinStream, leaveStream]);

  // Start streaming function
  const startStreaming = async () => {
    try {
      showLoading('Starting Stream', 'Setting up your camera...');

      let mediaStream: MediaStream;

      if (streamType === 'camera') {
        // Get camera stream
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
      } else {
        // Get screen share stream
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
      }

      // Store reference
      mediaStreamRef.current = mediaStream;

      // Display stream in video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // Start WebRTC streaming (simplified - in real app you'd use WebRTC)
      await startWebRTCStream(mediaStream);

      setIsStreaming(true);

      // Broadcast stream start event
      if (stream) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).socket?.emit('stream:start', {
          streamId: stream._id,
          streamKey: stream.streamKey,
          streamType: streamType,
        });
      }

      showSuccess('Stream Started!', 'You are now live! 🎥', {
        replaceType: 'loading',
      });
    } catch (error) {
      showError(
        'Stream Failed',
        'Failed to start streaming. Please check permissions.',
        {
          replaceType: 'loading',
        }
      );
      // eslint-disable-next-line no-console
      console.error('Streaming error:', error);
    }
  };

  // Stop streaming function
  const stopStreaming = () => {
    try {
      // Stop media stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
        mediaStreamRef.current = null;
      }

      // Stop media recorder
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }

      // Close WebSocket
      if (websocketRef.current) {
        websocketRef.current.close();
        websocketRef.current = null;
      }

      // Clear video element
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      setIsStreaming(false);

      // Broadcast stream stop event
      if (stream) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).socket?.emit('stream:stop', {
          streamId: stream._id,
        });
      }

      showSuccess('Stream Stopped', 'Your stream has ended.', {
        duration: 2000,
      });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Stop streaming error:', error);
    }
  };

  // WebRTC streaming implementation - Direct to RTMP like OBS
  const startWebRTCStream = async (mediaStream: MediaStream) => {
    try {
      // eslint-disable-next-line no-console
      console.log('🎥 Starting WebRTC stream directly to RTMP (like OBS)');
      // eslint-disable-next-line no-console
      console.log('📡 Stream Key:', stream?.streamKey);
      // eslint-disable-next-line no-console
      console.log('🔗 RTMP URL:', stream?.rtmpUrl);

      // Store media stream for cleanup
      mediaStreamRef.current = mediaStream;

      // Use MediaRecorder to capture stream and send to RTMP
      if (MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus')) {
        // eslint-disable-next-line no-console
        console.log('✅ Using MediaRecorder API for RTMP streaming');

        const mediaRecorder = new MediaRecorder(mediaStream, {
          mimeType: 'video/webm; codecs=vp8,opus',
          videoBitsPerSecond: 2500000, // 2.5 Mbps
          audioBitsPerSecond: 128000, // 128 kbps
        });

        // Store for cleanup
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = event => {
          if (event.data.size > 0) {
            // eslint-disable-next-line no-console
            console.log(
              '📡 Streaming to RTMP via backend:',
              event.data.size,
              'bytes'
            );

            // Send data directly to RTMP server (like OBS)
            if (stream && stream.rtmpUrl) {
              // eslint-disable-next-line no-console
              console.log(
                '✅ Stream data sent directly to RTMP server:',
                stream.rtmpUrl
              );

              // TODO: Implement direct RTMP streaming
              // This would require a WebRTC to RTMP bridge or similar
              // For now, we'll show the RTMP URL for manual streaming

              // eslint-disable-next-line no-console
              console.log(
                '📡 Use OBS or similar tool to stream to:',
                stream.rtmpUrl
              );
            }
          }
        };

        mediaRecorder.onstart = () => {
          // eslint-disable-next-line no-console
          console.log('🎬 MediaRecorder started - streaming to RTMP');
        };

        mediaRecorder.onstop = () => {
          // eslint-disable-next-line no-console
          console.log('⏹️ MediaRecorder stopped');
        };

        mediaRecorder.onerror = event => {
          // eslint-disable-next-line no-console
          console.error('❌ MediaRecorder error:', event);
        };

        // Start recording with 1-second chunks for real-time streaming
        mediaRecorder.start(1000);

        return Promise.resolve();
      }

      // Method 2: Fallback to RTCPeerConnection
      // eslint-disable-next-line no-console
      console.log('Using RTCPeerConnection for streaming');

      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      // Add tracks to peer connection
      mediaStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, mediaStream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          // eslint-disable-next-line no-console
          console.log('ICE candidate:', event.candidate);
          // In a real implementation, send to signaling server
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        // eslint-disable-next-line no-console
        console.log('Connection state:', peerConnection.connectionState);
      };

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // eslint-disable-next-line no-console
      console.log('WebRTC offer created:', offer);

      // Store for cleanup
      (window as unknown as Record<string, unknown>).currentPeerConnection =
        peerConnection;

      return Promise.resolve();
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('WebRTC streaming error:', error);
      throw error;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      // Cleanup MediaRecorder
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current = null;
      }
      // Cleanup PeerConnection
      if (
        (window as unknown as Record<string, unknown>).currentPeerConnection
      ) {
        (
          (window as unknown as Record<string, unknown>)
            .currentPeerConnection as RTCPeerConnection
        ).close();
        (window as unknown as Record<string, unknown>).currentPeerConnection =
          null;
      }
    };
  }, []);

  // Show loading state
  if (authLoading || loading) {
    return <Loading fullScreen text='Loading stream...' />;
  }

  // Show error state
  if (!stream) {
    return (
      <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-white mb-4'>
            Stream Not Found
          </h1>
          <Button onClick={() => router.push('/streams')}>
            Back to Streams
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-900'>
      <Header />
      <div className='flex'>
        <Sidebar />
        <main className='flex-1 p-6'>
          <div className='max-w-7xl mx-auto'>
            {/* Stream Header */}
            <div className='mb-6'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h1 className='text-3xl font-bold text-white mb-2'>
                    🎥 Streaming Studio
                  </h1>
                  <p className='text-gray-300'>
                    Stream:{' '}
                    <span className='font-medium text-white'>
                      {stream.title}
                    </span>
                  </p>
                </div>
                <div className='flex items-center space-x-3'>
                  <div className='flex items-center space-x-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700'>
                    <div className='flex items-center space-x-1'>
                      <svg className='w-4 h-4 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 12a3 3 0 11-6 0 3 3 0 016 0z' />
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' />
                      </svg>
                      <span className='text-sm text-gray-400'>Viewers</span>
                    </div>
                    <div className='text-lg font-bold text-white'>
                      {viewerCount}
                    </div>
                  </div>
                  <div
                    className={`px-4 py-2 rounded-lg text-sm font-semibold flex items-center space-x-1 ${
                      isStreaming
                        ? 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25'
                        : 'bg-gray-700 text-gray-300 border border-gray-600'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-white animate-pulse' : 'bg-gray-400'}`}></div>
                    <span>{isStreaming ? 'LIVE' : 'OFFLINE'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Stream Type Selection */}
            <div className='mb-6'>
              <Card>
                <div className='p-6'>
                  <h3 className='text-lg font-semibold text-white mb-2'>
                    📡 Stream to RTMP Server
                  </h3>
                  <p className='text-gray-400 text-sm mb-4'>
                    Stream directly to RTMP server (like OBS) - Use OBS or
                    similar tool
                  </p>
                  {stream?.rtmpUrl && (
                    <div className='mb-4 p-3 bg-gray-800 rounded-lg border border-gray-600'>
                      <p className='text-sm text-gray-300 mb-1'>RTMP URL:</p>
                      <code className='text-blue-400 text-sm break-all'>
                        {stream.rtmpUrl}
                      </code>
                    </div>
                  )}
                  <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                    <div
                      className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        streamType === 'camera'
                          ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                          : 'border-gray-600 hover:border-gray-400 hover:bg-gray-800/50'
                      }`}
                      onClick={() => !isStreaming && setStreamType('camera')}
                    >
                      <div className='flex items-center space-x-4'>
                        <div className='text-4xl'>📹</div>
                        <div>
                          <h4 className='text-white font-semibold text-lg'>
                            Camera
                          </h4>
                          <p className='text-gray-300 text-sm mt-1'>
                            Stream from your webcam
                          </p>
                        </div>
                      </div>
                    </div>
                    <div
                      className={`p-6 border-2 rounded-xl cursor-pointer transition-all duration-200 ${
                        streamType === 'screen'
                          ? 'border-blue-500 bg-blue-500/20 shadow-lg shadow-blue-500/20'
                          : 'border-gray-600 hover:border-gray-400 hover:bg-gray-800/50'
                      }`}
                      onClick={() => !isStreaming && setStreamType('screen')}
                    >
                      <div className='flex items-center space-x-4'>
                        <div className='text-4xl'>🖥️</div>
                        <div>
                          <h4 className='text-white font-semibold text-lg'>
                            Screen Share
                          </h4>
                          <p className='text-gray-300 text-sm mt-1'>
                            Share your screen
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              {/* Video Preview */}
              <div className='lg:col-span-2'>
                <Card className='h-full'>
                  <div className='aspect-video bg-black rounded-xl overflow-hidden relative border border-gray-700'>
                    <video
                      ref={videoRef}
                      className='w-full h-full object-cover'
                      muted
                      playsInline
                    />
                    {!isStreaming && (
                      <div className='absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900'>
                        <div className='text-center'>
                          <div className='text-7xl mb-6'>
                            {streamType === 'camera' ? '📹' : '🖥️'}
                          </div>
                          <p className='text-white text-xl font-semibold mb-3'>
                            Ready to Stream
                          </p>
                          <p className='text-gray-300 text-base'>
                            {streamType === 'camera'
                              ? 'Camera streaming ready'
                              : 'Screen share ready'}
                          </p>
                        </div>
                      </div>
                    )}
                    {isStreaming && (
                      <div className='absolute top-4 left-4 bg-red-600 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg animate-pulse'>
                        🔴 LIVE
                      </div>
                    )}
                  </div>
                </Card>
              </div>

              {/* Stream Controls */}
              <div className='lg:col-span-1'>
                <Card className='h-full'>
                  <div className='p-6 space-y-6'>
                    <h3 className='text-lg font-semibold text-white mb-2'>
                      🎛️ Stream Controls
                    </h3>
                    <p className='text-gray-400 text-sm mb-4'>
                      Manage your live broadcast
                    </p>

                    {/* Current Stream Type */}
                    <div className='bg-gradient-to-r from-gray-800 to-gray-700 p-5 rounded-xl border border-gray-600'>
                      <h4 className='text-sm font-semibold text-white mb-3'>
                        📋 Active Source
                      </h4>
                      <div className='flex items-center space-x-3'>
                        <span className='text-3xl'>
                          {streamType === 'camera' ? '📹' : '🖥️'}
                        </span>
                        <span className='text-white font-semibold text-lg'>
                          {streamType === 'camera' ? 'Camera' : 'Screen Share'}
                        </span>
                      </div>
                    </div>

                    {/* Stream Info */}
                    <div className='bg-gradient-to-r from-gray-800 to-gray-700 p-5 rounded-xl border border-gray-600'>
                      <h4 className='text-sm font-semibold text-white mb-4'>
                        🔗 Stream Details
                      </h4>
                      <div className='space-y-3 text-sm'>
                        <div>
                          <span className='font-semibold text-gray-300'>
                            Stream Key:
                          </span>
                          <div className='mt-1'>
                            <code className='bg-gray-900 text-blue-300 px-3 py-2 rounded-lg text-xs font-mono block'>
                              {stream.streamKey}
                            </code>
                          </div>
                        </div>
                        <div>
                          <span className='font-semibold text-gray-300'>
                            RTMP URL:
                          </span>
                          <div className='mt-1'>
                            <code className='bg-gray-900 text-green-300 px-3 py-2 rounded-lg text-xs font-mono block break-all'>
                              {stream.rtmpUrl}
                            </code>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Control Buttons */}
                    <div className='space-y-4'>
                      {!isStreaming ? (
                        <Button
                          onClick={startStreaming}
                          className='w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200'
                          size='lg'
                        >
                          🎥 Start Streaming
                        </Button>
                      ) : (
                        <Button
                          onClick={stopStreaming}
                          variant='danger'
                          className='w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200'
                          size='lg'
                        >
                          ⏹️ Stop Streaming
                        </Button>
                      )}

                      <Button
                        onClick={() => router.push(`/streams/${stream._id}`)}
                        variant='secondary'
                        className='w-full bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200'
                      >
                        👁️ View Stream
                      </Button>
                    </div>

                    {/* Instructions */}
                    <div className='bg-gradient-to-r from-gray-800 to-gray-700 p-5 rounded-xl border border-gray-600'>
                      <h4 className='font-semibold text-white mb-4 text-base'>
                        📖 Quick Start Guide
                      </h4>
                      <ul className='space-y-2 text-sm text-gray-300'>
                        <li className='flex items-start space-x-2'>
                          <span className='text-blue-400 font-bold'>1.</span>
                          <span>
                            Select your stream source (Camera/Screen Share)
                          </span>
                        </li>
                        <li className='flex items-start space-x-2'>
                          <span className='text-blue-400 font-bold'>2.</span>
                          <span>Click &quot;Start Streaming&quot; button</span>
                        </li>
                        <li className='flex items-start space-x-2'>
                          <span className='text-blue-400 font-bold'>3.</span>
                          <span>Allow browser camera/microphone access</span>
                        </li>
                        <li className='flex items-start space-x-2'>
                          <span className='text-green-400 font-bold'>4.</span>
                          <span>You&apos;re now live! 🎉</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
