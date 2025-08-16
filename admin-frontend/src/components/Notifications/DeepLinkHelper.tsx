import React, { useState, useEffect } from 'react';

interface DeepLinkSuggestion {
  value: string;
  label: string;
  description: string;
}

interface DeepLinkHelperProps {
  onSelect: (value: string) => void;
  currentValue?: string;
}

const DeepLinkHelper: React.FC<DeepLinkHelperProps> = ({ onSelect, currentValue }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<DeepLinkSuggestion[]>([]);

  const commonDeepLinks: DeepLinkSuggestion[] = [
    { value: 'home', label: 'Trang chủ', description: 'Điều hướng về trang chủ' },
    { value: 'profile', label: 'Hồ sơ', description: 'Xem hồ sơ người dùng' },
    { value: 'notifications', label: 'Thông báo', description: 'Xem danh sách thông báo' },
    { value: 'settings', label: 'Cài đặt', description: 'Cài đặt ứng dụng' },
    { value: 'explore', label: 'Khám phá', description: 'Khám phá nội dung mới' },
    { value: 'recommendations', label: 'Đề xuất', description: 'Xem đề xuất cá nhân' },
    { value: 'watch-later', label: 'Xem sau', description: 'Danh sách xem sau' },
    { value: 'watching-history', label: 'Lịch sử xem', description: 'Xem lịch sử xem phim' },
    { value: 'payment/qr', label: 'Thanh toán QR', description: 'Thanh toán qua QR code' },
    { value: 'movie/123', label: 'Chi tiết phim', description: 'Xem chi tiết phim (thay 123 bằng ID thực)' },
    { value: 'series/456', label: 'Chi tiết series', description: 'Xem chi tiết series (thay 456 bằng ID thực)' },
    { value: 'anime/789', label: 'Chi tiết anime', description: 'Xem chi tiết anime (thay 789 bằng ID thực)' },
    { value: 'genre/101', label: 'Thể loại', description: 'Xem phim theo thể loại (thay 101 bằng ID thực)' }
  ];

  useEffect(() => {
    if (currentValue) {
      const filtered = commonDeepLinks.filter(link => 
        link.label.toLowerCase().includes(currentValue.toLowerCase()) ||
        link.value.toLowerCase().includes(currentValue.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 5));
    } else {
      setFilteredSuggestions(commonDeepLinks.slice(0, 5));
    }
  }, [currentValue]);

  const handleSuggestionClick = (suggestion: DeepLinkSuggestion) => {
    onSelect(suggestion.value);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        className="btn btn-sm btn-outline btn-info"
        onClick={() => setShowSuggestions(!showSuggestions)}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Gợi ý Deep Link
      </button>

      {showSuggestions && (
        <div className="absolute top-full left-0 mt-1 w-80 bg-base-100 border border-base-300 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
          <div className="p-2">
            <div className="text-sm font-medium text-base-content mb-2">Deep Link phổ biến:</div>
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="p-2 hover:bg-base-200 rounded cursor-pointer border-b border-base-200 last:border-b-0"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className="font-medium text-sm">{suggestion.label}</div>
                <div className="text-xs text-base-content/70">{suggestion.description}</div>
                <div className="text-xs text-primary font-mono mt-1">{suggestion.value}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default DeepLinkHelper;
