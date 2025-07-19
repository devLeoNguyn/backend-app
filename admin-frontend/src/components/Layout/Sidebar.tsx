
import { HiOutlineHome, HiOutlineUsers, HiOutlineFilm, HiOutlineShoppingBag, HiOutlineBell, HiOutlineCog } from "react-icons/hi";

// ...existing code...

export const sidebarItems = [
  {
    title: "Dashboard",
    icon: <HiOutlineHome />,
    path: "/",
  },
  {
    title: "Users",
    icon: <HiOutlineUsers />,
    path: "/users",
  },
  {
    title: "Products",
    icon: <HiOutlineFilm />,
    path: "/products",
  },
  {
    title: "Orders",
    icon: <HiOutlineShoppingBag />,
    path: "/orders",
  },
  {
    title: "Notifications",
    icon: <HiOutlineBell />,
    path: "/notifications",
    badge: { text: "New", color: "bg-blue-500" } // Optional badge to highlight new feature
  },
  {
    title: "Settings",
    icon: <HiOutlineCog />,
    path: "/settings",
  }
];

// ...existing code...```
