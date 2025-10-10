'use client';

import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { streamService } from '@/lib/api/services/stream.service';
import { Stream } from '@/lib/api/types';
import { useAuth } from '@/lib/contexts/AuthContext';
import { useToast } from '@/lib/contexts/ToastContext';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

export default function StreamPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();

  const [stream, setStream] = useState<Stream | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingError, setStreamingError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  useEffect(() => {
    if (id) {
      fetchStream();
    }
  }, [id]);

  const fetchStream = async () => {
    try {
      const response = await streamService.getStream(id as string);
      setStream(response);
    } catch (error) {
      console.error('Failed to fetch stream:', error);
      showError('Error', 'Failed to load stream details');
      router.push('/streams');
    } finally {
      setLoading(false);
    }
  };

  const startStreaming = async () => {
    try {
      setStreamingError(null);

      if (!stream) return;

      let mediaStream: MediaStream;

      if (stream.streamType === 'camera') {
        // Request camera and microphone access
        mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
      } else {
        // Request screen share access
        mediaStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: true,
        });
      }

      mediaStreamRef.current = mediaStream;

      // Display the stream in the video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play();
      }

      // Create WebRTC peer connection for streaming
      await createPeerConnection(mediaStream);

      setIsStreaming(true);
      showSuccess('Streaming Started!', 'Your stream is now live! 🎥');
    } catch (error: any) {
      console.error('Failed to start streaming:', error);
      setStreamingError(error.message);
      showError('Streaming Error', error.message);
    }
  };

  const createPeerConnection = async (mediaStream: MediaStream) => {
    try {
      // Create peer connection
      const peerConnection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      });

      peerConnectionRef.current = peerConnection;

      // Add media tracks
      mediaStream.getTracks().forEach(track => {
        peerConnection.addTrack(track, mediaStream);
      });

      // Handle ICE candidates
      peerConnection.onicecandidate = event => {
        if (event.candidate) {
          // Send ICE candidate to server
          console.log('ICE candidate:', event.candidate);
        }
      };

      // Handle connection state changes
      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
      };

      // Create offer
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      // Send offer to server (you'll need to implement this endpoint)
      // await streamService.sendWebRTCOffer(stream._id, offer);
    } catch (error) {
      console.error('Failed to create peer connection:', error);
      throw error;
    }
  };

  const stopStreaming = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setIsStreaming(false);
    setStreamingError(null);
    showSuccess('Streaming Stopped', 'Your stream has ended');
  };

  if (loading) {
    return <Loading fullScreen text='Loading stream...' />;
  }

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
          <div className='max-w-6xl mx-auto'>
            {/* Stream Header */}
            <div className='mb-6'>
              <div className='flex items-center justify-between mb-4'>
                <div>
                  <h1 className='text-3xl font-bold text-white mb-2'>
                    {stream.title}
                  </h1>
                  <p className='text-gray-400'>{stream.description}</p>
                </div>
                <div className='flex items-center space-x-4'>
                  {isStreaming && (
                    <div className='flex items-center space-x-2'>
                      <div className='w-3 h-3 bg-red-500 rounded-full animate-pulse'></div>
                      <span className='text-red-500 font-semibold'>LIVE</span>
                    </div>
                  )}
                  <Button
                    onClick={isStreaming ? stopStreaming : startStreaming}
                    variant={isStreaming ? 'danger' : 'primary'}
                    className='px-6'
                  >
                    {isStreaming ? 'Stop Stream' : 'Start Stream'}
                  </Button>
                </div>
              </div>
            </div>

            {/* Stream Preview */}
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
              <div className='lg:col-span-2'>
                <div className='bg-black rounded-lg overflow-hidden aspect-video'>
                  <video
                    ref={videoRef}
                    className='w-full h-full object-cover'
                    muted
                    playsInline
                  />
                  {!isStreaming && (
                    <div className='absolute inset-0 flex items-center justify-center bg-gray-800'>
                      <div className='text-center'>
                        <div className='w-16 h-16 bg-gray-600 rounded-full flex items-center justify-center mx-auto mb-4'>
                          <svg
                            className='w-8 h-8 text-white'
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
                        <p className='text-gray-400'>Stream Preview</p>
                        <p className='text-sm text-gray-500 mt-2'>
                          {stream.streamType === 'camera'
                            ? 'Camera'
                            : 'Screen Share'}{' '}
                          will appear here
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {streamingError && (
                  <div className='mt-4 p-4 bg-red-900/20 border border-red-500/30 rounded-lg'>
                    <p className='text-red-400'>{streamingError}</p>
                  </div>
                )}
              </div>

              {/* Stream Info */}
              <div className='space-y-6'>
                <div className='bg-gray-800 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold text-white mb-4'>
                    Stream Information
                  </h3>
                  <div className='space-y-3'>
                    <div>
                      <label className='text-sm text-gray-400'>
                        Stream Key
                      </label>
                      <p className='text-white font-mono text-sm bg-gray-700 px-3 py-2 rounded'>
                        {stream.streamKey}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm text-gray-400'>
                        Stream Type
                      </label>
                      <p className='text-white capitalize'>
                        {stream.streamType === 'camera'
                          ? '📹 Camera'
                          : '🖥️ Screen Share'}
                      </p>
                    </div>
                    <div>
                      <label className='text-sm text-gray-400'>Status</label>
                      <p
                        className={`font-semibold ${isStreaming ? 'text-red-500' : 'text-gray-400'}`}
                      >
                        {isStreaming ? 'Live' : 'Offline'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className='bg-gray-800 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold text-white mb-4'>
                    Instructions
                  </h3>
                  <div className='space-y-3 text-sm text-gray-300'>
                    <p>1. Click &quot;Start Stream&quot; to begin</p>
                    <p>2. Allow camera/microphone access</p>
                    <p>3. Your stream will be live immediately</p>
                    <p>4. Share the stream URL with viewers</p>
                  </div>
                </div>

                <div className='bg-gray-800 rounded-lg p-6'>
                  <h3 className='text-lg font-semibold text-white mb-4'>
                    Stream URL
                  </h3>
                  <div className='space-y-2'>
                    <label className='text-sm text-gray-400'>Viewer URL</label>
                    <p className='text-white font-mono text-sm bg-gray-700 px-3 py-2 rounded break-all'>
                      {typeof window !== 'undefined'
                        ? `${window.location.origin}/streams/${stream._id}`
                        : ''}
                    </p>
                    <Button
                      variant='secondary'
                      size='sm'
                      onClick={() => {
                        if (typeof window !== 'undefined') {
                          navigator.clipboard.writeText(
                            `${window.location.origin}/streams/${stream._id}`
                          );
                          showSuccess(
                            'Copied!',
                            'Stream URL copied to clipboard'
                          );
                        }
                      }}
                      className='w-full'
                    >
                      Copy URL
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
