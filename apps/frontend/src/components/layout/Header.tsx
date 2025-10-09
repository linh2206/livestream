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
                {/* Profile Button - Clean & Modern */}
                <button
                  onClick={handleProfileClick}
                  className='relative group focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded-full'
                >
                  {/* Avatar Container */}
                  <div className='relative'>
                    {/* Main Avatar */}
                    <div className='w-11 h-11 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-500/30 group-hover:border-slate-400/50 transition-all duration-200'>
                      {user.avatar ? (
                        <img
                          src={user.avatar}
                          alt={user.username}
                          className='w-11 h-11 rounded-full object-cover'
                        />
                      ) : (
                        <span className='text-slate-200 font-semibold text-lg'>
                          {user.username?.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>

                    {/* Admin Indicator */}
                    {isAdmin && (
                      <div className='absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm border border-slate-700'>
                        <svg
                          className='w-2.5 h-2.5 text-white'
                          fill='currentColor'
                          viewBox='0 0 20 20'
                        >
                          <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                        </svg>
                      </div>
                    )}

                    {/* Online Status */}
                    <div className='absolute -bottom-0.5 -left-0.5 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-800 shadow-sm'></div>
                  </div>

                  {/* Subtle Dropdown Indicator - Repositioned to avoid overlap */}
                  <div className='absolute -bottom-1 -right-1 w-3 h-3 bg-slate-600 rounded-full flex items-center justify-center opacity-60 group-hover:opacity-100 transition-opacity'>
                    <svg
                      className={`w-2 h-2 text-slate-300 transition-transform duration-200 ${isProfileOpen ? 'rotate-180' : ''}`}
                      fill='none'
                      stroke='currentColor'
                      viewBox='0 0 24 24'
                    >
                      <path
                        strokeLinecap='round'
                        strokeLinejoin='round'
                        strokeWidth={3}
                        d='M19 9l-7 7-7-7'
                      />
                    </svg>
                  </div>
                </button>

                {/* Dropdown Menu - Clean Design */}
                {isProfileOpen && (
                  <div className='absolute right-0 mt-3 w-72 bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl shadow-2xl z-50 overflow-hidden'>
                    {/* Header Section */}
                    <div className='px-5 py-4 bg-gradient-to-r from-slate-800/50 to-slate-700/30 border-b border-slate-700/50'>
                      <div className='flex items-center space-x-3'>
                        <div className='w-12 h-12 bg-gradient-to-br from-slate-600 to-slate-800 rounded-full flex items-center justify-center border border-slate-500/30'>
                          {user.avatar ? (
                            <img
                              src={user.avatar}
                              alt={user.username}
                              className='w-12 h-12 rounded-full object-cover'
                            />
                          ) : (
                            <span className='text-slate-200 font-semibold text-lg'>
                              {user.username?.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className='flex-1 min-w-0'>
                          <div className='flex items-center space-x-2 mb-1'>
                            <h3 className='text-base font-semibold text-slate-100 truncate'>
                              {user.fullName || user.username}
                            </h3>
                            {isAdmin && (
                              <div className='flex items-center space-x-1 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-full'>
                                <svg
                                  className='w-3 h-3 text-amber-400'
                                  fill='currentColor'
                                  viewBox='0 0 20 20'
                                >
                                  <path d='M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z' />
                                </svg>
                                <span className='text-amber-400 text-xs font-medium'>
                                  Admin
                                </span>
                              </div>
                            )}
                          </div>
                          <p className='text-sm text-slate-400 truncate mb-1'>
                            {user.email}
                          </p>
                          <div className='flex items-center space-x-2'>
                            <div className='w-2 h-2 bg-emerald-500 rounded-full'></div>
                            <span className='text-xs text-emerald-400 font-medium'>
                              Online
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items - Clean Design */}
                    <div className='py-2'>
                      <button
                        onClick={handleGoToProfile}
                        className='w-full px-5 py-3 text-left text-sm text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 transition-all duration-200 flex items-center space-x-3 group'
                      >
                        <div className='w-8 h-8 bg-slate-700/50 rounded-lg flex items-center justify-center group-hover:bg-slate-600/50 transition-colors'>
                          <svg
                            className='w-4 h-4 text-slate-400 group-hover:text-slate-300'
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
                        </div>
                        <div>
                          <div className='font-medium'>View Profile</div>
                          <div className='text-xs text-slate-500'>
                            Manage your account
                          </div>
                        </div>
                      </button>

                      {isAdmin && (
                        <button
                          onClick={handleGoToAdmin}
                          className='w-full px-5 py-3 text-left text-sm text-slate-300 hover:bg-slate-800/50 hover:text-slate-100 transition-all duration-200 flex items-center space-x-3 group'
                        >
                          <div className='w-8 h-8 bg-amber-500/20 rounded-lg flex items-center justify-center group-hover:bg-amber-500/30 transition-colors'>
                            <svg
                              className='w-4 h-4 text-amber-400 group-hover:text-amber-300'
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
                          </div>
                          <div>
                            <div className='font-medium'>Admin Panel</div>
                            <div className='text-xs text-slate-500'>
                              Manage system settings
                            </div>
                          </div>
                        </button>
                      )}

                      <div className='border-t border-slate-700/50 my-2'></div>

                      <button
                        onClick={handleLogout}
                        className='w-full px-5 py-3 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 flex items-center space-x-3 group'
                      >
                        <div className='w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center group-hover:bg-red-500/30 transition-colors'>
                          <svg
                            className='w-4 h-4 text-red-400 group-hover:text-red-300'
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
                        </div>
                        <div>
                          <div className='font-medium'>Sign Out</div>
                          <div className='text-xs text-red-500/70'>
                            End your session
                          </div>
                        </div>
                      </button>
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
