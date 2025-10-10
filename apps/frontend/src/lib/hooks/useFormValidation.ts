import { useCallback, useState } from 'react';

export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: string) => string | undefined;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string | undefined;
}

export const commonValidationRules = {
  streamTitle: {
    required: true,
    minLength: 3,
    maxLength: 100,
  },
  streamDescription: {
    required: false,
    maxLength: 1000,
  },
  streamKey: {
    required: true,
    minLength: 3,
    maxLength: 50,
    pattern: /^[a-zA-Z0-9_-]+$/,
  },
  category: {
    required: false,
    maxLength: 50,
  },
  tags: {
    required: false,
    maxLength: 200,
    custom: (value: string) => {
      if (!value) return undefined;
      const tags = value
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
      if (tags.length > 10) return 'Maximum 10 tags allowed';
      for (const tag of tags) {
        if (tag.length > 20)
          return `Tag "${tag}" is too long (max 20 characters)`;
      }
      return undefined;
    },
  },
  // Auth validation rules
  username: {
    required: true,
    minLength: 3,
    maxLength: 30,
    pattern: /^[a-zA-Z0-9_]+$/,
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  password: {
    required: true,
    minLength: 6,
    maxLength: 100,
  },
  fullName: {
    required: true,
    minLength: 2,
    maxLength: 100,
  },
  usernameOrEmail: {
    required: true,
    minLength: 3,
    maxLength: 100,
  },
  streamType: {
    required: true,
    custom: (value: string) => {
      if (value && !['camera', 'screen'].includes(value)) {
        return 'Stream type must be either "camera" or "screen"';
      }
      return undefined;
    },
  },
};

export const useFormValidation = (rules: ValidationRules) => {
  const [errors, setErrors] = useState<ValidationErrors>({});

  const validateField = useCallback(
    (name: string, value: string): string | undefined => {
      const rule = rules[name];
      if (!rule) return undefined;

      // Required validation
      if (rule.required && (!value || value.trim().length === 0)) {
        return `${name} is required`;
      }

      // Skip other validations if value is empty and not required
      if (!value || value.trim().length === 0) {
        return undefined;
      }

      // Min length validation
      if (rule.minLength && value.length < rule.minLength) {
        return `${name} must be at least ${rule.minLength} characters long`;
      }

      // Max length validation
      if (rule.maxLength && value.length > rule.maxLength) {
        return `${name} must be less than ${rule.maxLength} characters`;
      }

      // Pattern validation
      if (rule.pattern && !rule.pattern.test(value)) {
        return `${name} format is invalid`;
      }

      // Custom validation
      if (rule.custom) {
        return rule.custom(value);
      }

      return undefined;
    },
    [rules]
  );

  const validateForm = useCallback(
    (data: Record<string, string>): boolean => {
      const newErrors: ValidationErrors = {};
      let isValid = true;

      for (const [fieldName, value] of Object.entries(data)) {
        const error = validateField(fieldName, value);
        if (error) {
          newErrors[fieldName] = error;
          isValid = false;
        }
      }

      setErrors(newErrors);
      return isValid;
    },
    [validateField]
  );

  const validateSingleField = useCallback(
    (name: string, value: string): boolean => {
      const error = validateField(name, value);
      setErrors(prev => ({
        ...prev,
        [name]: error,
      }));
      return !error;
    },
    [validateField]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((fieldName: string) => {
    setErrors(prev => ({
      ...prev,
      [fieldName]: undefined,
    }));
  }, []);

  const hasErrors = Object.values(errors).some(error => error !== undefined);

  return {
    errors,
    validateForm,
    validateSingleField,
    clearErrors,
    clearFieldError,
    hasErrors,
  };
};
