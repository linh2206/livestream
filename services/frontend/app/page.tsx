'use client';

import { useState, useEffect } from 'react';
import { Play, Users, Heart, MessageCircle } from 'lucide-react';
import VideoPlayer from '@/components/VideoPlayer';
import Chat from '@/components/Chat';
import { useSocket } from '@/hooks/useSocket';

export default function Home() {
  const [isLive, setIsLive] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const { socket } = useSocket();

  useEffect(() => {
    if (socket) {
      socket.on('online_count', (data: { count: number }) => {
        setViewerCount(data.count);
      });

      socket.on('like', (data: { count: number }) => {
        setLikeCount(data.count);
      });

      return () => {
        socket.off('online_count');
        socket.off('like');
      };
    }
  }, [socket]);

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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Video Player */}
          <div className="lg:col-span-2">
            <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6">
              <VideoPlayer />
              
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
                  
                  <div className="flex items-center space-x-2 text-white">
                    <MessageCircle className="w-5 h-5" />
                    <span>Chat</span>
                  </div>
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
          <div className="lg:col-span-1">
            <Chat />
          </div>
        </div>

        {/* Stream Info */}
        <div className="mt-6 bg-glass-white backdrop-blur-md rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Stream Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-glass-black rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">RTMP Input</h3>
              <p className="text-gray-300 text-sm">rtmp://localhost:1935/live</p>
              <p className="text-gray-400 text-xs mt-1">Stream Key: stream</p>
            </div>
            <div className="bg-glass-black rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">HLS Output</h3>
              <p className="text-gray-300 text-sm">http://localhost:8080/hls/stream.m3u8</p>
              <p className="text-gray-400 text-xs mt-1">For web players</p>
            </div>
            <div className="bg-glass-black rounded-lg p-4">
              <h3 className="text-white font-semibold mb-2">Web Interface</h3>
              <p className="text-gray-300 text-sm">http://localhost:8080</p>
              <p className="text-gray-400 text-xs mt-1">This page</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
