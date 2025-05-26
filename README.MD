# 🎬 Movie Backend API

Dự án backend API cho ứng dụng xem phim, sử dụng **Express + MongoDB + Mongoose**.

## 🎯 **Tính năng chính**

- 🔐 **Authentication**: OTP-based login qua SMS
- 🎬 **Movie Management**: CRUD phim và tập phim
- 👤 **User Management**: Quản lý profile người dùng
- 📱 **SMS Integration**: Gửi OTP qua eSMS API
- 🛡️ **Security**: JWT tokens, validation, error handling

## 🏗️ **Kiến trúc**

```
movie_backend/
├── models/          # Database schemas
├── controllers/     # Request handlers
├── routes/          # API endpoints
├── services/        # Business logic
├── middleware/      # Authentication, validation
├── validators/      # Input validation
└── config/          # Configuration files
```

## 🚀 **Cài đặt**

```bash
git clone https://github.com/yourusername/movie_backend.git
cd movie_backend
npm install
cp .env.example .env
# Cấu hình .env với MongoDB URI và SMS API keys
npm run dev
```

## 📊 **Database Schema**

### User Model
```javascript
{
  full_name: String,
  email: String (unique),
  phone: String (unique),
  password: String,
  is_phone_verified: Boolean
}
```

### Movie Model
```javascript
{
  title: String,
  description: String,
  category: String,
  release_date: Date,
  poster_url: String,
  trailer_url: String
}
```

### Episode Model
```javascript
{
  movie_id: ObjectId,
  title: String,
  episode_number: Number,
  duration: Number,
  video_url: String
}
```

## 🔐 **Authentication Flow**

1. **Đăng ký**: `POST /api/auth/send-otp` → `POST /api/auth/verify-otp` → `POST /api/auth/register-with-otp`
2. **Đăng nhập**: `POST /api/auth/request-login-otp` → `POST /api/auth/login-with-otp`
3. **Refresh**: `POST /api/auth/refresh-token`

## 📡 **API Endpoints**

### Public APIs (Không cần auth)
```
GET    /api/movies/new-week     # Phim mới
GET    /api/movies/:id          # Chi tiết phim
GET    /api/episodes/:id        # Chi tiết tập phim
POST   /api/auth/*              # Authentication
```

### Protected APIs (Cần JWT token)
```
GET    /api/users/me            # Profile cá nhân
PUT    /api/users/me            # Cập nhật profile
POST   /api/movies              # Thêm phim
PUT    /api/movies/:id          # Sửa phim
DELETE /api/movies/:id          # Xóa phim
POST   /api/episodes            # Thêm tập phim
PUT    /api/episodes/:id        # Sửa tập phim
DELETE /api/episodes/:id        # Xóa tập phim
```

## 🛠️ **Tech Stack**

- **Backend**: Node.js + Express.js
- **Database**: MongoDB + Mongoose
- **Authentication**: JWT + OTP
- **SMS Service**: eSMS API
- **Validation**: express-validator
- **Security**: bcrypt, helmet

## 🎓 **Học được gì từ dự án**

1. **MVC Architecture**: Tách biệt concerns rõ ràng
2. **RESTful API Design**: Thiết kế API chuẩn
3. **Authentication**: JWT + OTP system
4. **Database Design**: MongoDB relationships
5. **Security**: Best practices bảo mật
6. **Error Handling**: Xử lý lỗi professional
7. **Service Layer**: Business logic tách biệt

## 👨‍💻 **Tác giả**

**Nguyễn Quang Lộc** - Sinh viên IT  
📧 Email: your.email@example.com  
🔗 GitHub: [github.com/yourusername](https://github.com/yourusername)

---

⭐ **Star repo nếu bạn thấy hữu ích!**
