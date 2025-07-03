# QUY TRÌNH TÍCH HOP BACKEND MOVIE APP VÀO ADMIN TEMPLATE

## 🔍 PHÂN TÍCH HIỆN TRẠNG CHI TIẾT

### ✅ **MOVIE APP BACKEND** (`/backend/`)
**Framework:** Express.js + MongoDB + Mongoose
**Auth:** Đã có hệ thống authentication hoàn chỉnh
**Models:** 
- `User` - có `role: ['user', 'admin']` ✅
- `Movie` - quản lý phim với đầy đủ metadata 
- `MovieRental` - hệ thống thuê phim với analytics
- `Episode`, `Genre`, `Rating`, `Favorite`, `Watching`

**Controllers Available:**
- `user.controller.js` - User management với profile, interactions
- `movie.controller.js` - CRUD movies, search, statistics  
- `rental.controller.js` - Revenue stats, popular movies, cron jobs
- `genre.controller.js` - Genre management với admin routes
- `auth/` - Login, register, OTP system

**Admin APIs Đã Có:**
- `GET /api/rentals/stats/revenue` - Thống kê doanh thu ✅
- `GET /api/rentals/stats/popular` - Movies phổ biến ✅
- `GET /api/rentals/cron/status` - System monitoring ✅
- `POST/PUT/DELETE /api/genres` - Genre management ✅
- `POST/PUT/DELETE /api/movies` - Movie management ✅

### ✅ **ADMIN FRONTEND TEMPLATE** (`/admin-movie-app/frontend/`)
**Tech Stack:** React + TypeScript + Material-UI + TailwindCSS + React Query
**Current API:** External static API (`react-admin-ui-v1-api.vercel.app`)
**Pages:**
- `Home.tsx` - Dashboard với charts và metrics
- `Users.tsx` - User management table  
- `Products.tsx` - Product listing (→ Movies)
- `Orders.tsx` - Orders management (→ Rentals)
- `Charts.tsx`, `Profile.tsx`, `Notes.tsx`, `Logs.tsx`

## 🎯 CHIẾN LƯỢC TÍCH HOP

### **Approach: Backend Integration vào Admin Template**
1. **Copy admin frontend** vào backend folder
2. **Replace external APIs** bằng movie app APIs thật
3. **Data mapping** từ movie app format sang admin template format
4. **Serve admin frontend** từ movie app backend
5. **Authentication integration** với movie app auth system

---

## 📋 QUY TRÌNH THỰC HIỆN (4 GIAI ĐOẠN)

### **GIAI ĐOẠN 1: SETUP ADMIN BACKEND INFRASTRUCTURE**

#### **Bước 1.1: Copy Admin Frontend vào Backend**
```bash
# Copy admin frontend vào backend
cp -r admin-movie-app/frontend/ backend/admin-frontend/
cd backend/admin-frontend/
npm install
```

#### **Bước 1.2: Tạo Admin Controllers (Bổ sung)**
```javascript
// backend/controllers/admin.controller.js
const User = require('../models/User');
const Movie = require('../models/Movie');
const MovieRental = require('../models/MovieRental');

class AdminController {
    
    // GET /api/admin/dashboard/overview
    async getDashboardOverview(req, res) {
        try {
            const [totalUsers, totalMovies, totalRevenue, activeRentals] = await Promise.all([
                User.countDocuments(),
                Movie.countDocuments(),
                MovieRental.aggregate([
                    { $match: { status: 'active' } },
                    { $lookup: { from: 'moviepayments', localField: 'paymentId', foreignField: '_id', as: 'payment' } },
                    { $unwind: '$payment' },
                    { $group: { _id: null, total: { $sum: '$payment.amount' } } }
                ]),
                MovieRental.countDocuments({ status: 'active' })
            ]);

            res.json({
                status: 'success',
                data: {
                    totalUsers,
                    totalMovies,
                    totalRevenue: totalRevenue[0]?.total || 0,
                    activeRentals
                }
            });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/users - Format theo admin template
    async getAllUsers(req, res) {
        try {
            const { page = 1, limit = 10, search } = req.query;
            const query = search ? {
                $or: [
                    { full_name: { $regex: search, $options: 'i' } },
                    { email: { $regex: search, $options: 'i' } }
                ]
            } : {};

            const users = await User.find(query)
                .sort({ createdAt: -1 })
                .limit(limit * 1)
                .skip((page - 1) * limit);

            const total = await User.countDocuments(query);

            // Map to admin template format
            const formattedUsers = users.map(user => ({
                id: user._id,
                firstName: user.full_name.split(' ')[0],
                lastName: user.full_name.split(' ').slice(1).join(' '),
                email: user.email,
                phone: user.phone,
                createdAt: user.createdAt.toISOString().split('T')[0],
                verified: user.is_phone_verified,
                img: user.avatar || '/default-avatar.png'
            }));

            res.json(formattedUsers);
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/movies - Map movies thành products format
    async getAllMovies(req, res) {
        try {
            const movies = await Movie.find()
                .populate('genres', 'name')
                .sort({ createdAt: -1 })
                .limit(50);

            // Map to admin template products format
            const formattedMovies = movies.map(movie => ({
                id: movie._id,
                title: movie.movie_title,
                color: movie.genres[0]?.name || 'Unknown',
                producer: movie.producer,
                price: movie.price,
                createdAt: movie.createdAt.toISOString().split('T')[0],
                inStock: movie.release_status === 'released'
            }));

            res.json(formattedMovies);
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/rentals - Map rentals thành orders format
    async getAllRentals(req, res) {
        try {
            const rentals = await MovieRental.find()
                .populate('userId', 'full_name email')
                .populate('movieId', 'movie_title')
                .populate('paymentId', 'amount orderCode')
                .sort({ createdAt: -1 })
                .limit(50);

            // Map to admin template orders format
            const formattedRentals = rentals.map(rental => ({
                id: rental._id,
                userId: rental.userId?._id,
                customerName: rental.userId?.full_name,
                email: rental.userId?.email,
                movieTitle: rental.movieId?.movie_title,
                amount: rental.paymentId?.amount,
                status: rental.status,
                createdAt: rental.createdAt.toISOString().split('T')[0]
            }));

            res.json(formattedRentals);
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }

    // GET /api/admin/analytics/charts
    async getAnalyticsData(req, res) {
        try {
            // User growth by month
            const userGrowth = await User.aggregate([
                {
                    $group: {
                        _id: { 
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        count: { $sum: 1 }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                { $limit: 12 }
            ]);

            // Revenue by month
            const revenueGrowth = await MovieRental.aggregate([
                { $match: { status: { $in: ['active', 'expired'] } } },
                {
                    $lookup: {
                        from: 'moviepayments',
                        localField: 'paymentId', 
                        foreignField: '_id',
                        as: 'payment'
                    }
                },
                { $unwind: '$payment' },
                {
                    $group: {
                        _id: {
                            month: { $month: '$createdAt' },
                            year: { $year: '$createdAt' }
                        },
                        revenue: { $sum: '$payment.amount' }
                    }
                },
                { $sort: { '_id.year': 1, '_id.month': 1 } },
                { $limit: 12 }
            ]);

            // Genre distribution
            const genreStats = await Movie.aggregate([
                { $unwind: '$genres' },
                {
                    $lookup: {
                        from: 'genres',
                        localField: 'genres',
                        foreignField: '_id',
                        as: 'genre'
                    }
                },
                { $unwind: '$genre' },
                {
                    $group: {
                        _id: '$genre.name',
                        count: { $sum: 1 }
                    }
                },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]);

            res.json({
                userGrowth: userGrowth.map(item => ({
                    name: `${item._id.month}/${item._id.year}`,
                    users: item.count
                })),
                revenueGrowth: revenueGrowth.map(item => ({
                    name: `${item._id.month}/${item._id.year}`,
                    revenue: item.revenue
                })),
                genreDistribution: genreStats.map(item => ({
                    name: item._id,
                    value: item.count
                }))
            });
        } catch (error) {
            res.status(500).json({ status: 'error', message: error.message });
        }
    }
}

module.exports = new AdminController();
```

#### **Bước 1.3: Tạo Admin Routes**
```javascript
// backend/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAdmin } = require('../middlewares/admin.middleware');

// Dashboard
router.get('/dashboard/overview', requireAdmin, adminController.getDashboardOverview);
router.get('/analytics/charts', requireAdmin, adminController.getAnalyticsData);

// User Management  
router.get('/users', requireAdmin, adminController.getAllUsers);
router.get('/users/:id', requireAdmin, adminController.getUserDetail);

// Movie Management (Products)
router.get('/movies', requireAdmin, adminController.getAllMovies);

// Rental Management (Orders)
router.get('/rentals', requireAdmin, adminController.getAllRentals);

module.exports = router;
```

#### **Bước 1.4: Tạo Admin Middleware**
```javascript
// backend/middlewares/admin.middleware.js
const User = require('../models/User');

const requireAdmin = async (req, res, next) => {
    try {
        // Lấy userId từ query hoặc body (theo pattern hiện tại của movie app)
        const { userId, adminUserId } = req.query || req.body;
        const userIdToCheck = adminUserId || userId;
        
        if (!userIdToCheck) {
            return res.status(401).json({
                status: 'error',
                message: 'Admin authentication required - userId missing'
            });
        }

        const user = await User.findById(userIdToCheck);
        if (!user) {
            return res.status(404).json({
                status: 'error',
                message: 'User not found'
            });
        }

        if (user.role !== 'admin') {
            return res.status(403).json({
                status: 'error',
                message: 'Admin access required'
            });
        }

        req.adminUser = user;
        next();
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Authentication error'
        });
    }
};

module.exports = { requireAdmin };
```

#### **Bước 1.5: Update app.js**
```javascript
// backend/app.js (thêm vào phần routes)

// Admin routes
const adminRoutes = require('./routes/admin.routes');
app.use('/api/admin', adminRoutes);

// Serve admin frontend static files
app.use('/admin', express.static(path.join(__dirname, 'admin-dist')));

// SPA fallback for admin in production
if (process.env.NODE_ENV === 'production') {
    app.get('/admin/*', (req, res) => {
        res.sendFile(path.join(__dirname, 'admin-dist', 'index.html'));
    });
}
```

### **GIAI ĐOẠN 2: ADAPT ADMIN FRONTEND**

#### **Bước 2.1: Update API Configuration**
```typescript
// backend/admin-frontend/src/config/api.ts
const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? '' // Same origin in production
    : 'http://localhost:3000'; // Backend dev server

export const API_ENDPOINTS = {
    // Admin specific endpoints
    ADMIN_DASHBOARD: `${API_BASE_URL}/api/admin/dashboard/overview`,
    ADMIN_ANALYTICS: `${API_BASE_URL}/api/admin/analytics/charts`,
    ADMIN_USERS: `${API_BASE_URL}/api/admin/users`,
    ADMIN_MOVIES: `${API_BASE_URL}/api/admin/movies`, 
    ADMIN_RENTALS: `${API_BASE_URL}/api/admin/rentals`,
    
    // Use existing movie app APIs
    MOVIES: `${API_BASE_URL}/api/movies`,
    USERS: `${API_BASE_URL}/api/users`,
    RENTALS: `${API_BASE_URL}/api/rentals`,
    GENRES: `${API_BASE_URL}/api/genres`,
    AUTH_LOGIN: `${API_BASE_URL}/api/auth/login`,
    
    // Existing rental stats APIs
    RENTAL_STATS_REVENUE: `${API_BASE_URL}/api/rentals/stats/revenue`,
    RENTAL_STATS_POPULAR: `${API_BASE_URL}/api/rentals/stats/popular`,
};
```

#### **Bước 2.2: Update ApiCollection.tsx**
```typescript
// backend/admin-frontend/src/api/ApiCollection.tsx
import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

// Lấy admin user từ localStorage để pass userId
const getAdminUserId = () => {
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    return adminUser._id;
};

// Dashboard metrics từ movie app thật
export const fetchTotalUsers = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_DASHBOARD, {
        params: { adminUserId }
    });
    
    // Transform to admin template format
    return {
        number: response.data.data.totalUsers,
        percentage: 12, // Mock percentage for now
        chartData: [] // Add real chart data later
    };
};

export const fetchTotalProducts = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_DASHBOARD, {
        params: { adminUserId }
    });
    
    return {
        number: response.data.data.totalMovies,
        percentage: 8,
        chartData: []
    };
};

export const fetchTotalRevenue = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_DASHBOARD, {
        params: { adminUserId }
    });
    
    return {
        number: response.data.data.totalRevenue,
        percentage: 15,
        chartData: []
    };
};

// Users từ movie app
export const fetchUsers = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_USERS, {
        params: { adminUserId }
    });
    return response.data;
};

// Products (Movies) từ movie app
export const fetchProducts = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_MOVIES, {
        params: { adminUserId }
    });
    return response.data;
};

// Orders (Rentals) từ movie app
export const fetchOrders = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_RENTALS, {
        params: { adminUserId }
    });
    return response.data;
};

// Analytics charts data
export const fetchAnalyticsData = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_ANALYTICS, {
        params: { adminUserId }
    });
    return response.data;
};

// Revenue stats (sử dụng API có sẵn)
export const fetchTotalRevenueByProducts = async () => {
    const response = await axios.get(API_ENDPOINTS.RENTAL_STATS_REVENUE, {
        params: { 
            startDate: new Date(Date.now() - 30*24*60*60*1000).toISOString(),
            endDate: new Date().toISOString()
        }
    });
    
    // Transform data to chart format
    return {
        chartData: response.data.map(item => ({
            name: item._id.date,
            revenue: item.totalRevenue
        }))
    };
};
```

#### **Bước 2.3: Update Home.tsx Dashboard**
```typescript
// backend/admin-frontend/src/pages/Home.tsx (chỉ update imports)
import {
  fetchTotalProducts,
  fetchTotalProfit,  
  fetchTotalRatio,
  fetchTotalRevenue,
  fetchTotalRevenueByProducts,
  fetchTotalSource,
  fetchTotalUsers,
  fetchTotalVisit,
  fetchAnalyticsData, // NEW
} from '../api/ApiCollection';

// Thêm analytics data query
const queryGetAnalyticsData = useQuery({
    queryKey: ['analytics'],
    queryFn: fetchAnalyticsData,
});

// Component giữ nguyên, chỉ data source thay đổi
```

#### **Bước 2.4: Update Authentication**
```typescript
// backend/admin-frontend/src/pages/Login.tsx
import { API_ENDPOINTS } from '../config/api';

const handleLogin = async (email: string, password: string) => {
    try {
        const response = await axios.post(API_ENDPOINTS.AUTH_LOGIN, {
            email,
            phone: email, // Movie app requires phone
            password
        });

        const { user } = response.data;
        
        // Check admin role
        if (user.role !== 'admin') {
            throw new Error('Admin access required');
        }

        // Store admin user
        localStorage.setItem('adminUser', JSON.stringify(user));
        
        // Redirect to admin dashboard
        navigate('/');
    } catch (error) {
        console.error('Admin login error:', error);
        throw error;
    }
};
```

### **GIAI ĐOẠN 3: BUILD & DEPLOYMENT SETUP**

#### **Bước 3.1: Update Package.json Scripts**
```json
// backend/package.json
{
  "scripts": {
    "dev": "nodemon ./bin/www",
    "build-admin": "cd admin-frontend && npm run build && cp -r dist/ ../admin-dist/",
    "dev-admin": "concurrently \"npm run dev\" \"cd admin-frontend && npm run dev --port 5173\"",
    "start-with-admin": "npm run build-admin && npm start"
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

#### **Bước 3.2: Environment Variables**
```bash
# backend/.env
MONGO_URI=your_mongodb_connection
ADMIN_SECRET_KEY=your_admin_secret_key

# Admin panel will be served at /admin route
```

#### **Bước 3.3: Vite Config for Admin**
```typescript
// backend/admin-frontend/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  base: '/admin/', // Important for production serving
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  }
})
```

### **GIAI ĐOẠN 4: TESTING & OPTIMIZATION**

#### **Development URLs**
- **Movie App Backend**: `http://localhost:3000`
- **Admin Frontend Dev**: `http://localhost:5173`  
- **Admin Panel (Production)**: `http://localhost:3000/admin`

#### **Development Commands**
```bash
# Development (2 terminals)
cd backend && npm run dev              # Terminal 1: Backend
cd backend/admin-frontend && npm run dev  # Terminal 2: Admin frontend

# Or run both together  
cd backend && npm run dev-admin

# Production build
cd backend && npm run build-admin
```

## 📊 DATA MAPPING REFERENCE

### **Admin Template → Movie App**
```
Admin Template Format    →    Movie App Format
=============================================
GET /users              →    GET /api/admin/users (formatted)
GET /products           →    GET /api/admin/movies (as products)
GET /orders             →    GET /api/admin/rentals (as orders)
GET /totalusers         →    GET /api/admin/dashboard/overview
GET /totalrevenue       →    GET /api/admin/dashboard/overview
Analytics charts        →    GET /api/admin/analytics/charts
```

### **Data Transformations**
```javascript
// User → Admin Template User
movieAppUser = {
    _id, full_name, email, phone, role, is_phone_verified, createdAt
}
adminUser = {
    id: _id,
    firstName: full_name.split(' ')[0],
    lastName: full_name.split(' ').slice(1).join(' '),
    email, phone,
    createdAt: createdAt.split('T')[0],
    verified: is_phone_verified
}

// Movie → Admin Template Product  
movieAppMovie = {
    _id, movie_title, producer, price, genres, release_status
}
adminProduct = {
    id: _id,
    title: movie_title,
    producer, price,
    color: genres[0]?.name,
    inStock: release_status === 'released'
}

// Rental → Admin Template Order
movieAppRental = {
    _id, userId, movieId, paymentId, status, createdAt
}
adminOrder = {
    id: _id,
    userId, customerName, movieTitle,
    amount: paymentId.amount,
    status, createdAt: createdAt.split('T')[0]
}
```

## ✅ CHECKLIST TRIỂN KHAI

### **Backend**
- [✅] Admin controllers implemented - `/backend/controllers/admin.controller.js`
- [✅] Admin routes configured - `/backend/routes/admin.routes.js`
- [✅] Admin middleware added - `/backend/middlewares/admin.middleware.js`
- [✅] Data mapping functions created - In admin controller
- [✅] Static file serving configured - In app.js
- [✅] BSD License compliance - `LICENSE-ORIGINAL` & `ATTRIBUTION.md`

### **Frontend**  
- [✅] Admin frontend copied - `/backend/admin-frontend/`
- [✅] API endpoints updated - `src/config/api.ts` & `ApiCollection.tsx`
- [✅] Authentication integrated - `src/services/authService.ts`
- [✅] Data fetching adapted - Real MongoDB data integration
- [✅] Build process configured - `vite.config.ts` with proxy & output

### **Integration**
- [✅] Admin login flow working - Movie app auth integration
- [✅] Dashboard displaying real data - MongoDB live data
- [✅] User management functional - Real user CRUD operations
- [✅] Movie management functional - Real movie CRUD operations  
- [✅] Rental analytics working - Live rental/revenue stats

### **Deployment**
- [✅] Development setup working - `npm run dev-admin`
- [✅] Production build working - `npm run build-admin`
- [✅] Admin panel accessible at `/admin` - `http://localhost:3003/admin`
- [✅] Authentication protecting admin routes - Role-based middleware
- [✅] Real-time data updates - Live MongoDB integration

## 🎯 KẾT QUẢ MONG ĐỢI

**Sau khi hoàn thành:**
- ✅ **Single backend server** phục vụ cả movie app và admin panel
- ✅ **Real data dashboard** với thống kê thật từ MongoDB
- ✅ **Admin panel** tại `http://localhost:3003/admin`
- ✅ **Quản lý users, movies, rentals** với data thật
- ✅ **Authentication** tích hợp với movie app auth system
- ✅ **Production ready** với build scripts và deployment config
- ✅ **System monitoring** với environment variables & services health check
- ✅ **Admin account** tự động tạo sẵn

**Timeline:** 2-3 tuần implementation + 1 tuần testing & optimization

---

## 🚀 **HƯỚNG DẪN SỬ DỤNG ADMIN PANEL**

### **BƯỚC 1: TẠO ADMIN ACCOUNT**
```bash
cd backend
npm run create-admin
```

**Admin Credentials:**
- 📧 **Email**: `admin@movieapp.com`
- 📱 **Phone**: `0123456789`  
- 🔑 **Password**: `admin123`
- 👤 **Role**: `admin`

### **BƯỚC 2: CHẠY ADMIN PANEL**

**Development Mode:**
```bash
# Method 1: Run both servers
npm run dev-admin

# Method 2: Separate terminals
npm run dev                    # Terminal 1: Backend
cd admin-frontend && npm run dev  # Terminal 2: Frontend
```

**Production Mode:**
```bash
npm run start-with-admin
```

### **BƯỚC 3: TRUY CẬP ADMIN PANEL**
- **Admin Panel**: `http://localhost:3003/admin`
- **Backend API**: `http://localhost:3003/api/*`
- **Admin Dev Server**: `http://localhost:5173` (dev only)

### **BƯỚC 4: LOGIN VÀ SỬ DỤNG**
1. Mở `http://localhost:3003/admin`
2. Login với credentials trên
3. Explore dashboard với real data từ MongoDB

---

## 🛡️ **ADMIN AUTHENTICATION SYSTEM**

### **Database Schema**
- **Không tạo bảng mới** - Sử dụng User model hiện có
- **Admin Role**: User với `role: 'admin'` 
- **Middleware Protection**: `requireAdmin` middleware
- **JWT Integration**: Cùng auth system với Movie App

### **Admin User Fields:**
```javascript
{
  _id: ObjectId,
  full_name: "Movie App Admin", 
  email: "admin@movieapp.com",
  phone: "0123456789",
  password: "hashed_password",
  role: "admin",               // ← KEY FIELD
  is_phone_verified: true,
  is_active: true,
  createdAt: Date,
  updatedAt: Date
}
```

### **Security Features:**
- ✅ **Role-based access control** 
- ✅ **JWT token validation**
- ✅ **Password hashing** với bcrypt
- ✅ **Admin-only routes** protection
- ✅ **Session management**

---

## 🔧 **SYSTEM MONITORING FEATURES**

### **Real-time Service Health Check:**
- 🗄️ **MongoDB** - Connection status, collections, storage size
- ☁️ **Cloudflare** - API token, account configuration status
- 💳 **PayOS** - Payment gateway configuration validation  
- 📱 **ESMS** - SMS service setup validation
- 🔐 **JWT** - Authentication tokens configuration

### **System Metrics:**
- 📊 **Database Statistics** - Collections count, data size, indexes
- 🖥️ **Server Health** - Uptime, memory usage, environment
- ⚡ **Auto-refresh** - Updates every 30 seconds
- 🎯 **Visual Status** - Color-coded badges for each service

### **Environment Validation:**
- ✅ **Required Variables** - Validates all environment variables
- ❌ **Missing Configs** - Highlights missing configurations
- 🔍 **Configuration Review** - Easy overview of all service setups

---

## 📊 **ADMIN PANEL FEATURES**

### **Dashboard Analytics:**
- 👥 **User Management** - Real user CRUD operations
- 🎬 **Movie Management** - Real movie data as "products"
- 💰 **Rental Analytics** - Live rental/revenue statistics  
- 📈 **Growth Charts** - User growth, revenue trends
- 🎯 **Genre Distribution** - Movie genre analytics

### **Data Management:**
- 📋 **Real-time Data** - Direct MongoDB integration
- 🔄 **Live Updates** - No mock data, all real information
- 🔍 **Search & Filter** - Full data exploration capabilities
- 📊 **Export Capabilities** - Data export functionality

### **System Administration:**
- ⚙️ **Service Monitoring** - All integrated services health
- 🛠️ **Environment Status** - Configuration validation
- 📝 **Admin Logs** - System activity tracking
- 🔧 **Maintenance Tools** - Database and system utilities

---

**LƯU Ý QUAN TRỌNG:** Quy trình này tối ưu hóa việc tận dụng toàn bộ infrastructure hiện có của movie app backend, chỉ cần adapt admin frontend để hiển thị data thật thay vì static data. 