import { useState, useCallback } from 'react';

/**
 * Form Validation Hook
 * Provides real-time validation with error messages
 */
export const useFormValidation = (initialValues = {}, validationRules = {}) => {
    const [values, setValues] = useState(initialValues);
    const [errors, setErrors] = useState({});
    const [touched, setTouched] = useState({});
    const [isDirty, setIsDirty] = useState(false);

    // Validate a single field
    const validateField = useCallback((name, value) => {
        const rules = validationRules[name];
        if (!rules) return null;

        // Required validation
        if (rules.required && (!value || value.toString().trim() === '')) {
            return rules.message || `${name} is required`;
        }

        // Min length validation
        if (rules.minLength && value.length < rules.minLength) {
            return `Minimum ${rules.minLength} characters required`;
        }

        // Max length validation
        if (rules.maxLength && value.length > rules.maxLength) {
            return `Maximum ${rules.maxLength} characters allowed`;
        }

        // Pattern validation
        if (rules.pattern && !rules.pattern.test(value)) {
            return rules.patternMessage || 'Invalid format';
        }

        // Custom validation function
        if (rules.validate && typeof rules.validate === 'function') {
            const customError = rules.validate(value, values);
            if (customError) return customError;
        }

        return null;
    }, [validationRules, values]);

    // Validate all fields
    const validateAll = useCallback(() => {
        const newErrors = {};
        let isValid = true;

        Object.keys(validationRules).forEach(fieldName => {
            const error = validateField(fieldName, values[fieldName]);
            if (error) {
                newErrors[fieldName] = error;
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    }, [validationRules, values, validateField]);

    // Handle field change
    const handleChange = useCallback((name, value) => {
        setValues(prev => ({ ...prev, [name]: value }));
        setIsDirty(true);

        // Validate on change if field was touched
        if (touched[name]) {
            const error = validateField(name, value);
            setErrors(prev => ({ ...prev, [name]: error }));
        }
    }, [touched, validateField]);

    // Handle field blur
    const handleBlur = useCallback((name) => {
        setTouched(prev => ({ ...prev, [name]: true }));
        const error = validateField(name, values[name]);
        setErrors(prev => ({ ...prev, [name]: error }));
    }, [values, validateField]);

    // Reset form
    const reset = useCallback(() => {
        setValues(initialValues);
        setErrors({});
        setTouched({});
        setIsDirty(false);
    }, [initialValues]);

    // Get field props helper
    const getFieldProps = useCallback((name) => ({
        value: values[name] || '',
        onChange: (e) => handleChange(name, e.target.value),
        onBlur: () => handleBlur(name),
        error: touched[name] ? errors[name] : null,
    }), [values, errors, touched, handleChange, handleBlur]);

    return {
        values,
        errors,
        touched,
        isDirty,
        handleChange,
        handleBlur,
        validateAll,
        reset,
        getFieldProps,
        isValid: Object.keys(errors).length === 0,
    };
};

/**
 * Common validation rules
 */
export const validationRules = {
    required: (message) => ({
        required: true,
        message,
    }),

    minLength: (length, message) => ({
        minLength: length,
        message,
    }),

    maxLength: (length, message) => ({
        maxLength: length,
        message,
    }),

    pattern: (regex, message) => ({
        pattern: regex,
        patternMessage: message,
    }),

    url: {
        pattern: /^https?:\/\/.+/,
        patternMessage: 'Must be a valid URL starting with http:// or https://',
    },

    number: {
        pattern: /^\d+$/,
        patternMessage: 'Must be a valid number',
    },

    custom: (validateFn) => ({
        validate: validateFn,
    }),
};

export default useFormValidation;
