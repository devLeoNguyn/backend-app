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
    if (!formData.title) newErrors.title = 'Vui lòng nhập tiêu đề';
    if (!formData.body) newErrors.body = 'Vui lòng nhập nội dung';
    
    // Validate lengths
    if (formData.title && formData.title.length > 100) {
      newErrors.title = 'Tiêu đề tối đa 100 ký tự';
    }
    
    if (formData.body && formData.body.length > 500) {
      newErrors.body = 'Nội dung tối đa 500 ký tự';
    }
    
    // Validate target_type specific fields
    if (formData.target_type === 'specific_users' && (!formData.target_users || formData.target_users.length === 0)) {
      newErrors.target_users = 'Vui lòng chọn người dùng';
    }
    
    if (formData.target_type === 'segment' && !formData.segment) {
      newErrors.segment = 'Vui lòng chọn phân nhóm';
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
                  <span className="label-text">Tiêu đề</span>
                </label>
                <input
                  type="text"
                  name="title"
                  placeholder="Nhập tiêu đề thông báo"
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
                  <span className="label-text">Nội dung</span>
                </label>
                <textarea
                  name="body"
                  placeholder="Nhập nội dung thông báo"
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
                  <span className="label-text">Loại</span>
                </label>
                <select
                  name="type"
                  className="select select-bordered w-full"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="manual">Thủ công</option>
                  <option value="auto">Tự động</option>
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Đối tượng</span>
                </label>
                <select
                  name="target_type"
                  className="select select-bordered w-full"
                  value={formData.target_type}
                  onChange={handleChange}
                >
                  <option value="all">Tất cả người dùng</option>
                  <option value="segment">Phân nhóm người dùng</option>
                  <option value="specific_users">Người dùng cụ thể</option>
                </select>
              </div>
              
              {formData.target_type === 'segment' && (
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Phân nhóm</span>
                  </label>
                  <select
                    name="segment"
                    className={`select select-bordered w-full ${errors.segment ? 'select-error' : ''}`}
                    value={formData.segment}
                    onChange={handleChange}
                  >
                    <option value="">Chọn phân nhóm</option>
                    <option value="new_users">Người dùng mới</option>
                    <option value="active_users">Người dùng hoạt động</option>
                    <option value="premium_users">Người dùng trả phí</option>
                    <option value="inactive_users">Người dùng không hoạt động</option>
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
                  <span className="label-text">Deep Link (Không bắt buộc)</span>
                </label>
                <input
                  type="text"
                  name="deep_link"
                  placeholder="Ví dụ: movie/123"
                  className="input input-bordered w-full"
                  value={formData.deep_link}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">URL hình ảnh (Không bắt buộc)</span>
                </label>
                <input
                  type="text"
                  name="image_url"
                  placeholder="Ví dụ: https://example.com/image.jpg"
                  className="input input-bordered w-full"
                  value={formData.image_url}
                  onChange={handleChange}
                />
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Độ ưu tiên</span>
                </label>
                <select
                  name="priority"
                  className="select select-bordered w-full"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Thấp</option>
                  <option value="normal">Bình thường</option>
                  <option value="high">Cao</option>
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
              Hủy
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Đang lưu...
                </>
              ) : (
                notification ? 'Cập nhật thông báo' : 'Tạo thông báo'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NotificationForm;
