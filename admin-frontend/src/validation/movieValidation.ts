// Movie Form Validation Module
export interface MovieFormData {
  title: string;
  description: string;
  productionTime: string;
  producer: string;
  price: string;
  movieType: string;
  episodeCount: string;
  status: string;
  poster?: File;
}

export interface ValidationErrors {
  [key: string]: string;
}

// Validation rules
const VALIDATION_RULES = {
  title: {
    required: true,
    minLength: 2,
    maxLength: 200
  },
  description: {
    required: true,
    minLength: 10,
    maxLength: 2000
  },
  productionTime: {
    required: false, // Will be validated conditionally based on status
    minYear: 1900,
    maxYear: new Date().getFullYear() + 1
  },
  producer: {
    required: true,
    minLength: 2,
    maxLength: 100
  },
  price: {
    required: true,
    minValue: 0,
    maxValue: 1000000
  },
  movieType: {
    required: true,
    allowedValues: ['Phim lẻ', 'Phim bộ', 'Thể thao']
  },
  episodeCount: {
    required: true,
    minValue: 1,
    maxValue: 1000
  },
  status: {
    required: true,
    allowedValues: ['Sắp phát hành', 'Đã phát hành', 'Đã kết thúc']
  },
  poster: {
    required: false,
    maxSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
  }
};

// Validate individual field
export const validateField = (
  fieldName: keyof MovieFormData,
  value: string | File | undefined
): string => {
  const rules = VALIDATION_RULES[fieldName as keyof typeof VALIDATION_RULES];
  
  if (!rules) return '';

  // Required field validation
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return `${getFieldLabel(fieldName)} là bắt buộc`;
  }

  // Special handling for productionTime - skip validation if empty
  if (fieldName === 'productionTime') {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      console.log('⏭️ Skipping productionTime validation - field is empty');
      return ''; // Don't show error if productionTime is empty
    }
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    
    // Min length validation
    if ('minLength' in rules && rules.minLength && trimmedValue.length < rules.minLength) {
      return `${getFieldLabel(fieldName)} phải có ít nhất ${rules.minLength} ký tự`;
    }

    // Max length validation
    if ('maxLength' in rules && rules.maxLength && trimmedValue.length > rules.maxLength) {
      return `${getFieldLabel(fieldName)} không được vượt quá ${rules.maxLength} ký tự`;
    }

    // Numeric validation for price and episodeCount
    if (fieldName === 'price' || fieldName === 'episodeCount') {
      const numValue = Number(trimmedValue);
      if (isNaN(numValue)) {
        return `${getFieldLabel(fieldName)} phải là số`;
      }
      if ('minValue' in rules && rules.minValue !== undefined && numValue < rules.minValue) {
        return `${getFieldLabel(fieldName)} phải lớn hơn hoặc bằng ${rules.minValue}`;
      }
      if ('maxValue' in rules && rules.maxValue !== undefined && numValue > rules.maxValue) {
        return `${getFieldLabel(fieldName)} không được vượt quá ${rules.maxValue}`;
      }
    }

    // Date validation for productionTime
    if (fieldName === 'productionTime') {
      // Check if it's a valid datetime-local format (YYYY-MM-DDTHH:MM)
      const dateTimeRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
      if (!dateTimeRegex.test(trimmedValue)) {
        return `${getFieldLabel(fieldName)} phải có định dạng ngày giờ hợp lệ (YYYY-MM-DDTHH:MM)`;
      }
      
      const date = new Date(trimmedValue);
      if (isNaN(date.getTime())) {
        return `${getFieldLabel(fieldName)} phải là ngày giờ hợp lệ`;
      }
      
      const year = date.getFullYear();
      if ('minYear' in rules && rules.minYear && year < rules.minYear) {
        return `${getFieldLabel(fieldName)} không được nhỏ hơn năm ${rules.minYear}`;
      }
      if ('maxYear' in rules && rules.maxYear && year > rules.maxYear) {
        return `${getFieldLabel(fieldName)} không được lớn hơn năm ${rules.maxYear}`;
      }
    }

    // Allowed values validation
    if ('allowedValues' in rules && rules.allowedValues && !rules.allowedValues.includes(trimmedValue)) {
      return `${getFieldLabel(fieldName)} phải là một trong các giá trị: ${rules.allowedValues.join(', ')}`;
    }
  }

  // File validation for poster
  if (fieldName === 'poster' && value instanceof File) {
    const file = value as File;
    
    if ('maxSize' in rules && rules.maxSize && file.size > rules.maxSize) {
      return `${getFieldLabel(fieldName)} không được vượt quá 5MB`;
    }
    
    if ('allowedTypes' in rules && rules.allowedTypes && !rules.allowedTypes.includes(file.type)) {
      return `${getFieldLabel(fieldName)} phải là file ảnh (JPEG, PNG, WebP)`;
    }
  }

  return '';
};

// Validate entire form
export const validateMovieForm = (formData: MovieFormData): ValidationErrors => {
  const errors: ValidationErrors = {};

  console.log('🔍 validateMovieForm called with status:', formData.status);

  // Validate all fields except productionTime (will be handled conditionally)
  Object.keys(formData).forEach((fieldName) => {
    // Skip productionTime validation here - will be handled conditionally
    if (fieldName === 'productionTime') {
      console.log('⏭️ Skipping productionTime validation in main loop');
      return;
    }
    
    const fieldValue = formData[fieldName as keyof MovieFormData];
    const error = validateField(fieldName as keyof MovieFormData, fieldValue);
    if (error) {
      errors[fieldName] = error;
    }
  });

  // Conditional validation for productionTime
  // Only validate if status is "Sắp phát hành" (upcoming)
  if (formData.status === 'Sắp phát hành') {
    console.log('✅ Validating productionTime because status is "Sắp phát hành"');
    const productionTimeError = validateField('productionTime', formData.productionTime);
    if (productionTimeError) {
      errors.productionTime = productionTimeError;
    }
  } else {
    console.log('⏭️ Skipping productionTime validation because status is not "Sắp phát hành"');
  }

  console.log('📋 validateMovieForm errors:', errors);
  return errors;
};

// Get field label for Vietnamese
const getFieldLabel = (fieldName: string): string => {
  const labels: Record<string, string> = {
    title: 'Tên phim',
    description: 'Mô tả phim',
    productionTime: 'Ngày sản xuất',
    producer: 'Nhà sản xuất',
    price: 'Giá',
    movieType: 'Loại phim',
    episodeCount: 'Số tập',
    status: 'Trạng thái phát hành',
    poster: 'Poster phim'
  };
  
  return labels[fieldName] || fieldName;
};

// Check if form is valid
export const isFormValid = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length === 0;
};

// Clear specific field error
export const clearFieldError = (
  errors: ValidationErrors,
  fieldName: string
): ValidationErrors => {
  const newErrors = { ...errors };
  delete newErrors[fieldName];
  return newErrors;
};

// Validate on blur (real-time validation)
export const validateOnBlur = (
  fieldName: keyof MovieFormData,
  value: string | File | undefined,
  currentErrors: ValidationErrors
): ValidationErrors => {
  const newErrors = { ...currentErrors };
  
  // Special handling for productionTime - skip validation if empty
  if (fieldName === 'productionTime') {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      delete newErrors[fieldName]; // Remove error if empty
      return newErrors;
    }
  }
  
  const error = validateField(fieldName, value);
  
  if (error) {
    newErrors[fieldName] = error;
  } else {
    delete newErrors[fieldName];
  }
  
  return newErrors;
}; 