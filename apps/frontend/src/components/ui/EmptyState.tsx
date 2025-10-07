'use client';

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 ${className}`}
    >
      {icon && (
        <div className='w-16 h-16 mx-auto mb-4 bg-gray-700 rounded-full flex items-center justify-center'>
          {icon}
        </div>
      )}
      <h3 className='text-lg font-medium text-gray-300 mb-2 text-center'>
        {title}
      </h3>
      {description && (
        <p className='text-gray-400 text-sm text-center max-w-md mb-4'>
          {description}
        </p>
      )}
      {action && <div className='mt-4'>{action}</div>}
    </div>
  );
};
