import { useState, useEffect } from 'react'
import { supabase, supabaseHelpers } from '../lib/supabaseConfig'

const SupabaseExample = () => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState('')

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      setLoading(true)
      const currentUser = await supabaseHelpers.getCurrentUser()
      setUser(currentUser)
    } catch (error) {
      console.error('Error al verificar usuario:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignIn = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      })
      
      if (error) {
        setMessage('Error al iniciar sesión: ' + error.message)
      } else {
        setMessage('Redirigiendo a Google...')
      }
    } catch (error) {
      setMessage('Error inesperado: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        setMessage('Error al cerrar sesión: ' + error.message)
      } else {
        setUser(null)
        setMessage('Sesión cerrada exitosamente')
      }
    } catch (error) {
      setMessage('Error inesperado: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    )
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title">🔐 Ejemplo de Autenticación Supabase</h2>
        
        {message && (
          <div className="alert alert-info">
            <span>{message}</span>
          </div>
        )}

        {user ? (
          <div className="space-y-4">
            <div className="alert alert-success">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>¡Bienvenido, {user.email}!</span>
            </div>
            
            <div className="bg-base-200 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Información del usuario:</h3>
              <pre className="text-xs overflow-x-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>

            <button 
              className="btn btn-error w-full"
              onClick={handleSignOut}
              disabled={loading}
            >
              {loading ? 'Cerrando sesión...' : 'Cerrar Sesión'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <span>No has iniciado sesión</span>
            </div>

            <button 
              className="btn btn-primary w-full"
              onClick={handleSignIn}
              disabled={loading}
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar Sesión con Google'}
            </button>

            <div className="text-sm text-gray-600 text-center">
              <p>💡 Para que funcione la autenticación:</p>
              <p>1. Configura las variables de entorno</p>
              <p>2. Habilita Google OAuth en Supabase</p>
              <p>3. Configura las URLs de redirección</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default SupabaseExample
