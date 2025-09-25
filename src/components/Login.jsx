import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'

const Login = () => {
  const [identificacion, setIdentificacion] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const result = await login(identificacion, password)
      
      if (result.success) {
        // Redirigir según el rol
        switch (result.user.rol) {
          case 'Administrador':
            navigate('/admin/dashboard')
            break
          case 'Profesor':
            navigate('/profesor/dashboard')
            break
          case 'Estudiante':
            navigate('/estudiante/dashboard')
            break
          default:
            navigate('/dashboard')
        }
      } else {
        setError(result.message)
      }
    } catch (error) {
      setError('Error inesperado: ' + error.message)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return <LoadingSpinner text="Iniciando sesión..." />
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      
      {/* Imagen de fondo */}
      <div className="absolute inset-0">
        <img 
          src="/img/bg/01.jpg" 
          alt="Fondo del sistema" 
          className="w-full h-full object-cover"
        />
        {/* Overlay para mejorar legibilidad */}
        <div className="absolute inset-0 bg-black/60"></div>
      </div>
      


      <div className="max-w-6xl w-full relative z-10 px-4">
        <div className="backdrop-blur-xl bg-white/5 border border-white/30 rounded-3xl shadow-2xl overflow-hidden">
          <div className="flex flex-col lg:flex-row">
            
            {/* Panel Izquierdo - Branding e Ilustración */}
            <div className="w-full lg:w-1/2 bg-gradient-to-br from-yellow-500/40 to-amber-600/40 backdrop-blur-sm p-6 lg:p-12 flex flex-col justify-between text-white relative min-h-[200px] lg:min-h-auto">
              
              {/* Efecto de vidrio en el panel izquierdo */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm"></div>
              
              {/* Header del Panel Izquierdo */}
              <div className="text-center relative z-10">
                <div className="mb-4 lg:mb-8">
                  <img 
                    src="/img/bg/escudovok.png" 
                    alt="Escudo Vocacional" 
                    className="w-48 h-48 lg:w-64 lg:h-64 mx-auto mb-0 drop-shadow-2xl object-contain"
                  />
                  <h1 className="text-2xl lg:text-4xl font-bold mb-2 drop-shadow-2xl text-white">C O V O M O S A</h1>
                  <p className="hidden lg:block text-white text-lg drop-shadow-xl font-semibold">Sistema de Gestión Académica</p>
                </div>
              </div>

              {/* Ilustración Central - Solo visible en desktop */}
              <div className="hidden lg:flex flex-1 items-center justify-center relative z-10">
                <div className="text-center">
                  <h2 className="text-2xl font-semibold mb-2 drop-shadow-2xl text-white">Bienvenidos</h2>
                  <p className="text-white drop-shadow-xl font-medium">Accede a tu portal académico</p>
                </div>
              </div>

              {/* Footer del Panel Izquierdo - Solo visible en desktop */}
              <div className="hidden lg:block text-center text-white text-sm relative z-10">
                <p className="drop-shadow-xl font-medium">© 2025, Todos los Derechos Reservados, ver. 1.1.4</p>
                <p className="drop-shadow-xl font-medium">
                  Desarrollado por{' '}
                  <a 
                    href="https://arakarysolutions.vercel.app/" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-200 hover:text-blue-100 underline transition-colors duration-200"
                  >
                    Arakary Solutions
                  </a>
                </p>
              </div>
            </div>

            {/* Panel Derecho - Formulario de Login */}
            <div className="w-full lg:w-1/2 bg-white/10 backdrop-blur-xl p-6 lg:p-12 flex flex-col justify-center relative">
              
              {/* Efecto de vidrio en el panel derecho */}
              <div className="absolute inset-0 bg-white/5 backdrop-blur-sm lg:rounded-r-3xl"></div>
              
              {/* Header del Formulario */}
              <div className="text-center mb-6 lg:mb-8 relative z-10">
                <h2 className="text-2xl lg:text-3xl font-bold text-white mb-2 drop-shadow-2xl">Iniciar Sesión</h2>
                <p className="text-white font-semibold drop-shadow-xl text-sm lg:text-base">Accede a tu cuenta</p>
              </div>

              {/* Formulario */}
              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6 relative z-10">
                
                {/* Campo Identificación */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white drop-shadow-xl">
                    Identificación
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. 109860742"
                    className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/80 border border-white/30 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm text-black placeholder-gray-600 text-sm lg:text-base"
                    value={identificacion}
                    onChange={(e) => setIdentificacion(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Campo Contraseña */}
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white drop-shadow-xl">
                    Contraseña
                  </label>
                  <input
                    type="password"
                    placeholder="Ingresa tu contraseña"
                    className="w-full px-3 lg:px-4 py-2 lg:py-3 bg-white/80 border border-white/30 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all duration-300 backdrop-blur-sm text-black placeholder-gray-600 text-sm lg:text-base"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                </div>

                {/* Mensaje de Error */}
                {error && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 backdrop-blur-sm">
                    <div className="flex items-center">
                      <svg className="w-5 h-5 text-red-300 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-red-200 text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Botón de Login */}
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-500/80 to-indigo-600/80 backdrop-blur-sm text-white font-semibold py-2 lg:py-3 px-4 lg:px-6 rounded-xl hover:from-blue-600/90 hover:to-indigo-700/90 focus:ring-4 focus:ring-blue-400/50 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed border border-white/20 shadow-lg hover:shadow-xl text-sm lg:text-base"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Iniciando sesión...
                    </div>
                  ) : (
                    'Iniciar Sesión'
                  )}
                </button>
              </form>

              {/* Información Adicional */}
              <div className="mt-6 lg:mt-8 text-center relative z-10">
                <p className="text-white font-medium text-xs lg:text-sm drop-shadow-xl">
                  ¿Necesitas ayuda? Contacta al administrador del sistema
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>


    </div>
  )
}

export default Login
