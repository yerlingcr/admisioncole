import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import usuarioCategoriasService from '../services/usuarioCategoriasService'

const ProfesorDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categoriaAsignada, setCategoriaAsignada] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    totalPreguntas: 0,
    preguntasCreadas: 0,
    totalEstudiantes: 0,
    estudiantesActivos: 0
  })
  const [preguntasCategoria, setPreguntasCategoria] = useState([])
  const [estudiantesCategoria, setEstudiantesCategoria] = useState([])
  const [notasEstudiantes, setNotasEstudiantes] = useState([])
  const [loadingNotas, setLoadingNotas] = useState(false)

  useEffect(() => {
    loadUserInfo()
  }, [])

  useEffect(() => {
    if (categoriaAsignada && userInfo) {
      loadEstadisticas(categoriaAsignada)
      loadNotasEstudiantes()
    }
  }, [categoriaAsignada, userInfo])

  const loadUserInfo = async () => {
    try {
      if (user && user.identificacion) {
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('identificacion', user.identificacion)
          .single()
        
        if (error) throw error
        if (userData) {
          setUserInfo(userData)
          
          // Cargar categoría asignada al profesor
          await loadCategoriaAsignada(userData.identificacion)
        }
      }
    } catch (error) {
      console.error('Error cargando información del usuario:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategoriaAsignada = async (identificacion) => {
    try {
      console.log('🔍 Cargando categorías para:', identificacion)
      const categorias = await usuarioCategoriasService.getCategoriasByUsuario(identificacion)
      console.log('📚 Categorías obtenidas:', categorias)
      
      if (categorias && categorias.length > 0 && categorias[0]) {
        console.log('✅ Primera categoría:', categorias[0])
        setCategoriaAsignada(categorias[0])
        
        // La categoría puede venir como string o como objeto
        const nombreCategoria = typeof categorias[0] === 'string' ? categorias[0] : categorias[0].nombre
        console.log('📝 Nombre de categoría a usar:', nombreCategoria)
        
        if (nombreCategoria) {
          setCategoriaAsignada(nombreCategoria)
        }
      } else {
        console.log('❌ No se encontraron categorías')
      }
    } catch (error) {
      console.error('Error cargando categoría asignada:', error)
    }
  }

  const loadEstadisticas = async (categoria) => {
    try {
      console.log('📊 Cargando estadísticas para categoría:', categoria)
      console.log('👤 Usuario para estadísticas:', userInfo?.identificacion)
      
      // Cargar todas las preguntas de la categoría
      const { data: preguntasData, count: totalPreguntas } = await supabase
        .from('preguntas_quiz')
        .select('*', { count: 'exact' })
        .eq('categoria', categoria)
        .eq('activa', true)
        .order('fecha_creacion', { ascending: false })

      console.log('📚 Preguntas encontradas:', totalPreguntas, preguntasData)

      // Contar preguntas creadas por este profesor
      const { data: preguntasCreadasData, count: preguntasCreadas } = await supabase
        .from('preguntas_quiz')
        .select('*', { count: 'exact' })
        .eq('usuario_creador', userInfo?.identificacion)
        .eq('categoria', categoria)

      console.log('👨‍🏫 Preguntas creadas por profesor:', preguntasCreadas, 'Usuario:', userInfo?.identificacion)
      console.log('📝 Datos de preguntas creadas:', preguntasCreadasData)
      console.log('🔍 Categoría buscada:', categoria)
      console.log('🔍 Usuario completo:', userInfo)

      // Cargar estudiantes de la categoría con sus datos completos
      const { data: estudiantesCategoriaData } = await supabase
        .from('usuario_categorias')
        .select(`
          usuario_id,
          usuarios!inner(
            identificacion,
            nombre,
            primer_apellido,
            segundo_apellido,
            email,
            estado,
            rol
          )
        `)
        .eq('categoria', categoria)
        .eq('activa', true)
        .eq('usuarios.rol', 'Estudiante')

      const estudiantesCategoria = estudiantesCategoriaData?.map(item => item.usuarios) || []
      const totalEstudiantes = estudiantesCategoria.length

      console.log('👥 Estudiantes encontrados:', totalEstudiantes, estudiantesCategoria.map(e => e.identificacion))

      // Contar estudiantes activos (estado = 'Activo')
      const estudiantesActivosCount = estudiantesCategoria.filter(e => e.estado === 'Activo').length

      console.log('👥 Estudiantes activos (estado):', estudiantesActivosCount)

      console.log('📊 Estadísticas finales:', {
        totalPreguntas: totalPreguntas || 0,
        preguntasCreadas: preguntasCreadas || 0,
        totalEstudiantes,
        estudiantesActivos: estudiantesActivosCount
      })

      setEstadisticas({
        totalPreguntas: totalPreguntas || 0,
        preguntasCreadas: preguntasCreadas || 0,
        totalEstudiantes,
        estudiantesActivos: estudiantesActivosCount
      })

      setPreguntasCategoria(preguntasData || [])
      setEstudiantesCategoria(estudiantesCategoria)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  const loadNotasEstudiantes = async () => {
    if (!categoriaAsignada) return
    
    try {
      setLoadingNotas(true)
      console.log('📊 Cargando notas de estudiantes para categoría:', categoriaAsignada)
      
      // Obtener puntuación mínima de configuración
      const { data: config, error: configError } = await supabase
        .from('configuracion_quiz')
        .select('puntuacion_minima_aprobacion')
        .eq('activa', true)
        .single()
      
      const puntuacionMinima = config?.puntuacion_minima_aprobacion || 70
      console.log('📊 Puntuación mínima para aprobar:', puntuacionMinima)
      
      // Obtener estudiantes de la categoría del profesor
      const { data: estudiantesCategoria, error: errorEstudiantes } = await supabase
        .from('usuario_categorias')
        .select(`
          usuario_id,
          usuarios!inner(identificacion, nombre, primer_apellido, segundo_apellido, rol)
        `)
        .eq('categoria', categoriaAsignada)
        .eq('activa', true)
        .eq('usuarios.rol', 'Estudiante')

      if (errorEstudiantes) {
        console.error('❌ Error cargando estudiantes:', errorEstudiantes)
        return
      }

      console.log('👥 Estudiantes encontrados:', estudiantesCategoria?.length || 0)

      if (!estudiantesCategoria || estudiantesCategoria.length === 0) {
        setNotasEstudiantes([])
        return
      }

      // Obtener intentos de los estudiantes
      const estudianteIds = estudiantesCategoria.map(e => e.usuario_id)
      const { data: intentos, error: errorIntentos } = await supabase
        .from('intentos_quiz')
        .select('estudiante_id, puntuacion_total, fecha_fin')
        .in('estudiante_id', estudianteIds)
        .not('fecha_fin', 'is', null)
        .not('puntuacion_total', 'is', null)

      if (errorIntentos) {
        console.error('❌ Error cargando intentos:', errorIntentos)
        return
      }

      console.log('📝 Intentos encontrados:', intentos?.length || 0)

      // Procesar datos para obtener la mejor nota de cada estudiante
      const notasConEstudiantes = estudiantesCategoria.map(estudiante => {
        const intentosEstudiante = intentos?.filter(i => i.estudiante_id === estudiante.usuario_id) || []
        
        // Obtener la mejor puntuación del estudiante
        const mejorIntento = intentosEstudiante.reduce((mejor, actual) => {
          return actual.puntuacion_total > mejor.puntuacion_total ? actual : mejor
        }, { puntuacion_total: 0 })

        return {
          identificacion: estudiante.usuarios.identificacion,
          nombre: estudiante.usuarios.nombre,
          primer_apellido: estudiante.usuarios.primer_apellido,
          segundo_apellido: estudiante.usuarios.segundo_apellido,
          notaObtenida: mejorIntento.puntuacion_total || 0,
          intentosRealizados: intentosEstudiante.length,
          puntuacionMinima: puntuacionMinima
        }
      })

      // Ordenar por nota obtenida (mayor a menor)
      notasConEstudiantes.sort((a, b) => b.notaObtenida - a.notaObtenida)

      setNotasEstudiantes(notasConEstudiantes)
      console.log('📊 Notas cargadas:', notasConEstudiantes)
      
    } catch (error) {
      console.error('❌ Error cargando notas:', error)
    } finally {
      setLoadingNotas(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return <LoadingSpinner text="Cargando dashboard del profesor..." />
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-amber-900 to-slate-800 flex items-center justify-center">
        <div className="alert alert-error">
          <span>Error cargando información del usuario</span>
        </div>
      </div>
    )
  }

  // Removemos la verificación de categoría - el profesor puede acceder sin categoría asignada

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard Profesor</h1>
              <span className="badge bg-blue-600 text-white border-0">
                👤 {userInfo?.nombre || 'Usuario'} {userInfo?.primer_apellido || ''}
              </span>
              {categoriaAsignada && (
                <span className="badge bg-amber-600 text-white border-0">
                  📚 {typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}
                </span>
              )}
              {!categoriaAsignada && (
                <span className="badge bg-gray-500 text-white border-0">
                  ⚠️ Sin categoría asignada
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm text-gray-600 hover:bg-gray-100"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => navigate('/profesor/dashboard')}
              className="py-4 px-1 border-b-2 border-amber-500 text-amber-600 font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/profesor/gestion-preguntas')}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Mis Preguntas
            </button>
            <button
              onClick={() => navigate('/profesor/gestion-estudiantes')}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Mis Estudiantes
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">📚</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Preguntas de Categoría</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {categoriaAsignada ? estadisticas.totalPreguntas : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-lg">✏️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Mis Preguntas</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {categoriaAsignada ? estadisticas.preguntasCreadas : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-lg">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Estudiantes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {categoriaAsignada ? estadisticas.totalEstudiantes : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-lg">✅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Estudiantes Activos</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {categoriaAsignada ? estadisticas.estudiantesActivos : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información de la Categoría - Solo mostrar si hay categoría asignada */}
        {categoriaAsignada && (
          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-xl text-gray-800 mb-4">
                📚 Información de tu Categoría
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-800">{typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}</h3>
                    <p className="text-amber-700">
                      Como profesor de esta categoría, puedes crear preguntas y gestionar estudiantes específicamente para esta área.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay categoría asignada */}
        {!categoriaAsignada && (
          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-xl text-gray-800 mb-4">
                ⚠️ Sin Categoría Asignada
              </h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800">Contacta al Administrador</h3>
                    <p className="text-yellow-700">
                      No tienes una categoría asignada. Contacta al administrador para que te asigne una categoría de preguntas y puedas gestionar contenido específico.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg text-gray-800 mb-4">📝 Gestión de Preguntas</h3>
              <p className="text-gray-600 mb-4">
                {categoriaAsignada 
                  ? `Crea y edita preguntas para la categoría "${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}". Solo podrás gestionar preguntas de esta categoría.`
                  : 'Crea y edita preguntas. Contacta al administrador para asignarte una categoría específica.'
                }
              </p>
              <button
                onClick={() => navigate('/profesor/gestion-preguntas')}
                className="btn btn-primary w-full"
                disabled={!categoriaAsignada}
              >
                {categoriaAsignada ? 'Ir a Mis Preguntas' : 'Sin Categoría Asignada'}
              </button>
            </div>
          </div>

          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg text-gray-800 mb-4">👥 Gestión de Estudiantes</h3>
              <p className="text-gray-600 mb-4">
                {categoriaAsignada 
                  ? `Agrega y gestiona estudiantes de la categoría "${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}". Solo podrás gestionar estudiantes de esta categoría.`
                  : 'Agrega y gestiona estudiantes. Contacta al administrador para asignarte una categoría específica.'
                }
              </p>
              <button
                onClick={() => navigate('/profesor/gestion-estudiantes')}
                className="btn btn-primary w-full"
                disabled={!categoriaAsignada}
              >
                {categoriaAsignada ? 'Ir a Mis Estudiantes' : 'Sin Categoría Asignada'}
              </button>
            </div>
          </div>
        </div>

        {/* Sección de Notas de Estudiantes */}
        {categoriaAsignada && (
          <div className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="card-title text-xl text-gray-800">
                    📊 Notas de Estudiantes - "{typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}"
                  </h2>
                  <button
                    onClick={loadNotasEstudiantes}
                    className="btn btn-sm btn-outline"
                    disabled={loadingNotas}
                  >
                    {loadingNotas ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Cargando...
                      </>
                    ) : (
                      <>
                        🔄 Actualizar
                      </>
                    )}
                  </button>
                </div>

                {loadingNotas ? (
                  <div className="flex justify-center items-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                    <span className="ml-2">Cargando notas...</span>
                  </div>
                ) : notasEstudiantes.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th className="text-gray-700 font-semibold">#</th>
                          <th className="text-gray-700 font-semibold">Identificación</th>
                          <th className="text-gray-700 font-semibold">Nombre</th>
                          <th className="text-gray-700 font-semibold">Apellidos</th>
                          <th className="text-gray-700 font-semibold">Nota Obtenida</th>
                          <th className="text-gray-700 font-semibold">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notasEstudiantes.map((estudiante, index) => (
                          <tr key={estudiante.identificacion}>
                            <td className="font-medium text-gray-600">
                              {index + 1}
                            </td>
                            <td className="font-medium text-gray-800">
                              {estudiante.identificacion}
                            </td>
                            <td className="text-gray-700">
                              {estudiante.nombre}
                            </td>
                            <td className="text-gray-700">
                              {estudiante.primer_apellido} {estudiante.segundo_apellido || ''}
                            </td>
                            <td>
                              <span 
                                className={`badge badge-lg font-bold ${
                                  estudiante.notaObtenida > estudiante.puntuacionMinima 
                                    ? 'badge-success' 
                                    : 'badge-error'
                                }`}
                              >
                                {estudiante.notaObtenida}%
                              </span>
                            </td>
                            <td>
                              <span 
                                className={`badge badge-sm ${
                                  estudiante.notaObtenida > estudiante.puntuacionMinima 
                                    ? 'badge-success' 
                                    : 'badge-error'
                                }`}
                              >
                                {estudiante.notaObtenida > estudiante.puntuacionMinima 
                                  ? '✅ Aprobado' 
                                  : '❌ Reprobado'
                                }
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-6xl mb-4">📝</div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      No hay notas disponibles
                    </h3>
                    <p className="text-gray-500">
                      Los estudiantes de esta categoría aún no han completado la prueba.
                    </p>
                  </div>
                )}

                {notasEstudiantes.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {notasEstudiantes.filter(e => e.notaObtenida > e.puntuacionMinima).length}
                        </div>
                        <div className="text-sm text-gray-600">Aprobados</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {notasEstudiantes.filter(e => e.notaObtenida <= e.puntuacionMinima).length}
                        </div>
                        <div className="text-sm text-gray-600">Reprobados</div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Puntuación mínima para aprobar: <span className="font-semibold">{notasEstudiantes[0]?.puntuacionMinima || 70}%</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Preguntas de la Categoría */}
        {categoriaAsignada && (
          <div className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="card-title text-xl text-gray-800">
                    📚 Preguntas de la Categoría "{typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}"
                  </h2>
                  <span className="badge badge-primary">
                    {preguntasCategoria.length} preguntas
                  </span>
                </div>
                
                {preguntasCategoria.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No hay preguntas en esta categoría aún.</p>
                    <button
                      onClick={() => navigate('/profesor/gestion-preguntas')}
                      className="btn btn-primary"
                    >
                      Crear Primera Pregunta
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th>Pregunta</th>
                          <th>Creador</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preguntasCategoria.map((pregunta) => (
                          <tr key={pregunta.id}>
                            <td>
                              <div className="max-w-xs">
                                <p className="font-medium truncate">{pregunta.pregunta}</p>
                                {pregunta.imagen_url && (
                                  <span className="text-xs text-gray-500">📷 Con imagen</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${pregunta.usuario_creador === userInfo?.identificacion ? 'badge-success' : 'badge-neutral'}`}>
                                {pregunta.usuario_creador === userInfo?.identificacion ? 'Tú' : pregunta.usuario_creador || 'Sistema'}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-500">
                                {new Date(pregunta.fecha_creacion).toLocaleDateString()}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${pregunta.activa ? 'badge-success' : 'badge-error'}`}>
                                {pregunta.activa ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Estudiantes de la Categoría */}
        {categoriaAsignada && (
          <div className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="card-title text-xl text-gray-800">
                    👥 Estudiantes de la Categoría "{typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}"
                  </h2>
                  <span className="badge badge-primary">
                    {estudiantesCategoria.length} estudiantes
                  </span>
                </div>
                
                {estudiantesCategoria.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No hay estudiantes asignados a esta categoría aún.</p>
                    <button
                      onClick={() => navigate('/profesor/gestion-estudiantes')}
                      className="btn btn-primary"
                    >
                      Agregar Primer Estudiante
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Identificación</th>
                          <th>Email</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estudiantesCategoria.map((estudiante) => (
                          <tr key={estudiante.identificacion}>
                            <td>
                              <div className="font-medium">
                                {estudiante.nombre} {estudiante.primer_apellido} {estudiante.segundo_apellido || ''}
                              </div>
                            </td>
                            <td>
                              <span className="text-sm font-mono">{estudiante.identificacion}</span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-500">{estudiante.email || 'Sin email'}</span>
                            </td>
                            <td>
                              <span className={`badge ${estudiante.estado === 'Activo' ? 'badge-success' : 'badge-error'}`}>
                                {estudiante.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfesorDashboard


