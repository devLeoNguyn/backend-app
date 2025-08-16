import React, { useState, useEffect } from 'react';
import { HiOutlineXMark } from 'react-icons/hi2';
import { Notification } from '../../services/notificationService';
import DeepLinkHelper from './DeepLinkHelper';

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
    
    // Validate deep_link format
    if (formData.deep_link) {
      const validFormats = [
        /^movie\/\d+$/,           // movie/123
        /^series\/\d+$/,          // series/123
        /^anime\/\d+$/,           // anime/123
        /^genre\/\d+$/,           // genre/123
        /^profile$/,              // profile
        /^notifications$/,        // notifications
        /^settings$/,             // settings
        /^payment\/qr$/,          // payment/qr
        /^recommendations$/,      // recommendations
        /^watch-later$/,          // watch-later
        /^watching-history$/,     // watching-history
        /^explore$/,              // explore
        /^home$/,                 // home
        /^[a-zA-Z0-9\/\-_]+$/     // Format chung
      ];
      
      const isValidFormat = validFormats.some(format => format.test(formData.deep_link!));
      if (!isValidFormat) {
        newErrors.deep_link = 'Deep link không đúng định dạng. Ví dụ: movie/123, series/456, profile';
      }
    }
    
    // Validate image_url
    if (formData.image_url) {
      try {
        new URL(formData.image_url);
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const hasValidExtension = validExtensions.some(ext => 
          formData.image_url!.toLowerCase().includes(ext)
        );
        
        if (!hasValidExtension) {
          newErrors.image_url = 'URL phải có định dạng ảnh hợp lệ (.jpg, .jpeg, .png, .gif, .webp)';
        }
      } catch {
        newErrors.image_url = 'URL không hợp lệ';
      }
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
                  <span className="label-text-alt text-info">Cách thức tạo thông báo</span>
                </label>
                <select
                  name="type"
                  className="select select-bordered w-full"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="manual">Thủ công - Tạo bởi admin</option>
                  <option value="auto">Tự động - Hệ thống tạo</option>
                </select>
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Đối tượng</span>
                  <span className="label-text-alt text-info">Ai sẽ nhận thông báo</span>
                </label>
                <select
                  name="target_type"
                  className="select select-bordered w-full"
                  value={formData.target_type}
                  onChange={handleChange}
                >
                  <option value="all">Tất cả người dùng - Gửi cho mọi người</option>
                  <option value="segment">Phân nhóm người dùng - Gửi theo nhóm</option>
                  <option value="specific_users">Người dùng cụ thể - Chọn từng người</option>
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
                  <span className="label-text-alt text-info">Điều hướng khi nhấn vào thông báo</span>
                </label>
                <div className="flex gap-2">
                  <select
                    name="deep_link_type"
                    className="select select-bordered w-1/3"
                    onChange={(e) => {
                      const type = e.target.value;
                      let link = '';
                      if (type === 'movie') link = 'movie/';
                      else if (type === 'series') link = 'series/';
                      else if (type === 'anime') link = 'anime/';
                      else if (type === 'genre') link = 'genre/';
                      else if (type === 'custom') link = '';
                      else link = type;
                      
                      setFormData(prev => ({
                        ...prev,
                        deep_link: link
                      }));
                    }}
                  >
                    <option value="">Chọn loại</option>
                    <option value="home">Trang chủ</option>
                    <option value="profile">Hồ sơ</option>
                    <option value="notifications">Thông báo</option>
                    <option value="settings">Cài đặt</option>
                    <option value="explore">Khám phá</option>
                    <option value="recommendations">Đề xuất</option>
                    <option value="watch-later">Xem sau</option>
                    <option value="watching-history">Lịch sử xem</option>
                    <option value="payment/qr">Thanh toán QR</option>
                    <option value="movie">Phim (cần ID)</option>
                    <option value="series">Series (cần ID)</option>
                    <option value="anime">Anime (cần ID)</option>
                    <option value="genre">Thể loại (cần ID)</option>
                    <option value="custom">Tùy chỉnh</option>
                  </select>
                  <input
                    type="text"
                    name="deep_link"
                    placeholder={
                      formData.deep_link?.includes('/') && !formData.deep_link?.endsWith('/') 
                        ? "Nhập ID (ví dụ: 123)" 
                        : "Nhập deep link tùy chỉnh"
                    }
                    className="input input-bordered w-2/3"
                    value={formData.deep_link}
                    onChange={handleChange}
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <DeepLinkHelper 
                    onSelect={(value) => setFormData(prev => ({ ...prev, deep_link: value }))}
                    currentValue={formData.deep_link}
                  />
                  <span className="text-xs text-base-content/70">
                    Ví dụ: movie/123, series/456, profile, notifications
                  </span>
                </div>
                {errors.deep_link && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.deep_link}</span>
                  </label>
                )}
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">URL hình ảnh (Không bắt buộc)</span>
                  <span className="label-text-alt text-info">Hình ảnh hiển thị trong thông báo</span>
                </label>
                <input
                  type="text"
                  name="image_url"
                  placeholder="https://example.com/image.jpg"
                  className={`input input-bordered w-full ${errors.image_url ? 'input-error' : ''}`}
                  value={formData.image_url}
                  onChange={handleChange}
                />
                {errors.image_url && (
                  <label className="label">
                    <span className="label-text-alt text-error">{errors.image_url}</span>
                  </label>
                )}
                <label className="label">
                  <span className="label-text-alt text-info">
                    Hỗ trợ: .jpg, .jpeg, .png, .gif, .webp
                  </span>
                </label>
              </div>
              
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Độ ưu tiên</span>
                  <span className="label-text-alt text-info">Ảnh hưởng đến thứ tự hiển thị</span>
                </label>
                <select
                  name="priority"
                  className="select select-bordered w-full"
                  value={formData.priority}
                  onChange={handleChange}
                >
                  <option value="low">Thấp - Hiển thị cuối</option>
                  <option value="normal">Bình thường - Hiển thị theo thời gian</option>
                  <option value="high">Cao - Hiển thị đầu</option>
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
