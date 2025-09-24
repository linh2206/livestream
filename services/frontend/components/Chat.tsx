'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();
  const { user } = useAuth();

  // Auto-join chat when user is authenticated
  useEffect(() => {
    if (user && socket && !isJoined) {
      setIsJoined(true);
      socket.emit('join', {
        room: 'main',
        username: user.username,
      });
    }
  }, [user, socket, isJoined]);

  // Auto-leave chat when user logs out
  useEffect(() => {
    if (!user && socket && isJoined) {
      socket.emit('leave', { room: 'main' });
      setIsJoined(false);
      setMessages([]);
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
        console.log('Received message:', data);
        setMessages(prev => [...prev, data]);
      });

      // Load recent messages when joining
      const loadRecentMessages = async () => {
        try {
          const apiUrl = process.env.NEXT_PUBLIC_API_URL;
          if (apiUrl) {
            const response = await fetch(`${apiUrl}/chat/messages?room=main&limit=50`);
            if (response.ok) {
              const recentMessages = await response.json();
              setMessages(recentMessages.reverse()); // Reverse to show oldest first
            }
          }
        } catch (error) {
          console.error('Error loading recent messages:', error);
        }
      };

      // Load messages when socket connects and user is joined
      if (isJoined) {
        loadRecentMessages();
      }

      return () => {
        socket.off('chat_message');
      };
    }
  }, [socket, isJoined]);


  const sendMessage = () => {
    if (newMessage.trim() && socket && isJoined && user) {
      socket.emit('chat_message', {
        room: 'main',
        streamId: 'main',
        userId: user.id,
        username: user.username,
        message: newMessage.trim(),
      });
      setNewMessage('');
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
            <div key={msg.id} className="bg-glass-black rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-primary-400 font-medium text-sm">
                  {msg.username}
                </span>
                <span className="text-gray-400 text-xs">
                  {new Date(msg.timestamp).toLocaleTimeString()}
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
