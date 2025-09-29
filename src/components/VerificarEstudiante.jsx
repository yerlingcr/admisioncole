import React, { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

const VerificarEstudiante = () => {
  const [resultado, setResultado] = useState(null)
  const [cargando, setCargando] = useState(false)

  const verificarEstudiante = async () => {
    setCargando(true)
    try {
      console.log('🔍 VERIFICANDO ESTUDIANTE "eee"...')
      
      // 1. Obtener el intento más reciente del estudiante 'eee'
      const { data: intentos, error: errorIntentos } = await supabase
        .from('intentos_quiz')
        .select('id, estado, preguntas_correctas, preguntas_respondidas')
        .eq('estudiante_id', 'eee')
        .order('fecha_inicio', { ascending: false })
        .limit(1)
        
      if (errorIntentos) {
        throw errorIntentos
      }
      
      if (!intentos || intentos.length === 0) {
        throw new Error('No se encontraron intentos para el estudiante "eee"')
      }
      
      const intento = intentos[0]
      console.log('📊 DATOS DE intentos_quiz:', intento)
      
      // 2. Contar respuestas correctas en respuestas_estudiante
      const { data: respuestas, error: errorRespuestas } = await supabase
        .from('respuestas_estudiante')
        .select('pregunta_id, es_correcta, fecha_respuesta')
        .eq('intento_id', intento.id)
        .order('pregunta_id')
        
      if (errorRespuestas) {
        throw errorRespuestas
      }
      
      console.log('📝 DATOS DE respuestas_estudiante:', respuestas)
      
      // Analizar duplicados por pregunta_id
      const respuestasPorPregunta = {}
      respuestas.forEach((respuesta) => {
        if (!respuestasPorPregunta[respuesta.pregunta_id]) {
          respuestasPorPregunta[respuesta.pregunta_id] = []
        }
        respuestasPorPregunta[respuesta.pregunta_id].push(respuesta)
      })
      
      // Mostrar duplicados en consola
      console.log('🔍 ANÁLISIS DE DUPLICADOS:')
      Object.keys(respuestasPorPregunta).forEach(preguntaId => {
        const respuestasPregunta = respuestasPorPregunta[preguntaId]
        if (respuestasPregunta.length > 1) {
          console.log(`⚠️ Pregunta ${preguntaId} tiene ${respuestasPregunta.length} respuestas:`, respuestasPregunta)
        }
      })
      
      // Contar respuestas correctas (usando solo la última respuesta de cada pregunta)
      let correctas = 0
      let incorrectas = 0
      let preguntasUnicas = 0
      
      Object.keys(respuestasPorPregunta).forEach(preguntaId => {
        const respuestasPregunta = respuestasPorPregunta[preguntaId]
        const ultimaRespuesta = respuestasPregunta[respuestasPregunta.length - 1] // Usar la última respuesta
        
        const esCorrecta = ultimaRespuesta.es_correcta === true || ultimaRespuesta.es_correcta === 1 || ultimaRespuesta.es_correcta === 'true'
        if (esCorrecta) {
          correctas++
        } else {
          incorrectas++
        }
        preguntasUnicas++
      })
      
      const resultadoFinal = {
        intentoId: intento.id,
        estado: intento.estado,
        intentosQuizCorrectas: intento.preguntas_correctas,
        intentosQuizRespondidas: intento.preguntas_respondidas,
        respuestasEstudianteTotal: respuestas.length,
        respuestasEstudianteCorrectas: correctas,
        respuestasEstudianteIncorrectas: incorrectas,
        preguntasUnicas: preguntasUnicas,
        respuestasDuplicadas: respuestas.length - preguntasUnicas,
        diferencia: intento.preguntas_correctas - correctas,
        esConsistente: intento.preguntas_correctas === correctas
      }
      
      console.log('🔍 RESULTADO FINAL:', resultadoFinal)
      setResultado(resultadoFinal)
      
    } catch (error) {
      console.error('❌ Error:', error)
      setResultado({ error: error.message })
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">🔍 Verificar Estudiante "eee"</h1>
      
      <button 
        onClick={verificarEstudiante}
        disabled={cargando}
        className="btn btn-primary mb-6"
      >
        {cargando ? 'Verificando...' : 'Verificar Datos'}
      </button>
      
      {resultado && (
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            {resultado.error ? (
              <div className="alert alert-error">
                <span>❌ Error: {resultado.error}</span>
              </div>
            ) : (
              <>
                <h2 className="card-title text-xl mb-4">📊 Resultados de Verificación</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="stat bg-base-200 rounded-lg p-4">
                    <div className="stat-title">ID del Intento</div>
                    <div className="stat-value text-lg">{resultado.intentoId}</div>
                  </div>
                  
                  <div className="stat bg-base-200 rounded-lg p-4">
                    <div className="stat-title">Estado</div>
                    <div className="stat-value text-lg">{resultado.estado}</div>
                  </div>
                </div>
                
                <div className="divider">📊 Datos de intentos_quiz</div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="stat bg-blue-50 rounded-lg p-4">
                    <div className="stat-title">Preguntas Correctas</div>
                    <div className="stat-value text-2xl text-blue-600">{resultado.intentosQuizCorrectas}</div>
                  </div>
                  
                  <div className="stat bg-blue-50 rounded-lg p-4">
                    <div className="stat-title">Preguntas Respondidas</div>
                    <div className="stat-value text-2xl text-blue-600">{resultado.intentosQuizRespondidas}</div>
                  </div>
                </div>
                
                <div className="divider">📝 Datos de respuestas_estudiante</div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="stat bg-green-50 rounded-lg p-4">
                    <div className="stat-title">Total Respuestas</div>
                    <div className="stat-value text-2xl text-green-600">{resultado.respuestasEstudianteTotal}</div>
                  </div>
                  
                  <div className="stat bg-blue-50 rounded-lg p-4">
                    <div className="stat-title">Preguntas Únicas</div>
                    <div className="stat-value text-2xl text-blue-600">{resultado.preguntasUnicas}</div>
                  </div>
                  
                  <div className="stat bg-orange-50 rounded-lg p-4">
                    <div className="stat-title">Respuestas Duplicadas</div>
                    <div className="stat-value text-2xl text-orange-600">{resultado.respuestasDuplicadas}</div>
                  </div>
                  
                  <div className="stat bg-green-50 rounded-lg p-4">
                    <div className="stat-title">Respuestas Correctas</div>
                    <div className="stat-value text-2xl text-green-600">{resultado.respuestasEstudianteCorrectas}</div>
                  </div>
                  
                  <div className="stat bg-red-50 rounded-lg p-4">
                    <div className="stat-title">Respuestas Incorrectas</div>
                    <div className="stat-value text-2xl text-red-600">{resultado.respuestasEstudianteIncorrectas}</div>
                  </div>
                </div>
                
                <div className="divider">🔍 Comparación</div>
                
                <div className={`alert ${resultado.esConsistente ? 'alert-success' : 'alert-warning'}`}>
                  <div>
                    <h3 className="font-bold">
                      {resultado.esConsistente ? '✅ DATOS CONSISTENTES' : '⚠️ INCONSISTENCIA DETECTADA'}
                    </h3>
                    <div className="text-sm">
                      <p><strong>intentos_quiz dice:</strong> {resultado.intentosQuizCorrectas} correctas</p>
                      <p><strong>respuestas_estudiante tiene:</strong> {resultado.respuestasEstudianteCorrectas} correctas</p>
                      <p><strong>Diferencia:</strong> {resultado.diferencia} respuesta(s)</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VerificarEstudiante
