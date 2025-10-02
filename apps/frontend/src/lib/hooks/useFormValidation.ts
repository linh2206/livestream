'use client';

import { useState, useCallback } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | null;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export interface UseFormValidationReturn {
  errors: ValidationErrors;
  validateField: (name: string, value: string) => string | null;
  validateForm: (data: Record<string, string>) => boolean;
  clearErrors: () => void;
  clearFieldError: (field: string) => void;
  hasErrors: boolean;
}

export function useFormValidation(rules: ValidationRules): UseFormValidationReturn {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = useCallback((name: string, value: string): string | null => {
    const rule = rules[name];
    if (!rule) return null;

    // Required validation
    if (rule.required && (!value || value.trim() === '')) {
      return `${name} is required`;
    }

    // Skip other validations if value is empty and not required
    if (!value || value.trim() === '') return null;

    // Min length validation
    if (rule.minLength && value.length < rule.minLength) {
      return `${name} must be at least ${rule.minLength} characters`;
    }

    // Max length validation
    if (rule.maxLength && value.length > rule.maxLength) {
      return `${name} must be no more than ${rule.maxLength} characters`;
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      return `${name} format is invalid`;
    }

    // Custom validation
    if (rule.custom) {
      return rule.custom(value);
    }

    return null;
  }, [rules]);

  const validateForm = useCallback((data: Record<string, string>): boolean => {
    const newErrors: ValidationErrors = {};
    let isValid = true;

    Object.keys(rules).forEach(field => {
      const error = validateField(field, data[field] || '');
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [rules, validateField]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  return {
    errors,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError,
    hasErrors: Object.keys(errors).length > 0,
  };
}

// Common validation rules
export const commonValidationRules = {
  username: {
    required: true,
    minLength: 3,
    maxLength: 20,
    pattern: /^[a-zA-Z0-9_]+$/,
    custom: (value: string) => {
      if (value.startsWith('_') || value.endsWith('_')) {
        return 'Username cannot start or end with underscore';
      }
      return null;
    },
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  usernameOrEmail: {
    required: true,
    minLength: 3,
    maxLength: 50,
    custom: (value: string) => {
      // Check if it's an email format
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailPattern.test(value)) {
        return null; // Valid email
      }
      // Check if it's a valid username
      const usernamePattern = /^[a-zA-Z0-9_]+$/;
      if (usernamePattern.test(value) && value.length >= 3 && value.length <= 20) {
        return null; // Valid username
      }
      return 'Please enter a valid email or username';
    },
  },
  password: {
    required: true,
    minLength: 6,
    maxLength: 100,
  },
  fullName: {
    required: false,
    maxLength: 50,
    pattern: /^[a-zA-Z\s]+$/,
  },
  streamTitle: {
    required: true,
    minLength: 3,
    maxLength: 100,
  },
  streamDescription: {
    required: false,
    maxLength: 1000,
  },
};


