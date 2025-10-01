'use client';

import React from 'react';
import { useAuth } from '@/lib/contexts/AuthContext';
import { Button } from '@/components/ui/Button';

export const Header: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
      <div className="px-6">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center">
            <h1 className="text-lg font-bold text-white">
              Livestream Platform
            </h1>
          </div>
          
          <div className="flex items-center space-x-3">
            {user && (
              <>
                <span className="text-sm text-gray-300">
                  {user.username}
                </span>
                {isAdmin && (
                  <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full font-medium">
                    Admin
                  </span>
                )}
                <button
                  onClick={handleLogout}
                  className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded-lg transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

