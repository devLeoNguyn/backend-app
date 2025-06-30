# 📋 Movie Backend API Documentation Structure

Hệ thống API documentation đã được tách thành hai file riêng biệt để tối ưu hóa cho từng đối tượng sử dụng.

## 📁 Cấu Trúc Files

### 1. `swagger.yaml` - Frontend APIs
**🎯 Đối tượng:** Frontend developers, Mobile app development  
**📱 Chức năng:** Tất cả APIs cần thiết cho ứng dụng mobile/web

**Bao gồm:**
- ✅ Authentication & User management (frontend)
- ✅ Movie browsing & search
- ✅ Video streaming & playback
- ✅ User interactions (like, favorite, comment)
- ✅ Rental system (user perspective)
- ✅ Home page & series content
- ✅ Genre browsing (read-only)

### 2. `admin-swagger.yaml` - Admin APIs  
**🎯 Đối tượng:** Admin dashboard, Backend management  
**🔐 Chức năng:** Quản lý và administração hệ thống

**Bao gồm:**
- ✅ Genre CRUD operations
- ✅ Media upload management (images/videos)
- ✅ Rental statistics & analytics
- ✅ Cron job monitoring & control
- ✅ User analytics & reports
- ✅ Video processing status

## 🚀 Lợi Ích Của Việc Tách

### 📱 Frontend Team
- **Tập trung:** Chỉ thấy APIs liên quan đến frontend
- **Đơn giản:** Ít endpoint phức tạp, dễ implement
- **Bảo mật:** Không expose admin endpoints
- **Performance:** Documentation nhẹ hơn, load nhanh hơn

### 🔐 Admin Team  
- **Chuyên biệt:** Tập trung vào management & analytics
- **Chi tiết:** Có thêm metadata cho troubleshooting
- **Bảo mật:** Riêng biệt với frontend, control access tốt hơn
- **Mở rộng:** Dễ thêm admin features mới

## 📖 Cách Sử Dụng

### Cho Frontend Development:
```bash
# Chỉ sử dụng file này
backend/swagger.yaml
```

### Cho Admin Dashboard:
```bash  
# Sử dụng file này
backend/admin-swagger.yaml
```

### Integration với Tools:

#### Swagger UI:
```bash
# Frontend APIs
http://localhost:3003/api-docs

# Admin APIs  
http://localhost:3003/admin-docs
```

#### Code Generation:
```bash
# Generate frontend client
swagger-codegen generate -i swagger.yaml -l typescript-fetch -o frontend-client/

# Generate admin client  
swagger-codegen generate -i admin-swagger.yaml -l typescript-fetch -o admin-client/
```

## 🔄 Version History

### v1.4.0 (Current)
- ✅ Tách admin APIs sang file riêng
- ✅ Frontend-focused documentation
- ✅ Simplified authentication model
- ✅ Improved API consistency

### v1.3.0 (Previous)
- ✅ API consistency improvements
- ✅ Unified movie detail endpoint
- ❌ Removed duplicate endpoints

## 📋 API Endpoints Summary

### Frontend APIs (swagger.yaml)
```
Authentication:     /api/auth/*
User Profile:       /api/users/profile  
Movies:            /api/movies/*
Video Streaming:   /api/video-url/*
Interactions:      /api/ratings/*, /api/favorites/*
Rentals:           /api/rentals/* (user operations)
Home Content:      /api/home/*
Series Content:    /api/series/*
Genres:            /api/genres (read-only)
```

### Admin APIs (admin-swagger.yaml)  
```
Genre Management:   /api/genres/* (CRUD)
Media Upload:       /api/upload/*
Video Management:   /api/video-url/*/status
Rental Analytics:   /api/rentals/stats/*
Cron Management:    /api/rentals/cron/*
User Analytics:     /api/users/*/interactions/summary
```

## 🛠️ Development Workflow

### Frontend Development:
1. Mở `swagger.yaml` trong Swagger UI
2. Focus vào endpoints cần thiết cho app
3. Implement theo user flows
4. Không cần quan tâm admin complexity

### Admin Development:
1. Mở `admin-swagger.yaml` trong Swagger UI  
2. Có access đến management tools
3. Implement dashboard features
4. Monitor system health

## 📞 Support

- **Frontend Issues:** Contact frontend-team@movieapp.com
- **Admin Issues:** Contact admin@movieapp.com
- **General:** Reference both files for complete API coverage 