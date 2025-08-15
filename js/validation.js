// Form Validation Handler with Real-time Feedback
class ValidationHandler {
    constructor() {
        this.rules = this.initializeValidationRules();
        this.customValidators = {};
        this.errorMessages = this.initializeErrorMessages();
        this.debounceTimeout = 300; // ms
        this.validationCallbacks = {};
    }
    
    initializeValidationRules() {
        return {
            // Text fields
            fullName: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-Z\s'-]+$/,
                customValidator: 'validateName'
            },
            
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                maxLength: 255
            },
            
            phone: {
                required: true,
                pattern: /^[\+]?[(]?[\+]?\d{0,3}[)]?[-\s\.]?\d{1,4}[-\s\.]?\d{1,4}[-\s\.]?\d{1,4}[-\s\.]?\d{1,9}$/,
                minLength: 10,
                maxLength: 15
            },
            
            address: {
                required: true,
                minLength: 10,
                maxLength: 500
            },
            
            // Date fields
            dateOfBirth: {
                required: true,
                customValidator: 'validateDateOfBirth'
            },
            
            admissionDate: {
                required: true,
                customValidator: 'validateAdmissionDate'
            },
            
            // Select fields
            gender: {
                required: true,
                allowedValues: ['male', 'female', 'other']
            },
            
            relation: {
                required: true,
                allowedValues: ['father', 'mother', 'guardian', 'other']
            },
            
            roomNumber: {
                required: true
            },
            
            stayDuration: {
                required: true
            },
            
            // Guardian fields
            guardianName: {
                required: true,
                minLength: 2,
                maxLength: 100,
                pattern: /^[a-zA-Z\s'-]+$/
            },
            
            guardianPhone: {
                required: true,
                pattern: /^[\+]?[(]?[\+]?\d{0,3}[)]?[-\s\.]?\d{1,4}[-\s\.]?\d{1,4}[-\s\.]?\d{1,4}[-\s\.]?\d{1,9}$/,
                minLength: 10,
                maxLength: 15
            },
            
            emergencyContact: {
                required: false,
                pattern: /^[\+]?[(]?[\+]?\d{0,3}[)]?[-\s\.]?\d{1,4}[-\s\.]?\d{1,4}[-\s\.]?\d{1,4}[-\s\.]?\d{1,9}$/,
                minLength: 10,
                maxLength: 15
            }
        };
    }
    
    initializeErrorMessages() {
        return {
            required: 'This field is required',
            minLength: 'Must be at least {min} characters long',
            maxLength: 'Must not exceed {max} characters',
            pattern: 'Please enter a valid format',
            email: 'Please enter a valid email address',
            phone: 'Please enter a valid phone number',
            name: 'Please enter a valid name (letters, spaces, hyphens, apostrophes only)',
            dateOfBirth: 'Please enter a valid date of birth',
            admissionDate: 'Please enter a valid admission date',
            age: 'Age must be between 16 and 35 years',
            futureDate: 'Date cannot be in the future',
            pastDate: 'Date cannot be in the past',
            allowedValues: 'Please select a valid option'
        };
    }
    
    validateField(field) {
        if (!field || !field.name) return true;
        
        const fieldName = field.name;
        const value = field.value?.trim() || '';
        const rules = this.rules[fieldName];
        
        if (!rules) return true;
        
        const errors = [];
        
        // Required validation
        if (rules.required && !value) {
            errors.push(this.errorMessages.required);
        }
        
        // Skip further validation if field is empty and not required
        if (!value && !rules.required) {
            this.clearFieldError(field);
            return true;
        }
        
        if (value) {
            // Length validation
            if (rules.minLength && value.length < rules.minLength) {
                errors.push(this.errorMessages.minLength.replace('{min}', rules.minLength));
            }
            
            if (rules.maxLength && value.length > rules.maxLength) {
                errors.push(this.errorMessages.maxLength.replace('{max}', rules.maxLength));
            }
            
            // Pattern validation
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(this.getPatternErrorMessage(fieldName));
            }
            
            // Allowed values validation
            if (rules.allowedValues && !rules.allowedValues.includes(value.toLowerCase())) {
                errors.push(this.errorMessages.allowedValues);
            }
            
            // Custom validation
            if (rules.customValidator && this.customValidators[rules.customValidator]) {
                const customError = this.customValidators[rules.customValidator](value, field);
                if (customError) {
                    errors.push(customError);
                }
            }
        }
        
        // Display errors
        if (errors.length > 0) {
            this.showFieldError(field, errors[0]);
            return false;
        } else {
            this.clearFieldError(field);
            this.showFieldSuccess(field);
            return true;
        }
    }
    
    showFieldError(field, message) {
        const formGroup = field.closest('.form-group');
        const errorElement = formGroup?.querySelector('.error-message');
        
        if (formGroup && errorElement) {
            // Add error classes
            formGroup.classList.add('error');
            formGroup.classList.remove('success');
            field.classList.add('shake');
            
            // Show error message
            errorElement.textContent = message;
            errorElement.classList.add('show');
            
            // Remove shake animation after completion
            setTimeout(() => {
                field.classList.remove('shake');
            }, 500);
            
            // Add error styling to field
            field.style.borderColor = 'var(--error-color)';
            field.style.boxShadow = '0 0 0 3px rgba(239, 68, 68, 0.1)';
        }
    }
    
    clearFieldError(field) {
        const formGroup = field.closest('.form-group');
        const errorElement = formGroup?.querySelector('.error-message');
        
        if (formGroup && errorElement) {
            formGroup.classList.remove('error');
            errorElement.textContent = '';
            errorElement.classList.remove('show');
            
            // Clear field styling
            field.style.borderColor = '';
            field.style.boxShadow = '';
        }
    }
    
    showFieldSuccess(field) {
        const formGroup = field.closest('.form-group');
        
        if (formGroup) {
            formGroup.classList.add('success');
            formGroup.classList.remove('error');
            
            // Add success styling
            field.style.borderColor = 'var(--success-color)';
            field.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.1)';
            
            // Remove success styling after delay
            setTimeout(() => {
                if (!formGroup.classList.contains('error')) {
                    field.style.borderColor = '';
                    field.style.boxShadow = '';
                    formGroup.classList.remove('success');
                }
            }, 2000);
        }
    }
    
    getPatternErrorMessage(fieldName) {
        const customMessages = {
            email: this.errorMessages.email,
            phone: this.errorMessages.phone,
            guardianPhone: this.errorMessages.phone,
            emergencyContact: this.errorMessages.phone,
            fullName: this.errorMessages.name,
            guardianName: this.errorMessages.name
        };
        
        return customMessages[fieldName] || this.errorMessages.pattern;
    }
    
    // Custom validators
    initializeCustomValidators() {
        this.customValidators = {
            validateName: (value) => {
                if (value.length < 2) return 'Name must be at least 2 characters';
                if (!/^[a-zA-Z\s'-]+$/.test(value)) return 'Name can only contain letters, spaces, hyphens, and apostrophes';
                if (value.trim().split(/\s+/).length < 2) return 'Please enter both first and last name';
                return null;
            },
            
            validateDateOfBirth: (value) => {
                const date = new Date(value);
                const now = new Date();
                
                if (isNaN(date.getTime())) return 'Please enter a valid date';
                if (date > now) return 'Date of birth cannot be in the future';
                
                const age = this.calculateAge(date);
                if (age < 16) return 'Must be at least 16 years old';
                if (age > 35) return 'Must be under 35 years old';
                
                return null;
            },
            
            validateAdmissionDate: (value) => {
                const date = new Date(value);
                const now = new Date();
                const oneYearFromNow = new Date(now.getTime() + (365 * 24 * 60 * 60 * 1000));
                
                if (isNaN(date.getTime())) return 'Please enter a valid date';
                if (date < now.setHours(0, 0, 0, 0)) return 'Admission date cannot be in the past';
                if (date > oneYearFromNow) return 'Admission date cannot be more than one year in the future';
                
                return null;
            }
        };
    }
    
    calculateAge(birthDate) {
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }
    
    // Form-level validation
    validateForm(formElement) {
        if (!formElement) return false;
        
        const fields = formElement.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        const errors = [];
        
        fields.forEach(field => {
            if (!this.validateField(field)) {
                isValid = false;
                errors.push({
                    field: field.name,
                    message: field.parentElement.querySelector('.error-message')?.textContent
                });
            }
        });
        
        // Additional form-level validations
        const formLevelErrors = this.validateFormLevel(formElement);
        if (formLevelErrors.length > 0) {
            isValid = false;
            errors.push(...formLevelErrors);
        }
        
        return { isValid, errors };
    }
    
    validateFormLevel(formElement) {
        const errors = [];
        const formData = new FormData(formElement);
        
        // Cross-field validations
        const phone = formData.get('phone');
        const guardianPhone = formData.get('guardianPhone');
        const emergencyContact = formData.get('emergencyContact');
        
        // Check if phone numbers are different
        if (phone && guardianPhone && phone === guardianPhone) {
            errors.push({
                field: 'guardianPhone',
                message: 'Guardian phone should be different from student phone'
            });
        }
        
        if (phone && emergencyContact && phone === emergencyContact) {
            errors.push({
                field: 'emergencyContact',
                message: 'Emergency contact should be different from student phone'
            });
        }
        
        return errors;
    }
    
    // Step validation
    validateStep(stepNumber) {
        const stepElement = document.getElementById(`step${stepNumber}`);
        if (!stepElement) return { isValid: true, errors: [] };
        
        return this.validateForm(stepElement);
    }
    
    // Real-time validation setup
    setupRealTimeValidation() {
        this.initializeCustomValidators();
        
        const inputs = document.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            // Debounced validation on input
            let debounceTimer;
            
            input.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(() => {
                    if (input.value.length > 0) {
                        this.validateField(input);
                    }
                }, this.debounceTimeout);
            });
            
            // Immediate validation on blur
            input.addEventListener('blur', () => {
                clearTimeout(debounceTimer);
                this.validateField(input);
            });
            
            // Clear errors on focus
            input.addEventListener('focus', () => {
                if (input.value.length === 0) {
                    this.clearFieldError(input);
                }
            });
        });
    }
    
    // Animation and UI feedback
    showFormError(message) {
        this.showNotification(message, 'error');
    }
    
    showFormSuccess(message) {
        this.showNotification(message, 'success');
    }
    
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icon = type === 'error' ? 'fas fa-exclamation-circle' : 
                    type === 'success' ? 'fas fa-check-circle' : 'fas fa-info-circle';
        
        notification.innerHTML = `
            <i class="${icon}"></i>
            <span>${message}</span>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Styling
        const colors = {
            error: 'var(--error-color)',
            success: 'var(--success-color)',
            info: 'var(--primary-color)'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type]};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: var(--shadow-lg);
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            min-width: 300px;
            animation: slideInRight 0.3s ease-out;
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove
        const autoRemove = setTimeout(() => {
            this.removeNotification(notification);
        }, 5000);
        
        // Manual close
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeNotification(notification);
        });
    }
    
    removeNotification(notification) {
        notification.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }
    
    // Validation summary
    getValidationSummary(formElement) {
        const validation = this.validateForm(formElement);
        
        return {
            isValid: validation.isValid,
            errorCount: validation.errors.length,
            errors: validation.errors,
            completionPercentage: this.calculateCompletionPercentage(formElement)
        };
    }
    
    calculateCompletionPercentage(formElement) {
        const allFields = formElement.querySelectorAll('input, select, textarea');
        let completed = 0;
        
        allFields.forEach(field => {
            if (field.value && field.value.trim()) {
                completed++;
            }
        });
        
        return Math.round((completed / allFields.length) * 100);
    }
    
    // Advanced validation features
    addCustomRule(fieldName, rule) {
        if (!this.rules[fieldName]) {
            this.rules[fieldName] = {};
        }
        Object.assign(this.rules[fieldName], rule);
    }
    
    addCustomValidator(name, validatorFunction) {
        this.customValidators[name] = validatorFunction;
    }
    
    setValidationCallback(fieldName, callback) {
        this.validationCallbacks[fieldName] = callback;
    }
    
    // Accessibility improvements
    updateAriaLabels(field, isValid, errorMessage = '') {
        field.setAttribute('aria-invalid', !isValid);
        
        if (!isValid && errorMessage) {
            field.setAttribute('aria-describedby', `${field.id}-error`);
            
            // Ensure error element has proper ID
            const errorElement = field.parentElement.querySelector('.error-message');
            if (errorElement) {
                errorElement.id = `${field.id}-error`;
                errorElement.setAttribute('aria-live', 'polite');
            }
        } else {
            field.removeAttribute('aria-describedby');
        }
    }
    
    // Export validation state
    getValidationState() {
        const state = {};
        const inputs = document.querySelectorAll('input, select, textarea');
        
        inputs.forEach(input => {
            if (input.name) {
                state[input.name] = {
                    value: input.value,
                    isValid: this.validateField(input),
                    hasError: input.closest('.form-group')?.classList.contains('error') || false
                };
            }
        });
        
        return state;
    }
}

// Initialize validation when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const validationHandler = new ValidationHandler();
    validationHandler.setupRealTimeValidation();
    
    // Make globally available
    window.ValidationHandler = ValidationHandler;
    window.validationHandler = validationHandler;
});
