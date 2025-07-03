import React from 'react';
import { GridColDef } from '@mui/x-data-grid';
import DataTable from '../components/DataTable';
import { fetchProducts } from '../api/ApiCollection';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AddData from '../components/AddData';

const Products = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['allproducts'],
    queryFn: fetchProducts,
  });

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'img',
      headerName: 'Movie',
      minWidth: 300,
      flex: 1,
      renderCell: (params) => {
        return (
          <div className="flex gap-3 items-center">
            <div className="w-6 xl:w-10 overflow-hidden flex justify-center items-center">
              <img
                src={params.row.img || '/corrugated-box.jpg'}
                alt="movie-poster"
                className="object-cover"
              />
            </div>
            <div className="flex flex-col">
              <span className="mb-0 pb-0 leading-none font-semibold">
                {params.row.title}
              </span>
              <span className="text-xs text-gray-500">
                {params.row.movieType} • {params.row.releaseYear}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'color',
      type: 'string',
      headerName: 'Genre',
      minWidth: 100,
      flex: 1,
    },
    {
      field: 'price',
      type: 'number',
      headerName: 'Price (VND)',
      minWidth: 120,
      flex: 1,
      renderCell: (params) => {
        return (
          <span className={params.row.price > 0 ? 'text-green-600 font-semibold' : 'text-gray-500'}>
            {params.row.price > 0 ? `${params.row.price.toLocaleString()} đ` : 'Miễn phí'}
          </span>
        );
      },
    },
    {
      field: 'rating',
      headerName: 'Rating',
      minWidth: 80,
      type: 'number',
      flex: 1,
      renderCell: (params) => {
        return (
          <span className="flex items-center gap-1">
            ⭐ {params.row.rating || 'N/A'}
          </span>
        );
      },
    },
    {
      field: 'duration',
      headerName: 'Duration',
      minWidth: 100,
      type: 'string',
      flex: 1,
      renderCell: (params) => {
        return (
          <span>
            {params.row.duration ? `${params.row.duration} phút` : 'N/A'}
          </span>
        );
      },
    },
    {
      field: 'country',
      headerName: 'Country',
      minWidth: 100,
      type: 'string',
      flex: 1,
    },
    {
      field: 'inStock',
      headerName: 'Status',
      minWidth: 100,
      type: 'boolean',
      flex: 1,
      renderCell: (params) => {
        return (
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            params.row.inStock 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {params.row.inStock ? 'Đã phát hành' : 'Chưa phát hành'}
          </span>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Created At',
      minWidth: 100,
      type: 'string',
      flex: 1,
    },
  ];

  React.useEffect(() => {
    if (isLoading) {
      toast.loading('Loading...', { id: 'promiseProducts' });
    }
    if (isError) {
      toast.error('Error while getting the data!', {
        id: 'promiseProducts',
      });
    }
    if (isSuccess) {
      toast.success('Got the data successfully!', {
        id: 'promiseProducts',
      });
    }
  }, [isError, isLoading, isSuccess]);

  return (
    <div className="w-full p-0 m-0">
      <div className="w-full flex flex-col items-stretch gap-3">
        <div className="w-full flex justify-between xl:mb-5">
          <div className="flex gap-1 justify-start flex-col items-start">
            <h2 className="font-bold text-2xl xl:text-4xl mt-0 pt-0 text-base-content dark:text-neutral-200">
              Products
            </h2>
            {data && data.length > 0 && (
              <span className="text-neutral dark:text-neutral-content font-medium text-base">
                {data.length} Products Found
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className={`btn ${
              isLoading ? 'btn-disabled' : 'btn-primary'
            }`}
          >
            Add New Product +
          </button>
        </div>

        {isLoading ? (
          <DataTable
            slug="products"
            columns={columns}
            rows={[]}
            includeActionColumn={true}
          />
        ) : isSuccess ? (
          <DataTable
            slug="products"
            columns={columns}
            rows={data}
            includeActionColumn={true}
          />
        ) : (
          <>
            <DataTable
              slug="products"
              columns={columns}
              rows={[]}
              includeActionColumn={true}
            />
            <div className="w-full flex justify-center">
              Error while getting the data!
            </div>
          </>
        )}

        {isOpen && (
          <AddData
            slug={'product'}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          />
        )}
      </div>
    </div>
  );
};

export default Products;
