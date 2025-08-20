import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import { getAdminUserId } from '../api/ApiCollection';
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

interface RepeatRateData {
  totalBuyers: number;
  repeaters: number;
  repeatRate: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

interface ChurnRateData {
  totalUsersA: number;
  totalUsersB: number;
  churnedUsers: number;
  churnRate: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

interface TopCustomer {
  userId: string;
  name?: string | null;
  email?: string | null;
  totalSpent: number;
  orders: number;
  avgOrderValue: number;
  lastPurchase: string;
  share: number;
}

interface TopViewMovie {
  _id: string;
  movieTitle: string;
  posterPath: string;
  movieType: string;
  price: number;
  totalViews: number;
  uniqueViewersCount: number;
  lastViewedAt: string;
  avgViewsPerUser: number;
}

interface LowViewMovie {
  _id: string;
  movieTitle: string;
  posterPath: string;
  movieType: string;
  price: number;
  totalViews: number;
  uniqueViewersCount: number;
  lastViewedAt: string | null;
  avgViewsPerUser: number;
  createdAt: string;
}

const Analytics: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [topMovies, setTopMovies] = useState<TopMovie[]>([]);
  const [rentalDistribution, setRentalDistribution] = useState<RentalDistribution[]>([]);
  const [repeatRateData, setRepeatRateData] = useState<RepeatRateData | null>(null);
  const [churnRateData, setChurnRateData] = useState<ChurnRateData | null>(null);
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([]);
  const [topViewMovies, setTopViewMovies] = useState<TopViewMovie[]>([]);
  const [lowViewMovies, setLowViewMovies] = useState<LowViewMovie[]>([]);
  const [loading, setLoading] = useState(true);
  interface FilterState {
    mode: 'month' | 'quarter' | 'year';
    month?: string; // YYYY-MM
    quarter?: number; // 1-4
    year?: string; // YYYY
  }

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const currentYear = `${now.getFullYear()}`;
  const currentQuarter = Math.floor(now.getMonth() / 3) + 1;

  const [filter, setFilter] = useState<FilterState>({
    mode: 'month',
    month: currentMonth,
    quarter: currentQuarter,
    year: currentYear
  });

  const getRangeFromFilter = useCallback((f: FilterState) => {
    if (f.mode === 'month' && f.month) {
      const [y, m] = f.month.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 0); // last day of month
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    }

    if (f.mode === 'quarter' && f.quarter && f.year) {
      const q = f.quarter;
      const y = Number(f.year);
      const startMonth = (q - 1) * 3; // 0-based
      const start = new Date(y, startMonth, 1);
      const end = new Date(y, startMonth + 3, 0); // last day of quarter
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    }

    if (f.mode === 'year' && f.year) {
      const y = Number(f.year);
      const start = new Date(y, 0, 1);
      const end = new Date(y, 11, 31);
      return {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0]
      };
    }

    // fallback: last 30 days
    const fallbackStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    return {
      startDate: fallbackStart.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    };
  }, []);

  const fetchAnalyticsData = useCallback(async () => {
    setLoading(true);
    try {
  const baseUrl = import.meta.env.VITE_API_URL || API_BASE_URL;
  const userId = getAdminUserId();
  const { startDate, endDate } = getRangeFromFilter(filter);

  const params = new URLSearchParams({ startDate, endDate });
  if (userId) params.set('userId', userId);

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

      // Fetch customer analytics - 3 chỉ số mới
      // Repeat Purchase Rate (90 ngày)
      const repeatResponse = await fetch(`${baseUrl}/api/analytics/repeat-rate?${params}`);
      if (repeatResponse.ok) {
        const repeatResult = await repeatResponse.json();
        setRepeatRateData(repeatResult.data);
      }

      // Churn Rate (2 kỳ 90 ngày)
      const churnResponse = await fetch(`${baseUrl}/api/analytics/churn-rate?${params}`);
      if (churnResponse.ok) {
        const churnResult = await churnResponse.json();
        setChurnRateData(churnResult.data);
      }

      // Top Customers (limit=10)
      const customersResponse = await fetch(`${baseUrl}/api/analytics/top-customers?${params}&limit=10`);
      if (customersResponse.ok) {
        const customersResult = await customersResponse.json();
        setTopCustomers(customersResult.data.customers || []);
      }

      // Top Movies by Views (lượt view cao)
      const topViewsResponse = await fetch(`${baseUrl}/api/analytics/top-movies-by-views?${params}&limit=10`);
      if (topViewsResponse.ok) {
        const topViewsResult = await topViewsResponse.json();
        setTopViewMovies(topViewsResult.data || []);
      }

      // Low View Movies (lượt view thấp)
      const lowViewsResponse = await fetch(`${baseUrl}/api/analytics/low-view-movies?${params}&limit=10&minViewThreshold=0`);
      if (lowViewsResponse.ok) {
        const lowViewsResult = await lowViewsResponse.json();
        setLowViewMovies(lowViewsResult.data || []);
      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
    } finally {
      setLoading(false);
    }
  }, [filter, getRangeFromFilter]);

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
        
        {/* Date Range / Mode Filter */}
        <div className="flex gap-2 items-center bg-base-200 p-3 rounded-lg">
          <label className="text-sm text-base-content/70">Hiển thị theo:</label>
          <select
            value={filter.mode}
            onChange={(e) => setFilter(prev => ({ ...prev, mode: e.target.value as FilterState['mode'] }))}
            className="select select-sm select-bordered bg-base-100"
          >
            <option value="month">Tháng</option>
            <option value="quarter">Quý</option>
            <option value="year">Năm</option>
          </select>

          {filter.mode === 'month' && (
            <input
              type="month"
              value={filter.month}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(prev => ({ ...prev, month: e.target.value }))}
              className="input input-sm input-bordered bg-base-100"
            />
          )}

          {filter.mode === 'quarter' && (
            <div className="flex gap-2 items-center">
              <select
                value={String(filter.quarter)}
                onChange={(e) => setFilter(prev => ({ ...prev, quarter: Number(e.target.value) }))}
                className="select select-sm select-bordered bg-base-100"
              >
                <option value="1">Q1</option>
                <option value="2">Q2</option>
                <option value="3">Q3</option>
                <option value="4">Q4</option>
              </select>
              <input
                type="number"
                min={2000}
                max={2100}
                value={filter.year}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(prev => ({ ...prev, year: e.target.value }))}
                className="input input-sm input-bordered bg-base-100 w-28"
              />
            </div>
          )}

          {filter.mode === 'year' && (
            <input
              type="number"
              min={2000}
              max={2100}
              value={filter.year}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilter(prev => ({ ...prev, year: e.target.value }))}
              className="input input-sm input-bordered bg-base-100 w-28"
            />
          )}

          {/* Quick Presets */}
          <div className="divider divider-horizontal"></div>
          <div className="flex gap-1">
            <button
              onClick={() => setFilter({
                mode: 'month',
                month: currentMonth,
                quarter: currentQuarter,
                year: currentYear
              })}
              className="btn btn-xs btn-outline"
            >
              Tháng này
            </button>
            <button
              onClick={() => setFilter({
                mode: 'quarter',
                month: currentMonth,
                quarter: currentQuarter,
                year: currentYear
              })}
              className="btn btn-xs btn-outline"
            >
              Quý này
            </button>
            <button
              onClick={() => setFilter({
                mode: 'year',
                month: currentMonth,
                quarter: currentQuarter,
                year: currentYear
              })}
              className="btn btn-xs btn-outline"
            >
              Năm nay
            </button>
          </div>

          <button
            onClick={() => fetchAnalyticsData()}
            className="btn btn-sm btn-primary ml-2"
          >Áp dụng</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Customer Analytics KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Tỷ lệ Mua lại</p>
                <p className="text-2xl font-bold">
                  {((repeatRateData?.repeatRate || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {repeatRateData?.repeaters || 0}/{repeatRateData?.totalBuyers || 0} khách hàng
                </p>
                {repeatRateData && repeatRateData.totalBuyers >= 30 && (
                  <p className="text-xs opacity-60 mt-1">
                    CI: {(repeatRateData.confidenceInterval.lower * 100).toFixed(1)}%-{(repeatRateData.confidenceInterval.upper * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="text-3xl opacity-90">🔄</div>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-red-500 to-red-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Tỷ lệ Rời đi</p>
                <p className="text-2xl font-bold">
                  {((churnRateData?.churnRate || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs opacity-75 mt-1">
                  {churnRateData?.churnedUsers || 0}/{churnRateData?.totalUsersA || 0} khách rời đi
                </p>
                {churnRateData && churnRateData.totalUsersA >= 30 && (
                  <p className="text-xs opacity-60 mt-1">
                    CI: {(churnRateData.confidenceInterval.lower * 100).toFixed(1)}%-{(churnRateData.confidenceInterval.upper * 100).toFixed(1)}%
                  </p>
                )}
              </div>
              <div className="text-3xl opacity-90">📉</div>
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

      {/* Top Customers Table */}
      {topCustomers.length > 0 && (
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-base-content mb-4">🏆 Top Khách hàng (theo Doanh thu)</h3>
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th className="text-base-content">Khách hàng</th>
                    <th className="text-base-content text-right">Tổng chi tiêu</th>
                    <th className="text-base-content text-right">Số đơn</th>
                    <th className="text-base-content text-right">TB/Đơn</th>
                    <th className="text-base-content text-right">% Doanh thu</th>
                    <th className="text-base-content text-right">Mua gần nhất</th>
                  </tr>
                </thead>
                <tbody>
                  {topCustomers.map((customer, index) => (
                    <tr key={customer.userId}>
                      <td className="font-medium text-base-content">
                        <div className="flex items-center gap-2">
                          <div className="badge badge-primary badge-sm">#{index + 1}</div>
                          <div>
                            <div className="font-bold text-sm">
                              {customer.name || customer.email || `User ${customer.userId.slice(-6)}`}
                            </div>
                            {customer.email && customer.name && (
                              <div className="text-xs opacity-70">{customer.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="text-right text-success font-semibold">
                        {formatCurrency(customer.totalSpent)}
                      </td>
                      <td className="text-right text-base-content">
                        {customer.orders}
                      </td>
                      <td className="text-right text-base-content">
                        {formatCurrency(customer.avgOrderValue)}
                      </td>
                      <td className="text-right">
                        <span className={`badge ${customer.share > 0.05 ? 'badge-success' : customer.share > 0.02 ? 'badge-warning' : 'badge-ghost'}`}>
                          {(customer.share * 100).toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right text-sm text-base-content/70">
                        {new Date(customer.lastPurchase).toLocaleDateString('vi-VN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-sm text-base-content/70">
              <p>💡 Badge màu: xanh = &gt;5% doanh thu, vàng = 2-5%, xám = &lt;2%</p>
            </div>
          </div>
        </div>
      )}

      {/* Top Movies by Views và Low View Movies - 2 bảng song song */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 10 Movies - Lượt view cao nhất */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-base-content mb-4">🔥 Top 10 - Lượt xem cao nhất</h3>
            {topViewMovies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-base-content">Phim</th>
                      <th className="text-base-content text-center">Loại</th>
                      <th className="text-base-content text-center">Lượt xem</th>
                      <th className="text-base-content text-center">Người xem</th>
                      <th className="text-base-content text-center">TB/người</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topViewMovies.map((movie, index) => (
                      <tr key={movie._id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-base-content text-xs">#{index + 1}</div>
                            <div>
                              <div className="font-semibold text-base-content text-xs truncate max-w-[120px]" title={movie.movieTitle}>
                                {movie.movieTitle}
                              </div>
                              <div className="text-xs opacity-70">
                                {movie.price > 0 ? `${movie.price.toLocaleString()}đ` : 'Miễn phí'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`badge badge-sm ${movie.movieType === 'Phim lẻ' ? 'badge-primary' : 'badge-secondary'}`}>
                            {movie.movieType === 'Phim lẻ' ? 'Lẻ' : 'Bộ'}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="font-bold text-success">{movie.totalViews.toLocaleString()}</span>
                        </td>
                        <td className="text-center">
                          <span className="text-base-content">{movie.uniqueViewersCount.toLocaleString()}</span>
                        </td>
                        <td className="text-center">
                          <span className="text-base-content">{movie.avgViewsPerUser.toFixed(1)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-base-content/70">
                <p>Không có dữ liệu lượt xem trong khoảng thời gian này</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom 10 Movies - Lượt view thấp nhất */}
        <div className="card bg-base-200 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-base-content mb-4">📉 Top 10 - Lượt xem thấp nhất</h3>
            {lowViewMovies.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="table table-xs w-full">
                  <thead>
                    <tr>
                      <th className="text-base-content">Phim</th>
                      <th className="text-base-content text-center">Loại</th>
                      <th className="text-base-content text-center">Lượt xem</th>
                      <th className="text-base-content text-center">Người xem</th>
                      <th className="text-base-content text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowViewMovies.map((movie, index) => (
                      <tr key={movie._id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="font-bold text-base-content text-xs">#{index + 1}</div>
                            <div>
                              <div className="font-semibold text-base-content text-xs truncate max-w-[120px]" title={movie.movieTitle}>
                                {movie.movieTitle}
                              </div>
                              <div className="text-xs opacity-70">
                                {movie.price > 0 ? `${movie.price.toLocaleString()}đ` : 'Miễn phí'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="text-center">
                          <span className={`badge badge-sm ${movie.movieType === 'Phim lẻ' ? 'badge-primary' : 'badge-secondary'}`}>
                            {movie.movieType === 'Phim lẻ' ? 'Lẻ' : 'Bộ'}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`font-bold ${movie.totalViews === 0 ? 'text-error' : 'text-warning'}`}>
                            {movie.totalViews.toLocaleString()}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="text-base-content">{movie.uniqueViewersCount.toLocaleString()}</span>
                        </td>
                        <td className="text-center">
                          {movie.totalViews === 0 ? (
                            <span className="badge badge-error badge-sm">Chưa xem</span>
                          ) : movie.totalViews < 5 ? (
                            <span className="badge badge-warning badge-sm">Ít xem</span>
                          ) : (
                            <span className="badge badge-info badge-sm">Bình thường</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-base-content/70">
                <p>Không có dữ liệu</p>
              </div>
            )}
            <div className="mt-4 text-sm text-base-content/70">
              <p>💡 Badge trạng thái: đỏ = 0 view, vàng = &lt;5 views, xanh = &gt;=5 views</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
