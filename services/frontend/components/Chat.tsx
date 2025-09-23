'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import { useSocket } from '@/hooks/useSocket';

interface Message {
  id: string;
  username: string;
  message: string;
  timestamp: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [username, setUsername] = useState('');
  const [isJoined, setIsJoined] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket } = useSocket();

  // Load saved username and join status from localStorage
  useEffect(() => {
    const savedUsername = localStorage.getItem('chat_username');
    const savedIsJoined = localStorage.getItem('chat_isJoined') === 'true';
    
    if (savedUsername) {
      setUsername(savedUsername);
    }
    if (savedIsJoined && savedUsername && socket) {
      setIsJoined(true);
      // Auto-rejoin if we have saved state
      socket.emit('join', {
        room: 'main',
        username: savedUsername,
      });
    }
  }, [socket]);

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

  const joinChat = () => {
    if (username.trim() && socket) {
      socket.emit('join', {
        room: 'main',
        username: username.trim(),
      });
      setIsJoined(true);
      
      // Save to localStorage
      localStorage.setItem('chat_username', username.trim());
      localStorage.setItem('chat_isJoined', 'true');
    }
  };

  const sendMessage = () => {
    if (newMessage.trim() && socket && isJoined) {
      socket.emit('chat_message', {
        room: 'main',
        streamId: 'main',
        userId: '1', // In real app, get from auth
        username: username,
        message: newMessage.trim(),
      });
      setNewMessage('');
    }
  };

  const leaveChat = () => {
    if (socket && isJoined) {
      socket.emit('leave', { room: 'main' });
    }
    
    // Clear localStorage
    localStorage.removeItem('chat_username');
    localStorage.removeItem('chat_isJoined');
    
    // Reset state
    setIsJoined(false);
    setUsername('');
    setMessages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Remove duplicate function

  if (!isJoined) {
    return (
      <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-3xl p-8 h-[500px] border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Join Live Chat</h2>
          <p className="text-gray-300 text-sm">Connect with other viewers in real-time</p>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="block text-white text-sm font-semibold">
              Choose your username
            </label>
            <div className="relative">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && joinChat()}
                className="w-full px-6 py-4 bg-black/30 backdrop-blur-sm rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent border border-white/10 transition-all duration-300"
                placeholder="Enter your username"
              />
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-500/20 to-purple-600/20 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"></div>
            </div>
          </div>
          
          <button
            onClick={joinChat}
            disabled={!username.trim()}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:transform-none"
          >
            <span className="flex items-center justify-center space-x-2">
              <MessageCircle className="w-5 h-5" />
              <span>Join Chat</span>
            </span>
          </button>
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
            as {username}
          </div>
          <button
            onClick={leaveChat}
            className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded border border-red-400/30 hover:border-red-300/50"
          >
            Leave
          </button>
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
