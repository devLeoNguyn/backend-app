import { useState } from 'react';
import { GridColDef } from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import DataTable from '../components/DataTable';
import { fetchProducts, deleteProduct } from '../api/ApiCollection';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AddData from '../components/AddData';
import EditData from '../components/EditData';

interface MovieData {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  producer: string;
  price: number;
  movieType: string;
  totalEpisodes: number;
  status: 'released' | 'ended' | string;
  img?: string;
}

const Products = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState<MovieData | null>(null);
  
  const { isLoading, isError, data } = useQuery({
    queryKey: ['allproducts'],
    queryFn: fetchProducts,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      toast.success('Xóa phim thành công!');
      queryClient.invalidateQueries({ queryKey: ['allproducts'] });
    },
    onError: () => {
      toast.error('Có lỗi xảy ra khi xóa phim!');
    },
  });

  // Handler để mở modal edit với dữ liệu phim
  const handleEditMovie = (rowData: Record<string, unknown>) => {
    // Safe type assertion
    const movieData = rowData as unknown as MovieData;
    setSelectedMovie(movieData);
    setIsEditOpen(true);
  };

  // Handler để xóa phim
  const handleDeleteMovie = (rowData: Record<string, unknown>) => {
    const movieData = rowData as unknown as MovieData;
    if (window.confirm(`Bạn có chắc chắn muốn xóa phim "${movieData.title}"?`)) {
      deleteMutation.mutate(movieData.id);
    }
  };

  // Handler để chuyển đến trang quản lý episodes
  const handleManageEpisodes = (rowData: Record<string, unknown>) => {
    const movieData = rowData as unknown as MovieData;
    navigate(`/admin/episodes?movieId=${movieData.id}`);
  };

  // Custom row actions
  const getRowActions = (row: Record<string, unknown>) => {
    const movie = row as unknown as MovieData;
    return [
      {
        label: 'Manage Episodes',
        onClick: () => handleManageEpisodes(row),
        icon: '📺',
        tooltip: `Manage episodes for ${movie.title}`
      }
    ];
  };

  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 80,
      minWidth: 80,
    },
    {
      field: 'img',
      headerName: 'Thông tin phim',  
      minWidth: 250,
      flex: 1.2,
      renderCell: (params) => {
        return (
          <div className="flex gap-3 items-center py-2">
            <div className="w-12 h-16 overflow-hidden rounded shadow-sm">
              <img
                src={params.row.img || '/default-movie-poster.jpg'}
                alt="movie-poster"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0 gap-1">
              <span className="font-semibold truncate text-sm text-gray-800">
                {params.row.title}
              </span>
              <span className="text-xs text-gray-500">
                {params.row.releaseYear}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'genre',
      type: 'string',
      headerName: 'Thể loại',
      minWidth: 120,
      flex: 0.8,
      renderCell: (params) => {
        return (
          <div className="flex justify-center">
            <span className="badge bg-gradient-to-r from-purple-500 to-pink-500 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200">
              {params.row.genre || 'Chưa phân loại'}
            </span>
          </div>
        );
      },
    },
    {
      field: 'price',
      type: 'number',
      headerName: 'Giá',
      minWidth: 100,
      flex: 0.7,
      renderCell: (params) => {
        const price = params.row.price || 0;
        return (
          <span className={price > 0 ? 'text-green-600 font-semibold' : 'text-gray-500 font-semibold'}>
            {price > 0 ? `${price.toLocaleString()}đ` : 'Miễn phí'}
          </span>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      minWidth: 130,
      flex: 0.8,
      renderCell: (params) => {
        const status = params.row.status;
        const isReleased = status === 'released';
        const isEnded = status === 'ended';
        
        let gradientClass = 'from-yellow-400 to-orange-500';
        let statusText = 'Đang sản xuất';
        
        if (isReleased) {
          gradientClass = 'from-green-400 to-emerald-500';
          statusText = 'Đã phát hành';
        } else if (isEnded) {
          gradientClass = 'from-red-400 to-pink-500';
          statusText = 'Đã kết thúc';
        }
        
        return (
          <div className="flex justify-center">
            <span className={`badge bg-gradient-to-r ${gradientClass} text-white font-medium shadow-md hover:shadow-lg transition-all duration-200`}>
              {statusText}
            </span>
          </div>
        );
      },
    },
  ];

    if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="loading loading-spinner loading-lg"></div>
      </div>
    );
    }

    if (isError) {
    toast.error('Lỗi khi tải dữ liệu phim!');
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-error">Có lỗi xảy ra khi tải dữ liệu</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">🎬 Quản lý phim</h1>
          <button
          className="btn btn-black elegant-black"
            onClick={() => setIsOpen(true)}
          >
          + Thêm phim mới
          </button>
        </div>

      <div className="flex-1">
          <DataTable
            columns={columns}
          rows={data || []} 
            slug="products"
            includeActionColumn={true}
          onEdit={handleEditMovie} // Handler để edit phim
          onDelete={handleDeleteMovie} // Handler để xóa phim
          getRowActions={getRowActions} // Custom actions cho quản lý episode
        />
            </div>

      {/* Add Data Modal */}
          <AddData
        slug="product" 
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          />

      {/* Edit Data Modal */}
      {selectedMovie && (
        <EditData 
          slug="product" 
          isOpen={isEditOpen} 
          setIsOpen={setIsEditOpen}
          movieData={selectedMovie}
        />
        )}
    </div>
  );
};

export default Products;
