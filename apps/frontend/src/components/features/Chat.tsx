'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useSocketContext } from '@/lib/contexts/SocketContext';
import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  message: string;
  timestamp: string;
  type?: 'user' | 'system';
}

interface ChatProps {
  streamId: string;
  className?: string;
}

export const Chat: React.FC<ChatProps> = ({ streamId, className = '' }) => {
  const { user } = useAuth();
  const { isConnected, on, off, emit } = useSocketContext();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (isLoadingMore || !hasMoreMessages || !streamId) return;

    // Show loading indicator immediately
    setIsLoadingMore(true);

    try {
      const oldestMessage = messages[0];
      const beforeId = oldestMessage?.id || '';

      const response = await fetch(
        `http://localhost:9000/api/v1/chat/messages/stream/${streamId}?limit=20&before=${beforeId}`
      );

      if (response.ok) {
        const data = await response.json();
        if (data.length === 0) {
          setHasMoreMessages(false);
        } else {
          const newMessages: ChatMessage[] = data.map(
            (msg: Record<string, unknown>) => ({
              id: msg._id as string,
              userId:
                ((msg.userId as Record<string, unknown>)?._id as string) ||
                (msg.userId as string),
              username:
                ((msg.userId as Record<string, unknown>)?.username as string) ||
                (msg.username as string),
              message: msg.content as string,
              timestamp: msg.createdAt as string,
              type: 'user',
            })
          );

          // Filter out duplicates and add to beginning
          setMessages(prev => {
            const existingIds = new Set(prev.map(msg => msg.id));
            const uniqueNewMessages = newMessages.filter(
              msg => !existingIds.has(msg.id)
            );

            if (uniqueNewMessages.length > 0) {
              // Store current scroll position
              const container = messagesContainerRef.current;
              const scrollHeight = container?.scrollHeight || 0;
              const scrollTop = container?.scrollTop || 0;

              // Add new messages
              const newMessagesList = [...uniqueNewMessages.reverse(), ...prev];

              // Restore scroll position after state update
              setTimeout(() => {
                if (container) {
                  const newScrollHeight = container.scrollHeight;
                  const heightDiff = newScrollHeight - scrollHeight;
                  container.scrollTop = scrollTop + heightDiff;
                }
              }, 0);

              return newMessagesList;
            }

            return prev;
          });
        }
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Error loading more messages:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreMessages, messages, streamId]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !isConnected || !streamId || isLoading)
      return;

    setIsLoading(true);

    // Send message via WebSocket
    emit('send_message', {
      streamId,
      content: newMessage.trim(),
      userId: user._id,
      username: user.username,
    });

    setNewMessage('');
    setIsTyping(false);

    // Reset loading state after a short delay
    setTimeout(() => setIsLoading(false), 1000);
  };

  const handleTyping = useCallback(() => {
    if (!isTyping && newMessage.trim() && isConnected && streamId && user) {
      setIsTyping(true);
      emit('typing', {
        room: `chat:${streamId}`,
        userId: user._id,
        username: user.username,
      });
    }
  }, [isTyping, newMessage, isConnected, streamId, user, emit]);

  const handleStopTyping = useCallback(() => {
    if (isTyping && isConnected && streamId && user) {
      setIsTyping(false);
      emit('stop_typing', {
        room: `chat:${streamId}`,
        userId: user._id,
      });
    }
  }, [isTyping, isConnected, streamId, user, emit]);

  // Load existing messages and join chat room when component mounts
  useEffect(() => {
    const loadMessages = async () => {
      if (!streamId) return;

      try {
        const response = await fetch(
          `http://localhost:9000/api/v1/chat/messages/stream/${streamId}?limit=50`
        );
        if (response.ok) {
          const data = await response.json();
          const chatMessages: ChatMessage[] = data.map(
            (msg: Record<string, unknown>) => ({
              id: msg._id as string,
              userId:
                ((msg.userId as Record<string, unknown>)?._id as string) ||
                (msg.userId as string),
              username:
                ((msg.userId as Record<string, unknown>)?.username as string) ||
                (msg.username as string),
              message: msg.content as string,
              timestamp: msg.createdAt as string,
              type: 'user',
            })
          );
          setMessages(chatMessages.reverse()); // Reverse to show oldest first

          // After loading messages, scroll to bottom and allow auto-scroll for new messages
          setTimeout(() => {
            scrollToBottom();
            setUserHasScrolled(false);
          }, 50);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to load chat messages:', error);
      }
    };

    loadMessages();

    if (isConnected && streamId && user) {
      emit('join_stream_chat', {
        streamId,
        userId: user._id,
        username: user.username,
      });
    }

    return () => {
      if (isConnected && streamId && user) {
        emit('leave_stream_chat', {
          streamId,
          userId: user._id,
          username: user.username,
        });
      }
    };
  }, [isConnected, streamId, user, emit]);

  // WebSocket event listeners
  useEffect(() => {
    if (!isConnected) return;

    const handleNewMessage = (data: Record<string, unknown>) => {
      const message: ChatMessage = {
        id: data.id as string,
        userId: data.userId as string,
        username: data.username as string,
        message: data.content as string,
        timestamp: data.timestamp as string,
        type: 'user',
      };
      setMessages(prev => [...prev, message]);
    };

    const handleUserTyping = (data: Record<string, unknown>) => {
      setTypingUsers(prev => {
        const username = data.username as string;
        if (!prev.includes(username)) {
          return [...prev, username];
        }
        return prev;
      });
    };

    const handleUserStopTyping = (data: Record<string, unknown>) => {
      setTypingUsers(prev =>
        prev.filter(username => username !== data.username)
      );
    };

    const handleUserJoin = (data: Record<string, unknown>) => {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        userId: 'system',
        username: 'System',
        message: `${data.username} joined the chat`,
        timestamp: new Date().toISOString(),
        type: 'system',
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    const handleUserLeave = (data: Record<string, unknown>) => {
      const systemMessage: ChatMessage = {
        id: `system-${Date.now()}`,
        userId: 'system',
        username: 'System',
        message: `${data.username} left the chat`,
        timestamp: new Date().toISOString(),
        type: 'system',
      };
      setMessages(prev => [...prev, systemMessage]);
    };

    // Register event listeners
    on('chat:new_message', handleNewMessage);
    on('chat:user_typing', handleUserTyping);
    on('chat:user_stop_typing', handleUserStopTyping);
    on('chat:user_join', handleUserJoin);
    on('chat:user_leave', handleUserLeave);

    return () => {
      off('chat:new_message', handleNewMessage);
      off('chat:user_typing', handleUserTyping);
      off('chat:user_stop_typing', handleUserStopTyping);
      off('chat:user_join', handleUserJoin);
      off('chat:user_leave', handleUserLeave);
    };
  }, [isConnected, on, off]);

  // Track if user has scrolled up (to prevent auto-scroll)
  const [userHasScrolled, setUserHasScrolled] = useState(true); // Start as true to prevent initial auto-scroll

  // Auto-scroll when messages change (but not when loading more)
  useEffect(() => {
    if (!isLoadingMore && !userHasScrolled) {
      // Only scroll to bottom for new messages, not when loading more
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.type === 'user') {
        // Check if this is a new message (not from load more)
        const isNewMessage =
          lastMessage.timestamp &&
          new Date(lastMessage.timestamp).getTime() > Date.now() - 5000; // Within 5 seconds

        if (isNewMessage) {
          scrollToBottom();
        }
      }
    }
  }, [messages, scrollToBottom, isLoadingMore, userHasScrolled]);

  // Scroll event handler for lazy loading
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Check if user has scrolled up (not at bottom)
        const isAtBottom =
          container.scrollTop + container.clientHeight >=
          container.scrollHeight - 10;
        if (!isAtBottom) {
          setUserHasScrolled(true);
        } else {
          setUserHasScrolled(false);
        }

        // Load more messages if at top
        if (container.scrollTop <= 10 && hasMoreMessages && !isLoadingMore) {
          loadMoreMessages();
        }
      }, 100);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [loadMoreMessages, hasMoreMessages, isLoadingMore]);

  // Typing timeout
  useEffect(() => {
    if (isTyping) {
      const timeout = setTimeout(() => {
        handleStopTyping();
      }, 3000);
      return () => clearTimeout(timeout);
    }
  }, [isTyping, handleStopTyping]);

  return (
    <div
      className={`flex flex-col bg-gray-900 border border-gray-700 rounded-xl shadow-2xl ${className}`}
      style={{ height: '500px', maxHeight: '500px' }}
    >
      {/* Chat Header */}
      <div className='p-4 border-b border-gray-700 bg-gray-800 rounded-t-xl'>
        <div className='flex items-center justify-between'>
          <div>
            <h3 className='text-lg font-bold text-white flex items-center gap-2'>
              💬 Live Chat
            </h3>
            <div className='flex items-center gap-2 text-sm'>
              <div
                className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
              ></div>
              <span className='text-gray-400'>
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
              {messages.length > 0 && (
                <span className='text-gray-500'>
                  • {messages.length} messages
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className='overflow-y-auto p-4 space-y-3 bg-gradient-to-b from-gray-900 to-gray-800'
        style={{ height: '400px', maxHeight: '400px' }}
      >
        {/* Loading more messages indicator */}
        {isLoadingMore && (
          <div className='text-center text-gray-400 py-2'>
            <div className='w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-1'></div>
            <p className='text-xs'>Loading more...</p>
          </div>
        )}

        {messages.length === 0 ? (
          <div className='text-center text-gray-400 py-12'>
            <div className='text-4xl mb-4'>💭</div>
            <p className='text-lg font-medium mb-2'>No messages yet</p>
            <p className='text-sm'>Be the first to start the conversation!</p>
          </div>
        ) : (
          messages.map(message => {
            // System messages (join/leave) - display as thin line
            if (message.type === 'system') {
              return (
                <div key={message.id} className='flex justify-center py-1'>
                  <div className='text-xs text-gray-500 text-center'>
                    <span className='text-gray-400'>{message.message}</span>
                    <span className='ml-2 text-gray-600'>
                      {new Date(message.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              );
            }

            // Regular messages - display as boxes
            return (
              <div
                key={message.id}
                className={`flex ${
                  message.userId === user?._id ? 'justify-end' : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl shadow-lg ${
                    message.userId === user?._id
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white'
                      : 'bg-gray-700 text-gray-200 border border-gray-600'
                  }`}
                >
                  {message.userId !== user?._id && (
                    <div className='text-xs font-semibold text-blue-400 mb-1'>
                      {message.username}
                    </div>
                  )}
                  <div className='text-sm leading-relaxed'>
                    {message.message}
                  </div>
                  <div
                    className={`text-xs mt-2 ${
                      message.userId === user?._id
                        ? 'text-blue-100'
                        : 'text-gray-400'
                    }`}
                  >
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className='flex justify-start'>
            <div className='bg-gray-700 text-gray-300 text-sm px-4 py-2 rounded-2xl border border-gray-600 shadow-lg'>
              <div className='flex items-center gap-2'>
                <div className='flex gap-1'>
                  <div className='w-1 h-1 bg-gray-400 rounded-full animate-bounce'></div>
                  <div
                    className='w-1 h-1 bg-gray-400 rounded-full animate-bounce'
                    style={{ animationDelay: '0.1s' }}
                  ></div>
                  <div
                    className='w-1 h-1 bg-gray-400 rounded-full animate-bounce'
                    style={{ animationDelay: '0.2s' }}
                  ></div>
                </div>
                <span>
                  {typingUsers.join(', ')}{' '}
                  {typingUsers.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <div className='p-3 border-t border-gray-700 bg-gray-800 rounded-b-xl'>
        {user ? (
          <form onSubmit={handleSendMessage} className='flex gap-2'>
            <div className='flex-1 relative'>
              <input
                type='text'
                value={newMessage}
                onChange={e => {
                  setNewMessage(e.target.value);
                  handleTyping();
                }}
                onBlur={handleStopTyping}
                placeholder='Type a message...'
                className='w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 text-sm transition-all duration-200'
                disabled={!isConnected || isLoading}
              />
              {isLoading && (
                <div className='absolute right-2 top-1/2 transform -translate-y-1/2'>
                  <div className='w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin'></div>
                </div>
              )}
            </div>
            <button
              type='submit'
              disabled={!newMessage.trim() || !isConnected || isLoading}
              className='px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-200 flex items-center gap-1 text-sm'
            >
              {isLoading ? (
                <div className='w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
              ) : (
                <svg
                  className='w-3 h-3'
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
              )}
            </button>
          </form>
        ) : (
          <div className='text-center text-gray-400 py-3'>
            <div className='text-lg mb-1'>🔒</div>
            <p className='text-sm'>Please log in to join the chat</p>
          </div>
        )}
      </div>
    </div>
  );
};
