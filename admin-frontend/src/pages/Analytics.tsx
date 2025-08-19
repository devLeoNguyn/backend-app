import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

interface DashboardData {
  totalRevenue: number;
  totalOrders: number;
  avgOrderValue: number;
  activeCustomers: number;
  rentalTypeDistribution: Array<{
    _id: string;
    count: number;
    revenue: number;
  }>;
}

interface TrendData {
  _id: string;
  revenue: number;
  orders: number;
}

interface TopMovie {
  _id: string;
  movieTitle: string;
  moviePoster: string;
  totalRevenue: number;
  totalRentals: number;
  avgRentalValue: number;
}

interface RentalDistribution {
  _id: string;
  rentalType: string;
  count: number;
  revenue: number;
  percentage: number;
}

const Analytics: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [topMovies, setTopMovies] = useState<TopMovie[]>([]);
  const [rentalDistribution, setRentalDistribution] = useState<RentalDistribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3003';
      const userId = '6863e129661212a5d79c271f'; // Admin user ID
      
      const params = new URLSearchParams({
        userId,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      // Fetch dashboard data
      const dashboardResponse = await fetch(`${baseUrl}/api/analytics/dashboard?${params}`);
      if (dashboardResponse.ok) {
        const dashboardResult = await dashboardResponse.json();
        setDashboardData(dashboardResult.data);
      }

      // Fetch trend data
      const trendResponse = await fetch(`${baseUrl}/api/analytics/trends?${params}`);
      if (trendResponse.ok) {
        const trendResult = await trendResponse.json();
        setTrendData(trendResult.data);
      }

      // Fetch top movies
      const moviesResponse = await fetch(`${baseUrl}/api/analytics/top-movies?${params}&limit=10`);
      if (moviesResponse.ok) {
        const moviesResult = await moviesResponse.json();
        setTopMovies(moviesResult.data);
      }

      // Fetch rental distribution
      const distributionResponse = await fetch(`${baseUrl}/api/analytics/rental-distribution?${params}`);
      if (distributionResponse.ok) {
        const distributionResult = await distributionResponse.json();
        setRentalDistribution(distributionResult.data);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const pieColors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1'];

  const pieChartData = rentalDistribution.map((item, index) => ({
    name: item.rentalType === '48h' ? 'Thuê 48 giờ' : 'Thuê 30 ngày',
    value: item.count,
    revenue: item.revenue,
    percentage: item.percentage || 0,
    color: pieColors[index % pieColors.length]
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-base-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-base-content">📊 Quản lý Doanh thu</h1>
        
        {/* Date Range Filter */}
        <div className="flex gap-2 items-center bg-base-200 p-3 rounded-lg">
          <span className="text-sm text-base-content/70">Từ:</span>
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="input input-sm input-bordered bg-base-100"
          />
          <span className="text-sm text-base-content/70">đến:</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="input input-sm input-bordered bg-base-100"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-r from-green-500 to-green-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Tổng Doanh thu</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(dashboardData?.totalRevenue || 0)}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {dashboardData?.totalOrders || 0} đơn hàng
                </p>
              </div>
              <div className="text-3xl opacity-90">💰</div>
            </div>
          </div>
        </div>

        {/* <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Khách hàng đang thuê</p>
                <p className="text-2xl font-bold">
                  {dashboardData?.activeCustomers || 0}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  Đang có phim thuê active
                </p>
              </div>
              <div className="text-3xl opacity-90">👥</div>
            </div>
          </div>
        </div> */}

        <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Giá trị TB/Đơn</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(dashboardData?.avgOrderValue || 0)}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  Trung bình mỗi đơn hàng
                </p>
              </div>
              <div className="text-3xl opacity-90">📈</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Top phim</p>
                <p className="text-2xl font-bold">
                  {topMovies.length}
                </p>
                <p className="text-xs opacity-75 mt-1">
                  Phim có doanh thu
                </p>
              </div>
              <div className="text-3xl opacity-90">🎬</div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Chart */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-base-content">📈 Xu hướng Doanh thu theo Ngày</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="_id" className="text-base-content" />
                <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-base-content" />
                <Tooltip 
                  formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                  labelFormatter={(label) => `Ngày: ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--b2))', 
                    border: '1px solid hsl(var(--bc) / 0.2)',
                    borderRadius: '8px',
                    color: 'hsl(var(--bc))'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="revenue" 
                  stroke="#8884d8" 
                  strokeWidth={3}
                  name="Doanh thu"
                  dot={{ fill: '#8884d8', strokeWidth: 2, r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rental Type Distribution */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-base-content">⏰ Phân bố Gói thuê</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name}: ${percentage?.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [
                    `${value} lượt`,
                    `${formatCurrency((pieChartData.find(item => item.value === value)?.revenue || 0))}`
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--b2))', 
                    border: '1px solid hsl(var(--bc) / 0.2)',
                    borderRadius: '8px',
                    color: 'hsl(var(--bc))'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Movies Bar Chart */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-base-content">🎬 Top 10 Phim có Doanh thu Cao nhất</h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topMovies} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis 
                dataKey="movieTitle" 
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                tick={{ fontSize: 12 }}
                className="text-base-content"
              />
              <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}K`} className="text-base-content" />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), 'Doanh thu']}
                labelFormatter={(label) => `Phim: ${label}`}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--b2))', 
                  border: '1px solid hsl(var(--bc) / 0.2)',
                  borderRadius: '8px',
                  color: 'hsl(var(--bc))'
                }}
              />
              <Legend />
              <Bar dataKey="totalRevenue" fill="#82ca9d" name="Doanh thu" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Movies Table */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h3 className="card-title text-base-content mb-4">📋 Chi tiết Top Phim</h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th className="text-base-content">Phim</th>
                  <th className="text-base-content text-right">Doanh thu</th>
                  <th className="text-base-content text-right">Lượt thuê</th>
                  <th className="text-base-content text-right">TB/Lượt</th>
                </tr>
              </thead>
              <tbody>
                {topMovies.map((movie) => (
                  <tr key={movie._id}>
                    <td className="font-medium text-base-content">
                      {movie.movieTitle}
                    </td>
                    <td className="text-right text-success font-semibold">
                      {formatCurrency(movie.totalRevenue)}
                    </td>
                    <td className="text-right text-base-content">
                      {movie.totalRentals}
                    </td>
                    <td className="text-right text-base-content">
                      {formatCurrency(movie.avgRentalValue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
