import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

export interface FormValidationState<T> {
  data: T;
  errors: Record<string, string>;
  isValid: boolean;
  isValidating: boolean;
  hasBeenSubmitted: boolean;
}

export interface UseFormValidationOptions<T> {
  schema: z.ZodSchema<T>;
  initialData: T;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  debounceMs?: number;
}

export function useFormValidation<T extends Record<string, unknown>>({
  schema,
  initialData,
  validateOnChange = true,
  validateOnBlur = true,
  debounceMs = 300,
}: UseFormValidationOptions<T>) {
  const [state, setState] = useState<FormValidationState<T>>({
    data: initialData,
    errors: {},
    isValid: false,
    isValidating: false,
    hasBeenSubmitted: false,
  });

  // Debounced validation function
  const [validationTimeout, setValidationTimeout] = useState<NodeJS.Timeout | null>(null);

  const validateField = useCallback(
    (fieldName: keyof T, value: unknown, immediate = false) => {
      if (validationTimeout) {
        clearTimeout(validationTimeout);
      }

      const performValidation = () => {
        setState(prev => ({ ...prev, isValidating: true }));

        try {
          // Validate the entire form data with the updated field
          const updatedData = { ...state.data, [fieldName]: value };
          schema.parse(updatedData);

          // Field is valid, remove any existing error
          setState(prev => {
            const newErrors = { ...prev.errors };
            delete newErrors[fieldName as string];
            return {
              ...prev,
              errors: newErrors,
              isValidating: false,
            };
          });
        } catch (error) {
          if (error instanceof z.ZodError) {
            const fieldError = error.errors.find(err => err.path.includes(fieldName as string));

            if (fieldError) {
              setState(prev => ({
                ...prev,
                errors: {
                  ...prev.errors,
                  [fieldName as string]: fieldError.message,
                },
                isValidating: false,
              }));
            } else {
              setState(prev => ({ ...prev, isValidating: false }));
            }
          } else {
            setState(prev => ({ ...prev, isValidating: false }));
          }
        }
      };

      if (immediate) {
        performValidation();
      } else {
        const timeout = setTimeout(performValidation, debounceMs);
        setValidationTimeout(timeout);
      }
    },
    [schema, debounceMs, validationTimeout, state.data]
  );

  const validateAll = useCallback((): boolean => {
    setState(prev => ({ ...prev, isValidating: true }));

    try {
      schema.parse(state.data);

      // All fields are valid
      setState(prev => ({
        ...prev,
        errors: {},
        isValid: true,
        isValidating: false,
      }));

      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};

        error.errors.forEach(err => {
          const fieldName = err.path[0] as string;
          if (fieldName && !newErrors[fieldName]) {
            newErrors[fieldName] = err.message;
          }
        });

        setState(prev => ({
          ...prev,
          errors: newErrors,
          isValid: false,
          isValidating: false,
        }));
      } else {
        setState(prev => ({
          ...prev,
          isValid: false,
          isValidating: false,
        }));
      }

      return false;
    }
  }, [schema, state.data]);

  const updateField = useCallback(
    (fieldName: keyof T, value: unknown) => {
      setState(prev => ({
        ...prev,
        data: {
          ...prev.data,
          [fieldName]: value,
        },
      }));

      // Validate field if enabled
      if (validateOnChange && (state.hasBeenSubmitted || state.errors[fieldName as string])) {
        validateField(fieldName, value);
      }
    },
    [validateOnChange, validateField, state.hasBeenSubmitted, state.errors]
  );

  const handleBlur = useCallback(
    (fieldName: keyof T) => {
      if (validateOnBlur) {
        validateField(fieldName, state.data[fieldName], true);
      }
    },
    [validateOnBlur, validateField, state.data]
  );

  const handleSubmit = useCallback(
    (onSubmit: (data: T) => void | Promise<void>) => {
      return async (e: React.FormEvent) => {
        e.preventDefault();

        setState(prev => ({ ...prev, hasBeenSubmitted: true }));

        const isValid = validateAll();

        if (isValid) {
          await onSubmit(state.data);
        }
      };
    },
    [validateAll, state.data]
  );

  const reset = useCallback(() => {
    setState({
      data: initialData,
      errors: {},
      isValid: false,
      isValidating: false,
      hasBeenSubmitted: false,
    });
  }, [initialData]);

  const setData = useCallback((newData: Partial<T>) => {
    setState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        ...newData,
      },
    }));
  }, []);

  // Memoized computed values
  const hasErrors = useMemo(() => {
    return Object.values(state.errors).some(error => error && error.length > 0);
  }, [state.errors]);

  const getFieldError = useCallback(
    (fieldName: keyof T): string | undefined => {
      return state.errors[fieldName as string];
    },
    [state.errors]
  );

  const isFieldValid = useCallback(
    (fieldName: keyof T): boolean => {
      return !state.errors[fieldName as string];
    },
    [state.errors]
  );

  return {
    // State
    data: state.data,
    errors: state.errors,
    isValid: state.isValid && !hasErrors,
    isValidating: state.isValidating,
    hasBeenSubmitted: state.hasBeenSubmitted,
    hasErrors,

    // Actions
    updateField,
    handleBlur,
    handleSubmit,
    validateField,
    validateAll,
    reset,
    setData,

    // Utilities
    getFieldError,
    isFieldValid,
  };
}
