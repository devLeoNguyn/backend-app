import React, { useState, useEffect } from 'react';
import { authService } from '../../services/authService';
import axios from 'axios';
import { API_ENDPOINTS } from '../../config/api';
import toast from 'react-hot-toast';

interface NotificationSettings {
  default_priority: 'high' | 'normal' | 'low';
  auto_archive_days: number;
  default_template_id?: string;
  analytics_enabled: boolean;
  enable_batch_processing: boolean;
  max_batch_size: number;
  retry_failed_notifications: boolean;
  max_retries: number;
  enable_rate_limiting: boolean;
  rate_limit: number;
}

const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState<NotificationSettings>({
    default_priority: 'normal',
    auto_archive_days: 30,
    analytics_enabled: true,
    enable_batch_processing: true,
    max_batch_size: 1000,
    retry_failed_notifications: true,
    max_retries: 3,
    enable_rate_limiting: true,
    rate_limit: 10
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Current admin user
  const adminUser = authService.getCurrentUser();
  const adminUserId = adminUser?._id || '';
  
  // Fetch settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (!adminUserId) return;
      
      try {
        setLoading(true);
        const response = await axios.get(
          `${API_ENDPOINTS.ADMIN_SYSTEM_STATUS}?adminUserId=${adminUserId}`
        );
        
        if (response.data?.data?.notifications) {
          setSettings(response.data.data.notifications);
        }
      } catch (error) {
        console.error('Error fetching notification settings:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchSettings();
  }, [adminUserId]);
  
  // Save settings
  const handleSave = async () => {
    if (!adminUserId) return;
    
    try {
      setSaving(true);
      
      // Save settings to backend
      await axios.post(
        `${API_ENDPOINTS.ADMIN_SYSTEM_STATUS}/notifications`,
        { settings, adminUserId }
      );
      
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };
  
  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked
        : type === 'number' 
          ? parseInt(value, 10)
          : value
    }));
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }
  
  return (
    <div className="bg-base-100 p-6 rounded-lg">
      <h2 className="text-xl font-bold mb-6">Notification System Settings</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">General Settings</h3>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Default Priority</span>
            </label>
            <select
              name="default_priority"
              className="select select-bordered"
              value={settings.default_priority}
              onChange={handleChange}
            >
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Auto-Archive After (Days)</span>
            </label>
            <input
              type="number"
              name="auto_archive_days"
              className="input input-bordered"
              value={settings.auto_archive_days}
              onChange={handleChange}
              min={1}
              max={365}
            />
          </div>
          
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                name="analytics_enabled"
                className="checkbox"
                checked={settings.analytics_enabled}
                onChange={handleChange}
              />
              <span className="label-text">Enable Analytics</span>
            </label>
          </div>
        </div>
        
        {/* Processing Settings */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Processing Settings</h3>
          
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                name="enable_batch_processing"
                className="checkbox"
                checked={settings.enable_batch_processing}
                onChange={handleChange}
              />
              <span className="label-text">Enable Batch Processing</span>
            </label>
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Max Batch Size</span>
            </label>
            <input
              type="number"
              name="max_batch_size"
              className="input input-bordered"
              value={settings.max_batch_size}
              onChange={handleChange}
              min={100}
              max={10000}
              disabled={!settings.enable_batch_processing}
            />
          </div>
          
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                name="retry_failed_notifications"
                className="checkbox"
                checked={settings.retry_failed_notifications}
                onChange={handleChange}
              />
              <span className="label-text">Retry Failed Notifications</span>
            </label>
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Max Retries</span>
            </label>
            <input
              type="number"
              name="max_retries"
              className="input input-bordered"
              value={settings.max_retries}
              onChange={handleChange}
              min={1}
              max={10}
              disabled={!settings.retry_failed_notifications}
            />
          </div>
          
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                name="enable_rate_limiting"
                className="checkbox"
                checked={settings.enable_rate_limiting}
                onChange={handleChange}
              />
              <span className="label-text">Enable Rate Limiting</span>
            </label>
          </div>
          
          <div className="form-control">
            <label className="label">
              <span className="label-text">Rate Limit (Notifications/Second)</span>
            </label>
            <input
              type="number"
              name="rate_limit"
              className="input input-bordered"
              value={settings.rate_limit}
              onChange={handleChange}
              min={1}
              max={100}
              disabled={!settings.enable_rate_limiting}
            />
          </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end">
        <button 
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? (
            <>
              <span className="loading loading-spinner"></span>
              Saving...
            </>
          ) : (
            'Save Settings'
          )}
        </button>
      </div>
    </div>
  );
};

export default NotificationSettings;
