import React from 'react';

interface AdminCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: string;
  color?: 'blue' | 'green' | 'purple' | 'yellow' | 'red' | 'gray';
  className?: string;
  children?: React.ReactNode;
}

const colorClasses = {
  blue: 'from-blue-600 to-blue-700',
  green: 'from-green-600 to-green-700',
  purple: 'from-purple-600 to-purple-700',
  yellow: 'from-yellow-600 to-yellow-700',
  red: 'from-red-600 to-red-700',
  gray: 'from-gray-600 to-gray-700',
};

export default function AdminCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  color = 'gray',
  className = '',
  children 
}: AdminCardProps) {
  return (
    <div className={`bg-gradient-to-r ${colorClasses[color]} rounded-lg p-6 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-2">{title}</h3>
          <div className="text-3xl font-bold">{value}</div>
          {subtitle && (
            <div className="text-sm opacity-80 mt-1">{subtitle}</div>
          )}
        </div>
        {icon && (
          <div className="text-4xl opacity-80">{icon}</div>
        )}
      </div>
      {children}
    </div>
  );
}

