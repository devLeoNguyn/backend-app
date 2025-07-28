// import toast from 'react-hot-toast';
import {
  IoHomeOutline,
  IoPersonOutline,
  IoPeopleOutline,
  IoFilmOutline,
  IoDocumentTextOutline,
  IoBarChartOutline,
  IoCreateOutline,
  IoCalendarOutline,
  IoPieChartOutline,
  IoNewspaperOutline,
  IoLogOutOutline,
  IoStatsChartOutline,
  IoNotificationsOutline,
} from 'react-icons/io5';
// import { IoSettingsOutline } from 'react-icons/io5';

export const menu = [
  {
    catalog: 'chính',
    listItems: [
      {
        isLink: true,
        url: '/admin',
        icon: IoHomeOutline,
        label: 'trang chủ',
      },
      {
        isLink: true,
        url: '/admin/profile',
        icon: IoPersonOutline,
        label: 'hồ sơ',
      },
    ],
  },
  {
    catalog: 'quản lý',
    listItems: [
      {
        isLink: true,
        url: '/admin/users',
        icon: IoPeopleOutline,
        label: 'người dùng',
      },
      {
        isLink: true,
        url: '/admin/products',
        icon: IoFilmOutline,
        label: 'phim ảnh',
      },
      {
        isLink: true,
        url: '/admin/orders',
        icon: IoDocumentTextOutline,
        label: 'đơn hàng',
      },
      {
        isLink: true,
        url: '/admin/posts',
        icon: IoBarChartOutline,
        label: 'bài viết',
      },
    ],
  },
  {
    catalog: 'tiện ích',
    listItems: [
      {
        isLink: true,
        url: '/admin/notes',
        icon: IoCreateOutline,
        label: 'ghi chú',
      },
      {
        isLink: true,
        url: '/admin/calendar',
        icon: IoCalendarOutline,
        label: 'lịch',
      },
    ],
  },
  {
    catalog: 'thống kê',
    listItems: [
      {
        isLink: true,
        url: '/admin/charts',
        icon: IoPieChartOutline,
        label: 'biểu đồ',
      },
      {
        isLink: true,
        url: '/admin/logs',
        icon: IoNewspaperOutline,
        label: 'nhật ký',
      },
      {
        isLink: true,
        url: '/admin/websocket-test',
        icon: IoStatsChartOutline,
        label: 'kiểm tra websocket',
      },
    ],
  },
  {
    catalog: 'thông báo',
    listItems: [
      {
        isLink: true,
        url: '/admin/notifications',
        icon: IoNotificationsOutline,
        label: 'thông báo',
      },
    ],
  },
  {
    catalog: 'khác',
    listItems: [
      // {
      //   isLink: true,
      //   url: '/settings',
      //   icon: IoSettingsOutline,
      //   label: 'cài đặt',
      // },
      {
        isLink: true,
        url: '/login',
        icon: IoLogOutOutline,
        label: 'đăng xuất',
      },
    ],
  },
];
