import React from 'react';
import { GridColDef } from '@mui/x-data-grid';
import DataTable from '../components/DataTable';
import { fetchUsers } from '../api/ApiCollection';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AddData from '../components/AddData';

const Users = () => {
  const [isOpen, setIsOpen] = React.useState(false);
  const { isLoading, isError, isSuccess, data } = useQuery({
    queryKey: ['allusers'],
    queryFn: fetchUsers,
  });

  const columns: GridColDef[] = [
    { field: 'id', headerName: 'ID', width: 90 },
    {
      field: 'firstName',
      headerName: 'User Info',
      minWidth: 250,
      flex: 1,
      renderCell: (params) => {
        return (
          <div className="flex gap-3 items-center">
            <div className="avatar">
              <div className="w-6 xl:w-9 rounded-full">
                <img
                  src={params.row.img || '/Portrait_Placeholder.png'}
                  alt="user-picture"
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="mb-0 pb-0 leading-none font-semibold">
                {params.row.firstName} {params.row.lastName}
              </span>
              <span className="text-xs text-gray-500">
                {params.row.role === 'admin' ? '👑 Admin' : '👤 User'} • {params.row.gender || 'N/A'}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      field: 'email',
      type: 'string',
      headerName: 'Email',
      minWidth: 200,
      flex: 1,
    },
    {
      field: 'phone',
      type: 'string',
      headerName: 'Phone',
      minWidth: 120,
      flex: 1,
    },
    {
      field: 'verified',
      headerName: 'Status',
      width: 100,
      type: 'boolean',
      flex: 1,
      renderCell: (params) => {
        return (
          <div className="flex flex-col gap-1">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              params.row.verified 
                ? 'bg-green-100 text-green-800' 
                : 'bg-red-100 text-red-800'
            }`}>
              {params.row.verified ? '✓ Verified' : '✗ Not Verified'}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              params.row.isActive 
                ? 'bg-blue-100 text-blue-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {params.row.isActive ? '🟢 Active' : '🔴 Inactive'}
            </span>
          </div>
        );
      },
    },
    {
      field: 'address',
      type: 'string',
      headerName: 'Address',
      minWidth: 150,
      flex: 1,
      renderCell: (params) => {
        return (
          <span className="text-sm">
            {params.row.address || 'Chưa cập nhật'}
          </span>
        );
      },
    },
    {
      field: 'createdAt',
      headerName: 'Joined Date',
      minWidth: 100,
      type: 'string',
      flex: 1,
    },
    {
      field: 'lastLogin',
      headerName: 'Last Login',
      minWidth: 100,
      type: 'string',
      flex: 1,
      renderCell: (params) => {
        return (
          <span className="text-sm">
            {params.row.lastLogin ? new Date(params.row.lastLogin).toLocaleDateString('vi-VN') : 'Chưa đăng nhập'}
          </span>
        );
      },
    },
  ];

  React.useEffect(() => {
    if (isLoading) {
      toast.loading('Loading...', { id: 'promiseUsers' });
    }
    if (isError) {
      toast.error('Error while getting the data!', {
        id: 'promiseUsers',
      });
    }
    if (isSuccess) {
      toast.success('Got the data successfully!', {
        id: 'promiseUsers',
      });
    }
  }, [isError, isLoading, isSuccess]);

  return (
    <div className="w-full p-0 m-0">
      <div className="w-full flex flex-col items-stretch gap-3">
        <div className="w-full flex justify-between mb-5">
          <div className="flex gap-1 justify-start flex-col items-start">
            <h2 className="font-bold text-2xl xl:text-4xl mt-0 pt-0 text-base-content dark:text-neutral-200">
              Users
            </h2>
            {data && data.length > 0 && (
              <span className="text-neutral dark:text-neutral-content font-medium text-base">
                {data.length} Users Found
              </span>
            )}
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className={`btn ${
              isLoading ? 'btn-disabled' : 'btn-primary'
            }`}
          >
            Add New User +
          </button>
        </div>
        {isLoading ? (
          <DataTable
            slug="users"
            columns={columns}
            rows={[]}
            includeActionColumn={true}
          />
        ) : isSuccess ? (
          <DataTable
            slug="users"
            columns={columns}
            rows={data}
            includeActionColumn={true}
          />
        ) : (
          <>
            <DataTable
              slug="users"
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
            slug={'user'}
            isOpen={isOpen}
            setIsOpen={setIsOpen}
          />
        )}
      </div>
    </div>
  );
};

export default Users;
