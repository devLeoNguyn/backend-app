import React from 'react';
import { NotificationStats as NotificationStatsType } from '../../services/notificationService';

interface NotificationStatsProps {
  stats: NotificationStatsType | null;
  loading: boolean;
}

const NotificationStats: React.FC<NotificationStatsProps> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="w-full bg-base-100 p-4 rounded-lg shadow-sm flex justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="w-full bg-base-100 p-4 rounded-lg shadow-sm flex justify-center">
        <p>No statistics available</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Notifications */}
      <div className="stat bg-base-200 rounded-lg shadow-sm">
        <div className="stat-figure text-primary">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <div className="stat-title">Total</div>
        <div className="stat-value text-primary">{stats.total}</div>
        <div className="stat-desc">All notifications</div>
      </div>
      
      {/* Sent Notifications */}
      <div className="stat bg-base-200 rounded-lg shadow-sm">
        <div className="stat-figure text-success">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
          </svg>
        </div>
        <div className="stat-title">Sent</div>
        <div className="stat-value text-success">{stats.sent}</div>
        <div className="stat-desc">Successfully sent notifications</div>
      </div>
      
      {/* Scheduled Notifications */}
      <div className="stat bg-base-200 rounded-lg shadow-sm">
        <div className="stat-figure text-warning">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"></path>
          </svg>
        </div>
        <div className="stat-title">Scheduled</div>
        <div className="stat-value text-warning">{stats.scheduled}</div>
        <div className="stat-desc">Scheduled for future delivery</div>
      </div>
      
      {/* Draft Notifications */}
      <div className="stat bg-base-200 rounded-lg shadow-sm">
        <div className="stat-figure text-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path>
          </svg>
        </div>
        <div className="stat-title">Draft</div>
        <div className="stat-value text-info">{stats.draft}</div>
        <div className="stat-desc">Draft notifications</div>
      </div>
      
      {/* More stats */}
      <div className="stat bg-base-200 rounded-lg shadow-sm">
        <div className="stat-title">Delivery Rate</div>
        <div className="stat-value">{Math.round(stats.delivery_success_rate * 100)}%</div>
        <div className="stat-desc">Of notifications delivered</div>
      </div>
      
      <div className="stat bg-base-200 rounded-lg shadow-sm">
        <div className="stat-title">Read Rate</div>
        <div className="stat-value">{Math.round(stats.read_rate * 100)}%</div>
        <div className="stat-desc">Of notifications read</div>
      </div>
      
      {/* Failed Notifications */}
      <div className="stat bg-base-200 rounded-lg shadow-sm">
        <div className="stat-figure text-error">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="inline-block w-8 h-8 stroke-current">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
          </svg>
        </div>
        <div className="stat-title">Failed</div>
        <div className="stat-value text-error">{stats.failed}</div>
        <div className="stat-desc">Failed notifications</div>
      </div>
    </div>
  );
};

export default NotificationStats;
