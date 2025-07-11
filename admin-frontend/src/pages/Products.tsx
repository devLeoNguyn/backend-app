import React from 'react';
import { GridColDef } from '@mui/x-data-grid';
import DataTable from '../components/DataTable';
import { fetchProducts } from '../api/ApiCollection';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AddData from '../components/AddData';
import EditData from '../components/EditData';

const Products = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const [selectedMovie, setSelectedMovie] = React.useState(null);
  
  const { isLoading, isError, data } = useQuery({
    queryKey: ['allproducts'],
    queryFn: fetchProducts,
  });

  // Handler để mở modal edit với dữ liệu phim
  const handleEditMovie = (movieData: any) => {
    setSelectedMovie(movieData);
    setIsEditOpen(true);
  };

  const columns: GridColDef[] = [
    { 
      field: 'id', 
      headerName: 'ID', 
      width: 90,
      minWidth: 90,
    },
    {
      field: 'img',
      headerName: 'Movie',  
      minWidth: 250,
      flex: 1,
      renderCell: (params) => {
        return (
          <div className="flex gap-2 items-center py-2">
            <div className="w-12 h-16 overflow-hidden rounded">
              <img
                src={params.row.img || ''}
                alt="movie-poster"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="font-semibold truncate">
                {params.row.title}
              </span>
              <span className="text-xs text-gray-500 truncate">
                {params.row.movieType} • {params.row.releaseYear}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'genre',
      type: 'string',
      headerName: 'Genre',
      minWidth: 120,
      flex: 0.8,
    },
    {
      field: 'price',
      type: 'number',
      headerName: 'Price',
      minWidth: 100,
      flex: 0.6,
      renderCell: (params) => {
        return (
          <span className={params.row.price > 0 ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {params.row.price > 0 ? `${params.row.price.toLocaleString()} đ` : 'Miễn phí'}
          </span>
        );
      },
    },
    {
      field: 'status',
      headerName: 'Status',
      minWidth: 120,
      flex: 0.6,
      renderCell: (params) => {
        const status = params.row.status;
        const isReleased = status === 'released';
        return (
          <span className={`badge ${isReleased ? 'badge-success' : 'badge-warning'} text-xs`}>
            {isReleased ? '✅ Đã phát hành' : '🚫 Đã kết thúc'}
          </span>
        );
      },
    },
    {
      field: 'createdAt',
      type: 'string',
      headerName: 'Created',
      minWidth: 100,
      flex: 0.6,
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
          className="btn btn-primary"
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
          onEdit={handleEditMovie} // Truyền handler edit
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
