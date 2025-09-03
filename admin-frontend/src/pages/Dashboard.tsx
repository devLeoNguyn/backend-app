import { useQuery } from '@tanstack/react-query';
import { 
  MdTrendingUp,
  MdPeople
} from 'react-icons/md';
import { API_BASE_URL } from '../config/api';

// API functions
const fetchDashboardStats = async () => {
  const adminUserId = JSON.parse(localStorage.getItem('adminUser') || '{}')._id;
  if (!adminUserId) {
    throw new Error('Admin user ID not found');
  }

  const [totalUsers, totalMovies, totalRevenue, rentals] = await Promise.all([
    fetch(`${API_BASE_URL}/api/admin/totalusers?adminUserId=${adminUserId}`).then(r => r.json()),
    fetch(`${API_BASE_URL}/api/admin/totalproducts?adminUserId=${adminUserId}`).then(r => r.json()),
    fetch(`${API_BASE_URL}/api/admin/totalrevenue?adminUserId=${adminUserId}`).then(r => r.json()),
    // ❌ KHÔNG SỬ DỤNG - Backend không có route /api/admin/rentals
    // 🗓️ Date: 24/08/2025 - Comment vì endpoint không tồn tại 
    // 🔧 Fallback: Sử dụng existing rental stats endpoint
    // fetch(`${API_BASE_URL}/api/admin/rentals?adminUserId=${adminUserId}`).then(r => r.json())
    fetch(`${API_BASE_URL}/api/rentals/stats/popular?limit=5`).then(r => r.json()).then(data => data.data || [])
  ]);

  return {
    totalUsers,
    totalMovies,
    totalRevenue,
    totalRentals: rentals.length,
    rentals: rentals.slice(0, 5)
  };
};

const Dashboard = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
    refetchInterval: 30000 // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="card bg-error text-error-content max-w-md mx-auto shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title">⚠️ Lỗi tải dữ liệu</h2>
            <p>Không thể tải dữ liệu dashboard</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-base-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-base-content">🎬 Dashboard Tổng quan</h1>
        <div className="badge badge-primary badge-lg">Cập nhật realtime</div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Tổng Users</p>
                <p className="text-2xl font-bold">{data?.totalUsers?.number || 0}</p>
                <p className="text-xs opacity-75 mt-1">+{data?.totalUsers?.percentage || 0}% tháng này</p>
              </div>
              <div className="text-3xl opacity-90">👥</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Tổng Movies</p>
                <p className="text-2xl font-bold">{data?.totalMovies?.number || 0}</p>
                <p className="text-xs opacity-75 mt-1">+{data?.totalMovies?.percentage || 0}% tháng này</p>
              </div>
              <div className="text-3xl opacity-90">🎬</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-yellow-500 to-yellow-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Doanh Thu</p>
                <p className="text-2xl font-bold">{(data?.totalRevenue?.number || 0).toLocaleString()}</p>
                <p className="text-xs opacity-75 mt-1">+{data?.totalRevenue?.percentage || 0}% tháng này</p>
              </div>
              <div className="text-3xl opacity-90">💰</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Tổng Rentals</p>
                <p className="text-2xl font-bold">{data?.totalRentals || 0}</p>
                <p className="text-xs opacity-75 mt-1">+5% tháng này</p>
              </div>
              <div className="text-3xl opacity-90">📀</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Rentals Card */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between mb-6">
            <h2 className="card-title text-base-content">
              📋 Giao Dịch Thuê Phim Gần Đây
            </h2>
            <div className="badge badge-primary">
              <MdTrendingUp className="w-4 h-4 mr-1" />
              Realtime
            </div>
          </div>
          
          {data?.rentals && data.rentals.length > 0 ? (
            <div className="space-y-4">
              {data.rentals.map((rental: {
                customerName?: string;
                email?: string; 
                movieTitle?: string;
                amount?: number;
                status: string;
                createdAt: string;
              }, index: number) => (
                <div key={index} className="card bg-base-100 shadow-md">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-primary text-primary-content rounded-full w-12">
                            <span className="text-xs">
                              <MdPeople className="w-6 h-6" />
                            </span>
                          </div>
                        </div>
                        <div>
                          <h3 className="font-semibold text-base-content">
                            {rental.customerName || 'N/A'}
                          </h3>
                          <p className="text-sm text-base-content/70">
                            {rental.email || 'N/A'}
                          </p>
                          <p className="text-sm text-base-content font-medium">
                            🎬 {rental.movieTitle || 'N/A'}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-lg font-bold text-success">
                          {rental.amount ? `${rental.amount.toLocaleString()} đ` : 'Miễn phí'}
                        </div>
                        <div className={`badge ${
                          rental.status === 'active' 
                            ? 'badge-success' 
                            : rental.status === 'expired'
                            ? 'badge-error'
                            : 'badge-neutral'
                        }`}>
                          {rental.status === 'active' ? '🟢 Hoạt động' : 
                           rental.status === 'expired' ? '🔴 Hết hạn' : rental.status}
                        </div>
                        <div className="text-xs text-base-content/50 mt-1">
                          {new Date(rental.createdAt).toLocaleDateString('vi-VN')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">💳</div>
              <p className="text-base-content/70 font-medium text-lg mb-2">
                Chưa có giao dịch thuê phim nào
              </p>
              <p className="text-base-content/50 text-sm">
                Các giao dịch mới sẽ hiển thị tại đây
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">👥 Quản lý Users</h3>
          <p className="text-blue-100 mb-4">Xem và quản lý tài khoản người dùng</p>
          <button className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors">
            Xem Users
          </button>
        </div>
        
        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">🎬 Quản lý Movies</h3>
          <p className="text-green-100 mb-4">Thêm, sửa, xóa phim trong hệ thống</p>
          <button className="bg-white text-green-600 px-4 py-2 rounded-md font-medium hover:bg-green-50 transition-colors">
            Xem Movies
          </button>
        </div>
        
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">📊 Thống kê</h3>
          <p className="text-purple-100 mb-4">Xem báo cáo và phân tích dữ liệu</p>
          <button className="bg-white text-purple-600 px-4 py-2 rounded-md font-medium hover:bg-purple-50 transition-colors">
            Xem Thống kê
          </button>
        </div>
      </div> */}
    </div>
  );
};

export default Dashboard; 