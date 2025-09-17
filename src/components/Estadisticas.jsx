import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseConfig'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
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
      console.log('📊 Cargando estadísticas...')

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
        console.log('🔍 Iniciando consulta de intentos...')
        const { data: intentos, error: errorIntentos } = await supabase
          .from('intentos_quiz')
          .select('*')

        if (!errorIntentos && intentos) {
          console.log('📊 Intentos encontrados:', intentos.length)
          console.log('📊 Intentos con datos:', intentos)
          
          estadisticasData.intentosRealizados = intentos.length
          estadisticasData.intentosCompletados = intentos.filter(i => i.fecha_fin !== null).length
          
          console.log('📊 Intentos completados:', estadisticasData.intentosCompletados)
          
          // Obtener puntuación mínima de configuración
          const { data: config, error: configError } = await supabase
            .from('configuracion_quiz')
            .select('puntuacion_minima_aprobacion')
            .eq('activa', true)
            .single()
          
          const puntuacionMinima = config?.puntuacion_minima_aprobacion || 70
          console.log('📊 Puntuación mínima para aprobar:', puntuacionMinima)
          
          const intentosAprobados = intentos.filter(i => 
            i.fecha_fin !== null && 
            i.puntuacion_total !== null && 
            i.puntuacion_total >= puntuacionMinima
          ).length
          
          console.log('📊 Intentos aprobados:', intentosAprobados)
          
          estadisticasData.tasaAprobacion = estadisticasData.intentosCompletados > 0 
            ? (intentosAprobados / estadisticasData.intentosCompletados) * 100 
            : 0

          console.log('📊 Tasa de aprobación calculada:', estadisticasData.tasaAprobacion)

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

      } catch (queryError) {
        console.error('Error en consultas específicas:', queryError)
        // Continuar con datos por defecto
      }

      setEstadisticas(estadisticasData)

      // Cargar datos para la gráfica de rendimiento de estudiantes
      await loadChartData()

      console.log('✅ Estadísticas cargadas correctamente')
      console.log('📊 Datos finales de estadísticas:', estadisticasData)

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
      console.log('📊 Cargando datos para gráfica...')

      // Obtener intentos completados con puntuaciones
      const { data: intentos, error } = await supabase
        .from('intentos_quiz')
        .select(`
          puntuacion_total,
          estudiante_id,
          fecha_inicio,
          fecha_fin,
          usuarios!inner(
            nombre,
            primer_apellido,
            identificacion
          )
        `)
        .not('fecha_fin', 'is', null)
        .not('puntuacion_total', 'is', null)

      if (error) {
        console.error('Error cargando datos de gráfica:', error)
        return
      }

      if (intentos && intentos.length > 0) {
        // Procesar datos para la gráfica
        const estudiantesConPuntuaciones = intentos.map(intento => ({
          nombre: `${intento.usuarios.nombre} ${intento.usuarios.primer_apellido}`,
          identificacion: intento.usuarios.identificacion,
          puntuacion: intento.puntuacion_total
        }))

        // Ordenar por puntuación (mayor a menor)
        estudiantesConPuntuaciones.sort((a, b) => b.puntuacion - a.puntuacion)

        // Tomar los primeros 10 estudiantes para la gráfica
        const topEstudiantes = estudiantesConPuntuaciones.slice(0, 10)

        // Crear datos para Chart.js
        const chartData = {
          labels: topEstudiantes.map(est => `${est.nombre} (${est.identificacion})`),
          datasets: [
            {
              label: 'Puntuación (%)',
              data: topEstudiantes.map(est => est.puntuacion),
              backgroundColor: [
                '#10b981', // Verde para el primero
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
        console.log('📊 Datos de gráfica cargados:', chartData)
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
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const formatPercentage = (value) => {
    console.log('🔢 Formateando porcentaje:', value, 'Tipo:', typeof value)
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%'
    }
    return `${value.toFixed(1)}%`
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Top 10 Estudiantes por Puntuación',
        font: {
          size: 16,
          weight: 'bold'
        },
        color: colors.primary
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `Puntuación: ${context.parsed.y}%`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Puntuación (%)',
          color: colors.primary,
          font: {
            weight: 'bold'
          }
        },
        ticks: {
          color: colors.primary,
          callback: function(value) {
            return value + '%'
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Estudiantes',
          color: colors.primary,
          font: {
            weight: 'bold'
          }
        },
        ticks: {
          color: colors.primary,
          maxRotation: 45,
          minRotation: 45
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

  // Debug temporal
  console.log('🔍 Estado actual:', { loading, estadisticas })

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
              <Bar data={chartData} options={chartOptions} />
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-600">
                Mostrando los 10 estudiantes con mejor puntuación. Los datos se actualizan en tiempo real.
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
