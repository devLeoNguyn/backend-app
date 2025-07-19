import React, { useState, useEffect } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import { Notification } from '../../services/notificationService';

interface NotificationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Notification>) => Promise<void>;
  notification?: Notification;
  isLoading: boolean;
  title: string;
}

const NotificationForm: React.FC<NotificationFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  notification,
  isLoading,
  title
}) => {
  // Form state
  const [formData, setFormData] = useState<Partial<Notification>>({
    title: '',
    body: '',
    type: 'manual',
    target_type: 'all',
    target_users: [],
    segment: '',
    deep_link: '',
    image_url: '',
    priority: 'normal'
  });

  // Validation state
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Update form data when notification changes
  useEffect(() => {
    if (notification) {
      setFormData({
        title: notification.title || '',
        body: notification.body || '',
        type: notification.type || 'manual',
        target_type: notification.target_type || 'all',
        target_users: notification.target_users || [],
        segment: notification.segment || '',
        deep_link: notification.deep_link || '',
        image_url: notification.image_url || '',
        priority: notification.priority || 'normal'
      });
    }
  }, [notification]);

  // Handle input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    // Required fields
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.body) newErrors.body = 'Body is required';
    
    // Validate lengths
    if (formData.title && formData.title.length > 100) {
      newErrors.title = 'Title must be max 100 characters';
    }
    
    if (formData.body && formData.body.length > 500) {
      newErrors.body = 'Body must be max 500 characters';
    }
    
    // Validate target_type specific fields
    if (formData.target_type === 'specific_users' && (!formData.target_users || formData.target_users.length === 0)) {
      newErrors.target_users = 'Target users are required';
    }
    
    if (formData.target_type === 'segment' && !formData.segment) {
      newErrors.segment = 'Segment is required';
    }
    
    // Set errors
    setErrors(newErrors);
    
    // Return true if no errors
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    await onSubmit(formData);
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={() => onClose()}
    >
      <div
        className="w-[95%] max-w-4xl rounded-lg p-7 bg-base-100 relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full flex justify-between pb-5 border-b border-base-content border-opacity-30">
          <button
            onClick={() => onClose()}
            className="absolute top-5 right-3 btn btn-ghost btn-circle"
          >
            <HiOutlineXMark className="text-xl font-bold" />
          </button>
          <span className="text-2xl font-bold">{title}</span>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Title</span>
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="Notification Title"
                  className={`input input-bordered w-full ${errors.title ? 'input-error' : ''}`}
                  value={formData.title}
                  onChange={handleChange}
                  maxLength={100}
                />
                {errors.title && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.title}</span>
                  </label>
                )}
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Body</span>
                </label>
                <textarea
                  name="body"
                  placeholder="Notification Body"
                  className={`textarea textarea-bordered w-full h-24 ${errors.body ? 'textarea-error' : ''}`}
                  value={formData.body}
                  onChange={handleChange}
                  maxLength={500}
                />
                {errors.body && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.body}</span>
                  </label>
                )}
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Type</span>
                </label>
                <select
                  name="type"
                  className="select select-bordered w-full"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="manual">Manual</option>
                  <option value="auto">Auto</option>
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Target Type</span>
                </label>
                <select
                  name="target_type"
                  className="select select-bordered w-full"
                  value={formData.target_type}
                  onChange={handleChange}
                >
                  <option value="all">All Users</option>
                  <option value="segment">User Segment</option>
                  <option value="specific_users">Specific Users</option>
                </select>
              </div>
              
              {formData.target_type === 'segment' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Segment</span>
                  </label>
                  <select
                    name="segment"
                    className={`select select-bordered w-full ${errors.segment ? 'select-error' : ''}`}
                    value={formData.segment}
                    onChange={handleChange}
                  >
                    <option value="">Select a segment</option>
                    <option value="new_users">New Users</option>
                    <option value="active_users">Active Users</option>
                    <option value="premium_users">Premium Users</option>
                    <option value="inactive_users">Inactive Users</option>
                  </select>
                  {errors.segment && (
                    <label className="label">
                      <span className="label-text-alt text-error">{errors.segment}</span>
                    </label>
                  )}
                </div>
              )}
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Deep Link (Optional)</span>
                </label>
                <input
                  type="text"
                  name="deep_link"
                  placeholder="e.g., movie/123"
                  className="input input-bordered w-full"
                  value={formData.deep_link}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Image URL (Optional)</span>
                </label>
                <input
                  type="text"
                  name="image_url"
                  placeholder="e.g., https://example.com/image.jpg"
                  className="input input-bordered w-full"
                  value={formData.image_url}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Priority</span>
                </label>
                <select
                  name="priority"
                  className="select select-bordered w-full"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Low</option>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </select>
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onClose()}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Saving...
                </>
              ) : (
                notification ? 'Update Notification' : 'Create Notification'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationForm;
