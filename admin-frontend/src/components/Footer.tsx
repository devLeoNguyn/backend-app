// import React from 'react';
import { IoFilmOutline, IoHeartOutline } from 'react-icons/io5';

const Footer = () => {
  return (
    <div className="w-full px-5 py-6 border-t border-base-300 dark:border-slate-700 bg-base-100/50 backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2 text-sm text-base-content/70">
          <IoFilmOutline className="text-xl text-black" />
          <span className="font-medium">Hệ Thống Quản Lý Phim</span>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-2 text-sm text-base-content/60">
          <span className="flex items-center gap-1">
            Được làm với 
            <IoHeartOutline className="text-red-500 animate-pulse" />
            bởi Đội Ngũ Admin
          </span>
          <span className="hidden sm:inline">•</span>
          <span>© 2025 Bản quyền thuộc về chúng tôi</span>
        </div>
      </div>
    </div>
  );
};

export default Footer;
