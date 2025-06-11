import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';

// Cấu hình API - THAY ĐỔI IP NÀY
const API_BASE_URL = 'http://192.168.1.100:3003/api'; // Thay bằng IP máy server của bạn

const ProfileEditScreen = ({ navigation, route }) => {
  const [user, setUser] = useState({
    full_name: '',
    email: '',
    phone: '',
    gender: 'Nam',
    avatar: null
  });
  const [loading, setLoading] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  
  // Lấy userId từ navigation params hoặc AsyncStorage
  const [userId] = useState(route?.params?.userId || 'USER_ID_HERE');

  const genderOptions = ['Nam', 'Nữ', 'Khác'];

  // Load user profile khi component mount
  useEffect(() => {
    loadUserProfile();
  }, []);

  // Function load thông tin user
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      console.log('📱 Loading user profile...');
      
      const response = await fetch(`${API_BASE_URL}/users/profile?userId=${userId}`);
      const data = await response.json();
      
      console.log('📱 Profile response:', data);
      
      if (data.status === 'success') {
        const userData = data.data.user;
        setUser({
          full_name: userData.full_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          gender: userData.gender === 'male' ? 'Nam' : userData.gender === 'female' ? 'Nữ' : 'Khác',
          avatar: userData.avatar
        });
        console.log('✅ Profile loaded successfully');
      } else {
        Alert.alert('Lỗi', data.message);
      }
    } catch (error) {
      console.error('❌ Load profile error:', error);
      Alert.alert('Lỗi', 'Không thể tải thông tin profile');
    } finally {
      setLoading(false);
    }
  };

  // Function chọn ảnh từ thư viện hoặc camera
  const pickImage = () => {
    Alert.alert(
      'Chọn ảnh đại diện',
      'Bạn muốn chọn ảnh từ đâu?',
      [
        { text: 'Hủy', style: 'cancel' },
        { text: 'Thư viện', onPress: () => openImageLibrary() },
        { text: 'Camera', onPress: () => openCamera() },
      ]
    );
  };

  // Mở thư viện ảnh
  const openImageLibrary = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Cần cấp quyền', 'Vui lòng cấp quyền truy cập thư viện ảnh');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('📱 Image selected from library:', result.assets[0]);
        updateProfile(result.assets[0]);
      }
    } catch (error) {
      console.error('❌ Image picker error:', error);
      Alert.alert('Lỗi', 'Không thể chọn ảnh');
    }
  };

  // Mở camera
  const openCamera = async () => {
    try {
      const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
      
      if (!permissionResult.granted) {
        Alert.alert('Cần cấp quyền', 'Vui lòng cấp quyền sử dụng camera');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('📱 Image captured from camera:', result.assets[0]);
        updateProfile(result.assets[0]);
      }
    } catch (error) {
      console.error('❌ Camera error:', error);
      Alert.alert('Lỗi', 'Không thể mở camera');
    }
  };

  // Function cập nhật profile
  const updateProfile = async (avatarFile = null) => {
    try {
      // Validation
      if (!user.full_name.trim()) {
        Alert.alert('Lỗi', 'Vui lòng nhập họ và tên');
        return;
      }

      setLoading(true);

      console.log('📱 Updating profile:', {
        userId,
        full_name: user.full_name,
        gender: user.gender,
        hasAvatar: !!avatarFile
      });

      // Tạo FormData
      const formData = new FormData();
      formData.append('full_name', user.full_name.trim());
      
      // Convert giới tính về format backend
      const genderValue = user.gender === 'Nam' ? 'male' : user.gender === 'Nữ' ? 'female' : 'other';
      formData.append('gender', genderValue);

      // Thêm file avatar nếu có
      if (avatarFile) {
        console.log('📱 Adding avatar file:', {
          uri: avatarFile.uri,
          type: avatarFile.type,
          fileName: avatarFile.fileName
        });
        
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
      console.log('📱 Update response:', data);

      if (data.status === 'success') {
        const userData = data.data.user;
        setUser({
          full_name: userData.full_name || '',
          email: userData.email || '',
          phone: userData.phone || '',
          gender: userData.gender === 'male' ? 'Nam' : userData.gender === 'female' ? 'Nữ' : 'Khác',
          avatar: userData.avatar
        });
        
        Alert.alert('Thành công', 'Cập nhật thông tin thành công!', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
        console.log('✅ Profile updated successfully');
      } else {
        Alert.alert('Lỗi', data.message);
        console.error('❌ Update failed:', data.message);
      }
    } catch (error) {
      console.error('❌ Update profile error:', error);
      Alert.alert('Lỗi', 'Không thể cập nhật thông tin');
    } finally {
      setLoading(false);
    }
  };

  // Component Gender Picker
  const GenderPicker = () => (
    <TouchableOpacity 
      style={styles.genderInput}
      onPress={() => setShowGenderPicker(true)}
    >
      <Text style={styles.genderText}>{user.gender}</Text>
      <Ionicons name="chevron-down" size={20} color="#666" />
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E53E3E" />
        <Text style={styles.loadingText}>Đang xử lý...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chỉnh sửa hồ sơ</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
            {user.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color="#999" />
              </View>
            )}
            <View style={styles.editIconContainer}>
              <Ionicons name="camera" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        {/* Form Fields */}
        <View style={styles.formSection}>
          {/* Họ và tên */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Họ và tên</Text>
            <TextInput
              style={styles.textInput}
              value={user.full_name}
              onChangeText={(text) => setUser({ ...user, full_name: text })}
              placeholder="Nhập họ và tên"
              placeholderTextColor="#999"
            />
          </View>

          {/* Giới tính */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Giới tính</Text>
            <GenderPicker />
          </View>

          {/* Số điện thoại (readonly) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Số điện thoại</Text>
            <TextInput
              style={[styles.textInput, styles.readonlyInput]}
              value={user.phone}
              editable={false}
              placeholder="Số điện thoại"
              placeholderTextColor="#999"
            />
          </View>

          {/* Email (readonly) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.fieldLabel}>Email</Text>
            <TextInput
              style={[styles.textInput, styles.readonlyInput]}
              value={user.email}
              editable={false}
              placeholder="Email"
              placeholderTextColor="#999"
            />
          </View>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={styles.saveButtonContainer}>
        <TouchableOpacity 
          style={styles.saveButton}
          onPress={() => updateProfile()}
          disabled={loading}
        >
          <Text style={styles.saveButtonText}>Lưu</Text>
        </TouchableOpacity>
      </View>

      {/* Gender Picker Modal */}
      {showGenderPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <Text style={styles.pickerTitle}>Chọn giới tính</Text>
            {genderOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.pickerOption,
                  user.gender === option && styles.pickerOptionSelected
                ]}
                onPress={() => {
                  setUser({ ...user, gender: option });
                  setShowGenderPicker(false);
                }}
              >
                <Text style={[
                  styles.pickerOptionText,
                  user.gender === option && styles.pickerOptionTextSelected
                ]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.pickerCancel}
              onPress={() => setShowGenderPicker(false)}
            >
              <Text style={styles.pickerCancelText}>Hủy</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#FFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: '#000',
  },
  backButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
  },
  content: {
    flex: 1,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#007AFF',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formSection: {
    paddingHorizontal: 20,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#999',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#FFF',
    borderWidth: 1,
    borderColor: '#333',
  },
  readonlyInput: {
    backgroundColor: '#1A1A1A',
    color: '#666',
  },
  genderInput: {
    backgroundColor: '#2A2A2A',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  genderText: {
    fontSize: 16,
    color: '#FFF',
  },
  saveButtonContainer: {
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  saveButton: {
    backgroundColor: '#E53E3E',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerModal: {
    backgroundColor: '#2A2A2A',
    borderRadius: 10,
    padding: 20,
    margin: 20,
    minWidth: 250,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    marginBottom: 20,
  },
  pickerOption: {
    padding: 15,
    borderRadius: 8,
    marginBottom: 5,
  },
  pickerOptionSelected: {
    backgroundColor: '#E53E3E',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
  },
  pickerOptionTextSelected: {
    fontWeight: '600',
  },
  pickerCancel: {
    marginTop: 10,
    padding: 15,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  pickerCancelText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
  },
});

export default ProfileEditScreen; 