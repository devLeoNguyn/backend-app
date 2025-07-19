import React from 'react';
import { DataGrid, GridColDef, GridValueGetterParams, GridRenderCellParams } from '@mui/x-data-grid';
import { Notification } from '../../services/notificationService';
import { format } from 'date-fns';
import { 
  HiOutlinePencil, 
  HiOutlineTrash, 
  HiOutlineClock, 
  HiOutlinePaperAirplane,
  HiOutlineExclamationCircle,
  HiOutlineDocumentDuplicate
} from 'react-icons/hi';

interface NotificationDataTableProps {
  notifications: Notification[];
  loading: boolean;
  onEdit: (notification: Notification) => void;
  onDelete: (id: string) => void;
  onSend: (id: string) => void;
  onSchedule: (notification: Notification) => void;
  onDuplicate?: (notification: Notification) => void;
  selectedIds: string[];
  onSelectionModelChange: (newSelectionModel: string[]) => void;
}

const NotificationDataTable: React.FC<NotificationDataTableProps> = ({
  notifications,
  loading,
  onEdit,
  onDelete,
  onSend,
  onSchedule,
  onDuplicate,
  selectedIds,
  onSelectionModelChange
}) => {
  // Format date helper
  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return '-';
    try {
      return format(new Date(date), 'yyyy-MM-dd HH:mm');
    } catch (e) {
      return '-';
    }
  };

  // Status badge helper
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="badge badge-info">Draft</span>;
      case 'scheduled':
        return <span className="badge badge-warning">Scheduled</span>;
      case 'sent':
        return <span className="badge badge-success">Sent</span>;
      case 'failed':
        return <span className="badge badge-error">Failed</span>;
      default:
        return <span className="badge">{status}</span>;
    }
  };

  // Action buttons based on notification status
  const renderActions = (params: GridRenderCellParams) => {
    const notification = params.row as Notification;
    
    return (
      <div className="flex space-x-2">
        {/* Edit button - only for draft status */}
        {notification.status === 'draft' && (
          <button 
            className="btn btn-xs btn-ghost"
            onClick={() => onEdit(notification)}
            title="Edit"
          >
            <HiOutlinePencil className="text-base" />
          </button>
        )}
        
        {/* Schedule button - only for draft status */}
        {notification.status === 'draft' && (
          <button 
            className="btn btn-xs btn-ghost"
            onClick={() => onSchedule(notification)}
            title="Schedule"
          >
            <HiOutlineClock className="text-base" />
          </button>
        )}
        
        {/* Send button - for draft and scheduled status */}
        {['draft', 'scheduled'].includes(notification.status) && (
          <button 
            className="btn btn-xs btn-ghost"
            onClick={() => onSend(notification._id)}
            title="Send Now"
          >
            <HiOutlinePaperAirplane className="text-base" />
          </button>
        )}
        
        {/* Duplicate button - for all notifications */}
        {onDuplicate && (
          <button 
            className="btn btn-xs btn-ghost"
            onClick={() => onDuplicate(notification)}
            title="Duplicate"
          >
            <HiOutlineDocumentDuplicate className="text-base" />
          </button>
        )}
        
        {/* Delete button - for all notifications */}
        <button 
          className="btn btn-xs btn-ghost text-error"
          onClick={() => onDelete(notification._id)}
          title="Delete"
        >
          <HiOutlineTrash className="text-base" />
        </button>
      </div>
    );
  };

  const columns: GridColDef[] = [
    {
      field: '_id',
      headerName: 'ID',
      width: 80,
      renderCell: (params) => (
        <div className="truncate">{params.value.toString().substring(0, 8)}...</div>
      ),
    },
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      minWidth: 200,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => getStatusBadge(params.value as string),
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 100,
      valueGetter: (params: GridValueGetterParams) => {
        const type = params.row.type as string;
        return type.charAt(0).toUpperCase() + type.slice(1);
      },
    },
    {
      field: 'target_type',
      headerName: 'Target',
      width: 130,
      valueGetter: (params: GridValueGetterParams) => {
        const targetType = params.row.target_type as string;
        switch (targetType) {
          case 'all': return 'All Users';
          case 'segment': return `Segment: ${params.row.segment || '-'}`;
          case 'specific_users': return `${params.row.target_users?.length || 0} Users`;
          default: return targetType;
        }
      },
    },
    {
      field: 'scheduled_at',
      headerName: 'Scheduled',
      width: 160,
      valueGetter: (params: GridValueGetterParams) => 
        formatDate(params.row.scheduled_at),
    },
    {
      field: 'sent_at',
      headerName: 'Sent',
      width: 160,
      valueGetter: (params: GridValueGetterParams) => 
        formatDate(params.row.sent_at),
    },
    {
      field: 'sent_count',
      headerName: 'Recipients',
      width: 120,
      renderCell: (params) => {
        const sent = params.row.sent_count || 0;
        const failed = params.row.failed_count || 0;
        const total = params.row.total_target_count || 0;
        
        if (total === 0) return '-';
        
        const hasErrors = failed > 0;
        
        return (
          <div className="flex items-center">
            <span>{sent}/{total}</span>
            {hasErrors && (
              <span className="ml-2 text-error" title={`${failed} failed`}>
                <HiOutlineExclamationCircle />
              </span>
            )}
          </div>
        );
      },
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 160,
      valueGetter: (params: GridValueGetterParams) => 
        formatDate(params.row.created_at),
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 150,
      renderCell: renderActions,
      sortable: false,
      filterable: false,
    }
  ];

  return (
    <div className="bg-base-100 h-[600px] w-full">
      <DataGrid
        rows={notifications.map(n => ({ ...n, id: n._id }))}
        columns={columns}
        loading={loading}
        checkboxSelection
        disableRowSelectionOnClick
        onRowSelectionModelChange={(newSelectionModel) => {
          onSelectionModelChange(newSelectionModel as string[]);
        }}
        rowSelectionModel={selectedIds}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </div>
  );
};

export default NotificationDataTable;
