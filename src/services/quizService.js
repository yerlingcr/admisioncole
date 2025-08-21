import { supabase } from '../lib/supabaseConfig'

class QuizService {
  // Obtener configuración del quiz
  async getQuizConfig() {
    try {
      const { data, error } = await supabase
        .from('configuracion_quiz')
        .select('*')
        .eq('activa', true)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error obteniendo configuración del quiz:', error)
      throw error
    }
  }

  // Obtener preguntas aleatorias para el quiz
  async getQuizQuestions(totalQuestions = 5, categoria = null) {
    try {
      // Usar la función personalizada de Supabase
      const { data, error } = await supabase
        .rpc('obtener_preguntas_quiz', {
          p_total_preguntas: totalQuestions,
          p_categoria: categoria
        })

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error obteniendo preguntas del quiz:', error)
      // Fallback: obtener preguntas manualmente
      return this.getQuizQuestionsFallback(totalQuestions, categoria)
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

      console.log('Datos brutos de preguntas:', data)

      // Procesar y aleatorizar las preguntas
      const processedQuestions = data
        .map(q => {
          console.log('Procesando pregunta:', q)
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

      console.log('Preguntas procesadas:', processedQuestions)
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
      console.log('Iniciando verificación para estudiante:', estudianteId)
      
      // Primero verificar que las tablas existan
      try {
        const { data: configData, error: configError } = await supabase
          .from('configuracion_quiz')
          .select('*')
          .eq('activa', true)
          .limit(1)
        
        if (configError) {
          console.error('Error accediendo a configuracion_quiz:', configError)
          return {
            canTake: false,
            reason: 'Error de configuración del sistema'
          }
        }
        
        console.log('Configuración encontrada:', configData)
      } catch (tableError) {
        console.error('Error verificando tablas:', tableError)
        return {
          canTake: false,
          reason: 'Sistema de quiz no disponible'
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
}

export default new QuizService()
