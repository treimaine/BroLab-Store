import { useState } from 'react';
import { z } from 'zod';
import type {
  CreateSubscriptionInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput
} from '../../../shared/validation';
import {
  createSubscriptionSchema,
  loginSchema,
  registerSchema,
  sanitizeInput,
  updateProfileSchema,
  validateEmail,
  validatePassword
} from '../../../shared/validation';

// ================================
// VALIDATION HOOKS
// ================================

export function useRegisterValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: RegisterInput): boolean => {
    const result = registerSchema.safeParse(data);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(error => {
        if (error.path) {
          newErrors[error.path[0]] = error.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const validateField = (field: keyof RegisterInput, value: string): string | null => {
    const testData = { [field]: value } as Partial<RegisterInput>;
    const result = registerSchema.safeParse(testData);
    
    if (!result.success) {
      const fieldError = result.error.errors.find((error: z.ZodIssue) => 
        error.path && error.path[0] === field
      );
      return fieldError ? fieldError.message : null;
    }
    
    return null;
  };

  return { validate, validateField, errors, setErrors };
}

export function useLoginValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: LoginInput): boolean => {
    const result = loginSchema.safeParse(data);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(error => {
        if (error.path) {
          newErrors[error.path[0]] = error.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const validateField = (field: keyof LoginInput, value: string): string | null => {
    const testData = { [field]: value } as Partial<LoginInput>;
    const result = loginSchema.safeParse(testData);
    
    if (!result.success) {
      const fieldError = result.error.errors.find((error: z.ZodIssue) => 
        error.path && error.path[0] === field
      );
      return fieldError ? fieldError.message : null;
    }
    
    return null;
  };

  return { validate, validateField, errors, setErrors };
}

export function useSubscriptionValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: CreateSubscriptionInput): boolean => {
    const result = createSubscriptionSchema.safeParse(data);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(error => {
        if (error.path) {
          newErrors[error.path[0]] = error.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  return { validate, errors, setErrors };
}

export function useProfileValidation() {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (data: UpdateProfileInput): boolean => {
    const result = updateProfileSchema.safeParse(data);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach(error => {
        if (error.path) {
          newErrors[error.path[0]] = error.message;
        }
      });
      setErrors(newErrors);
      return false;
    }
    
    setErrors({});
    return true;
  };

  const validateField = (field: keyof UpdateProfileInput, value: string): string | null => {
    const testData = { [field]: value } as Partial<UpdateProfileInput>;
    const result = updateProfileSchema.safeParse(testData);
    
    if (!result.success) {
      const fieldError = result.error.errors.find((error: z.ZodIssue) => 
        error.path && error.path[0] === field
      );
      return fieldError ? fieldError.message : null;
    }
    
    return null;
  };

  return { validate, validateField, errors, setErrors };
}



// ================================
// UTILITY HOOKS
// ================================

export function useEmailValidation() {
  const [error, setError] = useState<string | null>(null);

  const validate = (email: string): boolean => {
    const isValid = validateEmail(email);
    setError(isValid ? null : 'Please enter a valid email address');
    return isValid;
  };

  return { validate, error, setError };
}

export function usePasswordValidation() {
  const [errors, setErrors] = useState<string[]>([]);

  const validate = (password: string): boolean => {
    const result = validatePassword(password);
    setErrors(result.errors);
    return result.isValid;
  };

  return { validate, errors, setErrors };
}

export function useInputSanitization() {
  const sanitize = (input: string): string => {
    return sanitizeInput(input);
  };

  return { sanitize };
}

// ================================
// REAL-TIME VALIDATION HOOK
// ================================

export function useRealTimeValidation<T>(
  schema: any,
  initialData: Partial<T> = {}
) {
  const [data, setData] = useState<Partial<T>>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(false);

  const updateField = (field: keyof T, value: any) => {
    const newData = { ...data, [field]: value };
    setData(newData);

    // Validate the updated field
    const fieldValidation = schema.safeParse({ [field]: value });
    
    if (!fieldValidation.success) {
      const fieldError = fieldValidation.error.errors.find((error: z.ZodIssue) => 
        error.path && error.path[0] === field
      );
      
      setErrors(prev => ({
        ...prev,
        [field as string]: fieldError ? fieldError.message : ''
      }));
    } else {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as string];
        return newErrors;
      });
    }

    // Validate entire form
    const fullValidation = schema.safeParse(newData);
    setIsValid(fullValidation.success);
  };

  const validate = (): boolean => {
    const result = schema.safeParse(data);
    
    if (!result.success) {
      const newErrors: Record<string, string> = {};
      result.error.errors.forEach((error: z.ZodIssue) => {
        if (error.path) {
          newErrors[error.path[0]] = error.message;
        }
      });
      setErrors(newErrors);
      setIsValid(false);
      return false;
    }
    
    setErrors({});
    setIsValid(true);
    return true;
  };

  const reset = () => {
    setData(initialData);
    setErrors({});
    setIsValid(false);
  };

  return {
    data,
    errors,
    isValid,
    updateField,
    validate,
    reset
  };
} 