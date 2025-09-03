# User Hard Delete Script

Script này được tạo để xóa cứng (hard delete) user ID `685d1ce6a997f4cb37bdc816` và tất cả dữ liệu liên quan từ database để tránh lỗi user ID null.

## ⚠️ CẢNH BÁO QUAN TRỌNG

**HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!** Tất cả dữ liệu sẽ bị xóa vĩnh viễn khỏi database.

## Các bảng sẽ bị ảnh hưởng

Script sẽ xóa dữ liệu từ các bảng sau:

1. **User** - Thông tin user chính
2. **OTP** - Mã OTP của user
3. **UserNotification** - Thông báo của user
4. **Watching** - Lịch sử xem phim
5. **Favorite** - Danh sách yêu thích
6. **Rating** - Đánh giá và bình luận
7. **MovieRental** - Thuê phim
8. **MoviePayment** - Thanh toán
9. **Notification** - Thông báo do user tạo

## Cách sử dụng

### 1. Kiểm tra dữ liệu trước khi xóa

```bash
cd backend-app/scripts
node delete-user-hard.js --verify
```

Lệnh này sẽ:
- Kết nối database
- Hiển thị thông tin user
- Đếm số lượng records liên quan
- **KHÔNG XÓA** bất kỳ dữ liệu nào

### 2. Thực hiện xóa cứng

```bash
cd backend-app/scripts
node delete-user-hard.js --delete
```

Lệnh này sẽ:
- Hiển thị cảnh báo
- Chờ 3 giây để bạn có thể hủy (Ctrl+C)
- Thực hiện xóa tất cả dữ liệu trong transaction
- Hiển thị kết quả chi tiết

## Tính năng bảo mật

- **Transaction**: Tất cả thao tác xóa được thực hiện trong một transaction để đảm bảo tính nhất quán
- **Validation**: Kiểm tra format user ID trước khi thực hiện
- **Verification**: Kiểm tra user tồn tại trước khi xóa
- **Delay**: 3 giây delay trước khi xóa để có thể hủy
- **Error handling**: Xử lý lỗi chi tiết và rollback nếu cần

## Output mẫu

### Khi verify:
```
🔗 Connecting to MongoDB for verification...
🔍 Verifying data for user ID: 685d1ce6a997f4cb37bdc816
==================================================
👤 User: John Doe (john@example.com)
📱 Phone: +84123456789
👥 Role: user

📊 Related records count:
   📱 OTP: 2
   🔔 UserNotifications: 15
   📺 Watching: 8
   ❤️  Favorites: 12
   ⭐ Ratings: 5
   🎬 MovieRentals: 3
   💳 MoviePayments: 3
   📢 Notifications created: 0

📈 Total records to be deleted: 48 (including user record)
```

### Khi delete:
```
⚠️  WARNING: This will permanently delete the user and all related data!
⚠️  This action cannot be undone!
⚠️  User ID: 685d1ce6a997f4cb37bdc816

🔗 Connecting to MongoDB...
✅ Connected to MongoDB successfully

🗑️  Starting hard delete for user ID: 685d1ce6a997f4cb37bdc816
============================================================
👤 Found user: John Doe (john@example.com)

📱 Deleting OTP records...
   ✅ Deleted 2 OTP records

🔔 Deleting UserNotification records...
   ✅ Deleted 15 UserNotification records

📺 Deleting Watching history...
   ✅ Deleted 8 Watching records

❤️  Deleting Favorite records...
   ✅ Deleted 12 Favorite records

⭐ Deleting Rating records...
   ✅ Deleted 5 Rating records

🎬 Deleting MovieRental records...
   ✅ Deleted 3 MovieRental records

💳 Deleting MoviePayment records...
   ✅ Deleted 3 MoviePayment records

📢 Deleting Notifications created by user...
   ✅ Deleted 0 Notification records

👤 Deleting User record...
   ✅ Deleted 1 User record

============================================================
🎉 SUCCESS: Hard delete completed!
📊 Total records deleted: 48
👤 User ID 685d1ce6a997f4cb37bdc816 and all related data have been permanently removed
============================================================

🔌 Disconnected from MongoDB
```

## Lưu ý

1. **Backup**: Nên backup database trước khi chạy script
2. **Testing**: Test trên môi trường development trước
3. **Permission**: Đảm bảo có quyền truy cập database
4. **Network**: Đảm bảo kết nối mạng ổn định

## Troubleshooting

### Lỗi kết nối database
- Kiểm tra connection string
- Kiểm tra quyền truy cập
- Kiểm tra kết nối mạng

### Lỗi validation
- Kiểm tra format user ID
- Đảm bảo user tồn tại trong database

### Lỗi transaction
- Kiểm tra quyền write trên database
- Đảm bảo MongoDB version hỗ trợ transactions







