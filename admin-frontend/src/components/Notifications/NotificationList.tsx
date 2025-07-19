import React from 'react';
import { GridColDef, GridValueGetterParams } from '@mui/x-data-grid';
import DataTable from '../DataTable';
import { Notification } from '../../services/notificationService';
import { format } from 'date-fns';

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  onEdit: (notification: Notification) => void;
  onDelete: (notificationId: string) => void;
  onSend: (notificationId: string) => void;
  onSchedule: (notification: Notification) => void;
  onSelectionChange: (selectedIds: string[]) => void;
  selectedIds: string[];
}

const NotificationList: React.FC<NotificationListProps> = ({
  notifications = [],
  loading,
  onEdit,
  onDelete,
  onSend,
  onSchedule,
  onSelectionChange,
  selectedIds = []
}) => {
  // Debug log
  console.log('NotificationList received notifications:', notifications);
  console.log('Loading state:', loading);
  
  // Helper to format dates
  const formatDate = (date: Date | string | undefined) => {
    if (!date) return '-';
    return format(new Date(date), 'yyyy-MM-dd HH:mm');
  };

  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'ID',
      width: 100,
      valueGetter: (params: GridValueGetterParams) => params.row._id
    },
    {
      field: 'title',
      headerName: 'Title',
      minWidth: 200,
      flex: 1
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params) => {
        const type = params.value as string;
        return (
          <span className={`badge ${type === 'manual' ? 'badge-primary' : 'badge-secondary'}`}>
            {type}
          </span>
        );
      }
    },
    {
      field: 'target_type',
      headerName: 'Target',
      width: 120,
      renderCell: (params) => {
        const targetType = params.value as string;
        let badgeClass = 'badge-info';
        
        if (targetType === 'all') badgeClass = 'badge-success';
        if (targetType === 'segment') badgeClass = 'badge-warning';
        if (targetType === 'specific_users') badgeClass = 'badge-info';
        
        return (
          <span className={`badge ${badgeClass}`}>
            {targetType}
          </span>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => {
        const status = params.value as string;
        let badgeClass = 'badge-info';
        
        if (status === 'draft') badgeClass = 'badge-info';
        if (status === 'scheduled') badgeClass = 'badge-warning';
        if (status === 'sent') badgeClass = 'badge-success';
        if (status === 'failed') badgeClass = 'badge-error';
        
        return (
          <span className={`badge ${badgeClass}`}>
            {status}
          </span>
        );
      }
    },
    {
      field: 'scheduled_at',
      headerName: 'Scheduled',
      width: 160,
      valueGetter: (params: GridValueGetterParams) => 
        formatDate(params.row.scheduled_at)
    },
    {
      field: 'sent_at',
      headerName: 'Sent',
      width: 160,
      valueGetter: (params: GridValueGetterParams) => 
        formatDate(params.row.sent_at)
    },
    {
      field: 'sent_count',
      headerName: 'Sent Count',
      width: 120,
      type: 'number'
    },
    {
      field: 'created_at',
      headerName: 'Created',
      width: 160,
      valueGetter: (params: GridValueGetterParams) => 
        formatDate(params.row.created_at)
    }
  ];

  // Custom actions for notification items
  const getRowActions = (notification: Notification) => {
    const actions = [];
    
    // Edit action for draft notifications
    if (notification.status === 'draft') {
      actions.push({
        label: 'Edit',
        onClick: () => onEdit(notification)
      });
    }
    
    // Schedule action for draft notifications
    if (notification.status === 'draft') {
      actions.push({
        label: 'Schedule',
        onClick: () => onSchedule(notification)
      });
    }
    
    // Send action for draft and scheduled notifications
    if (['draft', 'scheduled'].includes(notification.status)) {
      actions.push({
        label: 'Send Now',
        onClick: () => onSend(notification._id)
      });
    }
    
    // Delete action for all notifications
    actions.push({
      label: 'Delete',
      onClick: () => onDelete(notification._id)
    });
    
    return actions;
  };

  return (
    <div className="w-full bg-base-100">
      <DataTable
        columns={columns}
        rows={notifications as unknown as Record<string, unknown>[]}
        loading={loading}
        getRowId={(row: Record<string, unknown>) => row._id as string}
        checkboxSelection
        onRowSelectionModelChange={(newSelectionModel: string[]) => {
          onSelectionChange(newSelectionModel);
        }}
        rowSelectionModel={selectedIds}
        getRowActions={(row: Record<string, unknown>) => getRowActions(row as unknown as Notification)}
      />
    </div>
  );
};

export default NotificationList;
