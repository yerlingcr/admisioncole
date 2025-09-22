import { useState, useEffect, useCallback } from 'react'
import { configuracionService } from '../services/configuracionService'
import { institucionService } from '../services/institucionService'

// Cache global para configuraciones
const configCache = new Map()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutos

// Función helper para verificar si el cache es válido
const isCacheValid = (key) => {
  const cached = configCache.get(key)
  if (!cached) return false
  
  const now = Date.now()
  return (now - cached.timestamp) < CACHE_DURATION
}

// Hook personalizado para cachear configuraciones
export const useConfigCache = () => {
  const [configuracion, setConfiguracion] = useState(null)
  const [informacionInstitucional, setInformacionInstitucional] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Función para obtener configuración del quiz con cache
  const getQuizConfig = useCallback(async () => {
    const cacheKey = 'quiz_config'
    
    if (isCacheValid(cacheKey)) {
      console.log('📦 Cache hit para configuración del quiz')
      return configCache.get(cacheKey).data
    }

    console.log('🔄 Cache miss para configuración del quiz, consultando...')
    try {
      const config = await configuracionService.getConfiguracionActiva()
      
      // Guardar en cache
      configCache.set(cacheKey, {
        data: config,
        timestamp: Date.now()
      })
      
      return config
    } catch (error) {
      console.error('Error obteniendo configuración:', error)
      // Retornar configuración por defecto
      return configuracionService.getConfiguracionPorDefecto()
    }
  }, [])

  // Función para obtener información institucional con cache
  const getInformacionInstitucional = useCallback(async () => {
    const cacheKey = 'institucion_info'
    
    if (isCacheValid(cacheKey)) {
      console.log('📦 Cache hit para información institucional')
      return configCache.get(cacheKey).data
    }

    console.log('🔄 Cache miss para información institucional, consultando...')
    try {
      const info = await institucionService.getInformacionActiva()
      
      // Guardar en cache
      configCache.set(cacheKey, {
        data: info,
        timestamp: Date.now()
      })
      
      return info
    } catch (error) {
      console.error('Error obteniendo información institucional:', error)
      // Retornar información por defecto
      return institucionService.getInformacionPorDefecto()
    }
  }, [])

  // Función para limpiar cache
  const clearCache = useCallback((key = null) => {
    if (key) {
      configCache.delete(key)
      console.log(`🗑️ Cache limpiado para: ${key}`)
    } else {
      configCache.clear()
      console.log('🗑️ Cache completamente limpiado')
    }
  }, [])

  // Función para cargar todas las configuraciones
  const loadConfigurations = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      // Cargar configuración e información institucional en paralelo
      const [quizConfig, institucionalInfo] = await Promise.all([
        getQuizConfig(),
        getInformacionInstitucional()
      ])

      setConfiguracion(quizConfig)
      setInformacionInstitucional(institucionalInfo)
    } catch (err) {
      console.error('Error cargando configuraciones:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [getQuizConfig, getInformacionInstitucional])

  // Cargar configuraciones al montar el componente
  useEffect(() => {
    loadConfigurations()
  }, [loadConfigurations])

  return {
    configuracion,
    informacionInstitucional,
    loading,
    error,
    loadConfigurations,
    clearCache,
    getQuizConfig,
    getInformacionInstitucional
  }
}

export default useConfigCache
