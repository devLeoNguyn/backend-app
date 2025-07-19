import React, { useState } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import { Notification } from '../../services/notificationService';

interface ScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (notificationId: string, scheduledAt: Date) => Promise<void>;
  notification: Notification | null;
  isLoading: boolean;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  isOpen,
  onClose,
  onSchedule,
  notification,
  isLoading
}) => {
  const [scheduledAt, setScheduledAt] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Helper to get minimum datetime-local value (now + 5 minutes)
  const getMinDateTimeValue = (): string => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Add 5 minutes
    
    // Format as YYYY-MM-DDThh:mm
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!scheduledAt) {
      setError('Please select a schedule time');
      return;
    }
    
    if (!notification) {
      setError('No notification selected');
      return;
    }
    
    try {
      const scheduledDate = new Date(scheduledAt);
      await onSchedule(notification._id, scheduledDate);
      onClose();
    } catch (err) {
      setError('Failed to schedule notification');
    }
  };

  if (!isOpen || !notification) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-8"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={() => onClose()}
    >
      <div
        className="w-[95%] max-w-md rounded-lg p-6 bg-base-100 relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-full flex justify-between pb-4 border-b border-base-content border-opacity-30">
          <span className="text-xl font-bold">Schedule Notification</span>
          <button
            onClick={() => onClose()}
            className="btn btn-ghost btn-circle btn-sm"
          >
            <HiOutlineXMark className="text-lg font-bold" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="w-full mt-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text">Notification Title</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              value={notification.title}
              disabled
            />
          </div>
          
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">Schedule Date and Time</span>
            </label>
            <input
              type="datetime-local"
              className={`input input-bordered w-full ${error ? 'input-error' : ''}`}
              value={scheduledAt}
              onChange={(e) => {
                setScheduledAt(e.target.value);
                setError('');
              }}
              min={getMinDateTimeValue()}
            />
            {error && (
              <label className="label">
                <span className="label-text-alt text-error">{error}</span>
              </label>
            )}
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
              disabled={isLoading || !scheduledAt}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Scheduling...
                </>
              ) : (
                'Schedule Notification'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ScheduleModal;
