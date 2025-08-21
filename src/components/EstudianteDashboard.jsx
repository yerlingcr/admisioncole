import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import quizService from '../services/quizService'

const EstudianteDashboard = () => {
  const { user, logout, getUserInfo } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizStatus, setQuizStatus] = useState(null)
  const [quizStatusLoading, setQuizStatusLoading] = useState(false)
  const [showInstructions, setShowInstructions] = useState(false)

  useEffect(() => {
    loadUserInfo()
  }, [])

  useEffect(() => {
    if (userInfo?.identificacion) {
      checkQuizStatus()
    }
  }, [userInfo?.identificacion])

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

  const handleStartQuiz = () => {
    // Navegar al quiz
    navigate('/estudiante/quiz')
  }

  if (loading) {
    return <LoadingSpinner text="Cargando información..." />
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="alert alert-error">
          <span>Error cargando información del usuario</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      
      {/* Header con navegación */}
      <div className="navbar bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">🎓 Sistema de Admisión 2025</h1>
        </div>
        <div className="flex-none gap-2">
          <ThemeToggle />
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar bg-white/20 hover:bg-white/30">
              <div className="w-10 rounded-full bg-blue-600 text-white flex items-center justify-center">
                <span className="text-lg font-bold">
                  {userInfo.nombre.charAt(0)}{userInfo.primer_apellido.charAt(0)}
                </span>
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] menu menu-sm dropdown-content bg-white/90 backdrop-blur-xl rounded-box w-52 shadow-xl border border-white/20">
              <li>
                <a className="justify-between text-gray-800">
                  Perfil
                  <span className="badge badge-primary">Estudiante</span>
                </a>
              </li>
              <li><a className="text-gray-800">Configuración</a></li>
              <li><button onClick={handleLogout} className="text-red-600">Cerrar Sesión</button></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="container mx-auto px-4 py-8">
        
        {/* Pantalla de Bienvenida */}
        <div className="max-w-4xl mx-auto">
          
          {/* Logo del Centro Educativo */}
          <div className="text-center mb-8">
            <img 
              src="/img/ico/admision2025.png" 
              alt="Logo Centro Educativo" 
              className="w-32 h-32 mx-auto mb-6 drop-shadow-2xl"
            />
            <h1 className="text-4xl lg:text-5xl font-bold text-white mb-2 drop-shadow-2xl">
              Bienvenido al Sistema de Admisión
            </h1>
            <p className="text-xl text-blue-200 drop-shadow-xl">
              Evaluación de Conocimientos 2025
            </p>
          </div>

          {/* Información del Estudiante */}
          <div className="card bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-8">
            <div className="card-body text-center">
              <h2 className="card-title text-2xl text-white justify-center mb-4">
                👤 Información del Estudiante
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Nombre Completo:</span>
                    <span className="text-blue-200 font-medium">
                      {userInfo.nombre} {userInfo.primer_apellido} {userInfo.segundo_apellido}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Identificación:</span>
                    <span className="badge badge-primary text-lg px-4 py-2">
                      {userInfo.identificacion}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Estado:</span>
                    <span className={`badge ${userInfo.estado === 'Activo' ? 'badge-success' : 'badge-error'} text-lg px-4 py-2`}>
                      {userInfo.estado}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Fecha de Registro:</span>
                    <span className="text-blue-200">
                      {new Date(userInfo.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Instrucciones de la Prueba */}
          <div className="card bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl text-white justify-center mb-6">
                📋 Instrucciones de la Prueba
              </h2>
              
              <div className="space-y-4 text-white">
                <div className="alert alert-info bg-blue-500/20 border-blue-400/30 text-blue-100">
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <span className="font-semibold">Información General</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-blue-300 text-xl">⏱️</span>
                      <div>
                        <h4 className="font-semibold text-blue-200">Tiempo de la Prueba</h4>
                        <p className="text-sm text-gray-300">Tendrás 60 minutos para completar la evaluación</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <span className="text-blue-300 text-xl">📝</span>
                      <div>
                        <h4 className="font-semibold text-blue-200">Tipo de Preguntas</h4>
                        <p className="text-sm text-gray-300">Preguntas de opción múltiple y desarrollo</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3">
                      <span className="text-blue-300 text-xl">📊</span>
                      <div>
                        <h4 className="font-semibold text-blue-200">Total de Preguntas</h4>
                        <p className="text-sm text-gray-300">50 preguntas distribuidas en diferentes áreas</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <span className="text-blue-300 text-xl">💾</span>
                      <div>
                        <h4 className="font-semibold text-blue-200">Guardado Automático</h4>
                        <p className="text-sm text-gray-300">Tu progreso se guarda automáticamente</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="alert alert-warning bg-yellow-500/20 border-yellow-400/30 text-yellow-100 mt-6">
                  <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="font-semibold">
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
                  quizStatus.canTake ? (
                    <>
                      <button
                        onClick={handleStartQuiz}
                        className="btn btn-primary btn-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0 text-white font-bold text-xl px-12 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
                      >
                        🚀 Empezar Prueba de Admisión
                      </button>
                      
                      <p className="text-blue-200 mt-4 text-sm">
                        Haz clic en el botón cuando estés listo para comenzar
                      </p>
                    </>
                  ) : (
                    <div className="alert alert-warning bg-yellow-500/20 border-yellow-500/30 text-yellow-200 max-w-md mx-auto">
                      <span>⚠️ {quizStatus.reason}</span>
                    </div>
                  )
                ) : (
                  <div className="text-blue-200 text-sm">
                    Preparando sistema de quiz...
                  </div>
                )}
              </div>

          {/* Información Adicional */}
          <div className="mt-12 text-center text-blue-200 text-sm">
            <p>¿Tienes dudas? Contacta al administrador del sistema</p>
            <p className="mt-2">© 2025 Sistema de Admisión - Desarrollado por Arakary Solutions</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EstudianteDashboard
