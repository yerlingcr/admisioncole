import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import ConfigError from './components/ConfigError.jsx'

// Verificar si las variables de entorno están configuradas
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

const isConfigured = supabaseUrl && supabaseAnonKey && 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseAnonKey !== 'placeholder-key'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      {isConfigured ? <App /> : <ConfigError />}
    </ErrorBoundary>
  </StrictMode>,
)
