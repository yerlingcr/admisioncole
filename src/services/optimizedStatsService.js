import { supabase } from '../lib/supabaseConfig'

class OptimizedStatsService {
  // Cache para evitar consultas repetitivas
  static cache = new Map()
  static CACHE_DURATION = 5 * 60 * 1000 // 5 minutos

  // Función helper para verificar si el cache es válido
  static isCacheValid(key) {
    const cached = this.cache.get(key)
    if (!cached) return false
    
    const now = Date.now()
    return (now - cached.timestamp) < this.CACHE_DURATION
  }

  // Función helper para obtener datos del cache o hacer consulta
  static async getCachedData(key, fetchFunction) {
    if (this.isCacheValid(key)) {
      console.log(`📦 Cache hit para: ${key}`)
      return this.cache.get(key).data
    }

    console.log(`🔄 Cache miss para: ${key}, consultando base de datos...`)
    const data = await fetchFunction()
    
    // Guardar en cache
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    })
    
    return data
  }

  // Limpiar cache específico
  static clearCache(key) {
    if (key) {
      this.cache.delete(key)
    } else {
      this.cache.clear()
    }
    console.log(`🗑️ Cache limpiado para: ${key || 'todos'}`)
  }

  // Obtener estadísticas del sistema (AdminDashboard)
  static async getSystemStats() {
    return this.getCachedData('system_stats', async () => {
      try {
        const { data, error } = await supabase
          .rpc('obtener_estadisticas_sistema')

        if (error) throw error

        // Formatear datos para compatibilidad con el componente existente
        return {
          total_usuarios: data.total_usuarios,
          total_preguntas: data.total_preguntas,
          usuarios_activos: data.usuarios_activos,
          usuarios_inactivos: data.usuarios_inactivos,
          total_intentos: data.total_intentos,
          intentos_completados: data.intentos_completados,
          promedio_puntuacion: Math.round(data.promedio_puntuacion)
        }
      } catch (error) {
        // Silenciar error de RPC no disponible para usuarios finales
        throw error
      }
    })
  }

  // Obtener datos del profesor optimizado
  static async getProfessorData(professorId) {
    return this.getCachedData(`professor_${professorId}`, async () => {
      try {
        const { data, error } = await supabase
          .rpc('obtener_datos_profesor', { p_usuario_id: professorId })

        if (error) throw error
        return data
      } catch (error) {
        // Silenciar error de RPC no disponible para usuarios finales
        throw error
      }
    })
  }

  // Obtener top estudiantes por categoría
  static async getTopStudents(categoria, limit = 10) {
    return this.getCachedData(`top_students_${categoria}_${limit}`, async () => {
      try {
        const { data, error } = await supabase
          .rpc('obtener_top_estudiantes', { 
            p_categoria: categoria, 
            p_limit: limit 
          })

        if (error) throw error
        return data
      } catch (error) {
        // Silenciar error de RPC no disponible para usuarios finales
        throw error
      }
    })
  }

  // Obtener datos del estudiante optimizado
  static async getStudentData(studentId) {
    return this.getCachedData(`student_${studentId}`, async () => {
      try {
        const { data, error } = await supabase
          .rpc('obtener_datos_estudiante', { p_estudiante_id: studentId })

        if (error) throw error
        return data
      } catch (error) {
        // Silenciar error de RPC no disponible para usuarios finales
        throw error
      }
    })
  }

  // Invalidar cache cuando se hacen cambios
  static invalidateCacheOnChange(changeType, affectedIds = []) {
    switch (changeType) {
      case 'user_created':
      case 'user_updated':
      case 'user_deleted':
        this.clearCache('system_stats')
        affectedIds.forEach(id => {
          this.clearCache(`student_${id}`)
          this.clearCache(`professor_${id}`)
        })
        break
      
      case 'question_created':
      case 'question_updated':
      case 'question_deleted':
        this.clearCache('system_stats')
        this.cache.forEach((_, key) => {
          if (key.startsWith('professor_')) {
            this.clearCache(key)
          }
        })
        break
      
      case 'quiz_completed':
        this.clearCache('system_stats')
        affectedIds.forEach(id => {
          this.clearCache(`student_${id}`)
        })
        // Limpiar cache de top students para todas las categorías
        this.cache.forEach((_, key) => {
          if (key.startsWith('top_students_')) {
            this.clearCache(key)
          }
        })
        break
    }
  }
}

export default OptimizedStatsService
