import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Crear cliente de Supabase
let supabaseClient

// Usar valores por defecto para evitar problemas de deploy
supabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
)

export const supabase = supabaseClient

// Funciones útiles para Supabase
export const supabaseHelpers = {
  // Función para manejar errores de Supabase
  handleError: (error) => {
    console.error('Error de Supabase:', error)
    return {
      success: false,
      error: error.message,
      details: error
    }
  },

  // Función para manejar respuestas exitosas
  handleSuccess: (data) => {
    return {
      success: true,
      data,
      error: null
    }
  },

  // Función para verificar si el usuario está autenticado
  isAuthenticated: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      return !!user
    } catch (error) {
      return false
    }
  },

  // Función para obtener el usuario actual
  getCurrentUser: async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error) throw error
      return user
    } catch (error) {
      return null
    }
  }
}

// Configuración de temas para la aplicación
export const appConfig = {
  name: 'Admisión 2025',
  version: '1.0.0',
  description: 'Sistema de admisión para el año 2025',
  features: [
    'Autenticación de usuarios',
    'Gestión de formularios',
    'Base de datos en tiempo real',
    'Interfaz responsive',
    'Múltiples temas'
  ]
}
