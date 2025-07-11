import { useQuery } from '@tanstack/react-query';
import { 
  MdGroup, 
  MdMovie, 
  MdAttachMoney, 
  MdPlayCircle,
  MdTrendingUp,
  MdPeople,
  MdShoppingCart
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
    fetch(`${API_BASE_URL}/api/admin/rentals?adminUserId=${adminUserId}`).then(r => r.json())
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
      <div className="flex items-center justify-center min-h-screen">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-error">
        <span>Lỗi khi tải dữ liệu dashboard</span>
      </div>
    );
  }

  const stats = [
    {
      title: 'Tổng Users',
      value: data?.totalUsers?.number || 0,
      change: `+${data?.totalUsers?.percentage || 0}%`,
      icon: MdGroup,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Tổng Movies',
      value: data?.totalMovies?.number || 0,
      change: `+${data?.totalMovies?.percentage || 0}%`,
      icon: MdMovie,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Doanh Thu',
      value: `${(data?.totalRevenue?.number || 0).toLocaleString()} đ`,
      change: `+${data?.totalRevenue?.percentage || 0}%`,
      icon: MdAttachMoney,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-600'
    },
    {
      title: 'Tổng Rentals',
      value: data?.totalRentals || 0,
      change: '+5%',
      icon: MdPlayCircle,
      color: 'bg-purple-500',
      textColor: 'text-purple-600'
    }
  ];

  return (
    <div className="w-full p-0 m-0">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🎬 Movie App Admin Dashboard
        </h1>
        <p className="text-gray-600 dark:text-gray-300">
          Tổng quan hệ thống quản lý phim và người dùng
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-full ${stat.color}`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <span className={`text-sm font-medium ${stat.textColor}`}>
                {stat.change}
              </span>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                {stat.value}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                {stat.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Recent Rentals */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            📋 Giao Dịch Thuê Phim Gần Đây
          </h2>
          <MdTrendingUp className="w-6 h-6 text-gray-400" />
        </div>
        
        {data?.rentals && data.rentals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Khách hàng
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Phim
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Số tiền
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Trạng thái
                  </th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900 dark:text-white">
                    Ngày
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.rentals.map((rental: {
                  customerName?: string;
                  email?: string; 
                  movieTitle?: string;
                  amount?: number;
                  status: string;
                  createdAt: string;
                }, index: number) => (
                  <tr key={index} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <MdPeople className="w-4 h-4 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {rental.customerName || 'N/A'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {rental.email || 'N/A'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-gray-900 dark:text-white">
                        {rental.movieTitle || 'N/A'}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-green-600">
                        {rental.amount ? `${rental.amount.toLocaleString()} đ` : 'Miễn phí'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        rental.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : rental.status === 'expired'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {rental.status === 'active' ? '✅ Hoạt động' : 
                         rental.status === 'expired' ? '⏰ Hết hạn' : rental.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                      {rental.createdAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <MdShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Chưa có giao dịch thuê phim nào</p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
};

export default Dashboard; 