import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseConfig'
import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Pie } from 'react-chartjs-2'

// Registrar componentes de Chart.js
ChartJS.register(
  ArcElement,
  Title,
  Tooltip,
  Legend
)

const Estadisticas = () => {
  const [loading, setLoading] = useState(true)
  const [estadisticas, setEstadisticas] = useState({
    totalEstudiantes: 0,
    estudiantesActivos: 0,
    estudiantesInactivos: 0,
    totalPreguntas: 0,
    totalCategorias: 0,
    intentosRealizados: 0,
    intentosCompletados: 0,
    tasaAprobacion: 0,
    tiempoPromedio: 0,
    categoriasConEstudiantes: []
  })
  const [chartData, setChartData] = useState(null)

  const colors = {
    primary: '#4d3930',
    secondary: '#b47b21',
    accent: '#f4b100',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  }

  const loadEstadisticas = async () => {
    try {
      setLoading(true)

      // Simplificar consultas para evitar errores
      let estadisticasData = {
        totalEstudiantes: 0,
        estudiantesActivos: 0,
        estudiantesInactivos: 0,
        totalPreguntas: 0,
        totalCategorias: 0,
        intentosRealizados: 0,
        intentosCompletados: 0,
        tasaAprobacion: 0,
        tiempoPromedio: 0,
        categoriasConEstudiantes: []
      }

      try {
        // Obtener estadísticas de estudiantes
        const { data: estudiantes, error: errorEstudiantes } = await supabase
          .from('usuarios')
          .select('estado, identificacion')
          .eq('rol', 'Estudiante')

        if (!errorEstudiantes && estudiantes) {
          estadisticasData.totalEstudiantes = estudiantes.length
          estadisticasData.estudiantesActivos = estudiantes.filter(e => e.estado === 'Activo').length
          estadisticasData.estudiantesInactivos = estudiantes.filter(e => e.estado === 'Inactivo').length
        }

        // Obtener estadísticas de preguntas
        const { data: preguntas, error: errorPreguntas } = await supabase
          .from('preguntas_quiz')
          .select('id, categoria')
          .eq('activa', true)

        if (!errorPreguntas && preguntas) {
          estadisticasData.totalPreguntas = preguntas.length
          const categoriasUnicas = [...new Set(preguntas.map(p => p.categoria))]
          estadisticasData.totalCategorias = categoriasUnicas.length
        }

        // Obtener estadísticas de intentos
        const { data: intentos, error: errorIntentos } = await supabase
          .from('intentos_quiz')
          .select('*')

        if (!errorIntentos && intentos) {
          estadisticasData.intentosRealizados = intentos.length
          estadisticasData.intentosCompletados = intentos.filter(i => i.fecha_fin !== null).length
          
          // Obtener puntuación mínima de configuración
          const { data: config, error: configError } = await supabase
            .from('configuracion_quiz')
            .select('puntuacion_minima_aprobacion')
            .eq('activa', true)
            .single()
          
          const puntuacionMinima = config?.puntuacion_minima_aprobacion || 70
          
          const intentosAprobados = intentos.filter(i => 
            i.fecha_fin !== null && 
            i.puntuacion_total !== null && 
            i.puntuacion_total >= puntuacionMinima
          ).length
          
          
          estadisticasData.tasaAprobacion = estadisticasData.intentosCompletados > 0 
            ? (intentosAprobados / estadisticasData.intentosCompletados) * 100 
            : 0


          // Calcular tiempo promedio basado en fecha_inicio y fecha_fin
          const intentosConTiempo = intentos.filter(i => i.fecha_inicio && i.fecha_fin)
          estadisticasData.tiempoPromedio = intentosConTiempo.length > 0 
            ? intentosConTiempo.reduce((sum, i) => {
                const inicio = new Date(i.fecha_inicio)
                const fin = new Date(i.fecha_fin)
                return sum + Math.floor((fin - inicio) / 1000) // tiempo en segundos
              }, 0) / intentosConTiempo.length 
            : 0
        } else {
          console.error('❌ Error cargando intentos:', errorIntentos)
          console.error('❌ Detalles del error:', {
            message: errorIntentos?.message,
            details: errorIntentos?.details,
            hint: errorIntentos?.hint,
            code: errorIntentos?.code
          })
        }

        // Cargar estadísticas por categorías
        try {
          // Obtener todas las categorías
          const { data: categorias, error: errorCategorias } = await supabase
            .from('categorias_quiz')
            .select('nombre')
            .eq('activa', true)

          if (!errorCategorias && categorias) {
            const categoriasConEstadisticas = []

            for (const categoria of categorias) {
              // Contar estudiantes por categoría (solo usuarios con rol "Estudiante")
              const { data: estudiantesCategoria, error: errorEstudiantes } = await supabase
                .from('usuario_categorias')
                .select(`
                  usuario_id,
                  usuarios!inner(rol)
                `)
                .eq('categoria', categoria.nombre)
                .eq('activa', true)
                .eq('usuarios.rol', 'Estudiante')

              // Contar preguntas por categoría
              const { data: preguntasCategoria, error: errorPreguntas } = await supabase
                .from('preguntas_quiz')
                .select('id')
                .eq('categoria', categoria.nombre)
                .eq('activa', true)

              // Contar intentos por categoría (solo de estudiantes)
              const { data: intentosCategoria, error: errorIntentos } = await supabase
                .from('intentos_quiz')
                .select('id, puntuacion_total, fecha_fin, estudiante_id')
                .in('estudiante_id', estudiantesCategoria?.map(e => e.usuario_id) || [])

              const estudiantesCount = estudiantesCategoria?.length || 0
              const preguntasCount = preguntasCategoria?.length || 0
              
              // Contar estudiantes únicos que han hecho intentos (no el total de intentos)
              const estudiantesConIntentos = new Set(intentosCategoria?.map(i => i.estudiante_id) || [])
              const intentosCount = estudiantesConIntentos.size

              // Calcular tasa de aprobación para esta categoría (usando el mejor intento de cada estudiante)
              const intentosCompletados = intentosCategoria?.filter(i => i.fecha_fin !== null && i.puntuacion_total !== null) || []
              
              // Agrupar por estudiante y tomar el mejor intento de cada uno
              const mejorIntentoPorEstudiante = new Map()
              intentosCompletados.forEach(intento => {
                const estudianteId = intento.estudiante_id
                if (!mejorIntentoPorEstudiante.has(estudianteId) || 
                    intento.puntuacion_total > mejorIntentoPorEstudiante.get(estudianteId).puntuacion_total) {
                  mejorIntentoPorEstudiante.set(estudianteId, intento)
                }
              })
              
              const estudiantesConMejorIntento = Array.from(mejorIntentoPorEstudiante.values())
              const estudiantesAprobados = estudiantesConMejorIntento.filter(i => i.puntuacion_total >= 70).length

              const tasaAprobacion = estudiantesConMejorIntento.length > 0 
                ? (estudiantesAprobados / estudiantesConMejorIntento.length) * 100 
                : 0

              categoriasConEstadisticas.push({
                nombre: categoria.nombre,
                estudiantes: estudiantesCount,
                preguntas: preguntasCount,
                intentos: intentosCount,
                tasaAprobacion: tasaAprobacion
              })
            }

            estadisticasData.categoriasConEstudiantes = categoriasConEstadisticas
          }
        } catch (errorCategorias) {
          console.error('❌ Error cargando estadísticas por categorías:', errorCategorias)
        }

      } catch (queryError) {
        console.error('Error en consultas específicas:', queryError)
        // Continuar con datos por defecto
      }

      setEstadisticas(estadisticasData)

      // Cargar datos para la gráfica de rendimiento de estudiantes
      await loadChartData()


    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error)
      // Mostrar datos por defecto en caso de error
      setEstadisticas({
        totalEstudiantes: 0,
        estudiantesActivos: 0,
        estudiantesInactivos: 0,
        totalPreguntas: 0,
        totalCategorias: 0,
        intentosRealizados: 0,
        intentosCompletados: 0,
        tasaAprobacion: 0,
        tiempoPromedio: 0,
        categoriasConEstudiantes: []
      })
    } finally {
      setLoading(false)
    }
  }

  const loadChartData = async () => {
    try {

      // Obtener intentos completados con puntuaciones
      const { data: intentos, error } = await supabase
        .from('intentos_quiz')
        .select('*')
        .not('fecha_fin', 'is', null)
        .not('puntuacion_total', 'is', null)

      if (error) {
        console.error('❌ Error cargando datos de gráfica:', error)
        console.error('❌ Detalles del error:', {
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code
        })
        return
      }


      if (intentos && intentos.length > 0) {
        // Procesar datos para gráfico de pastel - contar estudiantes por categoría
        const categoriasCount = new Map()
        
        for (const intento of intentos) {
          try {
            // Obtener categoría del usuario
            const { data: categoriaData, error: errorCategoria } = await supabase
              .from('usuario_categorias')
              .select('categoria')
              .eq('usuario_id', intento.estudiante_id)
              .eq('activa', true)
              .single()

            if (errorCategoria) {
              console.error('❌ Error obteniendo categoría:', errorCategoria)
              continue
            }

            const categoria = categoriaData?.categoria || 'Sin categoría'
            
            // Contar estudiantes únicos por categoría
            if (!categoriasCount.has(categoria)) {
              categoriasCount.set(categoria, new Set())
            }
            categoriasCount.get(categoria).add(intento.estudiante_id)
          } catch (error) {
            console.error('❌ Error procesando intento:', error)
            continue
          }
        }

        // Convertir a array con conteos
        const categoriasConConteos = Array.from(categoriasCount.entries()).map(([categoria, estudiantes]) => ({
          categoria,
          cantidad: estudiantes.size
        }))

        // Ordenar por cantidad (mayor a menor)
        categoriasConConteos.sort((a, b) => b.cantidad - a.cantidad)


        // Crear datos para Chart.js (gráfico de pastel)
        const chartData = {
          labels: categoriasConConteos.map(cat => cat.categoria),
          datasets: [
            {
              label: 'Estudiantes por Categoría',
              data: categoriasConConteos.map(cat => cat.cantidad),
              backgroundColor: [
                '#10b981', // Verde
                '#3b82f6', // Azul
                '#8b5cf6', // Púrpura
                '#f59e0b', // Amarillo
                '#ef4444', // Rojo
                '#06b6d4', // Cyan
                '#84cc16', // Lima
                '#f97316', // Naranja
                '#ec4899', // Rosa
                '#6b7280', // Gris
              ],
              borderColor: colors.primary,
              borderWidth: 2,
            },
          ],
        }

        setChartData(chartData)
      }
    } catch (error) {
      console.error('Error en loadChartData:', error)
    }
  }

  useEffect(() => {
    loadEstadisticas()
  }, [])

  const formatTime = (seconds) => {
    if (!seconds) return '0:00'
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = Math.round((seconds % 60) * 100) / 100 // Redondear a 2 decimales
    return `${minutes}:${remainingSeconds.toFixed(2).padStart(5, '0')}`
  }

  const formatPercentage = (value) => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%'
    }
    return `${value.toFixed(1)}%`
  }

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            weight: 'bold'
          },
          color: colors.primary
        }
      },
      title: {
        display: true,
        text: 'Distribución de Estudiantes por Categoría',
        font: {
          size: 16,
          weight: 'bold'
        },
        color: colors.primary
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const total = context.dataset.data.reduce((a, b) => a + b, 0)
            const percentage = ((context.parsed / total) * 100).toFixed(1)
            return `${context.label}: ${context.parsed} estudiantes (${percentage}%)`
          }
        }
      }
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg" style={{ color: colors.primary }}></div>
        <p className="ml-4">Cargando estadísticas...</p>
      </div>
    )
  }


  return (
    <div className="p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2" style={{ color: colors.primary }}>
          📊 Estadísticas del Sistema
        </h2>
        <p className="text-gray-600">
          Métricas en tiempo real del sistema de admisión
        </p>
      </div>

      {/* Tarjetas de Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Estudiantes */}
        <div className="card bg-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Estudiantes</p>
                <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                  {estadisticas.totalEstudiantes}
                </p>
              </div>
              <div className="text-3xl">👥</div>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="badge badge-success badge-sm">
                {estadisticas.estudiantesActivos} Activos
              </span>
              <span className="badge badge-error badge-sm">
                {estadisticas.estudiantesInactivos} Inactivos
              </span>
            </div>
          </div>
        </div>

        {/* Total Preguntas */}
        <div className="card bg-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Preguntas</p>
                <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                  {estadisticas.totalPreguntas}
                </p>
              </div>
              <div className="text-3xl">❓</div>
            </div>
            <div className="mt-2">
              <span className="badge badge-info badge-sm">
                {estadisticas.totalCategorias} Categorías
              </span>
            </div>
          </div>
        </div>

        {/* Intentos Realizados */}
        <div className="card bg-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Intentos Realizados</p>
                <p className="text-2xl font-bold" style={{ color: colors.primary }}>
                  {estadisticas.intentosRealizados}
                </p>
              </div>
              <div className="text-3xl">📝</div>
            </div>
            <div className="mt-2">
              <span className="badge badge-warning badge-sm">
                {estadisticas.intentosCompletados} Completados
              </span>
            </div>
          </div>
        </div>

        {/* Tasa de Aprobación */}
        <div className="card bg-white shadow-lg">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tasa de Aprobación</p>
                <p className="text-2xl font-bold" style={{ color: colors.success }}>
                  {formatPercentage(estadisticas.tasaAprobacion)}
                </p>
              </div>
              <div className="text-3xl">📈</div>
            </div>
            <div className="mt-2">
              <span className="badge badge-success badge-sm">
                Tiempo Promedio: {formatTime(estadisticas.tiempoPromedio)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Gráfica de Rendimiento de Estudiantes */}
      {chartData && (
        <div className="card bg-white shadow-lg mb-8">
          <div className="card-body">
            <h3 className="card-title mb-4" style={{ color: colors.primary }}>
              📊 Rendimiento de Estudiantes
            </h3>
            <div className="w-full" style={{ height: '400px' }}>
              <Pie data={chartData} options={chartOptions} />
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Distribución de estudiantes que han completado la prueba por categoría. Los datos se actualizan en tiempo real.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas por Categorías */}
      <div className="card bg-white shadow-lg">
        <div className="card-body">
          <h3 className="card-title mb-4" style={{ color: colors.primary }}>
            📊 Estadísticas por Categorías
          </h3>
          
          {estadisticas.categoriasConEstudiantes.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th style={{ color: colors.primary }}>Categoría</th>
                    <th style={{ color: colors.primary }}>Estudiantes</th>
                    <th style={{ color: colors.primary }}>Preguntas</th>
                    <th style={{ color: colors.primary }}>Intentos</th>
                    <th style={{ color: colors.primary }}>Tasa Aprobación</th>
                  </tr>
                </thead>
                <tbody>
                  {estadisticas.categoriasConEstudiantes.map((categoria, index) => (
                    <tr key={index}>
                      <td className="font-semibold">{categoria.nombre}</td>
                      <td>
                        <span className="badge badge-info badge-sm">
                          {categoria.estudiantes}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-secondary badge-sm">
                          {categoria.preguntas}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-warning badge-sm">
                          {categoria.intentos}
                        </span>
                      </td>
                      <td>
                        <span 
                          className="badge badge-sm"
                          style={{ 
                            backgroundColor: categoria.tasaAprobacion >= 70 ? colors.success : colors.warning,
                            color: '#ffffff'
                          }}
                        >
                          {formatPercentage(categoria.tasaAprobacion)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No hay datos de categorías disponibles</p>
              <p className="text-sm text-gray-400 mt-2">
                Debug: categoriasConEstudiantes.length = {estadisticas.categoriasConEstudiantes?.length || 'undefined'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Botón de Actualizar */}
      <div className="flex justify-end mt-6">
        <button 
          onClick={async () => {
            await loadEstadisticas()
          }}
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Actualizando...
            </>
          ) : (
            <>
              🔄 Actualizar Estadísticas
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default Estadisticas
