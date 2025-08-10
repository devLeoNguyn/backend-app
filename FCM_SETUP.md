# 🔥 FCM Setup Guide

## Các biến môi trường cần thiết cho FCM

Thêm các biến sau vào file `.env` trong thư mục `backend-app`:

### 1. **Option 1: Sử dụng Service Account JSON File (Recommended)**

```bash
# Trong file .env
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

**Bước thực hiện:**
1. Tải service account JSON từ Firebase Console
2. Đặt file `firebase-service-account.json` trong thư mục `backend-app`
3. Thêm `GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json` vào `.env`

### 2. **Option 2: Sử dụng Service Account JSON String (Alternative)**

```bash
# Trong file .env
FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"...","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

**Bước thực hiện:**
1. Copy toàn bộ nội dung file JSON service account
2. Paste vào biến `FIREBASE_SERVICE_ACCOUNT` trong `.env`
3. Đảm bảo JSON string được escape đúng cách

## 🔧 Cách lấy Service Account JSON

### Bước 1: Firebase Console
1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Chọn project của bạn
3. Vào **Project Settings** (⚙️ icon)

### Bước 2: Service Accounts Tab
1. Click tab **Service accounts**
2. Click **Generate new private key**
3. Download file JSON

### Bước 3: Cấu hình
1. Đặt file JSON trong `backend-app/` (nếu dùng Option 1)
2. Hoặc copy JSON content vào `.env` (nếu dùng Option 2)

## 📝 Ví dụ file .env hoàn chỉnh

```bash
# Database
MONGO_URI=mongodb://localhost:27017/movie-app

# JWT Secrets
JWT_SECRET=your-jwt-secret-here
JWT_REFRESH_SECRET=your-jwt-refresh-secret-here
JWT_EXPIRES_IN=30d
JWT_REFRESH_EXPIRES_IN=7d

# Firebase Cloud Messaging (FCM)
# Option 1: Service account file
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

# Option 2: Service account JSON string (uncomment nếu dùng)
# FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}

# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your-cloudflare-account-id
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ACCOUNT_HASH=your-cloudflare-account-hash

# PayOS Payment
PAYOS_CLIENT_ID=your-payos-client-id
PAYOS_API_KEY=your-payos-api-key
PAYOS_CHECKSUM_KEY=your-payos-checksum-key
PAYOS_RETURN_URL=https://your-app.com/payment/success
PAYOS_CANCEL_URL=https://your-app.com/payment/cancel

# SMS Service
ESMS_API_KEY=your-esms-api-key
ESMS_SECRET_KEY=your-esms-secret-key

# System
SYSTEM_ADMIN_ID=6478b131b260ba24b5a8183e
NODE_ENV=development
PORT=3003
```

## ✅ Kiểm tra cấu hình

Sau khi cấu hình, kiểm tra bằng cách:

1. **Restart server**
2. **Kiểm tra logs** - sẽ thấy:
   ```
   ✅ [FCMService] Initialized with project ID: your-project-id
   ```

3. **Test FCM** bằng cách gửi notification test

## 🚨 Lưu ý quan trọng

- **Không commit** file `firebase-service-account.json` hoặc `.env` vào git
- **Backup** service account JSON file
- **Kiểm tra permissions** của service account có quyền gửi FCM
- **Test** FCM trước khi deploy production
