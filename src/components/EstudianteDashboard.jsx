import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'
import quizService from '../services/quizService'
import { institucionService } from '../services/institucionService'
import { supabase } from '../lib/supabaseConfig'
import OptimizedStatsService from '../services/optimizedStatsService'
import Swal from 'sweetalert2'

const EstudianteDashboard = () => {
  const { user, logout, getUserInfo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizStatus, setQuizStatus] = useState(null)
  const [quizStatusLoading, setQuizStatusLoading] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)
  const [quizConfig, setQuizConfig] = useState(null)
  const [informacionInstitucional, setInformacionInstitucional] = useState(null)
  const [intentosUsados, setIntentosUsados] = useState(0)
  const [categoriaEstudiante, setCategoriaEstudiante] = useState('')

  // Paleta de colores del sistema
  const colors = {
    primary: '#4d3930',
    secondary: '#f4b100',
    accent: '#b47b21',
    white: '#ffffff'
  }

  useEffect(() => {
    loadUserInfo()
  }, [])

  useEffect(() => {
    if (userInfo?.identificacion) {
      checkQuizStatus()
      loadQuizConfig()
      loadInformacionInstitucional()
      loadIntentosUsados()
      loadCategoriaEstudiante()
    } else {
      console.log('⏳ Esperando userInfo para cargar datos...');
    }
  }, [userInfo?.identificacion])

  // Refrescar datos cuando regreses al dashboard (solo si viene de otra página)
  useEffect(() => {
    if (userInfo?.identificacion && location.pathname === '/estudiante/dashboard') {
      // Solo refrescar si viene de una página diferente (no en carga inicial)
      const isReturningFromAnotherPage = location.state?.from !== 'dashboard';
      
      if (isReturningFromAnotherPage) {
        console.log('📍 Detectada navegación al dashboard, programando refresh suave...');
        // Delay más corto y sin logs excesivos
        const timer = setTimeout(() => {
          refreshDashboardData();
        }, 1000) // Reducido a 1 segundo
        
        return () => clearTimeout(timer)
      }
    }
  }, [location.pathname, userInfo?.identificacion])

  const loadUserInfo = async () => {
    try {
      setLoading(true)
      const info = await getUserInfo()
      setUserInfo(info)
      console.log('👤 Datos del usuario cargados:', info)
      console.log('👤 Estado del usuario:', info?.estado)
      console.log('👤 Identificación del usuario:', info?.identificacion)
    } catch (error) {
      console.error('Error cargando información del usuario:', error)
    } finally {
      setLoading(false)
    }
  }

  const refreshUserStatus = async () => {
    try {
      const info = await getUserInfo()
      setUserInfo(info)
      
      // También actualizar la categoría
      await loadCategoriaEstudiante()
      
      // Mostrar mensaje de confirmación
      await Swal.fire({
        icon: 'success',
        title: 'Estado Actualizado',
        text: `Tu estado actual es: ${info?.estado || 'Desconocido'}`,
        timer: 2000,
        showConfirmButton: false
      })
    } catch (error) {
      console.error('Error actualizando estado del usuario:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el estado del usuario',
        confirmButtonColor: '#b47b21'
      })
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const checkQuizStatus = async () => {
    if (!userInfo?.identificacion) {
      console.log('No hay identificacion del usuario:', userInfo)
      return
    }
    
    try {
      console.log('Verificando estado del quiz para:', userInfo.identificacion)
      setQuizStatusLoading(true)
      const status = await quizService.canStudentTakeQuiz(userInfo.identificacion)
      console.log('Estado del quiz recibido:', status)
      setQuizStatus(status)
    } catch (error) {
      console.error('Error verificando estado del quiz:', error)
      console.error('Detalles del error:', error.message, error.details)
      setQuizStatus({ canTake: false, reason: `Error: ${error.message || 'Error desconocido'}` })
    } finally {
      setQuizStatusLoading(false)
    }
  }

  const loadQuizConfig = async () => {
    try {
      const config = await quizService.getQuizConfig()
      setQuizConfig(config)
    } catch (error) {
      console.error('Error cargando configuración del quiz:', error)
      // Usar configuración por defecto si hay error
      setQuizConfig({
        tiempo_limite_minutos: 5,
        total_preguntas: 5,
        puntaje_minimo_aprobacion: 70,
        intentos_permitidos: 2
      })
    }
  }

  const loadInformacionInstitucional = async () => {
    try {
      const info = await institucionService.getInformacionActiva();
      setInformacionInstitucional(info);
    } catch (error) {
      console.error('Error cargando información institucional:', error);
      // Usar información por defecto si hay error
      setInformacionInstitucional(institucionService.getInformacionPorDefecto());
    }
  };

  const loadCategoriaEstudiante = async () => {
    try {
      if (!userInfo?.identificacion) return
      
      console.log('🚀 Cargando datos del estudiante...')
      
      try {
        // Intentar usar el servicio optimizado primero
        const studentData = await OptimizedStatsService.getStudentData(userInfo.identificacion)
        
        if (studentData?.categoria_asignada) {
          setCategoriaEstudiante(studentData.categoria_asignada)
          
          if (studentData?.intentos_usados !== undefined) {
            setIntentosUsados(studentData.intentos_usados)
          }
          
          // Datos del estudiante cargados exitosamente
          return
        }
      } catch (rpcError) {
        // Usando método original (RPC no disponible)
      }
      
      // Fallback al método original
      const { data, error } = await supabase
        .from('usuario_categorias')
        .select('categoria')
        .eq('usuario_id', userInfo.identificacion)
        .eq('activa', true)
        .single()

      if (error) {
        console.error('Error cargando categoría del estudiante:', error)
        setCategoriaEstudiante('Secretariado Ejecutivo')
        return
      }

      if (data?.categoria) {
        setCategoriaEstudiante(data.categoria)
        // Categoría cargada exitosamente
      } else {
        setCategoriaEstudiante('Secretariado Ejecutivo')
      }
    } catch (error) {
      console.error('Error cargando datos del estudiante:', error)
      setCategoriaEstudiante('Secretariado Ejecutivo')
    }
  }

  const loadIntentosUsados = async () => {
    try {
      if (!userInfo?.identificacion) return
      
      // Si ya se cargaron los datos optimizados, no hacer consulta adicional
      if (intentosUsados !== 0) return
      
      // Consulta simple solo para contar intentos completados
      const { data, error } = await supabase
        .from('intentos_quiz')
        .select('id')
        .eq('estudiante_id', userInfo.identificacion)
        .not('fecha_fin', 'is', null)

      if (error) {
        console.error('❌ Error cargando intentos:', error)
        setIntentosUsados(0)
        return
      }

      setIntentosUsados(data.length)
      
    } catch (error) {
      console.error('❌ Error en loadIntentosUsados:', error)
      setIntentosUsados(0)
    }
  }

  const handleStartQuiz = () => {
    // Validar que el estudiante esté activo
    if (userInfo?.estado !== 'Activo') {
      Swal.fire({
        icon: 'warning',
        title: 'Acceso Restringido',
        html: `
          <div style="text-align: left;">
            <p><strong>Tu cuenta no está activa para realizar la prueba.</strong></p>
            <br>
            <p><strong>Estado actual:</strong> ${userInfo?.estado || 'Inactivo'}</p>
            <br>
            <p><strong>Para activar tu cuenta:</strong></p>
            <ul style="margin-left: 20px;">
              <li>Comunícate con el Administrador del sistema</li>
              <li>Proporciona tu identificación: <strong>${userInfo?.identificacion || 'N/A'}</strong></li>
              <li>Espera a que se active tu cuenta</li>
            </ul>
            <br>
            <p><strong>Una vez activada, podrás realizar la prueba de admisión.</strong></p>
          </div>
        `,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
      return
    }

    // Si está activo, proceder al quiz
    navigate('/estudiante/quiz')
  }

  const refreshDashboardData = async () => {
    if (userInfo?.identificacion) {
      try {
        // Actualización silenciosa sin logs excesivos
        await Promise.all([
          checkQuizStatus(),
          loadIntentosUsados(),
          loadQuizConfig(),
          loadInformacionInstitucional()
        ]);
      } catch (error) {
        console.error('❌ Error refrescando datos del dashboard:', error);
      }
    }
  }


  const testDatabaseConnection = async () => {
    if (!userInfo?.identificacion) {
      return;
    }

    
    try {
      // Consulta directa sin filtros
      const { data: allData, error: allError } = await supabase
        .from('intentos_quiz')
        .select('*')
        .eq('estudiante_id', userInfo.identificacion);

      if (allError) {
        console.error('❌ Error en consulta general:', allError);
        return;
      }

      
      // Consulta solo completados
      const { data: completedData, error: completedError } = await supabase
        .from('intentos_quiz')
        .select('id, estudiante_id, fecha_inicio, fecha_fin, puntuacion_total')
        .eq('estudiante_id', userInfo.identificacion)
        .not('fecha_fin', 'is', null);

      if (completedError) {
        console.error('❌ Error en consulta completados:', completedError);
        return;
      }

      
    } catch (error) {
      console.error('❌ Error en test de conexión:', error);
    }
  }

  const oportunidadesDisponibles = quizConfig ? (quizConfig.intentos_permitidos - intentosUsados) : 0
  const seAgotaronIntentos = oportunidadesDisponibles <= 0



  if (loading) {
    return <LoadingSpinner text="Cargando información..." />
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent}, ${colors.primary})` }}>
        <div className="alert alert-error">
          <span>Error cargando información del usuario</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent}, ${colors.primary})` }}>
      
      {/* Header con navegación */}
      <div style={{ backgroundColor: colors.primary + '20', backdropFilter: 'blur(10px)', borderBottom: '1px solid ' + colors.accent + '40' }}>
        <div className="navbar py-2">
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: colors.white }}>
              🎓 Vocacional Monseñor Sanabria | {categoriaEstudiante || 'Secretariado Ejecutivo'}
            </h1>
          </div>
          <div className="flex-none">
            <div className="w-8 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: colors.accent }}>
              <span className="text-sm font-bold">
                {userInfo.nombre.charAt(0)}{userInfo.primer_apellido.charAt(0)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="container mx-auto px-4 py-8">
        
        {/* Pantalla de Bienvenida */}
        <div className="max-w-4xl mx-auto">
          
          {/* Título de la Evaluación */}
          <div className="text-center mb-8">
            <p className="text-3xl font-bold text-white drop-shadow-2xl">
              Evaluación de Conocimientos
            </p>
          </div>

          {/* Información del Estudiante */}
          <div className="card shadow-2xl mb-8" style={{ backgroundColor: colors.white + '10', backdropFilter: 'blur(10px)', border: '1px solid ' + colors.accent + '40' }}>
            <div className="card-body text-center">
              <h2 className="card-title text-2xl justify-center mb-4" style={{ color: colors.white }}>
                👤 Información del Estudiante
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold" style={{ color: colors.white }}>Nombre Completo:</span>
                    <span className="font-medium" style={{ color: colors.secondary }}>
                      {userInfo.nombre} {userInfo.primer_apellido} {userInfo.segundo_apellido}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-semibold" style={{ color: colors.white }}>Identificación:</span>
                    <span className="badge text-lg px-4 py-2" style={{ backgroundColor: colors.accent, color: colors.white }}>
                      {userInfo.identificacion}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold" style={{ color: colors.white }}>Oportunidades Disponibles:</span>
                    <span className="badge text-lg px-4 py-2" style={{ backgroundColor: colors.secondary, color: colors.white }}>
                      {quizConfig ? (quizConfig.intentos_permitidos - intentosUsados) : 'Cargando...'}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-semibold" style={{ color: colors.white }}>Intentos Realizados:</span>
                    <span className="badge text-lg px-4 py-2" style={{ backgroundColor: colors.accent, color: colors.white }}>
                      {intentosUsados}
                    </span>
                  </div>
                  
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones de la Prueba */}
          <div className="card shadow-2xl mb-8" style={{ backgroundColor: colors.white + '10', backdropFilter: 'blur(10px)', border: '1px solid ' + colors.accent + '40' }}>
            <div className="card-body">
              <h2 className="card-title text-2xl justify-center mb-6" style={{ color: colors.white }}>
                📋 Instrucciones de la Prueba
              </h2>
              
              <div className="space-y-4">
                <div className="alert p-3 rounded-lg" style={{ backgroundColor: colors.accent + '20', border: '1px solid ' + colors.accent + '40' }}>
                  <span className="font-semibold" style={{ color: colors.white }}>Información General</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-xl" style={{ color: colors.secondary }}>⏱️</span>
                      <div>
                        <h4 className="font-semibold" style={{ color: colors.secondary }}>Tiempo de la Prueba</h4>
                        <p className="text-sm" style={{ color: colors.white }}>
                          {quizConfig ? `Tendrás ${quizConfig.tiempo_limite_minutos} minutos para completar la evaluación` : 'Cargando configuración...'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <span className="text-xl" style={{ color: colors.secondary }}>📝</span>
                      <div>
                        <h4 className="font-semibold" style={{ color: colors.secondary }}>Tipo de Preguntas</h4>
                        <p className="text-sm" style={{ color: colors.white }}>Selección Única</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-xl" style={{ color: colors.secondary }}>📊</span>
                      <div>
                        <h4 className="font-semibold" style={{ color: colors.secondary }}>Total de Preguntas</h4>
                        <p className="text-sm" style={{ color: colors.white }}>
                          {quizConfig ? `${quizConfig.total_preguntas} preguntas distribuidas en diferentes áreas` : 'Cargando configuración...'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <span className="text-xl" style={{ color: colors.secondary }}>💾</span>
                      <div>
                        <h4 className="font-semibold" style={{ color: colors.secondary }}>Guardado Automático</h4>
                        <p className="text-sm" style={{ color: colors.white }}>Tu progreso se guarda automáticamente</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="alert p-3 rounded-lg mt-6" style={{ backgroundColor: colors.secondary + '20', border: '1px solid ' + colors.secondary + '40' }}>
                  <span className="font-semibold" style={{ color: colors.secondary }}>
                    ⚠️ Importante: Una vez que inicies la prueba, el cronómetro comenzará y no se podrá pausar.
                  </span>
                </div>
              </div>
            </div>
          </div>






                        {/* Botón para Empezar */}
              <div className="text-center">
                {quizStatusLoading ? (
                  <LoadingSpinner text="Verificando estado del quiz..." />
                ) : quizStatus ? (
                  quizStatus.canTake && !seAgotaronIntentos && userInfo?.estado === 'Activo' ? (
                    <>
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={handleStartQuiz}
                          className="btn btn-lg border-0 font-bold text-xl px-12 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                          style={{ backgroundColor: colors.secondary, color: colors.white }}
                        >
                          🚀 Iniciar ahora
                        </button>
                        
                        <button
                          onClick={handleLogout}
                          className="btn btn-lg border-0 font-bold text-xl px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                          style={{ backgroundColor: colors.accent, color: colors.white }}
                        >
                          🚪 Cerrar Sesión
                        </button>
                      </div>
                      
                      <p className="mt-4 text-sm" style={{ color: colors.secondary }}>
                        Haz clic en el botón cuando estés listo para comenzar
                      </p>
                    </>
                  ) : userInfo?.estado !== 'Activo' ? (
                    <>
                      <div className="alert p-4 rounded-lg max-w-lg mx-auto mb-4" style={{ backgroundColor: '#fef3c7', border: '1px solid #f59e0b' }}>
                        <div className="flex items-start space-x-3">
                          <span className="text-2xl">⚠️</span>
                          <div>
                            <h3 className="font-bold text-lg" style={{ color: '#92400e' }}>Cuenta Inactiva</h3>
                            <p className="text-sm mt-1" style={{ color: '#92400e' }}>
                              Tu cuenta no está activa para realizar la prueba de admisión.
                            </p>
                            <p className="text-sm mt-2" style={{ color: '#92400e' }}>
                              <strong>Estado:</strong> {userInfo?.estado || 'Inactivo'}
                            </p>
                            <p className="text-sm mt-2" style={{ color: '#92400e' }}>
                              <strong>Para activar tu cuenta:</strong> Comunícate con el Administrador del sistema.
                            </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={refreshUserStatus}
                          className="btn btn-lg border-0 font-bold text-xl px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                          style={{ backgroundColor: colors.secondary, color: colors.white }}
                        >
                          🔄 Actualizar Estado
                        </button>
                        
                        <button
                          onClick={handleLogout}
                          className="btn btn-lg border-0 font-bold text-xl px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                          style={{ backgroundColor: colors.accent, color: colors.white }}
                        >
                          🚪 Cerrar Sesión
                        </button>
                      </div>
                    </>
                  ) : seAgotaronIntentos ? (
                    <>
                      <button
                        onClick={handleLogout}
                        className="btn btn-lg border-0 font-bold text-xl px-12 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                        style={{ backgroundColor: colors.accent, color: colors.white }}
                      >
                        🚪 Salir
                      </button>
                      
                      <p className="mt-4 text-sm" style={{ color: colors.secondary }}>
                        Has agotado todas tus oportunidades para realizar la prueba
                      </p>
                    </>
                  ) : (
                    <div className="alert p-3 rounded-lg max-w-md mx-auto" style={{ backgroundColor: colors.accent + '20', border: '1px solid ' + colors.accent + '40' }}>
                      <span style={{ color: colors.accent }}>⚠️ {quizStatus.reason}</span>
                    </div>
                  )
                ) : (
                  <div className="text-sm" style={{ color: colors.secondary }}>
                    Preparando sistema de quiz...
                  </div>
                )}
              </div>

          {/* Información Adicional */}
          <div className="mt-12 text-center text-sm" style={{ color: colors.secondary }}>
            <p>¿Tienes dudas? Contacta al administrador del sistema</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstudianteDashboard
