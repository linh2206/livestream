'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
}

const adminMenuItems = [
  {
    name: 'Monitoring',
    href: '/admin/monitoring',
    icon: '📊',
    description: 'System performance and health',
  },
  {
    name: 'Users',
    href: '/admin/users',
    icon: '👥',
    description: 'User management and roles',
  },
  {
    name: 'Analytics',
    href: '/admin/analytics',
    icon: '📈',
    description: 'Platform analytics and insights',
  },
];

export default function AdminLayout({ children }: AdminLayoutProps) {
  const { user } = useAuth();
  const pathname = usePathname();

  // Check if user is admin
  if (!user || user.role !== 'admin') {
    return (
      <div className='min-h-screen bg-gray-900 flex items-center justify-center'>
        <div className='text-center'>
          <h1 className='text-2xl font-bold text-red-500 mb-4'>
            Access Denied
          </h1>
          <p className='text-gray-300'>
            You need admin privileges to access this page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-gray-900 flex'>
      {/* Sidebar */}
      <div className='w-64 bg-gray-800 border-r border-gray-700'>
        <div className='p-6'>
          <h1 className='text-xl font-bold text-white'>Admin Panel</h1>
          <p className='text-sm text-gray-400 mt-1'>
            Welcome back, {user.username}
          </p>
        </div>

        <nav className='px-4 pb-4'>
          <div className='space-y-2'>
            {adminMenuItems.map(item => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center p-3 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  <span className='text-lg mr-3'>{item.icon}</span>
                  <div>
                    <div className='font-medium'>{item.name}</div>
                    <div className='text-xs opacity-75'>{item.description}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className='px-4 pb-4'>
          <Link
            href='/dashboard'
            className='flex items-center p-3 text-gray-300 hover:bg-gray-700 hover:text-white rounded-lg transition-colors'
          >
            <span className='text-lg mr-3'>🏠</span>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 overflow-auto'>{children}</div>
    </div>
  );
}
