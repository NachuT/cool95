'use client';

import { useState, useEffect, useRef } from 'react';
import { Inter } from 'next/font/google';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

const API_BASE = '/api';

interface Message {
  id: string;
  username: string;
  message: string;
  type: string;
  timestamp: string;
  replyTo?: {
    id: string;
    username: string;
    message: string;
    type: string;
  };
}

export default function Home() {
  const [username, setUsername] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [token, setToken] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // ... existing useEffect and utility functions ...

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      console.log('Sending message with token:', token ? `${token.substring(0, 10)}...` : 'None');
      
      if (!token) {
        alert('You must be logged in to send messages');
        return;
      }
      
      const messageData = {
        message: newMessage,
        type: 'text',
        ...(replyingTo && { replyTo: replyingTo.id })
      };
      
      const response = await fetch(`${API_BASE}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(messageData),
      });
      
      if (response.ok) {
        setNewMessage('');
        setReplyingTo(null);
        fetchMessages();
      } else {
        const errorData = await response.json();
        console.error('Error sending message:', errorData);
        
        if (response.status === 401) {
          console.error('Authentication error. Token may be invalid or expired.');
          alert('Authentication error. Please log in again.');
          handleLogout();
        } else {
          alert(`Error sending message: ${errorData.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    if (replyingTo) {
      formData.append('replyTo', replyingTo.id);
    }

    try {
      console.log('Uploading image with token:', token);
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to upload image');
      }

      const data = await response.json();
      if (data.status === 'success') {
        setReplyingTo(null);
        fetchMessages();
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
    document.getElementById('messageInput')?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  // ... rest of the existing code until the return statement ...

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex flex-col">
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Chat App
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Welcome, {username}!</span>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="bg-white rounded-2xl shadow-xl h-[calc(100vh-16rem)] overflow-hidden">
          <div className="h-full flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.username === username ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl p-4 ${
                      msg.username === username
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    } transform transition-all hover:scale-[1.02]`}
                  >
                    {msg.replyTo && (
                      <div className={`mb-2 p-2 rounded-lg text-sm ${
                        msg.username === username ? 'bg-indigo-700/50' : 'bg-gray-200'
                      }`}>
                        <div className="font-semibold">{msg.replyTo.username}</div>
                        {msg.replyTo.type === 'image' ? (
                          <div className="italic">📷 Image</div>
                        ) : (
                          <div className="truncate">{msg.replyTo.message}</div>
                        )}
                      </div>
                    )}
                    <div className="text-sm opacity-75 mb-2">{msg.username}</div>
                    {msg.type === 'image' ? (
                      <div className="relative">
                        <Image
                          src={`${API_BASE}/images/${msg.message}`}
                          alt="Uploaded image"
                          width={400}
                          height={300}
                          className="object-contain rounded-lg max-h-[300px] w-auto"
                        />
                      </div>
                    ) : (
                      <div className="break-words">{msg.message}</div>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <div className="text-xs opacity-70">{formatTimestamp(msg.timestamp)}</div>
                      <button
                        onClick={() => handleReply(msg)}
                        className={`text-xs ${
                          msg.username === username
                            ? 'text-white/80 hover:text-white'
                            : 'text-gray-500 hover:text-gray-700'
                        } transition-colors`}
                      >
                        Reply
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t p-4 bg-gray-50">
              {replyingTo && (
                <div className="mb-2 p-2 bg-gray-100 rounded-lg flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm text-gray-500">
                      Replying to <span className="font-semibold">{replyingTo.username}</span>
                    </div>
                    <div className="text-sm truncate">
                      {replyingTo.type === 'image' ? '📷 Image' : replyingTo.message}
                    </div>
                  </div>
                  <button
                    onClick={cancelReply}
                    className="ml-2 text-gray-400 hover:text-gray-600"
                  >
                    ✕
                  </button>
                </div>
              )}
              <form onSubmit={handleSendMessage} className="flex items-center space-x-4">
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="text-gray-500 hover:text-gray-700 transition-colors p-2 hover:bg-gray-200 rounded-full"
                >
                  😊
                </button>
                <label 
                  className={`text-gray-500 hover:text-gray-700 cursor-pointer p-2 hover:bg-gray-200 rounded-full transition-colors ${
                    isUploading ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  title={isUploading ? 'Uploading...' : 'Upload image'}
                >
                  {isUploading ? '⏳' : '📎'}
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                  />
                </label>
                <input
                  id="messageInput"
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={replyingTo ? `Reply to ${replyingTo.username}...` : "Type a message..."}
                  className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  Send
                </button>
              </form>
              {showEmojiPicker && (
                <div className="absolute bottom-20 right-4 z-50">
                  <EmojiPicker
                    onEmojiClick={(emojiData) => {
                      setNewMessage((prev) => prev + emojiData.emoji);
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
