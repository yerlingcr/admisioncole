import { supabase } from '../lib/supabaseConfig'
import { configuracionService } from './configuracionService'
import usuarioCategoriasService from './usuarioCategoriasService'

class QuizService {
  // Obtener configuración del quiz
  async getQuizConfig(categoriaEstudiante = null) {
    try {
      // Usar el nuevo servicio de configuración con la categoría específica
      const config = await configuracionService.getConfiguracionActiva(categoriaEstudiante)
      return config
    } catch (error) {
      console.error('Error obteniendo configuración del quiz:', error)
      // Retornar configuración por defecto si hay error
      return configuracionService.getConfiguracionPorDefecto()
    }
  }

  // Obtener preguntas aleatorias para el quiz
  async getQuizQuestions(totalQuestions = 5, categoria = null, usuarioId = null) {
    try {
      // Si se proporciona usuarioId, obtener sus categorías asignadas
      let categoriasUsuario = []
      if (usuarioId) {
        categoriasUsuario = await usuarioCategoriasService.getCategoriasByUsuario(usuarioId)
      }

      // Si el usuario tiene categorías asignadas, usar solo esas
      // Si no tiene categorías asignadas, usar todas las categorías
      if (categoriasUsuario.length > 0) {
        return this.getQuizQuestionsByCategorias(totalQuestions, categoriasUsuario)
      } else {
        // Usar la función original si no hay categorías específicas
        const { data, error } = await supabase
          .rpc('obtener_preguntas_quiz', {
            p_total_preguntas: totalQuestions,
            p_categoria: categoria
          })

        if (error) throw error
        return data
      }
    } catch (error) {
      console.error('Error obteniendo preguntas del quiz:', error)
      // Fallback: obtener preguntas manualmente
      return this.getQuizQuestionsFallback(totalQuestions, categoria)
    }
  }

  // Obtener preguntas de categorías específicas del usuario
  async getQuizQuestionsByCategorias(totalQuestions, categoriasUsuario) {
    try {
      let query = supabase
        .from('preguntas_quiz')
        .select(`
          id,
          pregunta,
          imagen_url,
          categoria,
          nivel_dificultad,
          opciones_respuesta (
            id,
            texto_opcion,
            es_correcta,
            orden_mostrar
          )
        `)
        .eq('activa', true)
        .in('categoria', categoriasUsuario)

      const { data, error } = await query

      if (error) throw error


      // Procesar las preguntas
      const processedQuestions = data
        .map(q => ({
          id: q.id,
          pregunta: q.pregunta,
          imagen_url: q.imagen_url,
          categoria: q.categoria,
          nivel_dificultad: q.nivel_dificultad,
          opciones: this.aleatorizarOpciones(q.opciones_respuesta.filter(o => o.activa !== false))
        }))
      
      // Aleatorizar orden de preguntas usando Fisher-Yates
      const preguntasAleatorias = this.aleatorizarArray(processedQuestions)
      
      // Tomar solo el número de preguntas solicitado
      const preguntasSeleccionadas = preguntasAleatorias.slice(0, totalQuestions)

      return preguntasSeleccionadas
    } catch (error) {
      console.error('Error obteniendo preguntas por categorías:', error)
      throw error
    }
  }

  // Fallback si la función RPC no funciona
  async getQuizQuestionsFallback(totalQuestions = 5, categoria = null) {
    try {
      let query = supabase
        .from('preguntas_quiz')
        .select(`
          id,
          pregunta,
          imagen_url,
          categoria,
          nivel_dificultad,
          opciones_respuesta (
            id,
            texto_opcion,
            es_correcta,
            orden_mostrar
          )
        `)
        .eq('activa', true)
        .order('orden_mostrar')

      if (categoria) {
        query = query.eq('categoria', categoria)
      }

      const { data, error } = await query

      if (error) throw error


      // Procesar y aleatorizar las preguntas
      const processedQuestions = data
        .map(q => {
          return {
            id: q.id,
            pregunta: q.pregunta,
            imagen_url: q.imagen_url,
            categoria: q.categoria,
            nivel_dificultad: q.nivel_dificultad,
            opciones: q.opciones_respuesta
              .filter(o => o.activa !== false)
              .sort((a, b) => a.orden_mostrar - b.orden_mostrar)
                              .map(o => ({
                  id: o.id.toString(),
                  texto_opcion: o.texto,  // ← Cambiado de o.texto_opcion a o.texto
                  es_correcta: o.es_correcta
                }))
          }
        })
        .sort(() => Math.random() - 0.5) // Aleatorizar orden
        .slice(0, totalQuestions)

      return processedQuestions
    } catch (error) {
      console.error('Error en fallback de preguntas:', error)
      throw error
    }
  }

  // Crear un nuevo intento de quiz
  async createQuizAttempt(estudianteId) {
    try {
      const { data, error } = await supabase
        .from('intentos_quiz')
        .insert({
          estudiante_id: estudianteId,
          estado: 'En Progreso',
          fecha_inicio: new Date().toISOString()
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error creando intento de quiz:', error)
      throw error
    }
  }

  // Verificar si el estudiante ya tiene un intento activo
  async checkActiveAttempt(estudianteId) {
    try {
      const { data, error } = await supabase
        .from('intentos_quiz')
        .select('*')
        .eq('estudiante_id', estudianteId)
        .eq('estado', 'En Progreso')
        .order('fecha_inicio', { ascending: false })
        .limit(1)

      if (error) throw error
      return data.length > 0 ? data[0] : null
    } catch (error) {
      console.error('Error verificando intento activo:', error)
      throw error
    }
  }

  // Recuperar intento en progreso con respuestas
  async getActiveAttemptWithAnswers(estudianteId) {
    try {
      const { data, error } = await supabase
        .from('intentos_quiz')
        .select(`
          *,
          respuestas_estudiante (
            pregunta_id,
            opcion_seleccionada_id,
            es_correcta
          )
        `)
        .eq('estudiante_id', estudianteId)
        .eq('estado', 'En Progreso')
        .order('fecha_inicio', { ascending: false })
        .limit(1)

      if (error) throw error
      return data.length > 0 ? data[0] : null
    } catch (error) {
      console.error('Error recuperando intento activo:', error)
      throw error
    }
  }

  // Guardar respuesta del estudiante
  async saveStudentAnswer(intentoId, preguntaId, opcionSeleccionadaId, tiempoRespuesta, esCorrecta) {
    try {
      const { data, error } = await supabase
        .from('respuestas_estudiante')
        .insert({
          intento_id: intentoId,
          pregunta_id: preguntaId,
          opcion_seleccionada_id: opcionSeleccionadaId,
          tiempo_respuesta_segundos: tiempoRespuesta,
          es_correcta: esCorrecta
        })
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error guardando respuesta del estudiante:', error)
      throw error
    }
  }

  // Finalizar intento de quiz
  async finishQuizAttempt(intentoId, tiempoTotal, puntuacionTotal, preguntasRespondidas, preguntasCorrectas) {
    try {
      const { data, error } = await supabase
        .from('intentos_quiz')
        .update({
          estado: 'Completado',
          fecha_fin: new Date().toISOString(),
          tiempo_total_segundos: tiempoTotal,
          puntuacion_total: puntuacionTotal,
          preguntas_respondidas: preguntasRespondidas,
          preguntas_correctas: preguntasCorrectas
        })
        .eq('id', intentoId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error finalizando intento de quiz:', error)
      throw error
    }
  }

  // Obtener historial de intentos del estudiante
  async getStudentAttempts(estudianteId) {
    try {
      const { data, error } = await supabase
        .from('intentos_quiz')
        .select(`
          *,
          respuestas_estudiante (
            pregunta_id,
            opcion_seleccionada_id,
            es_correcta,
            tiempo_respuesta_segundos
          )
        `)
        .eq('estudiante_id', estudianteId)
        .order('fecha_inicio', { ascending: false })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error obteniendo historial de intentos:', error)
      throw error
    }
  }

  // Obtener estadísticas del quiz
  async getQuizStats() {
    try {
      const { data, error } = await supabase
        .from('intentos_quiz')
        .select('estado, puntuacion_total, preguntas_correctas')
        .eq('estado', 'Completado')

      if (error) throw error

      const stats = {
        totalAttempts: data.length,
        averageScore: data.length > 0 
          ? Math.round(data.reduce((sum, attempt) => sum + attempt.puntuacion_total, 0) / data.length)
          : 0,
        totalCorrectAnswers: data.reduce((sum, attempt) => sum + attempt.preguntas_correctas, 0),
        completionRate: data.length > 0 ? 100 : 0
      }

      return stats
    } catch (error) {
      console.error('Error obteniendo estadísticas del quiz:', error)
      throw error
    }
  }

  // Verificar si el estudiante puede realizar el quiz
  async canStudentTakeQuiz(estudianteId) {
    try {
      
      // Obtener categoría del estudiante
      let categoriaEstudiante = null
      try {
        const categorias = await usuarioCategoriasService.getCategoriasByUsuario(estudianteId)
        if (categorias && categorias.length > 0) {
          categoriaEstudiante = categorias[0] // Usar la primera categoría asignada
        }
      } catch (error) {
        console.log('No se pudo obtener categoría del estudiante para verificación')
      }

      // Verificar configuración del sistema (específica para la categoría)
      try {
        const config = await configuracionService.getConfiguracionActiva(categoriaEstudiante)
        
        if (!config) {
          return {
            canTake: false,
            reason: 'No hay configuración activa del sistema'
          }
        }
      } catch (configError) {
        console.error('Error verificando configuración:', configError)
        return {
          canTake: false,
          reason: 'Error de configuración del sistema'
        }
      }

      // Verificar si ya tiene un intento activo
      try {
        const activeAttempt = await this.checkActiveAttempt(estudianteId)
        if (activeAttempt) {
          return {
            canTake: true,
            reason: 'Tienes un quiz en progreso',
            attemptId: activeAttempt.id,
            hasActiveAttempt: true
          }
        }
      } catch (attemptError) {
        console.error('Error verificando intentos activos:', attemptError)
        // Continuar con la verificación
      }

      // Permitir que todos los estudiantes tomen el quiz
      return { canTake: true, hasActiveAttempt: false }
    } catch (error) {
      console.error('Error verificando si el estudiante puede realizar el quiz:', error)
      throw error
    }
  }

  // Función para aleatorizar arrays usando algoritmo Fisher-Yates
  aleatorizarArray(array) {
    if (!array || array.length === 0) return []
    
    // Crear una copia del array para no modificar el original
    const arrayAleatorio = [...array]
    
    // Algoritmo Fisher-Yates para aleatorización más robusta
    for (let i = arrayAleatorio.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[arrayAleatorio[i], arrayAleatorio[j]] = [arrayAleatorio[j], arrayAleatorio[i]]
    }
    
    return arrayAleatorio
  }

  // Función para aleatorizar las opciones de respuesta
  aleatorizarOpciones(opciones) {
    if (!opciones || opciones.length === 0) return []
    
    // Usar la función aleatorizarArray para las opciones
    const opcionesAleatorias = this.aleatorizarArray(opciones)
    
    // Mapear a la estructura esperada
    return opcionesAleatorias.map(o => ({
      id: o.id.toString(),
      texto_opcion: o.texto_opcion,
      es_correcta: o.es_correcta
    }))
  }

  // Función para resetear oportunidades de un estudiante
  async resetearOportunidadesEstudiante(estudianteId) {
    try {
      
      // 1. Primero obtener todos los intentos del estudiante para eliminar sus respuestas
      const { data: intentos, error: errorIntentos } = await supabase
        .from('intentos_quiz')
        .select('id, fecha_fin, estado')
        .eq('estudiante_id', estudianteId)

      if (errorIntentos) {
        console.error('Error obteniendo intentos:', errorIntentos)
        throw errorIntentos
      }


      // 2. Eliminar todas las respuestas relacionadas con estos intentos
      if (intentos && intentos.length > 0) {
        const intentoIds = intentos.map(intento => intento.id)
        
        const { error: errorRespuestas } = await supabase
          .from('respuestas_estudiante')
          .delete()
          .in('intento_id', intentoIds)

        if (errorRespuestas) {
          console.error('Error eliminando respuestas:', errorRespuestas)
          throw errorRespuestas
        }
      }

      // 3. Eliminar todos los intentos del estudiante
      const { error: errorEliminarIntentos } = await supabase
        .from('intentos_quiz')
        .delete()
        .eq('estudiante_id', estudianteId)

      if (errorEliminarIntentos) {
        console.error('Error eliminando intentos:', errorEliminarIntentos)
        throw errorEliminarIntentos
      }

      // 4. Verificar que se eliminaron todos los intentos
      const { data: intentosRestantes, error: errorVerificacion } = await supabase
        .from('intentos_quiz')
        .select('id')
        .eq('estudiante_id', estudianteId)

      if (errorVerificacion) {
        console.error('Error verificando eliminación:', errorVerificacion)
      } else {
      }

      return { success: true }
    } catch (error) {
      console.error('❌ Error reseteando oportunidades:', error)
      return { success: false, error: error.message }
    }
  }
}

export default new QuizService()
