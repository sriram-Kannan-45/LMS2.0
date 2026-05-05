import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_ORIGIN } from '../api/api';

const ChatPanel = ({ roomId, user }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState([]);
  
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL || BACKEND_ORIGIN, {
      auth: { token: user.token }
    });

    const socket = socketRef.current;

    // We use the same join-session event, or a specific chat one if needed
    // Assuming the user is already in the room via LiveClassRoom or similar
    
    socket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    socket.on('user-typing', ({ userId, userName }) => {
      setTypingUsers(prev => {
        if (!prev.find(u => u.id === userId)) {
          return [...prev, { id: userId, name: userName }];
        }
        return prev;
      });
    });

    socket.on('user-stop-typing', ({ userId }) => {
      setTypingUsers(prev => prev.filter(u => u.id !== userId));
    });

    return () => {
      socket.disconnect();
    };
  }, [roomId, user]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (!isTyping) {
      setIsTyping(true);
      socketRef.current.emit('typing', { roomId, userId: user.id, userName: user.name });
    }

    // Debounce stop-typing
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketRef.current.emit('stop-typing', { roomId, userId: user.id });
    }, 1500);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    // Optimistic UI update
    const tempMessage = {
      id: Date.now(), // temporary ID
      senderId: user.id,
      roomId,
      content: newMessage,
      createdAt: new Date().toISOString(),
      sender: { id: user.id, name: user.name },
      optimistic: true
    };
    
    setMessages(prev => [...prev, tempMessage]);
    
    socketRef.current.emit('send-message', {
      roomId,
      senderId: user.id,
      content: newMessage
    });

    setNewMessage('');
    setIsTyping(false);
    clearTimeout(typingTimeoutRef.current);
    socketRef.current.emit('stop-typing', { roomId, userId: user.id });
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 w-80 shadow-lg">
      <div className="p-4 border-b border-gray-200 bg-gray-50">
        <h3 className="font-semibold text-gray-800">Live Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => {
          const isMe = msg.senderId === user.id;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-500 mb-1">{isMe ? 'You' : msg.sender?.name}</span>
              <div 
                className={`px-3 py-2 rounded-lg max-w-[85%] text-sm ${
                  isMe 
                    ? 'bg-indigo-600 text-white rounded-br-none' 
                    : 'bg-gray-100 text-gray-800 rounded-bl-none'
                } ${msg.optimistic ? 'opacity-70' : ''}`}
              >
                {msg.content}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 border-t border-gray-200 bg-gray-50">
        {typingUsers.length > 0 && (
          <div className="text-xs text-gray-500 italic mb-2 px-1">
            {typingUsers.map(u => u.name).join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
          </div>
        )}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={handleTyping}
            placeholder="Type a message..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button 
            type="submit"
            disabled={!newMessage.trim()}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;
