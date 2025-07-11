import axios from 'axios';
import { API_ENDPOINTS } from '../config/api';

export interface AdminUser {
    _id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
    isVerified: boolean;
}

export interface LoginResponse {
    success: boolean;
    data: {
        user: AdminUser;
        token: string;
    };
    message: string;
}

class AuthService {
    private readonly ADMIN_USER_KEY = 'adminUser';
    private readonly ADMIN_TOKEN_KEY = 'adminToken';

    // Login với movie app backend
    async login(email: string, password: string): Promise<LoginResponse> {
        try {
            const response = await axios.post(API_ENDPOINTS.AUTH_LOGIN, {
                email,
                password
            });

            const loginData: LoginResponse = response.data;
            
            // Kiểm tra user có role admin không
            if (loginData.success && loginData.data.user.role === 'admin') {
                // Lưu admin user và token
                localStorage.setItem(this.ADMIN_USER_KEY, JSON.stringify(loginData.data.user));
                localStorage.setItem(this.ADMIN_TOKEN_KEY, loginData.data.token);
                
                // Set axios default header
                this.setAuthHeader(loginData.data.token);
                
                return loginData;
            } else {
                throw new Error('Unauthorized: Admin access required');
            }
        } catch (error) {
            console.error('Login error:', error);
            const axiosError = error as { response?: { data?: { message?: string } } };
            throw new Error(axiosError.response?.data?.message || 'Login failed');
        }
    }

    // Logout
    logout(): void {
        localStorage.removeItem(this.ADMIN_USER_KEY);
        localStorage.removeItem(this.ADMIN_TOKEN_KEY);
        delete axios.defaults.headers.common['Authorization'];
    }

    // Lấy current admin user
    getCurrentUser(): AdminUser | null {
        const userStr = localStorage.getItem(this.ADMIN_USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    }

    // Lấy token
    getToken(): string | null {
        return localStorage.getItem(this.ADMIN_TOKEN_KEY);
    }

    // Kiểm tra authentication status
    isAuthenticated(): boolean {
        const user = this.getCurrentUser();
        const token = this.getToken();
        return !!(user && token && user.role === 'admin');
    }

    // Set Authorization header
    setAuthHeader(token: string): void {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }

    // Initialize auth (gọi khi app start)
    initializeAuth(): void {
        const token = this.getToken();
        if (token) {
            this.setAuthHeader(token);
        }
    }

    // Verify token with backend
    async verifyToken(): Promise<boolean> {
        try {
            const token = this.getToken();
            if (!token) return false;

            const response = await axios.get(`${API_ENDPOINTS.AUTH_LOGIN}/verify`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            return response.data.success;
        } catch (error) {
            console.error('Token verification failed:', error);
            this.logout();
            return false;
        }
    }
}

export const authService = new AuthService(); 