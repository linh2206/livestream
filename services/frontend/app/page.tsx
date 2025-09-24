'use client';

import { useState, useEffect } from 'react';
import { Play, Users, Heart, MessageCircle } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import Chat from '@/components/Chat';
import UsersTable from '@/components/UsersTable';
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
  const { socket, isConnected } = useSocket();
  
  // Get stream key from environment variables
  const streamKey = process.env.NEXT_PUBLIC_STREAM_NAME || 'stream';
  const isLive = activeStreams && activeStreams.length > 0;
  
  console.log('🔍 Stream status:', { 
    streamKey, 
    activeStreams, 
    isLive, 
    activeStreamsLength: activeStreams?.length || 0 
  });
  
  // Ensure isLive is always a boolean - default to false if no active streams
  const streamIsLive = Boolean(activeStreams && activeStreams.length > 0);

  useEffect(() => {
    if (socket) {
      console.log('🔌 Setting up socket listeners in page.tsx');
      
      socket.on('online_count', (data: { count: number }) => {
        console.log('👥 Online count update:', data.count);
        setViewerCount(data.count);
      });

      socket.on('like', (data: { count: number }) => {
        console.log('👍 Like count update:', data.count);
        setLikeCount(data.count);
      });

      socket.on('like_update', (data: { count: number, liked: boolean }) => {
        console.log('👍 Like update:', data);
        setLikeCount(data.count);
        setIsLiked(data.liked);
      });

      return () => {
        console.log('🔌 Cleaning up socket listeners in page.tsx');
        socket.off('online_count');
        socket.off('like');
        socket.off('like_update');
      };
    } else {
      console.log('❌ No socket available in page.tsx');
    }
  }, [socket]);

  // Stream status is now handled by useActiveStreams hook

  const handleLike = () => {
    if (socket && user) {
      console.log('👍 Sending like:', { liked: !isLiked, userId: user.id, streamKey });
      socket.emit('like', {
        streamId: streamKey,
        room: streamKey,
        liked: !isLiked,
        userId: user.id,
      });
      setIsLiked(!isLiked);
    } else {
      console.log('❌ Cannot send like:', { hasSocket: !!socket, hasUser: !!user });
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
                {user?.avatar && (
                  <img 
                    src={user.avatar} 
                    alt={user.username}
                    className="w-6 h-6 rounded-full"
                  />
                )}
                <div className="text-sm">
                  <div className="text-white font-medium">
                    {user?.fullName || user?.username}
                  </div>
                  <div className="text-gray-300 text-xs flex items-center space-x-1">
                    <span className={`inline-block w-2 h-2 rounded-full ${isAdmin ? 'bg-red-500' : 'bg-green-500'}`}></span>
                    <span>{isAdmin ? 'Admin' : 'User'}</span>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
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

        {/* Users Table - Admin Only */}
        {isAdmin && (
          <div className="mt-6">
            <UsersTable />
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
