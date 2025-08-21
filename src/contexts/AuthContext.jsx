import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseConfig'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Verificar si hay una sesión activa al cargar la app
  useEffect(() => {
    checkSession()
  }, [])

  const checkSession = async () => {
    try {
      const userInfo = localStorage.getItem('userInfo')
      if (!userInfo) {
        setIsAuthenticated(false)
        return false
      }

      // Restaurar usuario desde localStorage
      const userData = JSON.parse(userInfo)
      setUser({
        identificacion: userData.identificacion,
        nombre: userData.nombre,
        primer_apellido: userData.primer_apellido,
        segundo_apellido: userData.segundo_apellido,
        rol: userData.rol
      })
      setIsAuthenticated(true)
      return true
    } catch (error) {
      console.error('Error verificando sesión:', error)
      setIsAuthenticated(false)
      return false
    }
  }

  const login = async (identificacion, password) => {
    try {
      setLoading(true)
      
      console.log('🔍 Intentando login con:', { identificacion, password })

      // Login directo a la tabla usuarios (sin funciones RPC)
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('identificacion', identificacion)
        .limit(1)

      console.log('📡 Respuesta de Supabase:', { data, error })
      console.log('📊 Datos recibidos:', JSON.stringify(data, null, 2))
      
      if (error) {
        throw new Error('Error en la validación: ' + error.message)
      }

      if (data && data.length > 0) {
        const userData = data[0] // Tomar el primer usuario del array
        console.log('🔍 Usuario encontrado:', userData)
        
        // Verificar contraseña en JavaScript
        if (userData.password !== password) {
          return {
            success: false,
            message: 'Contraseña incorrecta'
          }
        }
        
        // Crear datos de sesión
        const sessionData = {
          identificacion: userData.identificacion,
          nombre: userData.nombre,
          primer_apellido: userData.primer_apellido,
          segundo_apellido: userData.segundo_apellido,
          rol: userData.rol,
          token: Date.now().toString()
        }
        
        // Guardar en localStorage
        localStorage.setItem('sessionToken', sessionData.token)
        localStorage.setItem('userInfo', JSON.stringify(sessionData))
        
        // Actualizar estado
        setUser({
          identificacion: userData.identificacion,
          nombre: userData.nombre,
          primer_apellido: userData.primer_apellido,
          segundo_apellido: userData.segundo_apellido,
          rol: userData.rol
        })
        setIsAuthenticated(true)
        
        return {
          success: true,
          message: 'Login exitoso',
          user: {
            identificacion: userData.identificacion,
            rol: userData.rol
          }
        }
      } else {
        return {
          success: false,
          message: 'Usuario no encontrado o contraseña incorrecta'
        }
      }
    } catch (error) {
      console.error('Error en login:', error)
      return {
        success: false,
        message: 'Error interno del sistema: ' + error.message
      }
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      // Limpiar estado local
      localStorage.removeItem('sessionToken')
      localStorage.removeItem('userInfo')
      setUser(null)
      setIsAuthenticated(false)
    } catch (error) {
      console.error('Error cerrando sesión:', error)
    }
  }

  const getUserInfo = async () => {
    if (!user) return null
    
    // Retornar información del usuario desde el estado local
    return {
      identificacion: user.identificacion,
      nombre: user.nombre,
      primer_apellido: user.primer_apellido,
      segundo_apellido: user.segundo_apellido,
      rol: user.rol
    }
  }

  const checkIsAuthenticated = () => {
    return !!user
  }

  // Restaurar sesión al montar la aplicación
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const userInfo = localStorage.getItem('userInfo')
        const sessionToken = localStorage.getItem('sessionToken')
        
        if (userInfo && sessionToken) {
          const userData = JSON.parse(userInfo)
          setUser({
            identificacion: userData.identificacion,
            nombre: userData.nombre,
            primer_apellido: userData.primer_apellido,
            segundo_apellido: userData.segundo_apellido,
            rol: userData.rol
          })
          setIsAuthenticated(true)
          console.log('✅ Sesión restaurada desde localStorage')
        }
      } catch (error) {
        console.error('Error restaurando sesión:', error)
        // Limpiar datos corruptos
        localStorage.removeItem('userInfo')
        localStorage.removeItem('sessionToken')
      }
    }

    restoreSession()
  }, [])

  const hasRole = (role) => {
    return user && user.rol === role
  }

  const hasAnyRole = (roles) => {
    return user && roles.includes(user.rol)
  }

  const value = {
    user,
    loading,
    isAuthenticated,
    login,
    logout,
    checkSession,
    getUserInfo,
    checkIsAuthenticated,
    hasRole,
    hasAnyRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
