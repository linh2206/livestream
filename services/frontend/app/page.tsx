'use client';

import { useState, useEffect } from 'react';
import { Play, Users, Heart, MessageCircle } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import Chat from '@/components/Chat';
import UsersTable from '@/components/UsersTable';
import OnlineUsersTable from '@/components/OnlineUsersTable';
import BandwidthMonitor from '@/components/BandwidthMonitor';
import LoginForm from '@/components/LoginForm';
import { useActiveStreams } from '../hooks/useStreams';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';

export default function Home() {
  const { user, isAuthenticated, isAdmin, loading, logout } = useAuth();
  const { data: activeStreams } = useActiveStreams();
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [streamStatus, setStreamStatus] = useState<{ isLive: boolean; viewerCount: number }>({ isLive: false, viewerCount: 0 });
  const { socket, isConnected } = useSocket();
  
  // Get stream key from environment variables
  const streamKey = process.env.NEXT_PUBLIC_STREAM_NAME || 'stream';
  
  // Check stream status from both API and socket
  const isLiveFromAPI = activeStreams && activeStreams.length > 0;
  const isLiveFromSocket = streamStatus.isLive;
  const streamIsLive = isLiveFromAPI || isLiveFromSocket;
  

  useEffect(() => {
    if (socket) {
      socket.on('online_count', (data: { count: number }) => {
        setViewerCount(data.count);
      });

      socket.on('like_update', (data: { count: number, liked: boolean }) => {
        setLikeCount(data.count);
        setIsLiked(data.liked);
      });

      socket.on('viewer_count_response', (data: { viewerCount: number, isLive: boolean }) => {
        setViewerCount(data.viewerCount);
      });

      socket.on('like_count_response', (data: { likeCount: number, isLive: boolean }) => {
        setLikeCount(data.likeCount);
      });

      socket.on('stream_status_response', (data: { isLive: boolean, viewerCount: number }) => {
        setStreamStatus({ isLive: data.isLive, viewerCount: data.viewerCount });
        setViewerCount(data.viewerCount);
      });

      // Request initial data
      socket.emit('get_viewer_count', { streamKey });
      socket.emit('get_like_count', { streamKey });
      socket.emit('get_stream_status', { streamKey });

      return () => {
        socket.off('online_count');
        socket.off('like_update');
        socket.off('viewer_count_response');
        socket.off('like_count_response');
        socket.off('stream_status_response');
      };
    }
  }, [socket, streamKey]);

  // Auto-join room when user is authenticated and socket is connected
  useEffect(() => {
    if (socket && user && isConnected) {
      socket.emit('join', {
        room: streamKey,
        username: user.username,
      });
    }
    
    // Cleanup: leave room when component unmounts or user logs out
    return () => {
      if (socket && user) {
        socket.emit('leave', { room: streamKey });
      }
    };
  }, [socket, user, isConnected, streamKey]);

  // Stream status is now handled by useActiveStreams hook

  const handleLike = () => {
    if (socket && user) {
      socket.emit('like', {
        streamId: streamKey,
        room: streamKey,
        liked: !isLiked,
        userId: user.id,
      });
      setIsLiked(!isLiked);
    }
  };


  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-white mb-4">
            🎬 LiveStream App
          </h1>
          <p className="text-gray-300 text-xl mb-8">
            Please login to access the live stream and chat
          </p>
          <button
            onClick={() => setShowLoginForm(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold text-lg transition-colors"
          >
            Login / Register
          </button>
        </div>
        {showLoginForm && (
          <LoginForm onClose={() => setShowLoginForm(false)} />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2">
                🎬 LiveStream App
              </h1>
              <p className="text-gray-300">
                Welcome back, {user?.username}! Real-time streaming with interactive chat
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 bg-glass-white backdrop-blur-md rounded-lg px-4 py-2">
                <Users className="w-5 h-5 text-white" />
                <span className="text-white font-medium">{viewerCount}</span>
              </div>
              <div className="flex items-center space-x-2 bg-glass-white backdrop-blur-md rounded-lg px-4 py-2">
                <Heart className="w-5 h-5 text-white" />
                <span className="text-white font-medium">{likeCount}</span>
              </div>
              
              {/* User Info */}
              <div className="flex items-center space-x-2 bg-glass-white backdrop-blur-md rounded-lg px-4 py-2">
                <div className="text-sm">
                  <div className="text-white font-medium">
                    {user?.username}
                  </div>
                </div>
              </div>
              
              <button
                onClick={logout}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6 h-[600px]">
              <VideoPlayer isAuthenticated={isAuthenticated} />
              
              {/* Stream Controls */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleLike}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all ${
                      isLiked
                        ? 'bg-red-500 text-white'
                        : 'bg-glass-white text-white hover:bg-glass-black'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                    <span>Like</span>
                  </button>
                  
                  <button
                    onClick={() => setShowChat(!showChat)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-glass-white text-white hover:bg-glass-black transition-all"
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{showChat ? 'Hide Chat' : 'Show Chat'}</span>
                  </button>
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${streamIsLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className={`text-sm font-medium ${streamIsLive ? 'text-red-400' : 'text-gray-400'}`}>
                    {streamIsLive ? 'LIVE' : 'OFFLINE'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Chat */}
          {showChat && (
            <div className="lg:col-span-1">
              <Chat />
            </div>
          )}
        </div>

        {/* Online Users */}
        <div className="mt-6 bg-glass-white backdrop-blur-md rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Online Users</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-glass-black rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Active Viewers</h3>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-white text-lg font-bold">{viewerCount}</span>
                <span className="text-gray-400 text-sm">viewers online</span>
              </div>
            </div>
            <div className="bg-glass-black rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Chat Status</h3>
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                <span className="text-white text-lg font-bold">
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
                <span className="text-gray-400 text-sm">WebSocket</span>
              </div>
            </div>
          </div>
        </div>

        {/* Users Tables - Admin Only */}
        {isAdmin && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UsersTable />
            <OnlineUsersTable />
          </div>
        )}

        {/* Bandwidth Monitor */}
        <div className="mt-6">
          <BandwidthMonitor />
        </div>
      </div>
    </div>
  );
}
