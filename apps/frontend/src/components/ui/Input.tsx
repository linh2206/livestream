import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  fullWidth?: boolean;
  textarea?: boolean;
  rows?: number;
}

export const Input: React.FC<InputProps> = ({
  className = '',
  label,
  error,
  fullWidth = false,
  textarea = false,
  rows = 3,
  ...props
}) => {
  const baseStyles =
    'w-full rounded-lg border-2 bg-gray-800/50 backdrop-blur-sm px-4 py-3 text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:opacity-50 transition-all duration-200';
  const borderStyles = error
    ? 'border-red-400 focus:ring-red-400 focus:border-red-400'
    : 'border-gray-600 focus:ring-blue-400 focus:border-blue-400 hover:border-gray-500';
  const heightStyles = textarea ? 'min-h-[100px]' : 'h-12';

  return (
    <div className={`space-y-2 ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className='text-sm font-semibold text-gray-200 flex items-center gap-2'>
          {label}
          {props.required && <span className='text-red-400'>*</span>}
        </label>
      )}
      {textarea ? (
        <textarea
          className={`${baseStyles} ${borderStyles} ${heightStyles} ${className} resize-none`}
          rows={rows}
          {...(props as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      ) : (
        <input
          className={`${baseStyles} ${borderStyles} ${heightStyles} ${className}`}
          {...props}
        />
      )}
      {error && (
        <div className='flex items-center gap-1 mt-1'>
          <div className='w-1 h-1 bg-red-400 rounded-full'></div>
          <p className='text-xs text-red-400 font-medium'>{error}</p>
        </div>
      )}
    </div>
  );
};
