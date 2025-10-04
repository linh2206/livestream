// Validation utilities for maintainable code

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return {
    isValid: emailRegex.test(email),
    errors: emailRegex.test(email) ? [] : ['Invalid email format']
  };
};

export const validatePassword = (password: string): ValidationResult => {
  const errors: string[] = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateUsername = (username: string): ValidationResult => {
  const errors: string[] = [];
  
  if (username.length < 3) {
    errors.push('Username must be at least 3 characters');
  }
  
  if (username.length > 20) {
    errors.push('Username must be no more than 20 characters');
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    errors.push('Username can only contain letters, numbers, and underscores');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

export const validateStreamTitle = (title: string): ValidationResult => {
  const errors: string[] = [];
  
  if (!title || title.trim().length === 0) {
    errors.push('Stream title is required');
  }
  
  if (title.length > 100) {
    errors.push('Stream title must be no more than 100 characters');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
