import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
  actions?: React.ReactNode;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, actions, onClick }) => {
  return (
    <div className={`bg-gray-800 rounded-lg border border-gray-700 shadow-sm ${className}`} onClick={onClick}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
          {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
          {actions && <div className="flex space-x-2">{actions}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};
