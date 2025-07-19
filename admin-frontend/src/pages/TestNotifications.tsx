import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface TestNotification {
  _id: string;
  title: string;
  body: string;
  type: string;
  target_type: string;
  status: string;
}

const TestNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<TestNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const adminUserId = '6863e129661212a5d79c271f';
      const url = `http://localhost:3003/api/admin/notifications?userId=${adminUserId}`;
      
      console.log('Fetching from:', url);
      
      const response = await axios.get(url);
      
      console.log('Response:', response.data);
      
      if (response.data.success) {
        setNotifications(response.data.data.notifications);
        setError(null);
      } else {
        setError('API returned failure');
      }
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Notifications API</h1>
      
      <button 
        onClick={fetchNotifications}
        className="btn btn-primary mb-4"
        disabled={loading}
      >
        {loading ? 'Loading...' : 'Fetch Notifications'}
      </button>

      {error && (
        <div className="alert alert-error mb-4">
          <span>Error: {error}</span>
        </div>
      )}

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification._id} className="card bg-base-100 shadow-md">
            <div className="card-body">
              <h2 className="card-title">{notification.title}</h2>
              <p>{notification.body}</p>
              <div className="flex gap-2">
                <div className="badge badge-info">{notification.type}</div>
                <div className="badge badge-success">{notification.target_type}</div>
                <div className="badge badge-warning">{notification.status}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-gray-100 rounded">
        <h3 className="font-bold">Debug Info:</h3>
        <p>Total notifications: {notifications.length}</p>
        <p>Loading: {loading ? 'true' : 'false'}</p>
        <p>Error: {error || 'none'}</p>
      </div>
    </div>
  );
};

export default TestNotifications;
