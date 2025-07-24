import React from 'react';
import { NavLink } from 'react-router-dom';
import { IconType } from 'react-icons';

interface MenuItemProps {
  onClick?: () => void;
  catalog: string;
  listItems: Array<{
    isLink: boolean;
    url?: string;
    icon: IconType;
    label: string;
    onClick?: () => void;
  }>;
}

const MenuItem: React.FC<MenuItemProps> = ({
  onClick,
  catalog,
  listItems,
}) => {
  return (
    <div className="w-full flex flex-col items-stretch gap-2">
      <span className="hidden xl:block px-3 py-1 xl:text-xs 2xl:text-sm font-semibold text-base-content/50 uppercase tracking-wider border-b border-base-300/50">
        {catalog}
      </span>
      {listItems.map((listItem, index) => {
        if (listItem.isLink) {
          return (
            <NavLink
              key={index}
              onClick={onClick}
              to={listItem.url || ''}
              className={({ isActive }) =>
                isActive
                  ? 'btn 2xl:min-h-[52px] 3xl:min-h-[64px] btn-black btn-block justify-start gap-3 rounded-lg shadow-lg elegant-black'
                  : 'btn 2xl:min-h-[52px] 3xl:min-h-[64px] btn-ghost btn-block justify-start gap-3 rounded-lg hover:btn-black transition-all duration-200'
              }
            >
              <listItem.icon className="xl:text-xl 2xl:text-2xl 3xl:text-3xl" />
              <span className="xl:text-sm 2xl:text-base 3xl:text-lg capitalize font-medium">
                {listItem.label}
              </span>
            </NavLink>
          );
        } else {
          return (
            <button
              key={index}
              onClick={listItem.onClick}
              className="btn 2xl:min-h-[52px] 3xl:min-h-[64px] btn-ghost btn-block justify-start gap-3 rounded-lg hover:bg-base-200/50 transition-all duration-200"
            >
              <listItem.icon className="xl:text-xl 2xl:text-2xl 3xl:text-3xl" />
              <span className="xl:text-sm 2xl:text-base 3xl:text-lg capitalize font-medium">
                {listItem.label}
              </span>
            </button>
          );
        }
      })}
    </div>
  );
};

export default MenuItem;
