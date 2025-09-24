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
    if (user && socket && !isJoined) {
      console.log('💬 Joining chat as:', user.username);
      setIsJoined(true);
      socket.emit('join', {
        room: streamKey,
        username: user.username,
      });
    }
  }, [user, socket, isJoined]);

  // Auto-leave chat when user logs out
  useEffect(() => {
    if (!user && socket && isJoined) {
      socket.emit('leave', { room: streamKey });
      setIsJoined(false);
    }
  }, [user, socket, isJoined]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on('chat_message', (data: Message) => {
        console.log('💬 Received real-time message:', data);
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
      console.log('📤 Sending message:', newMessage.trim());
      socket.emit('chat_message', {
        room: streamKey,
        streamId: streamKey,
        userId: user.id,
        username: user.username,
        content: newMessage.trim(),
      });
      setNewMessage('');
      // Real-time update will be handled by socket listener
    } else {
      console.log('❌ Cannot send message:', { 
        hasMessage: !!newMessage.trim(), 
        hasSocket: !!socket, 
        isJoined, 
        hasUser: !!user 
      });
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
    <div className="bg-glass-white backdrop-blur-md rounded-2xl p-6 h-96 flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="w-6 h-6 text-white" />
          <h2 className="text-xl font-bold text-white">Live Chat</h2>
        </div>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-300">
            as {user?.username}
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-2 mb-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No messages yet. Be the first to chat!</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg._id} className="bg-glass-black rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-primary-400 font-medium text-sm">
                  {msg.username}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(msg.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <p className="text-white text-sm">{msg.message}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Message Input */}
      <div className="flex space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-4 py-2 bg-glass-black rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Type a message..."
        />
        <button
          onClick={sendMessage}
          disabled={!newMessage.trim()}
          className="bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2 rounded-lg transition-colors"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
