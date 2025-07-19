import React from 'react';
import {
  DataGrid,
  GridColDef,
  GridToolbar,
  GridRowSelectionModel,
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
  rows: Record<string, unknown>[];
  slug?: string;
  includeActionColumn?: boolean;
  onEdit?: (rowData: Record<string, unknown>) => void;
  loading?: boolean;
  getRowId?: (row: Record<string, unknown>) => string;
  checkboxSelection?: boolean;
  onRowSelectionModelChange?: (newSelectionModel: string[]) => void;
  rowSelectionModel?: string[];
  getRowActions?: (row: Record<string, unknown>) => Array<{
    label: string;
    onClick: () => void;
  }>;
}

const DataTable: React.FC<DataTableProps> = ({
  columns,
  rows,
  slug,
  includeActionColumn,
  onEdit,
  loading = false,
  getRowId,
  checkboxSelection = false,
  onRowSelectionModelChange,
  rowSelectionModel,
  getRowActions,
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

  // Build custom actions column if getRowActions is provided
  const customActionColumn: GridColDef = {
    field: 'customActions',
    headerName: 'Actions',
    minWidth: 150,
    flex: 0.5,
    renderCell: (params) => {
      const actions = getRowActions ? getRowActions(params.row) : [];
      return (
        <div className="flex items-center gap-1">
          {actions.map((action, index) => (
            <button
              key={index}
              onClick={action.onClick}
              className="btn btn-xs btn-outline"
            >
              {action.label}
            </button>
          ))}
        </div>
      );
    },
  };

  // Determine which columns to show
  const finalColumns = (() => {
    if (getRowActions) {
      return [...columns, customActionColumn];
    }
    if (includeActionColumn) {
      return [...columns, actionColumn];
    }
    return columns;
  })();

  // Wrapper function to handle row selection model change
  const handleRowSelectionModelChange = (
    rowSelectionModel: GridRowSelectionModel
  ) => {
    if (onRowSelectionModelChange) {
      onRowSelectionModelChange(rowSelectionModel as string[]);
    }
  };

  const tableProps = {
    className: "dataGrid w-full bg-base-100 text-base-content min-h-[500px]",
    rows,
    columns: finalColumns,
    loading,
    getRowId: getRowId || ((row: Record<string, unknown>) => row.id as string),
    checkboxSelection,
    onRowSelectionModelChange: handleRowSelectionModelChange,
    rowSelectionModel,
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
