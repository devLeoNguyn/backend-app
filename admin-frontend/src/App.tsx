import { useEffect } from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Outlet,
  ScrollRestoration,
  Navigate,
} from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Products from './pages/Products';
import Episodes from './pages/Episodes';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Menu from './components/menu/Menu';
import Error from './pages/Error';
import Profile from './pages/Profile';
import Orders from './pages/Orders';
import Posts from './pages/Posts';
import Notes from './pages/Notes';
import Calendar from './pages/Calendar';
import Charts from './pages/Charts';
import Logs from './pages/Logs';
import ToasterProvider from './components/ToasterProvider';
import EditProfile from './pages/EditProfile';
import User from './pages/User';
import Product from './pages/Product';
import Login from './pages/Login';
import WebSocketTestPage from './pages/WebSocketTest';
import ProtectedRoute from './components/ProtectedRoute';
import { authService } from './services/authService';
import Notifications from './pages/Notifications';
import TestNotifications from './pages/TestNotifications';
import Settings from './pages/Settings';

function App() {
  // Initialize authentication when app starts
  useEffect(() => {
    authService.initializeAuth();
  }, []);

  const Layout = () => {
    return (
      <ProtectedRoute>
      <div
        id="rootContainer"
        className="w-full p-0 m-0 overflow-visible min-h-screen flex flex-col justify-between"
      >
        <ToasterProvider />
        <ScrollRestoration />
        <div>
          <Navbar />
          <div className="w-full flex gap-0 pt-20 xl:pt-[96px] 2xl:pt-[112px] mb-auto">
            <div className="hidden xl:block xl:w-[250px] 2xl:w-[280px] 3xl:w-[350px] border-r-2 border-base-300 dark:border-slate-700 px-3 xl:px-4 xl:py-1">
              <Menu />
            </div>
            <div className="w-full px-4 xl:px-4 2xl:px-5 xl:py-2 overflow-clip">
              <Outlet />
            </div>
          </div>
        </div>
        <Footer />
      </div>
      </ProtectedRoute>
    );
  };

  const router = createBrowserRouter([
    {
      path: '/',
      element: <Navigate to="/admin" replace />,
    },
    {
      path: '/admin',
      element: <Layout />,
      children: [
        {
          path: '',
          element: <Dashboard />,
        },
        {
          path: 'home',
          element: <Home />,
        },
        {
          path: 'profile',
          element: <Profile />,
        },
        {
          path: 'profile/edit',
          element: <EditProfile />,
        },
        {
          path: 'users',
          element: <Users />,
        },
        {
          path: 'users/:id',
          element: <User />,
        },
        {
          path: 'products',
          element: <Products />,
        },
        {
          path: 'products/:id',
          element: <Product />,
        },
        {
          path: 'episodes',
          element: <Episodes />,
        },
        {
          path: 'orders',
          element: <Orders />,
        },
        {
          path: 'posts',
          element: <Posts />,
        },
        {
          path: 'notes',
          element: <Notes />,
        },
        {
          path: 'calendar',
          element: <Calendar />,
        },
        {
          path: 'charts',
          element: <Charts />,
        },
        {
          path: 'logs',
          element: <Logs />,
        },
        {
          path: 'websocket-test',
          element: <WebSocketTestPage />,
        },
        {
          path: 'notifications',
          element: <Notifications />,
        },
        {
          path: 'test-notifications',
          element: <TestNotifications />,
        },
        {
          path: 'settings',
          element: <Settings />,
        },
      ],
      errorElement: <Error />,
    },
    {
      path: '/login',
      element: <Login />,
    },
  ]);

  return <RouterProvider router={router} />;
}

export default App;
