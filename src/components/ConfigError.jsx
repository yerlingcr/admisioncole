import React from 'react'

const ConfigError = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl mx-auto text-center">
        <div className="bg-white rounded-lg shadow-lg p-8 border border-gray-200">
          <div className="text-6xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Configuración Requerida
          </h1>
          <p className="text-gray-600 mb-6">
            El sistema necesita configurar las variables de entorno de Supabase para funcionar correctamente.
          </p>
          
          <div className="bg-gray-100 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-gray-800 mb-2">Para el administrador del sistema:</h3>
            <ol className="list-decimal list-inside text-sm text-gray-700 space-y-1">
              <li>Ve al Dashboard de Vercel</li>
              <li>Selecciona tu proyecto "admision2025"</li>
              <li>Ve a Settings → Environment Variables</li>
              <li>Agrega las siguientes variables:</li>
            </ol>
            <div className="mt-3 bg-gray-200 rounded p-3 font-mono text-xs">
              <div>VITE_SUPABASE_URL = https://tu-proyecto.supabase.co</div>
              <div>VITE_SUPABASE_ANON_KEY = tu_clave_anonima</div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Una vez configuradas, haz un nuevo deploy del proyecto.
            </p>
          </div>
          
          <div className="text-sm text-gray-500">
            <p>Si eres el desarrollador, revisa el archivo env.example para más detalles.</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ConfigError
