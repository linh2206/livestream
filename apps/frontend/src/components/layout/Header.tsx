'use client';

import { useAuth } from '@/lib/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import React, { useEffect, useRef, useState } from 'react';

export const Header: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    setIsProfileOpen(false);
  };

  const handleProfileClick = () => {
    setIsProfileOpen(!isProfileOpen);
  };

  const handleGoToProfile = () => {
    router.push(`/user/${user?._id}`);
    setIsProfileOpen(false);
  };

  const handleGoToAdmin = () => {
    router.push('/admin/users');
    setIsProfileOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <header className='bg-gray-800 border-b border-gray-700 sticky top-0 z-50'>
      <div className='px-6'>
        <div className='flex justify-between items-center h-14'>
          <div className='flex items-center'>
            <h1 className='text-lg font-bold text-white'>
              Livestream Platform
            </h1>
          </div>

          <div className='flex items-center space-x-3'>
            {user && (
              <div className='relative' ref={dropdownRef}>
                {/* Profile Button - Simplified */}
                <button
                  onClick={handleProfileClick}
                  className='flex items-center space-x-2 p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors group'
                >
                  {/* Avatar with Admin Badge */}
                  <div className='relative'>
                    <div className='w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg'>
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className='w-10 h-10 rounded-full object-cover'
                        />
                      ) : (
                        <span className='text-white font-bold text-lg'>
                          {user.username?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    {isAdmin && (
                      <div className='absolute -top-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center'>
                        <svg
                          className='w-2.5 h-2.5 text-white'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path
                            fillRule='evenodd'
                            d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                            clipRule='evenodd'
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Dropdown Arrow */}
                  <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M19 9l-7 7-7-7'
                    />
                  </svg>
                </button>

                {/* Dropdown Menu */}
                {isProfileOpen && (
                  <div className='absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50'>
                    <div className='py-2'>
                      {/* Profile Info - Compact */}
                      <div className='px-4 py-3 border-b border-gray-700'>
                        <div className='flex items-center space-x-3'>
                          <div className='w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center'>
                            {user.avatar ? (
                              <img
                                src={user.avatar}
                                alt={user.username}
                                className='w-12 h-12 rounded-full object-cover'
                              />
                            ) : (
                              <span className='text-white font-bold text-lg'>
                                {user.username?.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className='flex-1 min-w-0'>
                            <div className='flex items-center space-x-2'>
                              <p className='text-sm font-medium text-white truncate'>
                                {user.fullName || user.username}
                              </p>
                              {isAdmin && (
                                <span className='px-2 py-0.5 bg-blue-600 text-white text-xs rounded-full font-medium flex-shrink-0'>
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className='text-xs text-gray-400 truncate'>
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className='py-1'>
                        <button
                          onClick={handleGoToProfile}
                          className='w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-3'
                        >
                          <svg
                            className='w-4 h-4'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                            />
                          </svg>
                          <span>View Profile</span>
                        </button>

                        {isAdmin && (
                          <button
                            onClick={handleGoToAdmin}
                            className='w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors flex items-center space-x-3'
                          >
                            <svg
                              className='w-4 h-4'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                              />
                            </svg>
                            <span>Admin Panel</span>
                          </button>
                        )}

                        <div className='border-t border-gray-700 my-1'></div>

                        <button
                          onClick={handleLogout}
                          className='w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors flex items-center space-x-3'
                        >
                          <svg
                            className='w-4 h-4'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1'
                            />
                          </svg>
                          <span>Logout</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
