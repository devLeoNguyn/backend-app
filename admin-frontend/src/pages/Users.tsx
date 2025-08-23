import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  MdSearch, 
  MdEmail,
  MdPhone,
  MdCalendarToday
} from 'react-icons/md';
import { fetchUsers } from '../api/ApiCollection';

interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: string;
  gender?: string;
  img?: string;
  createdAt: string;
  isActive: boolean;
}

// Component Avatar tái sử dụng
const UserAvatar = ({ user, size = 'w-16 h-16' }: { user: User; size?: string }) => {
  const getInitials = () => {
    const firstInitial = user.firstName?.[0] || '';
    const lastInitial = user.lastName?.[0] || '';
    return (firstInitial + lastInitial) || user.email?.[0]?.toUpperCase() || '?';
  };

  const getGradientColor = () => {
    // Tạo màu gradient dựa trên tên để mỗi user có màu riêng
    const colors = [
      'from-blue-500 to-blue-600',
      'from-purple-500 to-purple-600', 
      'from-green-500 to-green-600',
      'from-orange-500 to-orange-600',
      'from-pink-500 to-pink-600',
      'from-indigo-500 to-indigo-600',
      'from-teal-500 to-teal-600',
      'from-red-500 to-red-600'
    ];
    const index = (user.firstName?.charCodeAt(0) || 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="avatar relative">
      <div className={`${size} rounded-full ring ring-primary ring-offset-2 bg-base-300 overflow-hidden`}>
        {user.img && user.img !== '/default-avatar.png' && !user.img.includes('default') ? (
          <img 
            src={user.img} 
            alt={`${user.firstName} ${user.lastName}`}
            className="object-cover w-full h-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              const parent = target.parentElement;
              if (parent && !parent.querySelector('.avatar-fallback')) {
                const fallback = document.createElement('div');
                fallback.className = `avatar-fallback w-full h-full flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br ${getGradientColor()}`;
                fallback.textContent = getInitials();
                parent.appendChild(fallback);
              }
            }}
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center text-xl font-bold text-white bg-gradient-to-br ${getGradientColor()}`}>
            {getInitials()}
          </div>
        )}
      </div>
      {/* Online status indicator removed */}
    </div>
  );
};

const Users = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['allusers', currentPage, pageSize, searchTerm],
    queryFn: () => fetchUsers(currentPage, pageSize, searchTerm || undefined),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6">
        <div className="card bg-error text-error-content max-w-md mx-auto shadow-xl">
          <div className="card-body text-center">
            <h2 className="card-title">⚠️ Lỗi tải dữ liệu</h2>
            <p>Không thể tải danh sách người dùng</p>
          </div>
        </div>
      </div>
    );
  }

  const users: User[] = data?.users || [];
  const pagination = data?.pagination;
  
  // Filter users based on role (client-side filter for role)
  const filteredUsers = users.filter(user => {
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesRole;
  });

  const totalUsers = pagination?.totalUsers || 0;
  const adminCount = users.filter(u => u.role === 'admin').length;
  const userCount = users.filter(u => u.role === 'user').length;
  
  // Handle search with debounce
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1); // Reset to first page when changing page size
  };

  return (
    <div className="p-6 space-y-6 bg-base-100 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-base-content">Quản lý Người dùng</h1>
        {/* <button 
          className="btn btn-primary gap-2"
          onClick={() => setIsAddModalOpen(true)}
        >
          <MdAdd className="w-5 h-5" />
          Thêm người dùng
        </button> */}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Tổng số</p>
                <p className="text-2xl font-bold">{totalUsers}</p>
                <p className="text-xs opacity-75 mt-1">người dùng</p>
              </div>
              {/* <div className="text-3xl opacity-90">👥</div> */}
            </div>
          </div>
        </div>
        
        <div className="card bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Admin</p>
                <p className="text-2xl font-bold">{adminCount}</p>
                <p className="text-xs opacity-75 mt-1">quản trị viên</p>
              </div>
              {/* <div className="text-3xl opacity-90">👑</div> */}
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-xl">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium opacity-90">Thành viên</p>
                <p className="text-2xl font-bold">{userCount}</p>
                <p className="text-xs opacity-75 mt-1">người dùng thường</p>
              </div>
              {/* <div className="text-3xl opacity-90">👤</div> */}
            </div>
          </div>
        </div>

        {/* Removed online status KPI card */}
      </div>

      {/* Filters & Search Card */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <h2 className="card-title text-base-content mb-4">🔍 Tìm kiếm & Lọc</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-base-content/50" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  className="input input-bordered w-full pl-10"
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select 
                className="select select-bordered"
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
              >
                <option value="all">Tất cả vai trò</option>
                <option value="admin">Admin</option>
                <option value="user">Người dùng</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Users Table Card */}
      <div className="card bg-base-200 shadow-xl">
        <div className="card-body">
          <div className="flex items-center justify-between mb-6">
            <h2 className="card-title text-base-content">
              📋 Danh sách người dùng ({filteredUsers.length})
            </h2>
              <div className="badge badge-primary badge-lg">{filteredUsers.length} kết quả</div>
          </div>
          
          {filteredUsers.length > 0 ? (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <div key={user.id} className="card bg-base-100 shadow-md hover:shadow-lg transition-all duration-200 border border-base-300">
                  <div className="card-body p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <UserAvatar user={user} />
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold text-base-content">
                              {user.firstName} {user.lastName}
                            </h3>
                            <div className={`badge ${
                              user.role === 'admin' ? 'badge-warning' : 'badge-info'
                            }`}>
                              {user.role === 'admin' ? 'Admin' : 'User'}
                            </div>
                            {/* Removed per-user online badge */}
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-4 text-sm text-base-content/70">
                            <div className="flex items-center gap-1">
                              <MdEmail className="w-4 h-4" />
                              <span>{user.email}</span>
                            </div>
                            {user.phone && (
                              <div className="flex items-center gap-1">
                                <MdPhone className="w-4 h-4" />
                                <span>{user.phone}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <MdCalendarToday className="w-4 h-4" />
                              <span>Tham gia: {new Date(user.createdAt).toLocaleDateString('vi-VN')}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Lock/Unlock actions */}
                      {/* <div className="flex items-center gap-2"> */}
                        {/* <button
                          className="btn btn-sm btn-outline"
                          onClick={async () => {
                            try {
                              await setUserLockStatus(user.id, 'lock');
                              window.location.reload();
                            } catch (e) {
                              console.error('Lock user failed', e);
                            }
                          }}
                        >
                          <MdLock className="w-4 h-4" /> Khóa
                        </button>
                        <button
                          className="btn btn-sm btn-outline"
                          onClick={async () => {
                            try {
                              await setUserLockStatus(user.id, 'unlock');
                              window.location.reload();
                            } catch (e) {
                              console.error('Unlock user failed', e);
                            }
                          }}
                        >
                          <MdLockOpen className="w-4 h-4" /> Mở khóa
                        </button> */}
                      {/* </div> */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <p className="text-base-content/70 font-medium text-lg mb-2">
                Không tìm thấy người dùng nào
              </p>
              <p className="text-base-content/50 text-sm">
                Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc
              </p>
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {data?.pagination && data.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 p-4 bg-base-200 rounded-lg">
            <div className="text-sm text-base-content/70">
              Hiển thị {((data.pagination.currentPage - 1) * data.pagination.pageSize) + 1} - {Math.min(data.pagination.currentPage * data.pagination.pageSize, data.pagination.totalUsers)} trong tổng số {data.pagination.totalUsers} người dùng
            </div>
            
            <div className="flex items-center gap-4">
              {/* Page Size Selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm">Hiển thị:</span>
                <select 
                  className="select select-bordered select-sm"
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Pagination Buttons */}
              <div className="flex items-center gap-2">
                <button
                  className="btn btn-sm btn-outline"
                  disabled={!data.pagination.hasPrev}
                  onClick={() => handlePageChange(data.pagination.currentPage - 1)}
                >
                  ‹ Trước
                </button>
                
                <span className="text-sm px-3 py-1 bg-base-300 rounded">
                  Trang {data.pagination.currentPage} / {data.pagination.totalPages}
                </span>
                
                <button
                  className="btn btn-sm btn-outline"
                  disabled={!data.pagination.hasNext}
                  onClick={() => handlePageChange(data.pagination.currentPage + 1)}
                >
                  Tiếp ›
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="modal modal-open">
          <div className="modal-box">
            <h3 className="font-bold text-lg mb-4">🆕 Thêm người dùng mới</h3>
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span>Chức năng này sẽ được phát triển trong phiên bản tiếp theo.</span>
            </div>
            <div className="modal-action">
              <button 
                className="btn btn-primary" 
                onClick={() => setIsAddModalOpen(false)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
