import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { IoMenuOutline } from 'react-icons/io5';
import { IoSearchOutline, IoNotificationsOutline } from 'react-icons/io5';
import { IoExpandOutline, IoContractOutline } from 'react-icons/io5';
import ChangeThemes from './ChangesThemes';
import toast from 'react-hot-toast';
import { menu } from './menu/data';
import MenuItem from './menu/MenuItem';
import { authService } from '../services/authService';
// import { DiReact } from 'react-icons/di';
import logo from '../assets/logo.png';

const Navbar = () => {
  const [isFullScreen, setIsFullScreen] = React.useState(true);
  const element = document.getElementById('root');

  const [isDrawerOpen, setDrawerOpen] = React.useState(false);
  const toggleDrawer = () => setDrawerOpen(!isDrawerOpen);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullScreen(!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await element?.requestFullscreen();
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  };

  const navigate = useNavigate();

  const handleLogout = () => {
    try {
      // Clear authentication data
      authService.logout();
      
      // Show success message
      toast.success('Logged out successfully');
      
      // Navigate to login page
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error logging out');
    }
  };

  return (
    // navbar screen
    <div className="fixed z-[3] top-0 left-0 right-0 bg-base-100 w-full flex justify-between px-3 xl:px-4 py-0 xl:py-0 gap-4 xl:gap-0">
      {/* container */}
      <div className="flex gap-3 items-center">
        {/* for mobile */}
        <div className="drawer w-auto p-0 mr-1 xl:hidden">
          <input
            id="drawer-navbar-mobile"
            type="checkbox"
            className="drawer-toggle"
            checked={isDrawerOpen}
            onChange={toggleDrawer}
          />
          <div className="p-0 w-auto drawer-content">
            <label
              htmlFor="drawer-navbar-mobile"
              className="p-0 btn btn-ghost drawer-button"
            >
              <IoMenuOutline className="text-2xl" />
            </label>
          </div>
          <div className="drawer-side z-[99]">
            <label
              htmlFor="drawer-navbar-mobile"
              aria-label="close sidebar"
              className="drawer-overlay"
            ></label>
            <div className="menu p-4 w-auto min-h-full bg-base-200 text-base-content">
              <Link
                to={'/admin'}
                className="flex items-center gap-2 xl:gap-3 my-0"
              >
                <div className="logo-container flex items-center">
                  <img
                    src={logo}
                    alt="Movie Management Logo"
                    className="block dark:hidden invert w-16 h-16 sm:w-20 sm:h-20 xl:w-24 xl:h-24 2xl:w-28 2xl:h-28 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <img
                    src={logo}
                    alt="Movie Management Logo"
                    className="hidden dark:block w-16 h-16 sm:w-20 sm:h-20 xl:w-24 xl:h-24 2xl:w-28 2xl:h-28 object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <span className="text-[16px] leading-[1.2] sm:text-lg xl:text-xl 2xl:text-2xl font-semibold text-base-content dark:text-neutral-200">
                  Quản Lý Phim
                </span>
              </Link>
              {menu.map((item, index) => (
                <MenuItem
                  onClick={toggleDrawer}
                  key={index}
                  catalog={item.catalog}
                  listItems={item.listItems}
                />
              ))}
            </div>
          </div>
        </div>

        {/* navbar logo */}
        <Link to={'/admin'} className="flex items-center gap-3 xl:gap-4 my-0">
          <img
            src={logo}
            alt="Movie Management Logo"
            className="block dark:hidden invert w-32 h-32 sm:w-32 sm:h-32 xl:w-32 xl:h-32 2xl:w-32 2xl:h-32 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          <img
            src={logo}
            alt="Movie Management Logo"
            className="hidden dark:block w-32 h-32 sm:w-32 sm:h-32 xl:w-32 xl:h-32 2xl:w-32 2xl:h-32 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
          {/* <span className="text-xs sm:text-base xl:text-lg 2xl:text-xl font-medium leading-tight tracking-tight text-base-content/90 dark:text-neutral-200">
            Trang Admin
          </span> */}
        </Link>
      </div>

      {/* navbar items to right */}
      <div className="flex items-center gap-0 xl:gap-1 2xl:gap-2 3xl:gap-5">
        {/* search */}
        <button
          onClick={() =>
            toast('Gaboleh cari!', {
              icon: '😠',
            })
          }
          className="hidden sm:inline-flex btn btn-circle btn-ghost"
        >
          <IoSearchOutline className="text-xl 2xl:text-2xl 3xl:text-3xl" />
        </button>

        {/* fullscreen */}
        <button
          onClick={toggleFullScreen}
          className="hidden xl:inline-flex btn btn-circle btn-ghost"
        >
          {isFullScreen ? (
            <IoExpandOutline className="xl:text-xl 2xl:text-2xl 3xl:text-3xl" />
          ) : (
            <IoContractOutline className="xl:text-xl 2xl:text-2xl 3xl:text-3xl" />
          )}
        </button>

        {/* notification */}
        <button
          onClick={() =>
            toast('Gaada notif!', {
              icon: '😠',
            })
          }
          className="px-0 xl:px-auto btn btn-circle btn-ghost"
        >
          <IoNotificationsOutline className="text-xl 2xl:text-2xl 3xl:text-3xl" />
        </button>

        {/* theme */}
        <div className="px-0 xl:px-auto btn btn-circle btn-ghost xl:mr-1">
          <ChangeThemes />
        </div>

        {/* avatar dropdown */}
        <div className="dropdown dropdown-end">
          <div
            tabIndex={0}
            role="button"
            className="btn btn-ghost btn-circle avatar"
          >
            <div className="w-9  rounded-full">
              <img
                src="https://avatars.githubusercontent.com/u/74099030?v=4"
                alt="foto-cowok-ganteng"
              />
            </div>
          </div>
          <ul
            tabIndex={0}
            className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-100 rounded-box w-40"
          >
            {/* Profile link removed */}
            <li>
              <button 
                onClick={handleLogout}
                className="justify-between w-full text-left"
              >
                Log Out
              </button>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Navbar;
