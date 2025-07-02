import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { WS_BASE_URL } from '../config/api';

interface WebSocketTestProps {
  adminUserId: string;
}

interface StatsData {
  totalUsers: number;
  totalMovies: number;
  totalRevenue: {
    amount: number;
    transactions: number;
  };
  recentRentals: Array<{
    id: string;
    customerName: string;
    movieTitle: string;
    amount: number;
    status: string;
    createdAt: string;
  }>;
  lastUpdated: string;
  connectedAdmins: number;
}

const WebSocketTest: React.FC<WebSocketTestProps> = ({ adminUserId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [notifications, setNotifications] = useState<string[]>([]);
  const [connectionStatus, setConnectionStatus] = useState('Disconnected');

  useEffect(() => {
    // Khởi tạo WebSocket connection
    const newSocket = io(WS_BASE_URL, {
      transports: ['websocket', 'polling']
    });

    setSocket(newSocket);

    // Connection events
    newSocket.on('connect', () => {
      console.log('🔌 WebSocket connected:', newSocket.id);
      setIsConnected(true);
      setConnectionStatus('Connected');
      
      // Authenticate as admin
      newSocket.emit('admin-auth', { adminUserId });
    });

    newSocket.on('disconnect', () => {
      console.log('🔌 WebSocket disconnected');
      setIsConnected(false);
      setIsAuthenticated(false);
      setConnectionStatus('Disconnected');
    });

    // Admin authentication events
    newSocket.on('admin-authenticated', (data) => {
      console.log('👑 Admin authenticated:', data);
      setIsAuthenticated(true);
      setConnectionStatus('Authenticated');
      addNotification('Admin authenticated successfully');
    });

    newSocket.on('admin-auth-failed', (data) => {
      console.error('❌ Admin auth failed:', data);
      setIsAuthenticated(false);
      setConnectionStatus('Auth Failed');
      addNotification(`Auth failed: ${data.message}`);
    });

    // Stats updates
    newSocket.on('stats-update', (data: StatsData) => {
      console.log('📊 Stats update received:', data);
      setStats(data);
      addNotification(`Stats updated: ${data.totalUsers} users, ${data.totalMovies} movies`);
    });

    // Real-time notifications
    newSocket.on('new-user', (data) => {
      console.log('👤 New user:', data);
      addNotification(data.message);
    });

    newSocket.on('new-rental', (data) => {
      console.log('🎬 New rental:', data);
      addNotification(data.message);
    });

    newSocket.on('revenue-update', (data) => {
      console.log('💰 Revenue update:', data);
      addNotification(data.message);
    });

    return () => {
      newSocket.close();
    };
  }, [adminUserId]);

  const addNotification = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setNotifications(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 9)]);
  };

  const requestStats = () => {
    if (socket && isAuthenticated) {
      socket.emit('request-stats');
      addNotification('Requested latest stats');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-4">🔄 Real-time WebSocket Test</h2>
      
      {/* Connection Status */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${
            isConnected ? (isAuthenticated ? 'bg-green-500' : 'bg-yellow-500') : 'bg-red-500'
          }`}></div>
          <span className="font-semibold">Status: {connectionStatus}</span>
          {isAuthenticated && (
            <button
              onClick={requestStats}
              className="ml-4 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Refresh Stats
            </button>
          )}
        </div>
      </div>

      {/* Live Stats */}
      {stats && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">📊 Live Statistics</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
              <div className="text-sm text-gray-600">Total Users</div>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <div className="text-2xl font-bold text-green-600">{stats.totalMovies}</div>
              <div className="text-sm text-gray-600">Total Movies</div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-lg font-bold text-purple-600">
                {formatCurrency(stats.totalRevenue.amount)}
              </div>
              <div className="text-sm text-gray-600">Total Revenue</div>
            </div>
            <div className="bg-orange-50 p-3 rounded">
              <div className="text-2xl font-bold text-orange-600">{stats.connectedAdmins}</div>
              <div className="text-sm text-gray-600">Connected Admins</div>
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            Last updated: {new Date(stats.lastUpdated).toLocaleString()}
          </div>
        </div>
      )}

      {/* Recent Rentals */}
      {stats?.recentRentals && stats.recentRentals.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">🎬 Recent Rentals</h3>
          <div className="space-y-2">
            {stats.recentRentals.slice(0, 3).map((rental) => (
              <div key={rental.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div>
                  <span className="font-medium">{rental.customerName}</span>
                  <span className="text-gray-600 ml-2">rented {rental.movieTitle}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(rental.amount)}</div>
                  <div className="text-xs text-gray-500">{rental.createdAt}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Notifications */}
      <div>
        <h3 className="text-lg font-semibold mb-3">🔔 Live Notifications</h3>
        <div className="bg-gray-50 p-3 rounded max-h-64 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="text-gray-500 text-sm">No notifications yet...</div>
          ) : (
            <div className="space-y-1">
              {notifications.map((notification, index) => (
                <div key={index} className="text-sm font-mono text-gray-700">
                  {notification}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WebSocketTest; 