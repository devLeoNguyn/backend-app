// apiService.js - Service để xử lý API calls

const API_BASE_URL = 'http://YOUR_SERVER_IP:3003/api'; // Thay YOUR_SERVER_IP bằng IP thực tế

class ApiService {
  // GET user profile
  static async getUserProfile(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/users/profile?userId=${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Get user profile error:', error);
      throw error;
    }
  }

  // UPDATE user profile (với hoặc không có avatar)
  static async updateUserProfile(userId, profileData, avatarFile = null) {
    try {
      const formData = new FormData();
      
      // Thêm dữ liệu profile
      if (profileData.full_name) formData.append('full_name', profileData.full_name);
      if (profileData.phone) formData.append('phone', profileData.phone);
      if (profileData.gender) formData.append('gender', profileData.gender);
      
      // Thêm file avatar nếu có
      if (avatarFile) {
        formData.append('avatar', {
          uri: avatarFile.uri,
          type: avatarFile.type || 'image/jpeg',
          name: avatarFile.fileName || `avatar_${Date.now()}.jpg`,
        });
      }

      const response = await fetch(`${API_BASE_URL}/users/profile?userId=${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Update user profile error:', error);
      throw error;
    }
  }

  // UPLOAD avatar riêng lẻ
  static async uploadAvatar(userId, avatarFile) {
    try {
      const formData = new FormData();
      
      formData.append('avatar', {
        uri: avatarFile.uri,
        type: avatarFile.type || 'image/jpeg',
        name: avatarFile.fileName || `avatar_${Date.now()}.jpg`,
      });

      const response = await fetch(`${API_BASE_URL}/users/upload-avatar?userId=${userId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Upload avatar error:', error);
      throw error;
    }
  }
}

export default ApiService;

// Utility functions
export const validateImageFile = (file) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
  const maxSize = 2 * 1024 * 1024; // 2MB
  
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Chỉ cho phép file ảnh (JPEG, PNG, GIF)');
  }
  
  if (file.fileSize && file.fileSize > maxSize) {
    throw new Error('File quá lớn. Vui lòng chọn file nhỏ hơn 2MB');
  }
  
  return true;
};

export const getImageDimensions = (uri) => {
  return new Promise((resolve, reject) => {
    Image.getSize(
      uri,
      (width, height) => resolve({ width, height }),
      (error) => reject(error)
    );
  });
};