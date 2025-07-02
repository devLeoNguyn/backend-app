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
    const response = await axios.get(API_ENDPOINTS.ADMIN_TOTAL_USERS, {
        params: { adminUserId }
    });
    
    console.log('Total Users API response:', response.data);
    return response.data;
};

export const fetchTotalProducts = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_TOTAL_PRODUCTS, {
        params: { adminUserId }
    });
    
    console.log('Total Products API response:', response.data);
    return response.data;
};

export const fetchTotalRevenue = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_TOTAL_REVENUE, {
        params: { adminUserId }
    });
    
    console.log('Total Revenue API response:', response.data);
    return response.data;
};

// Static/Mock data for now (will implement later)
export const fetchTotalRatio = async () => {
    return {
        number: 85,
        percentage: 12,
        chartData: []
    };
};

export const fetchTotalSource = async () => {
    return {
        chartData: [
            { name: 'Direct', value: 400 },
            { name: 'Social Media', value: 300 },
            { name: 'Search Engines', value: 300 },
            { name: 'Referrals', value: 200 }
        ]
    };
};

export const fetchTotalVisit = async () => {
    return {
        number: 1234,
        percentage: 8,
        chartData: []
    };
};

export const fetchTotalProfit = async () => {
    const adminUserId = getAdminUserId();
    // Calculate profit as a percentage of revenue for now
    const revenueResponse = await axios.get(API_ENDPOINTS.ADMIN_TOTAL_REVENUE, {
        params: { adminUserId }
    });
    
    return {
        number: Math.round(revenueResponse.data.number * 0.15), // 15% profit margin
        percentage: 10,
        chartData: []
    };
};

// Users từ movie app
export const fetchUsers = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_USERS, {
        params: { adminUserId }
    });
    
    console.log('Users API response:', response.data);
    return response.data;
};

// Single user
export const fetchSingleUser = async (id: string) => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(`${API_ENDPOINTS.ADMIN_USERS}/${id}`, {
        params: { adminUserId }
    });
    
    console.log('Single User API response:', response.data);
    return response.data;
};

// Products (Movies) từ movie app
export const fetchProducts = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_MOVIES, {
        params: { adminUserId }
    });
    
    console.log('Products (Movies) API response:', response.data);
    return response.data;
};

// Single product (movie)
export const fetchSingleProduct = async (id: string) => {
    const response = await axios.get(`${API_ENDPOINTS.MOVIES}/${id}`);
    
    // Transform movie data to product format
    const movie = response.data.data.movie;
    const formattedProduct = {
        id: movie._id,
        title: movie.movie_title,
        color: movie.genres?.[0] || 'Unknown',
        producer: movie.producer,
        price: movie.price,
        createdAt: movie.createdAt?.split('T')[0],
        inStock: movie.release_status === 'released',
        img: movie.poster_url || '/corrugated-box.jpg'
    };
    
    console.log('Single Product (Movie) API response:', formattedProduct);
    return formattedProduct;
};

// Orders (Rentals) từ movie app
export const fetchOrders = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_RENTALS, {
        params: { adminUserId }
    });
    
    console.log('Orders (Rentals) API response:', response.data);
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
    const chartData = response.data.data?.map((item: any) => ({
        name: item._id.date,
        revenue: item.totalRevenue
    })) || [];
    
    console.log('Revenue by Products API response:', { chartData });
    return { chartData };
};

// Analytics charts data
export const fetchAnalyticsData = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_ANALYTICS, {
        params: { adminUserId }
    });
    
    console.log('Analytics Data API response:', response.data);
    return response.data;
};

// System status monitoring
export const fetchSystemStatus = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_SYSTEM_STATUS, {
        params: { adminUserId }
    });
    
    console.log('System Status API response:', response.data);
    return response.data;
};

// Top deals - mock data for now
export const fetchTopDeals = async () => {
    return [
        {
            id: 1,
            username: 'John Doe',
            email: 'john@example.com',
            amount: '500000',
            img: '/Portrait_Placeholder.png'
        },
        {
            id: 2,
            username: 'Jane Smith',
            email: 'jane@example.com',
            amount: '350000',
            img: '/Portrait_Placeholder.png'
        }
    ];
};

// Posts - mock data for now  
export const fetchPosts = async () => {
    return [
        {
            id: 1,
            title: 'Movie App Launch',
            body: 'We are excited to announce the launch of our movie streaming platform',
            userId: 1,
            date: new Date().toISOString()
        }
    ];
};

// Notes - mock data for now
export const fetchNotes = async () => {
    return [
        {
            id: 1,
            title: 'System Maintenance',
            body: 'Schedule system maintenance for next week',
            date: new Date().toISOString(),
            author: 'Admin',
            topic: 'productivity'
        }
    ];
};

// Logs - mock data for now
export const fetchLogs = async () => {
    return [
        {
            id: 1,
            action: 'User Login',
            timestamp: new Date().toISOString(),
            user: 'admin@movieapp.com',
            status: 'success'
        }
    ];
};
