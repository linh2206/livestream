'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useSocketContext } from '@/lib/contexts/SocketContext';
import { useState } from 'react';

interface StreamChatProps {
  streamId: string;
}

export function StreamChat({ streamId: _streamId }: StreamChatProps) {
  const { user } = useAuth();
  const { isConnected } = useSocketContext();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<
    Array<{
      id: string;
      user: string;
      message: string;
      timestamp: string;
    }>
  >([]);

  const handleSendMessage = () => {
    if (!message.trim() || !user || !isConnected) return;

    const newMessage = {
      id: Date.now().toString(),
      user: user.username,
      message: message.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, newMessage]);
    setMessage('');

    // TODO: Send message via socket
    // socket.emit('chat_message', {
    //   room: `stream:${streamId}`,
    //   message: newMessage.message,
    //   timestamp: newMessage.timestamp,
    // });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className='bg-gray-800 rounded-lg shadow-lg h-96 flex flex-col'>
      <div className='p-4 border-b border-gray-700'>
        <h3 className='text-lg font-semibold text-white'>Stream Chat</h3>
        <div className='text-sm text-gray-400'>
          {isConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className='flex-1 overflow-y-auto p-4 space-y-2'>
        {messages.length === 0 ? (
          <div className='text-center text-gray-400 py-8'>
            No messages yet. Be the first to chat!
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className='flex flex-col'>
              <div className='flex items-center space-x-2'>
                <span className='font-medium text-blue-400 text-sm'>
                  {msg.user}
                </span>
                <span className='text-xs text-gray-500'>
                  {new Date(msg.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <p className='text-gray-300 text-sm'>{msg.message}</p>
            </div>
          ))
        )}
      </div>

      <div className='p-4 border-t border-gray-700'>
        {user ? (
          <div className='flex space-x-2'>
            <input
              type='text'
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='Type a message...'
              className='flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400'
              disabled={!isConnected}
            />
            <button
              onClick={handleSendMessage}
              disabled={!message.trim() || !isConnected}
              className='px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
            >
              Send
            </button>
          </div>
        ) : (
          <div className='text-center text-gray-400 py-2'>
            Please log in to chat
          </div>
        )}
      </div>
    </div>
  );
}
