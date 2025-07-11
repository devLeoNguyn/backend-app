import React from 'react';
import {
  DataGrid,
  GridColDef,
  GridToolbar,
} from '@mui/x-data-grid';
import { useNavigate } from 'react-router-dom';
import {
  HiOutlinePencilSquare,
  HiOutlineEye,
  HiOutlineTrash,
} from 'react-icons/hi2';
import toast from 'react-hot-toast';

interface DataTableProps {
  columns: GridColDef[];
  rows: object[];
  slug: string;
  includeActionColumn?: boolean;
  onEdit?: (rowData: any) => void; // Thêm prop onEdit
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  slug,
  includeActionColumn,
  onEdit, // Thêm onEdit vào destructuring
}) => {
  const navigate = useNavigate();

  const actionColumn: GridColDef = {
    field: 'action',
    headerName: 'Action',
    minWidth: 120,
    flex: 0.5,
    renderCell: (params) => {
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              navigate(`/admin/${slug}/${params.row.id}`);
            }}
            className="btn btn-square btn-ghost btn-sm"
          >
            <HiOutlineEye />
          </button>
          <button
            onClick={() => {
              if (onEdit) {
                onEdit(params.row); // Sử dụng onEdit callback nếu có
              } else {
                toast('Chức năng đang phát triển!', {
                  icon: '⚙️',
              });
              }
            }}
            className="btn btn-square btn-ghost btn-sm"
          >
            <HiOutlinePencilSquare />
          </button>
          <button
            onClick={() => {
              toast('Chức năng đang phát triển!', {
                icon: '⚙️',
              });
            }}
            className="btn btn-square btn-ghost btn-sm"
          >
            <HiOutlineTrash />
          </button>
        </div>
      );
    },
  };

  const tableProps = {
    className: "dataGrid w-full bg-base-100 text-base-content min-h-[500px]",
    rows,
    columns: includeActionColumn ? [...columns, actionColumn] : columns,
    getRowHeight: () => 60,
    initialState: {
            pagination: {
              paginationModel: {
                pageSize: 10,
              },
            },
    },
    slots: { toolbar: GridToolbar },
    slotProps: {
            toolbar: {
              showQuickFilter: true,
              quickFilterProps: { debounceMs: 500 },
            },
    },
    pageSizeOptions: [5, 10, 25, 50],
    checkboxSelection: true,
    disableRowSelectionOnClick: true,
    disableColumnFilter: true,
    disableDensitySelector: true,
    disableColumnSelector: true,
    autoHeight: true,
    sx: {
      // Custom styles for better responsive behavior
      '& .MuiDataGrid-main': {
        width: '100%',
        overflow: 'auto',
      },
      '& .MuiDataGrid-virtualScroller': {
        overflow: 'auto',
      },
      '& .MuiDataGrid-footerContainer': {
        minHeight: '52px',
      },
      '& .MuiDataGrid-cell': {
        whiteSpace: 'normal',
        padding: '8px',
        lineHeight: '1.2',
      },
      '& .MuiDataGrid-columnHeaders': {
        minHeight: '48px !important',
        backgroundColor: 'rgba(0, 0, 0, 0.04)',
            },
      '& .MuiDataGrid-toolbarContainer': {
        padding: '8px',
        gap: '8px',
        flexWrap: 'wrap',
      },
      '& .MuiButton-root': {
        padding: '4px 8px',
        minWidth: 'auto',
      },
    },
  };

  return (
    <div className="w-full overflow-hidden rounded-lg border border-base-300">
      <div className="w-full overflow-auto">
        <DataGrid {...tableProps} />
      </div>
      </div>
    );
};

export default DataTable;
