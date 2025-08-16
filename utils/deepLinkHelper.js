/**
 * Deep Link Helper - Quản lý validation và suggestions cho deep link
 */

// Các format deep link hợp lệ
const VALID_DEEP_LINK_FORMATS = {
  // Trang chính
  home: { pattern: /^home$/, description: 'Trang chủ' },
  profile: { pattern: /^profile$/, description: 'Hồ sơ người dùng' },
  notifications: { pattern: /^notifications$/, description: 'Danh sách thông báo' },
  settings: { pattern: /^settings$/, description: 'Cài đặt' },
  explore: { pattern: /^explore$/, description: 'Khám phá' },
  recommendations: { pattern: /^recommendations$/, description: 'Đề xuất' },
  watchLater: { pattern: /^watch-later$/, description: 'Xem sau' },
  watchingHistory: { pattern: /^watching-history$/, description: 'Lịch sử xem' },
  
  // Thanh toán
  paymentQR: { pattern: /^payment\/qr$/, description: 'Thanh toán QR' },
  
  // Nội dung với ID
  movie: { pattern: /^movie\/\d+$/, description: 'Chi tiết phim', example: 'movie/123' },
  series: { pattern: /^series\/\d+$/, description: 'Chi tiết series', example: 'series/456' },
  anime: { pattern: /^anime\/\d+$/, description: 'Chi tiết anime', example: 'anime/789' },
  genre: { pattern: /^genre\/\d+$/, description: 'Thể loại', example: 'genre/101' },
  
  // Format chung
  custom: { pattern: /^[a-zA-Z0-9\/\-_]+$/, description: 'Deep link tùy chỉnh' }
};

/**
 * Validate deep link format
 * @param {string} deepLink - Deep link cần validate
 * @returns {Object} - Kết quả validation
 */
function validateDeepLink(deepLink) {
  if (!deepLink) {
    return { isValid: true, message: null };
  }
  
  const trimmedLink = deepLink.trim();
  
  // Kiểm tra từng format
  for (const [key, format] of Object.entries(VALID_DEEP_LINK_FORMATS)) {
    if (format.pattern.test(trimmedLink)) {
      return { 
        isValid: true, 
        message: null,
        type: key,
        description: format.description
      };
    }
  }
  
  return {
    isValid: false,
    message: 'Deep link không đúng định dạng. Ví dụ: movie/123, series/456, profile, notifications'
  };
}

/**
 * Get suggestions cho deep link
 * @param {string} input - Input từ user
 * @returns {Array} - Danh sách suggestions
 */
function getDeepLinkSuggestions(input = '') {
  const suggestions = [];
  const lowerInput = input.toLowerCase();
  
  for (const [key, format] of Object.entries(VALID_DEEP_LINK_FORMATS)) {
    if (format.description.toLowerCase().includes(lowerInput) || 
        key.toLowerCase().includes(lowerInput)) {
      suggestions.push({
        value: format.example || key,
        label: `${format.description}${format.example ? ` (${format.example})` : ''}`,
        type: key
      });
    }
  }
  
  return suggestions.slice(0, 5); // Giới hạn 5 suggestions
}

/**
 * Get common deep links
 * @returns {Array} - Danh sách deep link phổ biến
 */
function getCommonDeepLinks() {
  return [
    { value: 'home', label: 'Trang chủ', description: 'Điều hướng về trang chủ' },
    { value: 'profile', label: 'Hồ sơ', description: 'Xem hồ sơ người dùng' },
    { value: 'notifications', label: 'Thông báo', description: 'Xem danh sách thông báo' },
    { value: 'settings', label: 'Cài đặt', description: 'Cài đặt ứng dụng' },
    { value: 'explore', label: 'Khám phá', description: 'Khám phá nội dung mới' },
    { value: 'recommendations', label: 'Đề xuất', description: 'Xem đề xuất cá nhân' },
    { value: 'watch-later', label: 'Xem sau', description: 'Danh sách xem sau' },
    { value: 'watching-history', label: 'Lịch sử xem', description: 'Xem lịch sử xem phim' },
    { value: 'payment/qr', label: 'Thanh toán QR', description: 'Thanh toán qua QR code' }
  ];
}

/**
 * Format deep link với ID
 * @param {string} type - Loại (movie, series, anime, genre)
 * @param {string|number} id - ID
 * @returns {string} - Deep link đã format
 */
function formatDeepLinkWithId(type, id) {
  const validTypes = ['movie', 'series', 'anime', 'genre'];
  if (!validTypes.includes(type)) {
    throw new Error('Loại không hợp lệ. Chỉ hỗ trợ: movie, series, anime, genre');
  }
  
  if (!id) {
    throw new Error('ID không được để trống');
  }
  
  return `${type}/${id}`;
}

module.exports = {
  validateDeepLink,
  getDeepLinkSuggestions,
  getCommonDeepLinks,
  formatDeepLinkWithId,
  VALID_DEEP_LINK_FORMATS
};
