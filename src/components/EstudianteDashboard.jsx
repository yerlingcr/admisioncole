import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'
import quizService from '../services/quizService'
import { institucionService } from '../services/institucionService'
import { supabase } from '../lib/supabaseConfig'

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
  const [intentosCompletados, setIntentosCompletados] = useState([])

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
      console.log('🚀 Cargando datos iniciales para:', userInfo.identificacion);
      checkQuizStatus()
      loadQuizConfig()
      loadInformacionInstitucional()
      loadIntentosUsados()
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
    } catch (error) {
      console.error('Error cargando información del usuario:', error)
    } finally {
      setLoading(false)
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
        numero_preguntas: 5,
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

  const loadIntentosUsados = async () => {
    try {
      if (!userInfo?.identificacion) {
        console.log('⚠️ No hay identificacion del usuario para cargar intentos');
        return;
      }

      console.log('🔍 Buscando intentos para:', userInfo.identificacion);
      
      // Consulta directa y simple
      const { data, error } = await supabase
        .from('intentos_quiz')
        .select('id, estudiante_id, fecha_inicio, fecha_fin, puntuacion_total')
        .eq('estudiante_id', userInfo.identificacion)
        .not('fecha_fin', 'is', null);

      if (error) {
        console.error('❌ Error cargando intentos:', error);
        console.error('❌ Detalles del error:', {
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        setIntentosUsados(0);
        setIntentosCompletados([]);
        return;
      }

      console.log('📊 Intentos encontrados en BD:', data);
      console.log('📊 Cantidad de intentos:', data.length);
      
      // Ordenar por fecha_inicio (más recientes primero)
      const sortedData = data.sort((a, b) => new Date(b.fecha_inicio) - new Date(a.fecha_inicio));
      
      // Verificar que cada intento tenga puntuacion_total
      sortedData.forEach((intento, index) => {
        console.log(`📊 Intento ${index + 1}:`, {
          id: intento.id,
          fecha_inicio: intento.fecha_inicio,
          fecha_fin: intento.fecha_fin,
          puntuacion_total: intento.puntuacion_total
        });
      });
      
      setIntentosUsados(sortedData.length);
      setIntentosCompletados(sortedData);
      
      console.log('✅ Estado actualizado - intentosUsados:', sortedData.length);
    } catch (error) {
      console.error('❌ Error en loadIntentosUsados:', error);
      setIntentosUsados(0);
      setIntentosCompletados([]);
    }
  };

  const handleStartQuiz = () => {
    // Navegar al quiz
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
      console.log('⚠️ No hay userInfo para probar conexión');
      return;
    }

    console.log('🧪 Probando conexión directa a la base de datos...');
    
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

      console.log('📊 Todos los intentos en BD:', allData);
      console.log('📊 Cantidad total de intentos:', allData.length);
      
      // Mostrar detalles de cada intento
      allData.forEach((intento, index) => {
        console.log(`📊 Intento ${index + 1}:`, {
          id: intento.id,
          estudiante_id: intento.estudiante_id,
          fecha_inicio: intento.fecha_inicio,
          fecha_fin: intento.fecha_fin,
          puntuacion_total: intento.puntuacion_total,
          tiene_fecha_fin: !!intento.fecha_fin,
          es_completado: intento.fecha_fin !== null
        });
      });
      
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

      console.log('✅ Intentos completados en BD:', completedData);
      console.log('📊 Cantidad de completados:', completedData.length);
      
      // Alert para mostrar resultados
      alert(`Resultados de la verificación:\n\nTotal de intentos: ${allData.length}\nIntentos completados: ${completedData.length}\n\nRevisa la consola para más detalles.`);
      
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
              🎓 {informacionInstitucional?.nombre_centro_educativo || 'Centro Educativo'} | {informacionInstitucional?.nombre_especialidad || 'Secretariado Ejecutivo'}
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
                          {quizConfig ? `${quizConfig.numero_preguntas} preguntas distribuidas en diferentes áreas` : 'Cargando configuración...'}
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

          {/* Historial de Intentos */}
          {intentosCompletados.length > 0 && (
            <div className="card shadow-2xl mb-8" style={{ backgroundColor: colors.white + '10', backdropFilter: 'blur(10px)', border: '1px solid ' + colors.accent + '40' }}>
              <div className="card-body">
                <h2 className="card-title text-2xl justify-center mb-6" style={{ color: colors.white }}>
                  📊 Historial de Intentos
                </h2>
                
                <div className="space-y-3">
                  {intentosCompletados.map((intento, index) => (
                    <div key={intento.id} className="flex justify-between items-center p-4 rounded-lg" style={{ backgroundColor: colors.white + '05', border: '1px solid ' + colors.white + '10' }}>
                      <div className="flex items-center space-x-4">
                        <span className="text-xl font-bold" style={{ color: colors.secondary }}>#{index + 1}</span>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: colors.white }}>
                            {new Date(intento.fecha_inicio).toLocaleDateString('es-ES')} - {new Date(intento.fecha_inicio).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <p className="text-xs" style={{ color: colors.secondary }}>
                            📅 {new Date(intento.fecha_fin).toLocaleDateString('es-ES')} - {new Date(intento.fecha_fin).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-center">
                          <span className={`badge text-xl px-6 py-3 font-bold ${intento.puntuacion_total >= 70 ? 'badge-success' : 'badge-error'}`} style={{ 
                            backgroundColor: intento.puntuacion_total >= 70 ? colors.secondary : colors.accent,
                            color: colors.white
                          }}>
                            {intento.puntuacion_total || 0}%
                          </span>
                          <p className="text-xs mt-2 font-semibold" style={{ color: colors.secondary }}>
                            {intento.puntuacion_total >= 70 ? '✅ Aprobado' : '❌ No Aprobado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}





                        {/* Botón para Empezar */}
              <div className="text-center">
                {quizStatusLoading ? (
                  <LoadingSpinner text="Verificando estado del quiz..." />
                ) : quizStatus ? (
                  quizStatus.canTake && !seAgotaronIntentos ? (
                    <>
                      <div className="flex gap-4 justify-center">
                        <button
                          onClick={handleStartQuiz}
                          className="btn btn-lg border-0 font-bold text-xl px-12 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                          style={{ backgroundColor: colors.secondary, color: colors.white }}
                        >
                          🚀 Empezar Prueba de Admisión
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
            <p className="mt-2">© 2025 Sistema de Admisión - Desarrollado por Arakary Solutions</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstudianteDashboard
