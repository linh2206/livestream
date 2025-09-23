'use client';

import { useState, useEffect } from 'react';
import { Play, Users, Heart, MessageCircle } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import Chat from '@/components/Chat';
import UsersTable from '@/components/UsersTable';
import BandwidthMonitor from '@/components/BandwidthMonitor';
import { useSocket } from '@/hooks/useSocket';

export default function Home() {
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('online_count', (data: { count: number }) => {
        setViewerCount(data.count);
      });

      socket.on('like', (data: { count: number }) => {
        setLikeCount(data.count);
      });

      socket.on('like_update', (data: { count: number, liked: boolean }) => {
        setLikeCount(data.count);
        setIsLiked(data.liked);
      });

      return () => {
        socket.off('online_count');
        socket.off('like');
        socket.off('like_update');
      };
    }
  }, [socket]);

  // Check stream status periodically
  useEffect(() => {
    const checkStreamStatus = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!apiUrl) {
          console.error('NEXT_PUBLIC_API_URL environment variable is not set');
          return;
        }
        
        // Check stream status from API
        const response = await fetch(`${apiUrl}/streams/active`);
        if (response.ok) {
          const activeStreams = await response.json();
          setIsLive(activeStreams && activeStreams.length > 0);
        } else {
          setIsLive(false);
        }
      } catch (error) {
        console.error('Error checking stream status:', error);
        setIsLive(false);
      }
    };

    // Check immediately
    checkStreamStatus();

    // Check every 5 seconds
    const interval = setInterval(checkStreamStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleLike = () => {
    if (socket) {
      socket.emit('like', {
        streamId: 'main',
        room: 'main',
        liked: !isLiked,
      });
      setIsLiked(!isLiked);
    }
  };

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
                Real-time streaming with interactive chat
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
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-3">
            <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
              <VideoPlayer streamName="stream" />
              
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
                  <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-red-500 animate-pulse' : 'bg-gray-500'}`}></div>
                  <span className="text-white text-sm">
                    {isLive ? 'LIVE' : 'OFFLINE'}
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

        {/* Users Table */}
        <div className="mt-6">
          <UsersTable />
        </div>

        {/* Bandwidth Monitor */}
        <div className="mt-6">
          <BandwidthMonitor />
        </div>
      </div>
    </div>
  );
}
