import React, { useState } from 'react';
import NotificationSettings from '../components/Settings/NotificationSettings';
import NotificationTemplates from '../components/Notifications/NotificationTemplates';

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState('notifications');

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">⚙️ System Settings</h1>
      
      <div className="tabs tabs-boxed mb-6">
        <button
          className={`tab ${activeTab === 'general' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          Notifications
        </button>
        <button
          className={`tab ${activeTab === 'templates' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('templates')}
        >
          Templates
        </button>
        <button
          className={`tab ${activeTab === 'users' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Users
        </button>
        <button
          className={`tab ${activeTab === 'payments' ? 'tab-active' : ''}`}
          onClick={() => setActiveTab('payments')}
        >
          Payments
        </button>
      </div>
      
      <div className="mt-4">
        {activeTab === 'notifications' && <NotificationSettings />}
        {activeTab === 'templates' && <NotificationTemplates />}
        
        {activeTab === 'general' && (
          <div className="bg-base-100 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">General Settings</h2>
            <p className="text-gray-500">General settings will be implemented in future updates.</p>
          </div>
        )}
        
        {activeTab === 'users' && (
          <div className="bg-base-100 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">User Settings</h2>
            <p className="text-gray-500">User settings will be implemented in future updates.</p>
          </div>
        )}
        
        {activeTab === 'payments' && (
          <div className="bg-base-100 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Payment Settings</h2>
            <p className="text-gray-500">Payment settings will be implemented in future updates.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
