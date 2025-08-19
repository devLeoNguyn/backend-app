// import toast from 'react-hot-toast';
import {
  IoHomeOutline,
  IoPeopleOutline,
  IoFilmOutline,
  IoDocumentTextOutline,
  IoLogOutOutline,
  IoNotificationsOutline,
  IoStatsChartOutline,
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
      // Profile menu item removed
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
        url: '/admin/analytics',
        icon: IoStatsChartOutline,
        label: 'doanh thu',
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
