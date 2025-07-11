export const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? 'https://backend-app-lou3.onrender.com' 
    : 'http://localhost:3003'; // Use localhost for development

export const WS_BASE_URL = process.env.NODE_ENV === 'production'
    ? 'wss://backend-app-lou3.onrender.com'
    : 'ws://localhost:3003';

export const API_ENDPOINTS = {
    // Admin specific endpoints
    ADMIN_DASHBOARD: `${API_BASE_URL}/api/admin/dashboard/overview`,
    ADMIN_ANALYTICS: `${API_BASE_URL}/api/admin/analytics/charts`,
    ADMIN_USERS: `${API_BASE_URL}/api/admin/users`,
    ADMIN_MOVIES: `${API_BASE_URL}/api/admin/movies`, 
    ADMIN_MOVIES_CREATE: `${API_BASE_URL}/api/admin/movies`, // POST endpoint cho tạo phim mới
    ADMIN_RENTALS: `${API_BASE_URL}/api/admin/rentals`,
    
    // Admin template compatible endpoints
    ADMIN_TOTAL_USERS: `${API_BASE_URL}/api/admin/totalusers`,
    ADMIN_TOTAL_PRODUCTS: `${API_BASE_URL}/api/admin/totalproducts`,
    ADMIN_TOTAL_REVENUE: `${API_BASE_URL}/api/admin/totalrevenue`,
    
    // System monitoring endpoints
    ADMIN_SYSTEM_STATUS: `${API_BASE_URL}/api/admin/system/status`,
    
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