import axios from 'axios';
import { API_ENDPOINTS, API_BASE_URL } from '../config/api';

// Error interface for API responses
interface ApiError {
    response?: {
        status?: number;
        statusText?: string;
        data?: {
            message?: string;
            [key: string]: unknown;
        };
    };
    message: string;
    config?: {
        url?: string;
        [key: string]: unknown;
    };
}

// Type guard for API errors
const isApiError = (error: unknown): error is ApiError => {
    return typeof error === 'object' && error !== null && 'message' in error;
};

// Movie update data interface
interface MovieUpdateData {
    movie_title?: string;
    description?: string;
    production_time?: string;
    producer?: string;
    price?: number;
    movie_type?: string;
    total_episodes?: number;
    release_status?: string;
    poster_path?: string;
    genres?: string[]; // Thêm hỗ trợ genres array
    event_start_time?: string | null;
    [key: string]: unknown;
}

// Cập nhật interface cho Genre để phù hợp với backend
interface Genre {
    _id: string;
    genre_name: string;
    parent_genre?: {
        _id: string;
        genre_name: string;
    } | string | null;
    is_parent: boolean;
    children?: Genre[];
    description?: string;
    is_active: boolean;
    sort_order: number;
}

// Lấy admin user từ localStorage để pass userId
export const getAdminUserId = () => {
    const adminUser = JSON.parse(localStorage.getItem('adminUser') || '{}');
    // Fallback to hardcoded admin ID for testing (only when localStorage empty)
    return adminUser._id || '6863e129661212a5d79c271f';
};

// Thêm function để lấy parent genres với children
export const fetchParentGenres = async (): Promise<Genre[]> => {
    try {
        const response = await axios.get(`${API_ENDPOINTS.GENRES}?type=parent&format=tree`);
        console.log('📚 Parent Genres with children fetched:', response.data);
        return response.data.data?.genres || [];
    } catch (error) {
        console.error('❌ Error fetching parent genres:', error);
        return [];
    }
};

// Thêm function để lấy child genres theo parent ID
export const fetchChildGenres = async (parentId: string): Promise<Genre[]> => {
    try {
        const response = await axios.get(`${API_ENDPOINTS.GENRES}?type=children&parent_id=${parentId}`);
        console.log('📚 Child Genres fetched for parent', parentId, ':', response.data);
        return response.data.data?.genres || [];
    } catch (error) {
        console.error('❌ Error fetching child genres:', error);
        return [];
    }
};

// Giữ function cũ để tương thích
export const fetchGenres = async (): Promise<Genre[]> => {
    try {
        const response = await axios.get(API_ENDPOINTS.GENRES);
        console.log('📚 All Genres fetched:', response.data);
        return response.data.data?.genres || [];
    } catch (error) {
        console.error('❌ Error fetching genres:', error);
        return [];
    }
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

// Lock/Unlock user account (admin)
export const setUserLockStatus = async (userId: string, action: 'lock' | 'unlock') => {
    const adminUserId = getAdminUserId();
    const response = await axios.put(`${API_ENDPOINTS.ADMIN_USER_LOCK}/${userId}/lock`, { action }, {
        params: { adminUserId }
    });
    return response.data;
};

// Products (Movies) từ movie app
export const fetchProducts = async () => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_MOVIES, {
        params: { adminUserId, limit: 100 } // Lấy tất cả phim
    });
    
    console.log('Products (Movies) API response:', response.data);
    
    // Xử lý response mới có pagination
    if (response.data.data) {
        return response.data.data; // Trả về mảng phim từ data property
    }
    
    return response.data; // Fallback cho format cũ
};

// Single product (movie) - Enhanced for editing
export const fetchSingleProduct = async (id: string) => {
    const response = await axios.get(`${API_ENDPOINTS.MOVIES}/${id}`);
    
    // Transform movie data to product format with more details for editing
    const movie = response.data.data.movie;
    const formattedProduct = {
        id: movie._id,
        title: movie.movie_title,
        description: movie.description,
        color: movie.genres?.[0]?.genre_name || 'Unknown',
        genre: movie.genres?.[0]?.genre_name || '',
        // Thêm thông tin genres đầy đủ cho form edit
        genres: movie.genres || [], // Tất cả genres của phim
        currentGenreIds: movie.genres?.map((g: Genre) => g._id) || [], // Array các genre IDs
        producer: movie.producer,
        price: movie.price,
        movieType: movie.movie_type,
        totalEpisodes: movie.total_episodes,
        status: movie.release_status,
        createdAt: movie.createdAt?.split('T')[0],
        releaseYear: movie.production_time ? new Date(movie.production_time).getFullYear() : null,
        inStock: movie.release_status === 'released',
        img: movie.poster_path
    };
    
    console.log('Single Product (Movie) API response:', formattedProduct);
    return formattedProduct;
};

// Create new product (movie) - Admin only
export const createProduct = async (productData: {
    title: string;
    description: string;
    production_time: string;
    genres: string[]; // <-- now an array of genre ids
    producer: string;
    price: number;
    movie_type: string;
    total_episodes: number;
    release_status: string; // "Đã phát hành" hoặc "Đã kết thúc"
    event_start_time: string; // Sẽ luôn là rỗng
    poster_file?: File;
    send_notification?: boolean; // Thêm flag gửi notification
}) => {
    const adminUserId = getAdminUserId();
    
    // Map release status từ Vietnamese to English
    const releaseStatusMap: { [key: string]: string } = {
        'Đã phát hành': 'released',
        'Đã kết thúc': 'ended'
    };

    const mappedReleaseStatus = releaseStatusMap[productData.release_status] || 'released';
    
    // Convert production_time to proper date format - chỉ validate khi có giá trị
    let productionDate = null;
    if (productData.production_time && productData.production_time.trim() !== '') {
        productionDate = new Date(productData.production_time);
        if (isNaN(productionDate.getTime())) {
            throw new Error('Production time phải là ngày hợp lệ');
        }
    }
    
    // 🖼️ Upload poster to Cloudflare Images first
    let posterUrl = 'https://via.placeholder.com/400x600.png?text=No+Poster';
    
    if (productData.poster_file) {
        try {
            console.log('📤 Uploading poster to Cloudflare Images...');
            
            // Create FormData for image upload
            const imageFormData = new FormData();
            imageFormData.append('file', productData.poster_file);
            imageFormData.append('folder', 'movie-posters');
            // Removed variant to use original image and avoid transform costs
            
            // Upload to Cloudflare Images
            const imageResponse = await axios.post(`${API_BASE_URL}/api/upload/image`, imageFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (imageResponse.data.status === 'success') {
                // Use original image URL to avoid transform costs
                posterUrl = imageResponse.data.data.url || imageResponse.data.data.recommendedUrl;
                console.log('✅ Poster uploaded to Cloudflare (original):', posterUrl);
            } else {
                console.warn('⚠️ Image upload failed, using placeholder');
            }
        } catch (imageError: unknown) {
            const errorMessage = isApiError(imageError) ? imageError.message : 'Unknown error';
            console.warn('⚠️ Image upload error, using placeholder:', errorMessage);
            // Continue with placeholder if image upload fails
        }
    }
    
    // Transform admin form data to movie API format
    const movieData = {
        movie_title: productData.title,
        description: productData.description,
        production_time: productionDate ? productionDate.toISOString() : null,
        producer: productData.producer,
        price: productData.price,
        movie_type: productData.movie_type,
        total_episodes: productData.total_episodes,
        release_status: mappedReleaseStatus, // "released" hoặc "ended"
        poster_path: posterUrl, // Use Cloudflare URL or placeholder
        genres: productData.genres, // <-- assign genres array directly
        event_start_time: null, // Không sử dụng event_start_time
        send_notification: productData.send_notification || false, // Thêm flag gửi notification
        episodes: [
            {
                episode_title: `${productData.title} - ${productData.movie_type === 'Phim lẻ' ? 'Full Movie' : 'Episode 1'}`,
                uri: 'pending-upload', // Placeholder, will be updated when video is uploaded
                episode_number: 1,
                episode_description: `${productData.title} - ${productData.movie_type === 'Phim lẻ' ? 'Full Movie' : 'Episode 1'}`,
                duration: 120 // Default 2 hours
            }
        ],
        adminUserId // For admin authentication
    };
    
    console.log('🎬 Creating new movie via admin API:', {
        ...movieData,
        send_notification: movieData.send_notification
    });
    
    try {
    const response = await axios.post(API_ENDPOINTS.ADMIN_MOVIES_CREATE, movieData, {
        params: { adminUserId }
    });
    
    console.log('✅ Movie created successfully:', response.data);
        
        // Log về việc push notification
        if (mappedReleaseStatus === 'released' || productData.send_notification) {
            console.log('📢 Push notification sẽ được gửi:', {
                reason: mappedReleaseStatus === 'released' ? 'auto_released' : 'manual_admin',
                send_notification: productData.send_notification
            });
        } else {
            console.log('🔇 Không gửi push notification');
        }
        
        return response.data;
    } catch (error: unknown) {
        const apiError = isApiError(error) ? error : { message: 'Unknown error' };
        console.error('❌ API Error details:', {
            status: apiError.response?.status,
            data: apiError.response?.data,
            message: apiError.message
        });
        throw apiError;
    }
};

// Update existing product (movie) - Admin only
export const updateProduct = async (productId: string, productData: {
    title?: string;
    description?: string;
    production_time?: string;
    genre?: string;
    genres?: string[]; // Thêm support cho array of genre IDs
    producer?: string;
    price?: number;
    movie_type?: string;
    total_episodes?: number;
    release_status?: string; // "Đã phát hành" hoặc "Đã kết thúc"
    event_start_time?: string;
    poster_file?: File;
}) => {
    const adminUserId = getAdminUserId();
    
    // Map release status từ Vietnamese to English nếu có
    let mappedReleaseStatus = productData.release_status;
    if (productData.release_status) {
        const releaseStatusMap: { [key: string]: string } = {
            'Đã phát hành': 'released',
            'Đã kết thúc': 'ended'
        };
        mappedReleaseStatus = releaseStatusMap[productData.release_status] || productData.release_status;
    }
    
    // Convert production_time to proper date format nếu có
    let productionDate = null;
    if (productData.production_time && productData.production_time.trim() !== '') {
        productionDate = new Date(productData.production_time);
        if (isNaN(productionDate.getTime())) {
            throw new Error('Production time phải là ngày hợp lệ');
        }
    }
    
    // 🖼️ Upload poster to Cloudflare Images nếu có file mới
    let posterUrl;
    if (productData.poster_file) {
        try {
            console.log('📤 Uploading updated poster to Cloudflare Images...');
            
            const imageFormData = new FormData();
            imageFormData.append('file', productData.poster_file);
            imageFormData.append('folder', 'movie-posters');
            
            const imageResponse = await axios.post(`${API_BASE_URL}/api/upload/image`, imageFormData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (imageResponse.data.status === 'success') {
                posterUrl = imageResponse.data.data.url || imageResponse.data.data.recommendedUrl;
                console.log('✅ Updated poster uploaded to Cloudflare:', posterUrl);
            }
        } catch (imageError: unknown) {
            const errorMessage = isApiError(imageError) ? imageError.message : 'Unknown error';
            console.warn('⚠️ Image upload error, keeping original poster:', errorMessage);
            // Không fail toàn bộ update nếu upload ảnh lỗi
        }
    }
    
    // Transform admin form data to movie API format
    const movieUpdateData: MovieUpdateData = {};
    
    if (productData.title) movieUpdateData.movie_title = productData.title;
    if (productData.description) movieUpdateData.description = productData.description;
    if (productionDate) movieUpdateData.production_time = productionDate.toISOString();
    if (productData.producer) movieUpdateData.producer = productData.producer;
    if (productData.price !== undefined) movieUpdateData.price = productData.price;
    if (productData.movie_type) movieUpdateData.movie_type = productData.movie_type;
    if (productData.total_episodes) movieUpdateData.total_episodes = productData.total_episodes;
    if (mappedReleaseStatus) movieUpdateData.release_status = mappedReleaseStatus;
    // Chỉ cập nhật poster_path khi có ảnh mới được upload thành công
    if (posterUrl) movieUpdateData.poster_path = posterUrl;
    
    // Xử lý genres - ưu tiên genres array, fallback về genre string
    if (productData.genres && productData.genres.length > 0) {
        movieUpdateData.genres = productData.genres;
        console.log('🏷️ Using genres array:', productData.genres);
    } else if (productData.genre && productData.genre.trim() !== '') {
        movieUpdateData.genres = [productData.genre.trim()];
        console.log('🏷️ Using single genre:', productData.genre);
    }
    
    if (productData.event_start_time && productData.event_start_time.trim() !== '') {
        const eventDate = new Date(productData.event_start_time);
        if (!isNaN(eventDate.getTime())) {
            movieUpdateData.event_start_time = eventDate.toISOString();
        }
    }
    
    // Không cần gửi adminUserId trong body, sẽ gửi qua query params
    
    console.log('🎬 Updating movie via admin API:', movieUpdateData);
    
    try {
        const response = await axios.put(`${API_ENDPOINTS.ADMIN_MOVIES}/${productId}`, movieUpdateData, {
            params: { adminUserId }
        });
        
        console.log('✅ Movie updated successfully:', response.data);
        
        // Log về việc push notification (sẽ được xử lý ở backend)
        if (mappedReleaseStatus === 'released') {
            console.log('📢 Có thể có push notification được gửi nếu trạng thái thay đổi thành "released"');
        }
        
    return response.data;
    } catch (error: unknown) {
        const apiError = isApiError(error) ? error : { message: 'Unknown error' };
        console.error('❌ Update API Error details:', {
            status: apiError.response?.status,
            statusText: apiError.response?.statusText,
            data: apiError.response?.data,
            message: apiError.message,
            config: {
                url: apiError.config?.url,
                method: apiError.config?.method,
                data: apiError.config?.data
            }
        });
        
        // Log dữ liệu đã gửi để debug
        console.error('📝 Data sent to API:', movieUpdateData);
        
        // Ném lỗi chi tiết hơn để frontend hiển thị
        if (apiError.response?.data?.message && typeof apiError.response.data.message === 'string') {
            throw new Error(apiError.response.data.message);
        } else if (apiError.response?.data?.error && typeof apiError.response.data.error === 'string') {
            throw new Error(apiError.response.data.error);
        } else {
            throw new Error(`Lỗi ${apiError.response?.status}: ${apiError.response?.statusText || 'Không xác định'}`);
        }
    }
};

// Delete product (movie) - Admin only
export const deleteProduct = async (productId: string) => {
    const adminUserId = getAdminUserId();
    
    console.log('🗑️ Deleting movie via admin API:', productId);
    
    try {
        const response = await axios.delete(`${API_ENDPOINTS.ADMIN_MOVIES}/${productId}`, {
            params: { adminUserId }
        });
        
        console.log('✅ Movie deleted successfully:', response.data);
        return response.data;
    } catch (error: unknown) {
        const apiError = isApiError(error) ? error : { message: 'Unknown error' };
        console.error('❌ Delete Movie Error:', {
            status: apiError.response?.status,
            data: apiError.response?.data,
            message: apiError.message
        });
        
        if (apiError.response?.data?.message && typeof apiError.response.data.message === 'string') {
            throw new Error(apiError.response.data.message);
        } else {
            throw new Error(`Error deleting movie: ${apiError.message}`);
        }
    }
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
    const chartData = response.data.data?.map((item: { _id: { date: string }, totalRevenue: number }) => ({
        name: item._id.date,
        revenue: item.totalRevenue
    })) || [];
    
    console.log('Revenue by Products API response:', { chartData });
    return { chartData };
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



// ============================================================================
// EPISODE MANAGEMENT API FUNCTIONS
// ============================================================================

// Episode interfaces
export interface Episode {
    id: string;
    episode_title: string;
    episode_number: number;
    episode_description: string;
    uri: string;
    duration: number;
    createdAt: string;
    updatedAt: string;
    movie_id: string;
    movie_title?: string;
}

interface EpisodeCreateData {
    episode_title: string;
    episode_number: number;
    episode_description?: string;
    movie_id: string;
    duration?: number;
    uri?: string;
}

interface EpisodeUpdateData {
    episode_title?: string;
    episode_number?: number;
    episode_description?: string;
    duration?: number;
    uri?: string;
}

// Get episodes by movie ID
export const fetchEpisodesByMovie = async (movieId: string, page: number = 1, limit: number = 20) => {
    const adminUserId = getAdminUserId();
    const response = await axios.get(API_ENDPOINTS.ADMIN_EPISODES, {
        params: { 
            adminUserId,
            movieId,
            page,
            limit
        }
    });
    
    console.log('Episodes API response:', response.data);
    return response.data;
};

// Create new episode
export const createEpisode = async (episodeData: EpisodeCreateData) => {
    const adminUserId = getAdminUserId();
    
    console.log('🎬 Creating new episode:', episodeData);
    
    try {
        const response = await axios.post(API_ENDPOINTS.ADMIN_EPISODES, episodeData, {
            params: { adminUserId }
        });
        
        console.log('✅ Episode created successfully:', response.data);
        return response.data;
    } catch (error: unknown) {
        const apiError = isApiError(error) ? error : { message: 'Unknown error' };
        console.error('❌ Create Episode Error:', {
            status: apiError.response?.status,
            data: apiError.response?.data,
            message: apiError.message
        });
        
        if (apiError.response?.data?.message && typeof apiError.response.data.message === 'string') {
            throw new Error(apiError.response.data.message);
        } else {
            throw new Error(`Error creating episode: ${apiError.message}`);
        }
    }
};

// Update existing episode
export const updateEpisode = async (episodeId: string, episodeData: EpisodeUpdateData) => {
    const adminUserId = getAdminUserId();
    
    console.log('🎬 Updating episode:', episodeId, episodeData);
    
    try {
        const response = await axios.put(`${API_ENDPOINTS.ADMIN_EPISODES}/${episodeId}`, episodeData, {
            params: { adminUserId }
        });
        
        console.log('✅ Episode updated successfully:', response.data);
        return response.data;
    } catch (error: unknown) {
        const apiError = isApiError(error) ? error : { message: 'Unknown error' };
        console.error('❌ Update Episode Error:', {
            status: apiError.response?.status,
            data: apiError.response?.data,
            message: apiError.message
        });
        
        if (apiError.response?.data?.message && typeof apiError.response.data.message === 'string') {
            throw new Error(apiError.response.data.message);
        } else {
            throw new Error(`Error updating episode: ${apiError.message}`);
        }
    }
};

// Delete episode
export const deleteEpisode = async (episodeId: string) => {
    const adminUserId = getAdminUserId();
    
    console.log('🗑️ Deleting episode:', episodeId);
    
    try {
        const response = await axios.delete(`${API_ENDPOINTS.ADMIN_EPISODES}/${episodeId}`, {
            params: { adminUserId }
        });
        
        console.log('✅ Episode deleted successfully:', response.data);
        return response.data;
    } catch (error: unknown) {
        const apiError = isApiError(error) ? error : { message: 'Unknown error' };
        console.error('❌ Delete Episode Error:', {
            status: apiError.response?.status,
            data: apiError.response?.data,
            message: apiError.message
        });
        
        if (apiError.response?.data?.message && typeof apiError.response.data.message === 'string') {
            throw new Error(apiError.response.data.message);
        } else {
            throw new Error(`Error deleting episode: ${apiError.message}`);
        }
    }
};

// Reorder episodes
export const reorderEpisodes = async (movieId: string, episodes: Array<{ id: string; episode_number: number }>) => {
    const adminUserId = getAdminUserId();
    
    console.log('🔄 Reordering episodes for movie:', movieId, episodes);
    
    try {
        const response = await axios.post(API_ENDPOINTS.ADMIN_EPISODES_REORDER, {
            movie_id: movieId,
            episodes
        }, {
            params: { adminUserId }
        });
        
        console.log('✅ Episodes reordered successfully:', response.data);
        return response.data;
    } catch (error: unknown) {
        const apiError = isApiError(error) ? error : { message: 'Unknown error' };
        console.error('❌ Reorder Episodes Error:', {
            status: apiError.response?.status,
            data: apiError.response?.data,
            message: apiError.message
        });
        
        if (apiError.response?.data?.message && typeof apiError.response.data.message === 'string') {
            throw new Error(apiError.response.data.message);
        } else {
            throw new Error(`Error reordering episodes: ${apiError.message}`);
        }
    }
};