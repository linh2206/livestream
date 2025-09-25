'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';
import { useChatMessages } from '../hooks/useChatMessages';

interface Message {
  _id: string;
  username: string;
  message: string;
  createdAt: string;
}

export default function Chat() {
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { user } = useAuth();
  
  // Get stream key from environment variables
  const streamKey = process.env.NEXT_PUBLIC_STREAM_NAME || 'stream';
  const { messages, mutate } = useChatMessages(streamKey, 50);
  

  // Auto-join chat when user is authenticated
  useEffect(() => {
    if (user && socket) {
      setIsJoined(true);
    } else {
      setIsJoined(false);
    }
  }, [user, socket]);

  const scrollToBottom = () => {
    // Only scroll if user is near bottom to avoid interrupting typing
    const container = messagesEndRef.current?.parentElement;
    if (container) {
      const isNearBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 100;
      if (isNearBottom) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on('chat_message', (data: Message) => {
        // Refresh messages from SWR when new message arrives
        mutate();
      });

      return () => {
        socket.off('chat_message');
      };
    }
  }, [socket, mutate]);


  const sendMessage = () => {
    if (newMessage.trim() && socket && isJoined && user) {
      socket.emit('chat_message', {
        room: streamKey,
        streamId: user.id, // Use user.id as streamId for the message
        userId: user.id,
        username: user.username,
        content: newMessage.trim(),
      });
      setNewMessage('');
      // Real-time update will be handled by socket listener
    }
  };


  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Remove duplicate function

  // Show loading if not joined yet
  if (!isJoined) {
    return (
      <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6 h-96 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Connecting to chat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900/90 to-gray-800/90 backdrop-blur-xl rounded-3xl p-6 h-[600px] w-full max-w-md flex flex-col border border-gray-700/50 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse absolute -top-1 -right-1"></div>
            <MessageCircle className="w-6 h-6 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Live Chat
          </h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-sm text-gray-300 font-medium">
            {user?.username}
          </span>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-12">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-lg font-medium mb-2">No messages yet</p>
            <p className="text-sm">Be the first to start the conversation!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className="group">
              <div className="bg-gradient-to-r from-gray-800/80 to-gray-700/80 backdrop-blur-sm rounded-2xl p-4 border border-gray-600/30 hover:border-blue-500/30 transition-all duration-200">
                <div className="flex items-center space-x-3 mb-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">
                      {msg.username.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1">
                    <span className="text-blue-400 font-semibold text-sm">
                      {msg.username}
                    </span>
                    <span className="text-gray-400 text-xs ml-2">
                      {new Date(msg.createdAt).toLocaleTimeString('vi-VN', { 
                        hour12: false, 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                  </div>
                </div>
                <p className="text-white text-sm leading-relaxed pl-11">{msg.message}</p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="flex space-x-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="w-full px-4 py-3 bg-gray-800/80 backdrop-blur-sm rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 border border-gray-600/50 transition-all duration-200"
            placeholder="Type your message..."
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
          </div>
        </div>
        <button
          type="button"
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white p-3 rounded-2xl transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100 shadow-lg"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
