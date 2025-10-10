'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useSocketContext } from '@/lib/contexts/SocketContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
  avatar?: string;
  role?: 'user' | 'moderator' | 'streamer';
}

interface ChatProps {
  streamId: string;
  className?: string;
}

export const Chat: React.FC<ChatProps> = ({ streamId, className = '' }) => {
  const { user } = useAuth();
  const {
    socket,
    isConnected,
    sendMessage: sendMessageViaSocket,
  } = useSocketContext();

  // ALL HOOKS MUST BE AT THE TOP - NEVER AFTER CONDITIONAL RETURNS!
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Handle typing indicators
  const handleTyping = useCallback(() => {
    if (!isTyping && newMessage.trim()) {
      setIsTyping(true);
      socket?.emit('typing:start', { streamId });
    }
  }, [isTyping, newMessage, socket, streamId]);

  const handleStopTyping = useCallback(() => {
    if (isTyping) {
      setIsTyping(false);
      socket?.emit('typing:stop', { streamId });
    }
  }, [isTyping, socket, streamId]);

  // Load chat history when component mounts
  useEffect(() => {
    const loadChatHistory = async () => {
      if (!streamId) return;

      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/chat/messages/stream/${streamId}/recent?limit=50`
        );
        if (response.ok) {
          const history = await response.json();
          // Transform backend format to frontend format and sort by timestamp (oldest first)
          const formattedMessages = history
            .map((msg: unknown) => {
              const m = msg as {
                _id: string;
                content: string;
                userId:
                  | string
                  | { _id: string; username: string; avatar?: string };
                username: string;
                timestamp: string;
                createdAt: string;
                avatar?: string;
                isModerator?: boolean;
              };
              return {
                id: m._id,
                userId: typeof m.userId === 'object' ? m.userId._id : m.userId,
                username:
                  typeof m.userId === 'object' ? m.userId.username : m.username,
                content: m.content,
                timestamp: new Date(m.createdAt),
                avatar:
                  typeof m.userId === 'object' ? m.userId.avatar : m.avatar,
                role: m.isModerator ? 'moderator' : 'user',
              };
            })
            .sort(
              (a: ChatMessage, b: ChatMessage) =>
                a.timestamp.getTime() - b.timestamp.getTime()
            ); // Sort oldest first
          setMessages(formattedMessages);
          scrollToBottom();
        }
      } catch (error) {
        // console.error('Failed to load chat history:', error);
      }
    };

    loadChatHistory();
  }, [streamId, scrollToBottom]);

  useEffect(() => {
    if (socket && isConnected && user) {
      // Join stream chat room
      socket.emit('join_stream_chat', {
        streamId,
        userId: user._id,
        username: user.username,
      });

      // Connection events
      socket.on('connect', () => {
        // Handle connect
      });

      socket.on('disconnect', () => {
        // Handle disconnect
      });

      // Message events
      socket.on('chat:new_message', (message: ChatMessage) => {
        setMessages(prev => {
          const newMessages = [
            ...prev,
            {
              ...message,
              timestamp: new Date(message.timestamp),
            },
          ];
          // Sort by timestamp to ensure proper order
          return newMessages.sort(
            (a: ChatMessage, b: ChatMessage) =>
              a.timestamp.getTime() - b.timestamp.getTime()
          );
        });
        scrollToBottom();
      });

      // Typing events
      socket.on('chat:typing', (data: { userId: string; username: string }) => {
        setTypingUsers(prev => [
          ...prev.filter(u => u !== data.username),
          data.username,
        ]);
      });

      socket.on(
        'chat:stop_typing',
        (data: { userId: string; username: string }) => {
          setTypingUsers(prev => prev.filter(u => u !== data.username));
        }
      );

      // System messages
      socket.on('chat:user_join', (data: { username: string }) => {
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          userId: 'system',
          username: 'System',
          content: `${data.username} joined the chat`,
          timestamp: new Date(),
          role: 'moderator',
        };
        setMessages(prev => {
          const newMessages = [...prev, systemMessage];
          return newMessages.sort(
            (a: ChatMessage, b: ChatMessage) =>
              a.timestamp.getTime() - b.timestamp.getTime()
          );
        });
        scrollToBottom();
      });

      socket.on('chat:user_leave', (data: { username: string }) => {
        const systemMessage: ChatMessage = {
          id: `system-${Date.now()}`,
          userId: 'system',
          username: 'System',
          content: `${data.username} left the chat`,
          timestamp: new Date(),
          role: 'moderator',
        };
        setMessages(prev => {
          const newMessages = [...prev, systemMessage];
          return newMessages.sort(
            (a: ChatMessage, b: ChatMessage) =>
              a.timestamp.getTime() - b.timestamp.getTime()
          );
        });
        scrollToBottom();
      });

      // Recent messages (fallback)
      socket.on('chat:recent_messages', (messages: ChatMessage[]) => {
        const formattedMessages = messages.map(msg => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        const sortedMessages = formattedMessages.sort(
          (a: ChatMessage, b: ChatMessage) =>
            a.timestamp.getTime() - b.timestamp.getTime()
        );
        setMessages(sortedMessages);
        scrollToBottom();
      });

      return () => {
        // Leave stream chat room
        socket.emit('leave_stream_chat', { streamId, userId: user._id });

        socket.off('connect');
        socket.off('disconnect');
        socket.off('chat:new_message');
        socket.off('chat:typing');
        socket.off('chat:stop_typing');
        socket.off('chat:user_join');
        socket.off('chat:user_leave');
        socket.off('chat:recent_messages');
      };
    }
  }, [socket, isConnected, user, streamId, scrollToBottom]);

  // Auto-scroll when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Handle typing timeout
  useEffect(() => {
    const timeout = setTimeout(() => {
      handleStopTyping();
    }, 1000);

    return () => clearTimeout(timeout);
  }, [newMessage, handleStopTyping]);

  // NOW conditional returns are safe
  if (!user) {
    return (
      <div
        className={`h-[600px] flex flex-col bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl ${className}`}
      >
        <div className='flex-1 flex items-center justify-center'>
          <div className='text-center text-gray-400'>
            <div className='w-8 h-8 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-4'></div>
            <p>Please login to use chat</p>
          </div>
        </div>
      </div>
    );
  }

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !isConnected) return;

    // Send message via SocketContext - backend will broadcast to all including sender
    sendMessageViaSocket(streamId, newMessage.trim());

    setNewMessage('');
    handleStopTyping();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'streamer':
        return 'text-purple-400';
      case 'moderator':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'streamer':
        return '👑';
      case 'moderator':
        return '🛡️';
      default:
        return '';
    }
  };

  const getAvatarColor = (username: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-indigo-500',
      'bg-yellow-500',
    ];
    const index = username.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div
      className={`h-full flex flex-col bg-gray-900/95 backdrop-blur-sm rounded-xl border border-gray-700/50 shadow-2xl ${className}`}
    >
      {/* Header */}
      <div className='flex items-center justify-between p-4 border-b border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-700/80 rounded-t-xl'>
        <div className='flex items-center space-x-3'>
          <div className='relative'>
            <div className='w-3 h-3 bg-blue-500 rounded-full animate-pulse'></div>
            <div className='absolute inset-0 w-3 h-3 bg-blue-400 rounded-full animate-ping opacity-75'></div>
          </div>
          <h3 className='text-lg font-bold text-white tracking-wide'>
            Live Chat
          </h3>
          <div className='flex items-center space-x-2'>
            <span className='text-xs text-gray-300 bg-gray-600/50 px-2 py-1 rounded-full font-medium'>
              {messages.length} messages
            </span>
          </div>
        </div>
        <div className='flex items-center space-x-2'>
          <div
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              isConnected
                ? 'bg-green-400 shadow-green-400/50 shadow-lg'
                : 'bg-red-400 shadow-red-400/50 shadow-lg'
            }`}
          />
          <span
            className={`text-sm font-medium transition-colors duration-300 ${
              isConnected ? 'text-green-300' : 'text-red-300'
            }`}
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Messages Area */}
      <div className='flex-1 overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-900/40 via-gray-800/20 to-gray-900/40'>
        {messages.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full text-gray-400'>
            <div className='relative mb-6'>
              <div className='w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-gray-600/30'>
                <svg
                  className='w-8 h-8 text-blue-400'
                  fill='currentColor'
                  viewBox='0 0 20 20'
                >
                  <path
                    fillRule='evenodd'
                    d='M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z'
                    clipRule='evenodd'
                  />
                </svg>
              </div>
              <div className='absolute -top-1 -right-1 w-4 h-4 bg-blue-500 rounded-full animate-pulse'></div>
            </div>
            <h4 className='text-lg font-semibold text-gray-200 mb-2'>
              Welcome to Live Chat!
            </h4>
            <p className='text-sm text-gray-400 text-center max-w-xs leading-relaxed'>
              Be the first to start the conversation and connect with other
              viewers
            </p>
          </div>
        ) : (
          messages.map(message => {
            const isOwnMessage = message.userId === user?._id;
            const isSystemMessage = message.userId === 'system';

            if (isSystemMessage) {
              return (
                <div key={message.id} className='flex justify-center my-2'>
                  <div className='bg-gray-700/60 border border-gray-600/40 px-4 py-2 rounded-full backdrop-blur-sm'>
                    <span className='text-xs text-gray-300 font-medium'>
                      {message.content}
                    </span>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={message.id}
                className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} group animate-in slide-in-from-bottom-2 duration-300`}
              >
                <div
                  className={`flex max-w-[75%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-end space-x-3`}
                >
                  {/* Avatar */}
                  {!isOwnMessage && (
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg ${getAvatarColor(message.username)}`}
                    >
                      {message.username.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Message Content */}
                  <div
                    className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    {/* Username and timestamp for all messages */}
                    <div className='flex items-center space-x-2'>
                      <span
                        className={`text-xs font-semibold ${getRoleColor(message.role)}`}
                      >
                        {getRoleBadge(message.role)} {message.username}
                      </span>
                      <span className='text-xs text-gray-500'>
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    <div
                      className={`px-4 py-3 rounded-2xl shadow-lg transition-all duration-200 group-hover:shadow-xl ${
                        isOwnMessage
                          ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-br-lg'
                          : 'bg-gray-700/90 text-gray-100 rounded-bl-lg backdrop-blur-sm border border-gray-600/30'
                      }`}
                    >
                      <p className='text-sm leading-relaxed break-words'>
                        {message.content}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className='flex items-center space-x-3 text-gray-400 animate-in slide-in-from-bottom-2 duration-300'>
            <div className='flex space-x-1'>
              <div className='w-2 h-2 bg-blue-400 rounded-full animate-bounce'></div>
              <div
                className='w-2 h-2 bg-blue-400 rounded-full animate-bounce'
                style={{ animationDelay: '0.1s' }}
              ></div>
              <div
                className='w-2 h-2 bg-blue-400 rounded-full animate-bounce'
                style={{ animationDelay: '0.2s' }}
              ></div>
            </div>
            <span className='text-sm font-medium'>
              {typingUsers.length === 1
                ? `${typingUsers[0]} is typing...`
                : `${typingUsers.slice(0, 2).join(', ')}${typingUsers.length > 2 ? ` and ${typingUsers.length - 2} others` : ''} are typing...`}
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      {user ? (
        <div className='p-4 border-t border-gray-700/50 bg-gradient-to-r from-gray-800/80 to-gray-700/80 rounded-b-xl'>
          <form onSubmit={handleSendMessage} className='flex space-x-3'>
            <div className='flex-1 relative'>
              <input
                ref={inputRef}
                type='text'
                value={newMessage}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder={
                  isConnected ? 'Type your message...' : 'Connecting...'
                }
                className='w-full px-4 py-3 bg-gray-700/80 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 text-sm backdrop-blur-sm'
                disabled={!isConnected}
                maxLength={500}
              />
              {newMessage.length > 0 && (
                <div className='absolute right-3 top-1/2 transform -translate-y-1/2'>
                  <span className='text-xs text-gray-500'>
                    {newMessage.length}/500
                  </span>
                </div>
              )}
            </div>
            <button
              type='submit'
              disabled={
                !newMessage.trim() || !isConnected || newMessage.length > 500
              }
              className='px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl disabled:shadow-none'
            >
              <svg
                className='w-5 h-5'
                fill='none'
                stroke='currentColor'
                viewBox='0 0 24 24'
              >
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 19l9 2-9-18-9 18 9-2zm0 0v-8'
                />
              </svg>
            </button>
          </form>
        </div>
      ) : (
        <div className='p-4 border-t border-gray-700/50 text-center bg-gradient-to-r from-gray-800/80 to-gray-700/80 rounded-b-xl'>
          <div className='flex items-center justify-center space-x-2 text-gray-400'>
            <svg className='w-4 h-4' fill='currentColor' viewBox='0 0 20 20'>
              <path
                fillRule='evenodd'
                d='M18 8a6 6 0 01-7.743 5.743L10 14l-1 1-1 1H6v2H2v-4l4.257-4.257A6 6 0 1118 8zm-6-4a1 1 0 100 2 2 2 0 012 2 1 1 0 102 0 4 4 0 00-4-4z'
                clipRule='evenodd'
              />
            </svg>
            <p className='text-sm font-medium'>
              Please log in to participate in the chat
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
