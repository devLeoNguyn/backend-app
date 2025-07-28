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
      headerName: 'Mã',
      width: 100,
      valueGetter: (params: GridValueGetterParams) => params.row._id
    },
    {
      field: 'title',
      headerName: 'Tiêu đề',
      minWidth: 200,
      flex: 1
    },
    {
      field: 'type',
      headerName: 'Loại',
      width: 120,
      renderCell: (params) => {
        const type = params.value as string;
        return (
          <span className={`badge ${type === 'manual' ? 'badge-primary' : 'badge-secondary'}`}>
            {type === 'manual' ? 'Thủ công' : 'Tự động'}
          </span>
        );
      }
    },
    {
      field: 'target_type',
      headerName: 'Đối tượng',
      width: 120,
      renderCell: (params) => {
        const targetType = params.value as string;
        let badgeClass = 'badge-info';
        let label = '';
        if (targetType === 'all') { badgeClass = 'badge-success'; label = 'Tất cả'; }
        if (targetType === 'segment') { badgeClass = 'badge-warning'; label = 'Phân nhóm'; }
        if (targetType === 'specific_users') { badgeClass = 'badge-info'; label = 'Người dùng cụ thể'; }
        return (
          <span className={`badge ${badgeClass}`}>
            {label}
          </span>
        );
      }
    },
    {
      field: 'status',
      headerName: 'Trạng thái',
      width: 120,
      renderCell: (params) => {
        const status = params.value as string;
        let badgeClass = 'badge-info';
        let label = '';
        if (status === 'draft') { badgeClass = 'badge-info'; label = 'Nháp'; }
        if (status === 'scheduled') { badgeClass = 'badge-warning'; label = 'Đã lên lịch'; }
        if (status === 'sent') { badgeClass = 'badge-success'; label = 'Đã gửi'; }
        if (status === 'failed') { badgeClass = 'badge-error'; label = 'Thất bại'; }
        return (
          <span className={`badge ${badgeClass}`}>
            {label}
          </span>
        );
      }
    },
    {
      field: 'scheduled_at',
      headerName: 'Thời gian lên lịch',
      width: 160,
      valueGetter: (params: GridValueGetterParams) => 
        formatDate(params.row.scheduled_at)
    },
    {
      field: 'sent_at',
      headerName: 'Thời gian gửi',
      width: 160,
      valueGetter: (params: GridValueGetterParams) => 
        formatDate(params.row.sent_at)
    },
    {
      field: 'sent_count',
      headerName: 'Số lượng gửi',
      width: 120,
      type: 'number'
    },
    {
      field: 'created_at',
      headerName: 'Ngày tạo',
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
        label: 'Sửa',
        onClick: () => onEdit(notification)
      });
    }
    
    // Schedule action for draft notifications
    if (notification.status === 'draft') {
      actions.push({
        label: 'Lên lịch',
        onClick: () => onSchedule(notification)
      });
    }
    
    // Send action for draft and scheduled notifications
    if (['draft', 'scheduled'].includes(notification.status)) {
      actions.push({
        label: 'Gửi ngay',
        onClick: () => onSend(notification._id)
      });
    }
    
    // Delete action for all notifications
    actions.push({
      label: 'Xóa',
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
