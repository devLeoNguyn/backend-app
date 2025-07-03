import React from 'react';
import WebSocketTest from '../components/WebSocketTest';

const WebSocketTestPage: React.FC = () => {
  // Lấy adminUserId từ localStorage hoặc context
  const adminUserId = localStorage.getItem('adminUserId') || '6863e129661212a5d79c271f';

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">WebSocket Real-time Test</h1>
        <p className="text-gray-600 mt-2">
          Test real-time updates và notifications cho admin dashboard
        </p>
      </div>
      
      <WebSocketTest adminUserId={adminUserId} />
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="font-semibold text-blue-800 mb-2">📋 Test Instructions:</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• WebSocket sẽ tự động kết nối và authenticate với admin ID</li>
          <li>• Stats sẽ được cập nhật real-time mỗi 30 giây</li>
          <li>• Thử tạo user mới hoặc rental mới để test notifications</li>
          <li>• Click "Refresh Stats" để request stats mới nhất</li>
          <li>• Mở nhiều tab để test multiple admin connections</li>
        </ul>
      </div>
    </div>
  );
};

export default WebSocketTestPage; 