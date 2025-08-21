import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseConfig'

const SupabaseTest = () => {
  const [connectionStatus, setConnectionStatus] = useState('Verificando...')
  const [userCount, setUserCount] = useState(null)
  const [error, setError] = useState(null)
  const [debugInfo, setDebugInfo] = useState({})

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    try {
      setConnectionStatus('Conectando...')
      
      // Probar conexión básica
      const { data, error } = await supabase
        .from('usuarios')
        .select('count', { count: 'exact', head: true })

      if (error) {
        throw error
      }

      setConnectionStatus('✅ Conectado exitosamente')
      setUserCount(data?.[0]?.count || 0)
      setError(null)
    } catch (error) {
      console.error('Error de conexión:', error)
      setConnectionStatus('❌ Error de conexión')
      setError(error.message)
    }
  }

  const testRPC = async () => {
    try {
      setConnectionStatus('Probando funciones RPC...')
      
      // Probar función de estadísticas
      const { data, error } = await supabase.rpc('obtener_estadisticas_sistema')
      
      if (error) {
        throw error
      }

      setConnectionStatus('✅ Funciones RPC funcionando')
      setUserCount(data?.[0]?.total_usuarios || 0)
      setError(null)
    } catch (error) {
      console.error('Error en RPC:', error)
      setConnectionStatus('❌ Error en funciones RPC')
      setError(error.message)
    }
  }

  const testValidarLogin = async () => {
    try {
      setConnectionStatus('Probando validar_login...')
      
      console.log('🧪 Probando función validar_login...')
      
      // Probar la función validar_login específicamente
      const { data, error } = await supabase.rpc('validar_login', {
        p_identificacion: 'ADMIN001',
        p_password: 'admin123'
      })
      
      console.log('🧪 Resultado validar_login:', { data, error })
      
      if (error) {
        throw error
      }

      setConnectionStatus('✅ Función validar_login funcionando')
      setDebugInfo({ validarLogin: data })
      setError(null)
    } catch (error) {
      console.error('Error en validar_login:', error)
      setConnectionStatus('❌ Error en validar_login')
      setError(error.message)
      setDebugInfo({ validarLoginError: error })
    }
  }

  const testDirectQuery = async () => {
    try {
      setConnectionStatus('Probando consulta directa...')
      
      // Probar consulta directa a la tabla usuarios
      const { data, error } = await supabase
        .from('usuarios')
        .select('identificacion, nombre, rol, password')
        .eq('identificacion', 'ADMIN001')
        .limit(1)
      
      console.log('🔍 Consulta directa usuarios:', { data, error })
      
      if (error) {
        throw error
      }

      setConnectionStatus('✅ Consulta directa funcionando')
      setDebugInfo({ directQuery: data })
      setError(null)
    } catch (error) {
      console.error('Error en consulta directa:', error)
      setConnectionStatus('❌ Error en consulta directa')
      setError(error.message)
      setDebugInfo({ directQueryError: error })
    }
  }

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h2 className="card-title text-2xl mb-4">🔌 Prueba de Conexión Supabase</h2>
        
        {/* Estado de la conexión */}
        <div className="alert alert-info mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 h-6 w-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>{connectionStatus}</span>
        </div>

        {/* Información de la conexión */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="stat bg-base-200 rounded-box">
            <div className="stat-title">Estado</div>
            <div className="stat-value text-lg">
              {connectionStatus.includes('✅') ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
          
          <div className="stat bg-base-200 rounded-box">
            <div className="stat-title">Usuarios en BD</div>
            <div className="stat-value text-lg">
              {userCount !== null ? userCount : '...'}
            </div>
          </div>
        </div>

        {/* Botones de prueba */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button 
            className="btn btn-primary"
            onClick={testConnection}
          >
            Probar Conexión Básica
          </button>
          
          <button 
            className="btn btn-secondary"
            onClick={testRPC}
          >
            Probar Funciones RPC
          </button>

          <button 
            className="btn btn-accent"
            onClick={testValidarLogin}
          >
            Probar validar_login
          </button>

          <button 
            className="btn btn-info"
            onClick={testDirectQuery}
          >
            Probar Consulta Directa
          </button>
        </div>

        {/* Variables de entorno */}
        <div className="bg-base-200 p-4 rounded-lg mb-4">
          <h3 className="font-semibold mb-2">Variables de Entorno:</h3>
          <div className="text-sm space-y-1">
            <div>
              <span className="font-medium">URL:</span> 
              <span className="font-mono text-xs ml-2">
                {import.meta.env.VITE_SUPABASE_URL ? '✅ Configurada' : '❌ No configurada'}
              </span>
            </div>
            <div>
              <span className="font-medium">API Key:</span> 
              <span className="font-mono text-xs ml-2">
                {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ No configurada'}
              </span>
            </div>
          </div>
        </div>

        {/* Información de Debug */}
        {Object.keys(debugInfo).length > 0 && (
          <div className="bg-base-200 p-4 rounded-lg mb-4">
            <h3 className="font-semibold mb-2">Información de Debug:</h3>
            <pre className="text-xs overflow-auto bg-base-300 p-2 rounded">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        )}

        {/* Error si existe */}
        {error && (
          <div className="alert alert-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Instrucciones */}
        <div className="alert alert-warning">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span className="text-sm">
            Usa los botones para probar cada funcionalidad paso a paso
          </span>
        </div>
      </div>
    </div>
  )
}

export default SupabaseTest
