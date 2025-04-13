'use client';

import { useState, useEffect, useRef } from 'react';
import { Inter } from 'next/font/google';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

const inter = Inter({ subsets: ['latin'] });

// Use relative URLs for API requests to leverage Next.js rewrites
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
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [isTimeExpired, setIsTimeExpired] = useState<boolean>(false);
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Format time as MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Start working to earn time
  const startWorking = () => {
    setIsWorking(true);
    setWorkStartTime(Date.now());
  };

  // Stop working and add earned time
  const stopWorking = () => {
    if (workStartTime) {
      const earnedSeconds = Math.floor((Date.now() - workStartTime) / 1000);
      setRemainingTime(prev => prev + earnedSeconds);
      setIsWorking(false);
      setWorkStartTime(null);
      
      // Save the updated time to localStorage
      localStorage.setItem('remainingTime', (remainingTime + earnedSeconds).toString());
    }
  };

  // Check if user has time remaining
  const checkTimeRemaining = () => {
    const savedTime = localStorage.getItem('remainingTime');
    if (savedTime) {
      const time = parseInt(savedTime, 10);
      setRemainingTime(time);
      if (time <= 0) {
        setIsTimeExpired(true);
      }
    }
  };

  // Timer effect to count down remaining time
  useEffect(() => {
    if (isLoggedIn && remainingTime > 0 && !isTimeExpired) {
      timerRef.current = setInterval(() => {
        setRemainingTime(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setIsTimeExpired(true);
            localStorage.setItem('remainingTime', '0');
            return 0;
          }
          localStorage.setItem('remainingTime', newTime.toString());
          return newTime;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isLoggedIn, remainingTime, isTimeExpired]);

  // Check for remaining time on initial load
  useEffect(() => {
    checkTimeRemaining();
  }, []);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_BASE}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
      } else if (response.status === 401) {
        console.error('Authentication error when fetching messages');
        // Don't log out here as GET messages doesn't require authentication
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUsername = localStorage.getItem('username');
    console.log('Loading from localStorage - Token:', storedToken ? `${storedToken.substring(0, 10)}...` : 'None', 'Username:', storedUsername || 'None');
    
    if (storedToken && storedUsername) {
      setToken(storedToken);
      setUsername(storedUsername);
      setIsLoggedIn(true);
      console.log('User logged in from localStorage');
      // Fetch messages immediately after setting token
      fetchMessages();
    } else {
      // Redirect to login page if not logged in
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (isLoggedIn && !isTimeExpired) {
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [isLoggedIn, isTimeExpired]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken('');
    setUsername('');
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    router.push('/login');
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (isTimeExpired) {
      alert('Your time has expired. Please work to earn more time.');
      return;
    }

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
    if (isTimeExpired) {
      alert('Your time has expired. Please work to earn more time.');
      return;
    }

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
    if (isTimeExpired) {
      alert('Your time has expired. Please work to earn more time.');
      return;
    }
    setReplyingTo(message);
    document.getElementById('messageInput')?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Invalid date';
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (isTimeExpired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Time Expired</h2>
          <p className="text-gray-700 mb-6">
            You've used all your available time. Work to earn more time to continue using the app.
          </p>
          <div className="flex flex-col space-y-4">
            <button
              onClick={startWorking}
              disabled={isWorking}
              className={`py-3 px-6 rounded-lg font-medium ${
                isWorking
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isWorking ? 'Working...' : 'Start Working'}
            </button>
            {isWorking && (
              <button
                onClick={stopWorking}
                className="py-3 px-6 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Stop Working
              </button>
            )}
            <button
              onClick={handleLogout}
              className="py-3 px-6 rounded-lg font-medium bg-gray-200 text-gray-800 hover:bg-gray-300"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex flex-col">
      <div className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Chat App
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-gray-600">Time remaining:</span>
              <span className={`font-bold ${remainingTime < 60 ? 'text-red-600' : 'text-green-600'}`}>
                {formatTime(remainingTime)}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={isWorking ? stopWorking : startWorking}
                className={`py-1 px-3 rounded-lg text-sm font-medium ${
                  isWorking
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isWorking ? 'Stop Working' : 'Work'}
              </button>
            </div>
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
