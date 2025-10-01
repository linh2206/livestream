import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
}

export const Input: React.FC<InputProps> = ({
  className = '',
  label,
  error,
  fullWidth = false,
  ...props
}) => {
  const baseStyles = 'h-10 w-full rounded-md border bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50';
  const borderStyles = error ? 'border-red-500 focus:ring-red-500' : 'border-gray-600 focus:ring-blue-500';
  
  return (
    <div className={`space-y-1 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="text-sm font-medium text-gray-300">{label}</label>
      )}
      <input
        className={`${baseStyles} ${borderStyles} ${className}`}
        {...props}
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
};
