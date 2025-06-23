# Frontend Integration Guide - Hệ Thống Thuê Phim

## Tổng quan tích hợp

Frontend React Native (Expo) cần tích hợp với backend để:
1. Hiển thị gói thuê phim
2. Xử lý thanh toán PayOS
3. Kiểm tra quyền xem phim
4. Quản lý lịch sử thuê phim

## 1. Service Layer (React Native)

### rentalService.ts

```typescript
import { Linking } from 'react-native';

interface RentalOption {
  type: '48h' | '30d';
  price: number;
  description: string;
}

interface RentalResponse {
  success: boolean;
  data: {
    orderCode: string;
    checkoutUrl: string;
    amount: number;
    rentalType: string;
    movieTitle: string;
    qrCode: string;
  };
}

interface RentalStatus {
  hasAccess: boolean;
  rental?: any;
  remainingTime?: number;
  remainingHours?: number;
  remainingDays?: number;
  message: string;
}

class RentalService {
  private baseURL = 'http://your-backend-url/api/rentals';

  /**
   * Tạo order thuê phim
   */
  async createRentalOrder(
    userId: string, 
    movieId: string, 
    rentalType: '48h' | '30d'
  ): Promise<RentalResponse> {
    const response = await fetch(`${this.baseURL}/rent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        movieId,
        rentalType
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }

    return data;
  }

  /**
   * Xác nhận thanh toán
   */
  async confirmRentalPayment(orderCode: string, userId: string) {
    const response = await fetch(`${this.baseURL}/confirm-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        orderCode,
        userId
      })
    });

    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }

    return data;
  }

  /**
   * Kiểm tra quyền xem phim
   */
  async checkRentalAccess(userId: string, movieId: string): Promise<RentalStatus> {
    const response = await fetch(`${this.baseURL}/status/${movieId}?userId=${userId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  }

  /**
   * Lấy lịch sử thuê phim
   */
  async getRentalHistory(userId: string, page = 1, limit = 10) {
    const response = await fetch(
      `${this.baseURL}/history?userId=${userId}&page=${page}&limit=${limit}`
    );
    const data = await response.json();
    
    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data;
  }

  /**
   * Mở PayOS checkout
   */
  async openPayOSCheckout(checkoutUrl: string) {
    const supported = await Linking.canOpenURL(checkoutUrl);
    
    if (supported) {
      await Linking.openURL(checkoutUrl);
    } else {
      throw new Error('Không thể mở trang thanh toán');
    }
  }

  /**
   * Tính giá thuê dựa trên giá phim
   */
  calculateRentalPrice(moviePrice: number, rentalType: '48h' | '30d'): number {
    const multiplier = rentalType === '48h' ? 0.3 : 0.5;
    return Math.round(moviePrice * multiplier);
  }

  /**
   * Format thời gian còn lại
   */
  formatRemainingTime(remainingTime: number): string {
    const hours = Math.floor(remainingTime / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} ngày ${hours % 24} giờ`;
    }
    
    return `${hours} giờ`;
  }
}

export const rentalService = new RentalService();
```

## 2. Components

### RentalOptionsModal.tsx

```tsx
import React, { useState } from 'react';
import { 
  View, 
  Text, 
  Modal, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator 
} from 'react-native';
import { rentalService } from '../services/rentalService';

interface Props {
  visible: boolean;
  onClose: () => void;
  movie: {
    _id: string;
    title: string;
    price: number;
  };
  userId: string;
}

export const RentalOptionsModal: React.FC<Props> = ({ 
  visible, 
  onClose, 
  movie, 
  userId 
}) => {
  const [loading, setLoading] = useState(false);

  const rentalOptions = [
    {
      type: '48h' as const,
      title: 'Thuê 48 giờ',
      price: rentalService.calculateRentalPrice(movie.price, '48h'),
      description: 'Xem phim trong 48 giờ kể từ khi thanh toán thành công'
    },
    {
      type: '30d' as const,
      title: 'Thuê 30 ngày',
      price: rentalService.calculateRentalPrice(movie.price, '30d'),
      description: 'Xem phim trong 30 ngày kể từ khi thanh toán thành công'
    }
  ];

  const handleRental = async (rentalType: '48h' | '30d') => {
    try {
      setLoading(true);
      
      const result = await rentalService.createRentalOrder(
        userId, 
        movie._id, 
        rentalType
      );

      // Mở PayOS checkout
      await rentalService.openPayOSCheckout(result.data.checkoutUrl);
      
      // Đóng modal
      onClose();
      
      // TODO: Navigate to payment confirmation screen
      // navigation.navigate('PaymentConfirmation', { 
      //   orderCode: result.data.orderCode 
      // });

    } catch (error) {
      Alert.alert('Lỗi', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Chọn gói thuê phim</Text>
          <Text style={styles.movieTitle}>{movie.title}</Text>
          
          {rentalOptions.map((option) => (
            <TouchableOpacity
              key={option.type}
              style={styles.optionButton}
              onPress={() => handleRental(option.type)}
              disabled={loading}
            >
              <View style={styles.optionHeader}>
                <Text style={styles.optionTitle}>{option.title}</Text>
                <Text style={styles.optionPrice}>
                  {option.price.toLocaleString('vi-VN')} VNĐ
                </Text>
              </View>
              <Text style={styles.optionDescription}>
                {option.description}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={onClose}
            disabled={loading}
          >
            <Text style={styles.closeButtonText}>Đóng</Text>
          </TouchableOpacity>

          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Đang tạo order...</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 400,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  movieTitle: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 20,
  },
  optionButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#444',
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  optionPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  optionDescription: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 20,
  },
  closeButton: {
    backgroundColor: '#444',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  loadingText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 16,
  },
});
```

### RentalStatusBanner.tsx

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { rentalService } from '../services/rentalService';

interface Props {
  userId: string;
  movieId: string;
  onRentalExpired?: () => void;
}

export const RentalStatusBanner: React.FC<Props> = ({ 
  userId, 
  movieId, 
  onRentalExpired 
}) => {
  const [rentalStatus, setRentalStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkRentalStatus();
    
    // Check status every minute
    const interval = setInterval(checkRentalStatus, 60000);
    
    return () => clearInterval(interval);
  }, [userId, movieId]);

  const checkRentalStatus = async () => {
    try {
      const status = await rentalService.checkRentalAccess(userId, movieId);
      setRentalStatus(status);
      
      if (!status.hasAccess && rentalStatus?.hasAccess) {
        // Rental just expired
        onRentalExpired?.();
      }
    } catch (error) {
      console.error('Error checking rental status:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !rentalStatus?.hasAccess) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🎬 Đang thuê phim</Text>
        <Text style={styles.message}>{rentalStatus.message}</Text>
      </View>
      <TouchableOpacity onPress={checkRentalStatus}>
        <Text style={styles.refreshText}>Làm mới</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderColor: '#007AFF',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    margin: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  message: {
    color: '#fff',
    fontSize: 12,
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
```

## 3. Video Player Integration

### Cập nhật VideoPlayer để kiểm tra quyền xem

```tsx
// Trong VideoPlayer component
useEffect(() => {
  const checkAccess = async () => {
    try {
      const status = await rentalService.checkRentalAccess(userId, movieId);
      
      if (!status.hasAccess) {
        // Show rental options modal
        setShowRentalModal(true);
        return;
      }
      
      // Load video if has access
      loadVideoStream();
      
    } catch (error) {
      console.error('Access check failed:', error);
    }
  };

  checkAccess();
}, [userId, movieId]);
```

## 4. Payment Confirmation Screen

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { rentalService } from '../services/rentalService';

interface Props {
  route: {
    params: {
      orderCode: string;
      userId: string;
    };
  };
  navigation: any;
}

export const PaymentConfirmationScreen: React.FC<Props> = ({ route, navigation }) => {
  const { orderCode, userId } = route.params;
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    // Auto-check payment status when screen loads
    handleConfirmPayment();
  }, []);

  const handleConfirmPayment = async () => {
    try {
      setConfirming(true);
      
      const result = await rentalService.confirmRentalPayment(orderCode, userId);
      
      setConfirmed(true);
      Alert.alert(
        'Thành công!', 
        result.message,
        [
          {
            text: 'Xem phim ngay',
            onPress: () => navigation.goBack()
          }
        ]
      );
      
    } catch (error) {
      Alert.alert('Lỗi', error.message);
    } finally {
      setConfirming(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Xác nhận thanh toán</Text>
      <Text style={styles.orderCode}>Mã đơn hàng: {orderCode}</Text>
      
      {!confirmed && (
        <TouchableOpacity 
          style={styles.confirmButton}
          onPress={handleConfirmPayment}
          disabled={confirming}
        >
          <Text style={styles.confirmButtonText}>
            {confirming ? 'Đang xác nhận...' : 'Xác nhận thanh toán'}
          </Text>
        </TouchableOpacity>
      )}
      
      {confirmed && (
        <View style={styles.successContainer}>
          <Text style={styles.successText}>✅ Thanh toán thành công!</Text>
          <TouchableOpacity 
            style={styles.watchButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.watchButtonText}>Xem phim ngay</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};
```

## 5. Rental History Screen

```tsx
import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  Image, 
  TouchableOpacity,
  RefreshControl 
} from 'react-native';
import { rentalService } from '../services/rentalService';

export const RentalHistoryScreen: React.FC = () => {
  const [rentals, setRentals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadRentalHistory();
  }, []);

  const loadRentalHistory = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setPage(1);
      }

      const result = await rentalService.getRentalHistory(
        userId, 
        isRefresh ? 1 : page
      );
      
      if (isRefresh) {
        setRentals(result.rentals);
      } else {
        setRentals(prev => [...prev, ...result.rentals]);
      }
      
    } catch (error) {
      console.error('Error loading rental history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const renderRentalItem = ({ item }) => (
    <View style={styles.rentalItem}>
      <Image source={{ uri: item.movieId.poster }} style={styles.poster} />
      <View style={styles.rentalInfo}>
        <Text style={styles.movieTitle}>{item.movieId.title}</Text>
        <Text style={styles.rentalType}>Gói: {item.rentalType}</Text>
        <Text style={styles.status}>
          Trạng thái: {item.status === 'active' ? 'Đang hoạt động' : 'Đã hết hạn'}
        </Text>
        <Text style={styles.dates}>
          {new Date(item.startTime).toLocaleDateString()} - 
          {new Date(item.endTime).toLocaleDateString()}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={rentals}
        renderItem={renderRentalItem}
        keyExtractor={(item) => item._id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRentalHistory(true)}
            tintColor="#fff"
          />
        }
        onEndReached={() => {
          if (!loading) {
            setPage(prev => prev + 1);
            loadRentalHistory();
          }
        }}
        onEndReachedThreshold={0.1}
      />
    </View>
  );
};
```

## 6. Environment Configuration

### .env trong React Native project

```env
# Backend API URL
EXPO_PUBLIC_API_URL=http://localhost:3000/api

# PayOS URLs (optional, có thể config từ backend)
EXPO_PUBLIC_PAYOS_RETURN_URL=exp://localhost:19000/--/payment-success
EXPO_PUBLIC_PAYOS_CANCEL_URL=exp://localhost:19000/--/payment-cancel
```

## 7. Deep Linking cho PayOS Return

### app.json

```json
{
  "expo": {
    "scheme": "movieapp",
    "web": {
      "bundler": "metro"
    }
  }
}
```

### App.tsx

```tsx
import { Linking } from 'expo-linking';

// Handle deep linking from PayOS
useEffect(() => {
  const handleDeepLink = (url: string) => {
    const { path, queryParams } = Linking.parse(url);
    
    if (path === 'payment-success') {
      // Navigate to payment confirmation
      navigation.navigate('PaymentConfirmation', {
        orderCode: queryParams?.orderCode,
        userId: queryParams?.userId
      });
    }
  };

  const subscription = Linking.addEventListener('url', ({ url }) => {
    handleDeepLink(url);
  });

  return () => subscription?.remove();
}, []);
```

## 8. Testing

### Manual Testing Steps

1. **Tạo rental order**
   ```bash
   curl -X POST http://localhost:3000/api/rentals/rent \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "USER_ID",
       "movieId": "MOVIE_ID", 
       "rentalType": "48h"
     }'
   ```

2. **Kiểm tra access**
   ```bash
   curl "http://localhost:3000/api/rentals/status/MOVIE_ID?userId=USER_ID"
   ```

3. **Test cron jobs**
   ```bash
   curl -X POST http://localhost:3000/api/rentals/cron/manual-check
   ```

Hệ thống thuê phim đã được triển khai hoàn chỉnh với tích hợp PayOS, cron jobs, và frontend React Native! 