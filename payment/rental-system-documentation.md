# Hệ Thống Thuê Phim - Tài Liệu Hướng Dẫn

## Tổng quan
Hệ thống thuê phim cho phép người dùng thuê phim với 2 loại gói:
- **Gói 48 giờ**: Xem phim trong 48 giờ kể từ khi thanh toán thành công
- **Gói 30 ngày**: Xem phim trong 30 ngày kể từ khi thanh toán thành công

## Kiến trúc hệ thống

### Backend Components
1. **Models**
   - `MovieRental.js`: Model quản lý thông tin thuê phim
   - `MoviePayment.js`: Model thanh toán (đã có sẵn)

2. **Controllers**
   - `rental.controller.js`: Xử lý logic thuê phim
   - Cập nhật `payment.controller.js`: Tích hợp logic thuê phim

3. **Services**
   - `rental.service.js`: Business logic cho thuê phim
   - `cron.service.js`: Cron job quản lý hết hạn thuê

4. **Routes**
   - `rental.routes.js`: API endpoints cho thuê phim

### Cron Jobs
- **Kiểm tra hết hạn**: Chạy mỗi giờ để kiểm tra và cập nhật trạng thái thuê phim
- **Thông báo sắp hết hạn**: Thông báo trước 2 giờ khi thuê phim sắp hết hạn

## API Endpoints

### 1. Thuê phim
```
POST /api/rentals/rent
Body: {
  "userId": "string",
  "movieId": "string", 
  "rentalType": "48h" | "30d",
  "amount": number
}
```

### 2. Kiểm tra trạng thái thuê
```
GET /api/rentals/status/:movieId?userId=string
```

### 3. Lịch sử thuê phim
```
GET /api/rentals/history?userId=string&page=1&limit=10
```

### 4. Xác nhận thanh toán
```
POST /api/rentals/confirm-payment
Body: {
  "orderCode": "string",
  "userId": "string"
}
```

## Quy trình thuê phim

### 1. Người dùng chọn thuê phim
1. Chọn phim muốn thuê
2. Chọn loại gói (48h/30d)
3. Hệ thống tạo order PayOS
4. Chuyển hướng đến trang thanh toán

### 2. Xử lý thanh toán
1. PayOS xử lý thanh toán
2. Webhook nhận thông báo thanh toán thành công
3. Kích hoạt quyền xem phim
4. Bắt đầu đếm thời gian thuê

### 3. Quản lý thời gian thuê
1. Cron job chạy mỗi giờ
2. Kiểm tra các rental sắp hết hạn
3. Gửi thông báo (nếu có)
4. Vô hiệu hóa quyền xem khi hết hạn

## Cấu trúc Database

### MovieRental Schema
```javascript
{
  userId: ObjectId,
  movieId: ObjectId,
  paymentId: ObjectId,
  rentalType: '48h' | '30d',
  startTime: Date,
  endTime: Date,
  status: 'active' | 'expired' | 'cancelled',
  createdAt: Date,
  updatedAt: Date
}
```

## Tích hợp Frontend (React Native)

### 1. Màn hình thuê phim
```javascript
// Component hiển thị gói thuê phim
<RentalOptions movieId={movieId} />
```

### 2. Xử lý thanh toán
```javascript
// Tạo order và chuyển đến PayOS
const handleRental = async (rentalType) => {
  const response = await api.post('/rentals/rent', {
    movieId,
    rentalType,
    userId
  });
  
  // Mở PayOS checkout
  Linking.openURL(response.data.checkoutUrl);
};
```

### 3. Kiểm tra quyền xem
```javascript
// Kiểm tra trước khi phát video
const checkRentalStatus = async () => {
  const status = await api.get(`/rentals/status/${movieId}?userId=${userId}`);
  return status.data.hasAccess;
};
```

## Cấu hình PayOS

### Environment Variables
```env
PAYOS_CLIENT_ID=your_client_id
PAYOS_API_KEY=your_api_key
PAYOS_CHECKSUM_KEY=your_checksum_key
PAYOS_RETURN_URL=your_return_url
PAYOS_CANCEL_URL=your_cancel_url
```

### Webhook Configuration
```javascript
// Webhook endpoint để nhận thông báo từ PayOS
POST /api/payments/webhook
```

## Bảo mật

### 1. Xác thực
- Kiểm tra userId trong mọi request
- Validate quyền truy cập phim

### 2. Thanh toán
- Verify webhook signature từ PayOS
- Double-check trạng thái thanh toán

### 3. Rate Limiting
- Giới hạn số lần tạo order/giờ
- Prevent spam rental requests

## Monitoring & Logging

### 1. Logs quan trọng
- Rental transactions
- Payment confirmations  
- Cron job executions
- Access violations

### 2. Metrics
- Revenue theo thời gian
- Phim được thuê nhiều nhất
- Conversion rate
- Churn rate

## Deployment

### 1. Production Checklist
- [ ] Cấu hình PayOS production credentials
- [ ] Setup cron job service
- [ ] Configure webhook endpoints
- [ ] Test payment flow end-to-end
- [ ] Monitor system performance

### 2. Backup Strategy
- Database backup hàng ngày
- Transaction logs backup
- Recovery procedures documented

## Troubleshooting

### Common Issues
1. **PayOS timeout**: Retry mechanism với exponential backoff
2. **Cron job fails**: Alert system và manual recovery
3. **Double payments**: Idempotency checks
4. **Expired rentals**: Grace period handling

### Debug Tools
- Payment transaction logs
- Rental status checker
- Cron job status dashboard 