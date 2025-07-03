# Cải Tiến Quản Lý Phim - Admin Dashboard

## 1. CRUD Operations cho Movies

### API Endpoints cần thêm
```
POST /api/admin/movies - Tạo phim mới
PUT /api/admin/movies/:id - Cập nhật phim
DELETE /api/admin/movies/:id - Xóa phim
GET /api/admin/movies/:id - Lấy chi tiết phim
```

### Yêu cầu
- [ ] Implement đầy đủ CRUD operations
- [ ] Validation dữ liệu đầu vào
- [ ] Error handling
- [ ] Response format chuẩn
- [ ] Authentication & Authorization

## 2. Cải Thiện Movie Model

### Thêm các trường mới
```typescript
{
  duration: Number,        // Thời lượng phim (phút)
  release_year: Number,    // Năm phát hành
  country: String,         // Quốc gia sản xuất
  age_rating: String,      // Phân loại độ tuổi (P, C13, C16, C18)
  trailer_url: String,     // URL trailer
  status: {
    type: String,
    enum: ['draft', 'published', 'hidden'],
    default: 'draft'
  }
}
```

### Yêu cầu
- [ ] Cập nhật MongoDB schema
- [ ] Migration data cũ
- [ ] Update các API liên quan
- [ ] Update validation

## 3. Validation Nâng Cao

### Yêu cầu
- [ ] Tạo validator riêng cho admin operations
- [ ] Validate các trường bắt buộc
- [ ] Validate định dạng dữ liệu:
  - URL (poster, trailer)
  - Năm phát hành (không được lớn hơn năm hiện tại)
  - Thời lượng (số dương)
  - Giá tiền (số không âm)
- [ ] Kiểm tra trùng lặp tên phim
- [ ] Sanitize input data

## 4. Tính Năng Quản Lý Nâng Cao

### Bulk Actions
- [ ] Xóa nhiều phim
- [ ] Cập nhật trạng thái nhiều phim
- [ ] Thay đổi thể loại hàng loạt

### Filter và Search
- [ ] Filter theo:
  - Năm phát hành
  - Thể loại
  - Trạng thái
  - Giá tiền
  - Quốc gia
- [ ] Search nâng cao với nhiều tiêu chí
- [ ] Sort theo nhiều trường
- [ ] Phân trang với limit/offset

### Export Data
- [ ] Export to CSV
- [ ] Export to Excel
- [ ] Chọn trường để export
- [ ] Filter trước khi export

## 5. Quản Lý Media

### Upload
- [ ] Upload poster
- [ ] Upload backdrop
- [ ] Upload trailer
- [ ] Tích hợp với Cloudflare
- [ ] Preview trước khi upload
- [ ] Validate file size và format
- [ ] Progress indicator
- [ ] Error handling

### Media Management
- [ ] Quản lý thư viện ảnh
- [ ] Resize và optimize ảnh
- [ ] Generate thumbnails
- [ ] Delete unused media

## 6. Analytics và Thống Kê

### Metrics
- [ ] Số lượt xem theo thời gian
- [ ] Doanh thu theo phim
- [ ] Đánh giá trung bình
- [ ] Số lượng bình luận
- [ ] Thời gian xem trung bình

### Visualizations
- [ ] Biểu đồ theo thời gian
- [ ] Heat maps
- [ ] Top performers
- [ ] Export reports

## 7. Quản Lý Episodes

### Features
- [ ] CRUD operations cho episodes
- [ ] Bulk upload episodes
- [ ] Sắp xếp thứ tự episodes
- [ ] Preview episode
- [ ] Quản lý trạng thái episodes
- [ ] Link với Cloudflare Stream

## 8. UI/UX Improvements

### Forms
- [ ] Form tạo/sửa phim với validation
- [ ] Preview thông tin phim
- [ ] Drag & drop upload
- [ ] Rich text editor cho mô tả
- [ ] Auto-save draft
- [ ] Form validation realtime

### Interactions
- [ ] Modal xác nhận các hành động quan trọng
- [ ] Loading states
- [ ] Error states
- [ ] Success feedback
- [ ] Keyboard shortcuts

## 9. Performance Optimization

### Backend
- [ ] Implement caching (Redis)
- [ ] Optimize database queries
- [ ] Index optimization
- [ ] Rate limiting
- [ ] Request validation

### Frontend
- [ ] Lazy loading components
- [ ] Infinite scroll
- [ ] Image optimization
- [ ] Bundle optimization
- [ ] State management optimization

## 10. Logging và Audit

### Logging
- [ ] Log mọi thay đổi
- [ ] Log errors
- [ ] Log performance metrics
- [ ] Log security events

### Audit
- [ ] Lưu lịch sử chỉnh sửa
- [ ] Tracking người thực hiện
- [ ] Khôi phục phiên bản cũ
- [ ] Export audit logs

## Ưu Tiên Triển Khai

1. CRUD Operations (1-2 tuần)
2. Validation & Model Updates (1 tuần)
3. Media Management (1-2 tuần)
4. UI/UX Improvements (2 tuần)
5. Các tính năng còn lại (4-6 tuần)

## Tech Stack

- Backend: Node.js, Express, MongoDB
- Frontend: React, TypeScript, Material-UI
- Storage: Cloudflare Stream
- Cache: Redis
- Analytics: MongoDB Aggregation 