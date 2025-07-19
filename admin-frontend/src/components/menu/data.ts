// import toast from 'react-hot-toast';
import {
  HiOutlineHome,
  HiOutlineUser,
  HiOutlineUsers,
  HiOutlineCube,
  HiOutlineClipboardDocumentList,
  HiOutlineDocumentChartBar,
  HiOutlinePencilSquare,
  HiOutlineCalendarDays,
  HiOutlinePresentationChartBar,
  HiOutlineDocumentText,
  HiOutlineArrowLeftOnRectangle,
  HiOutlineSignal,
  HiOutlineBell,
} from 'react-icons/hi2';
// import { IoSettingsOutline } from 'react-icons/io5';

export const menu = [
  {
    catalog: 'main',
    listItems: [
      {
        isLink: true,
        url: '/admin',
        icon: HiOutlineHome,
        label: 'homepage',
      },
      {
        isLink: true,
        url: '/admin/profile',
        icon: HiOutlineUser,
        label: 'profile',
      },
    ],
  },
  {
    catalog: 'lists',
    listItems: [
      {
        isLink: true,
        url: '/admin/users',
        icon: HiOutlineUsers,
        label: 'users',
      },
      {
        isLink: true,
        url: '/admin/products',
        icon: HiOutlineCube,
        label: 'products',
      },
      {
        isLink: true,
        url: '/admin/orders',
        icon: HiOutlineClipboardDocumentList,
        label: 'orders',
      },
      {
        isLink: true,
        url: '/admin/posts',
        icon: HiOutlineDocumentChartBar,
        label: 'posts',
      },
    ],
  },
  {
    catalog: 'general',
    listItems: [
      {
        isLink: true,
        url: '/admin/notes',
        icon: HiOutlinePencilSquare,
        label: 'notes',
      },
      {
        isLink: true,
        url: '/admin/calendar',
        icon: HiOutlineCalendarDays,
        label: 'calendar',
      },
    ],
  },
  {
    catalog: 'analytics',
    listItems: [
      {
        isLink: true,
        url: '/admin/charts',
        icon: HiOutlinePresentationChartBar,
        label: 'charts',
      },
      {
        isLink: true,
        url: '/admin/logs',
        icon: HiOutlineDocumentText,
        label: 'logs',
      },
      {
        isLink: true,
        url: '/admin/websocket-test',
        icon: HiOutlineSignal,
        label: 'WebSocket Test',
      },
    ],
  },
  {
    catalog: 'notifications',
    listItems: [
      {
        isLink: true,
        url: '/admin/notifications',
        icon: HiOutlineBell,
        label: 'notifications',
      },
    ],
  },
  {
    catalog: 'miscellaneous',
    listItems: [
      // {
      //   isLink: true,
      //   url: '/settings',
      //   icon: IoSettingsOutline,
      //   label: 'settings',
      // },
      {
        isLink: true,
        url: '/login',
        icon: HiOutlineArrowLeftOnRectangle,
        label: 'log out',
      },
    ],
  },
];
