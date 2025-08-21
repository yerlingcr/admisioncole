// Utilidades de validación para formularios

export const validators = {
  // Validar email
  email: (value) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!value) return 'El email es requerido'
    if (!emailRegex.test(value)) return 'El email no es válido'
    return null
  },

  // Validar contraseña
  password: (value, minLength = 8) => {
    if (!value) return 'La contraseña es requerida'
    if (value.length < minLength) return `La contraseña debe tener al menos ${minLength} caracteres`
    if (!/(?=.*[a-z])/.test(value)) return 'La contraseña debe contener al menos una letra minúscula'
    if (!/(?=.*[A-Z])/.test(value)) return 'La contraseña debe contener al menos una letra mayúscula'
    if (!/(?=.*\d)/.test(value)) return 'La contraseña debe contener al menos un número'
    return null
  },

  // Validar campo requerido
  required: (value, fieldName = 'Este campo') => {
    if (!value || value.trim() === '') return `${fieldName} es requerido`
    return null
  },

  // Validar longitud mínima
  minLength: (value, minLength, fieldName = 'Este campo') => {
    if (!value) return null // Si no es requerido, no validar
    if (value.length < minLength) return `${fieldName} debe tener al menos ${minLength} caracteres`
    return null
  },

  // Validar longitud máxima
  maxLength: (value, maxLength, fieldName = 'Este campo') => {
    if (!value) return null // Si no es requerido, no validar
    if (value.length > maxLength) return `${fieldName} debe tener máximo ${maxLength} caracteres`
    return null
  },

  // Validar número
  number: (value) => {
    if (!value) return null // Si no es requerido, no validar
    if (isNaN(value)) return 'Debe ser un número válido'
    return null
  },

  // Validar teléfono
  phone: (value) => {
    if (!value) return null // Si no es requerido, no validar
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
    if (!phoneRegex.test(value.replace(/\s/g, ''))) return 'El teléfono no es válido'
    return null
  },

  // Validar DNI (formato español)
  dni: (value) => {
    if (!value) return null // Si no es requerido, no validar
    const dniRegex = /^[0-9]{8}[A-Z]$/
    if (!dniRegex.test(value)) return 'El DNI no es válido'
    return null
  }
}

// Función para validar un formulario completo
export const validateForm = (formData, validationRules) => {
  const errors = {}
  
  Object.keys(validationRules).forEach(fieldName => {
    const fieldValue = formData[fieldName]
    const fieldRules = validationRules[fieldName]
    
    // Aplicar cada regla de validación
    for (const rule of fieldRules) {
      const error = rule.validator(fieldValue, ...rule.params)
      if (error) {
        errors[fieldName] = error
        break // Solo mostrar el primer error
      }
    }
  })
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Función para validar un campo individual
export const validateField = (value, validators) => {
  for (const validator of validators) {
    const error = validator.validator(value, ...validator.params)
    if (error) return error
  }
  return null
}

// Ejemplo de uso:
/*
const formData = {
  email: 'usuario@email.com',
  password: 'Password123',
  name: 'Juan'
}

const validationRules = {
  email: [
    { validator: validators.required, params: ['El email'] },
    { validator: validators.email, params: [] }
  ],
  password: [
    { validator: validators.required, params: ['La contraseña'] },
    { validator: validators.password, params: [8] }
  ],
  name: [
    { validator: validators.required, params: ['El nombre'] },
    { validator: validators.minLength, params: [2, 'El nombre'] }
  ]
}

const validation = validateForm(formData, validationRules)
console.log(validation.isValid, validation.errors)
*/
