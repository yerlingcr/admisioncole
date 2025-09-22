import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import GestionPreguntas from './GestionPreguntas'
import GestionUsuarios from './GestionUsuarios'
import GestionCategorias from './GestionCategorias'
import ConfiguracionPrueba from './ConfiguracionPrueba'
import Estadisticas from './Estadisticas'
import Reportes from './Reportes'
import OptimizedStatsService from '../services/optimizedStatsService'

const AdminDashboard = () => {
  const { user, logout, getUserInfo } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [openTabs, setOpenTabs] = useState([
    { id: 'dashboard', title: '📊 Dashboard', icon: '📊', closable: false }
  ])

  useEffect(() => {
    loadUserInfo()
    loadSystemStats()
  }, [])

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

  const loadSystemStats = async () => {
    try {
      setStatsLoading(true)
      console.log('🚀 Cargando estadísticas optimizadas...')
      
      try {
        // Intentar usar el servicio optimizado primero
        const statsData = await OptimizedStatsService.getSystemStats()
        // Estadísticas cargadas exitosamente
        setStats(statsData)
      } catch (rpcError) {
        // Usando método original (RPC no disponible)
        
        // Fallback al método original si RPC no funciona
        const [usuariosResult, preguntasResult, usuariosActivosResult] = await Promise.all([
          supabase.from('usuarios').select('*'),
          supabase.from('preguntas_quiz').select('*'),
          supabase.from('usuarios').select('*').eq('estado', 'Activo')
        ])
        
        const statsData = {
          total_usuarios: usuariosResult.data?.length || 0,
          total_preguntas: preguntasResult.data?.length || 0,
          usuarios_activos: usuariosActivosResult.data?.length || 0,
          usuarios_inactivos: (usuariosResult.data?.length || 0) - (usuariosActivosResult.data?.length || 0),
          total_intentos: 0,
          intentos_completados: 0,
          promedio_puntuacion: 0
        }
        
        console.log('✅ Estadísticas cargadas con fallback:', statsData)
        setStats(statsData)
      }
    } catch (error) {
      console.error('❌ Error cargando estadísticas:', error)
      
      // Fallback a datos por defecto si hay error
      setStats({
        total_usuarios: 0,
        total_preguntas: 0,
        usuarios_activos: 0,
        usuarios_inactivos: 0,
        total_intentos: 0,
        intentos_completados: 0,
        promedio_puntuacion: 0
      })
    } finally {
      setStatsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const openTab = (tabId, title, icon) => {
    // Si la pestaña ya está abierta, solo la activamos
    if (openTabs.find(tab => tab.id === tabId)) {
      setActiveTab(tabId)
      return
    }

    // Si no está abierta, la agregamos
    const newTab = { id: tabId, title, icon, closable: tabId !== 'dashboard' }
    setOpenTabs([...openTabs, newTab])
    setActiveTab(tabId)
  }

  const closeTab = (tabId) => {
    if (tabId === 'dashboard') return // No cerrar el dashboard
    
    const newTabs = openTabs.filter(tab => tab.id !== tabId)
    setOpenTabs(newTabs)
    
    // Si cerramos la pestaña activa, activamos la anterior
    if (activeTab === tabId) {
      const lastTab = newTabs[newTabs.length - 1]
      setActiveTab(lastTab.id)
    }
  }

  if (loading) {
    return <LoadingSpinner text="Cargando información..." />
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-base-200 flex items-center justify-center">
        <div className="alert alert-error">
          <span>Error cargando información del usuario</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: 'rgba(77, 57, 48, 0.05)' }}>
      {/* Sidebar Lateral */}
      <div className="w-64 min-h-screen shadow-xl" style={{ backgroundColor: '#4d3930' }}>
        {/* Logo y Título del Sidebar */}
        <div className="p-4 border-b" style={{ borderColor: '#b47b21' }}>
          <h1 className="text-lg font-bold" style={{ color: '#ffffff' }}>⚙️ Admin Panel</h1>
          <p className="text-xs mt-1" style={{ color: '#f4b100' }}>Sistema de Admisión 2025</p>
        </div>

        {/* Menú de Navegación */}
        <nav className="p-3">
          <ul className="space-y-1">
            {/* Dashboard */}
            <li>
              <div 
                className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                  activeTab === 'dashboard' 
                    ? 'bg-opacity-20' 
                    : 'hover:bg-opacity-20'
                }`}
                style={{ 
                  backgroundColor: activeTab === 'dashboard' 
                    ? 'rgba(244, 177, 0, 0.2)' 
                    : 'rgba(180, 123, 33, 0.1)',
                  border: activeTab === 'dashboard' ? '1px solid #f4b100' : 'none',
                  ':hover': { backgroundColor: 'rgba(180, 123, 33, 0.2)' }
                }}
                onClick={() => setActiveTab('dashboard')}
              >
                <span className="text-lg mr-2" style={{ color: '#f4b100' }}>📊</span>
                <span className="text-sm" style={{ color: '#ffffff' }}>Dashboard</span>
              </div>
            </li>

            {/* Gestión de Preguntas */}
            <li>
              <div 
                className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                  activeTab === 'preguntas' 
                    ? 'bg-opacity-20' 
                    : 'hover:bg-opacity-20'
                }`}
                style={{ 
                  backgroundColor: activeTab === 'preguntas' 
                    ? 'rgba(244, 177, 0, 0.2)' 
                    : 'rgba(180, 123, 33, 0.1)',
                  border: activeTab === 'preguntas' ? '1px solid #f4b100' : 'none',
                  ':hover': { backgroundColor: 'rgba(180, 123, 33, 0.2)' }
                }}
                onClick={() => openTab('preguntas', '📝 Gestión de Preguntas', '📝')}
              >
                <span className="text-lg mr-2" style={{ color: '#f4b100' }}>📝</span>
                <span className="text-sm" style={{ color: '#ffffff' }}>Gestión de Preguntas</span>
              </div>
            </li>

            {/* Gestión de Usuarios */}
            <li>
              <div 
                className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                  activeTab === 'usuarios' 
                    ? 'bg-opacity-20' 
                    : 'hover:bg-opacity-20'
                }`}
                style={{ 
                  backgroundColor: activeTab === 'usuarios' 
                    ? 'rgba(244, 177, 0, 0.2)' 
                    : 'rgba(180, 123, 33, 0.1)',
                  border: activeTab === 'usuarios' ? '1px solid #f4b100' : 'none',
                  ':hover': { backgroundColor: 'rgba(180, 123, 33, 0.2)' }
                }}
                onClick={() => openTab('usuarios', '👥 Gestión de Usuarios', '👥')}
              >
                <span className="text-lg mr-2" style={{ color: '#ffffff' }}>👥</span>
                <span className="text-sm" style={{ color: '#ffffff' }}>Gestión de Usuarios</span>
              </div>
            </li>

            {/* Gestión de Categorías */}
            <li>
              <div 
                className={`flex items-center p-2 rounded-lg cursor-pointer transition-colors ${
                  activeTab === 'categorias' 
                    ? 'bg-opacity-20' 
                    : 'hover:bg-opacity-20'
                }`}
                style={{ 
                  backgroundColor: activeTab === 'categorias' 
                    ? 'rgba(244, 177, 0, 0.2)' 
                    : 'rgba(180, 123, 33, 0.1)',
                  border: activeTab === 'categorias' ? '1px solid #f4b100' : 'none',
                  ':hover': { backgroundColor: 'rgba(180, 123, 33, 0.2)' }
                }}
                onClick={() => openTab('categorias', '🏷️ Gestión de Categorías', '🏷️')}
              >
                <span className="text-lg mr-2" style={{ color: '#f4b100' }}>🏷️</span>
                <span className="text-sm" style={{ color: '#ffffff' }}>Gestión de Categorías</span>
              </div>
            </li>

            {/* Estadísticas */}
            <li>
              <div className="flex items-center p-3 rounded-lg cursor-pointer transition-colors hover:bg-opacity-20"
                   style={{ 
                     backgroundColor: 'rgba(180, 123, 33, 0.1)',
                     ':hover': { backgroundColor: 'rgba(180, 123, 33, 0.2)' }
                   }}
                   onClick={() => openTab('estadisticas', '📈 Estadísticas del Sistema', '📈')}
              >
                <span className="text-xl mr-3" style={{ color: '#f4b100' }}>📈</span>
                <span style={{ color: '#ffffff' }}>Estadísticas</span>
              </div>
            </li>

            {/* Reportes */}
            <li>
              <div className="flex items-center p-3 rounded-lg cursor-pointer transition-colors hover:bg-opacity-20"
                   style={{ 
                     backgroundColor: 'rgba(180, 123, 33, 0.1)',
                     ':hover': { backgroundColor: 'rgba(180, 123, 33, 0.2)' }
                   }}
                   onClick={() => openTab('reportes', '📊 Reportes de Estudiantes', '📊')}
              >
                <span className="text-xl mr-3" style={{ color: '#f4b100' }}>📊</span>
                <span style={{ color: '#ffffff' }}>Reportes</span>
              </div>
            </li>

            {/* Configuración */}
            <li>
              <div className="flex items-center p-3 rounded-lg cursor-pointer transition-colors hover:bg-opacity-20"
                   style={{ 
                     backgroundColor: 'rgba(180, 123, 33, 0.1)',
                     ':hover': { backgroundColor: 'rgba(180, 123, 33, 0.2)' }
                   }}
                   onClick={() => openTab('configuracion', '⚙️ Configuración de la Prueba', '⚙️')}
              >
                <span className="text-xl mr-3" style={{ color: '#f4b100' }}>⚙️</span>
                <span style={{ color: '#ffffff' }}>Configuración</span>
              </div>
            </li>

            {/* Cerrar Sesión */}
            <li>
              <div className="flex items-center p-3 rounded-lg cursor-pointer transition-colors hover:bg-opacity-20"
                   style={{ 
                     backgroundColor: 'rgba(180, 123, 33, 0.1)',
                     ':hover': { backgroundColor: 'rgba(220, 38, 38, 0.2)' }
                   }}
                   onClick={handleLogout}
              >
                <span className="text-xl mr-3" style={{ color: '#f4b100' }}>🚪</span>
                <span style={{ color: '#ffffff' }}>Cerrar Sesión</span>
              </div>
            </li>

          </ul>
        </nav>

        {/* Información del Usuario */}
        <div className="absolute bottom-0 left-0 right-0 p-3 border-t" style={{ borderColor: '#b47b21' }}>
          <div className="flex items-center">
            <div className="w-7 h-7 rounded-full flex items-center justify-center mr-2" style={{ backgroundColor: '#f4b100' }}>
              <span className="text-xs font-bold" style={{ color: '#4d3930' }}>
                {userInfo.nombre.charAt(0)}{userInfo.primer_apellido.charAt(0)}
              </span>
            </div>
            <div>
              <div className="text-xs font-medium" style={{ color: '#ffffff' }}>
                {userInfo.nombre} {userInfo.primer_apellido}
              </div>
              <div className="text-xs" style={{ color: '#f4b100' }}>Administrador</div>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="flex-1">
        {/* Header Superior */}
        <div className="navbar shadow-lg" style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #b47b21' }}>
          <div className="flex-1">
            <h1 className="text-xl font-bold" style={{ color: '#4d3930' }}>
              {activeTab === 'dashboard' && '📊 Dashboard Principal'}
              {activeTab === 'preguntas' && '📝 Gestión de Preguntas'}
              {activeTab === 'usuarios' && '👥 Gestión de Usuarios'}
            </h1>
          </div>
          <div className="flex-none gap-2">
            <ThemeToggle />
          </div>
        </div>

        {/* Barra de Pestañas */}
        {openTabs.length > 1 && (
          <div className="tabs tabs-boxed bg-base-200 p-2" style={{ backgroundColor: 'rgba(77, 57, 48, 0.05)' }}>
            {openTabs.map((tab) => (
              <div
                key={tab.id}
                className={`tab cursor-pointer transition-all ${
                  activeTab === tab.id ? 'tab-active' : ''
                }`}
                style={{
                  backgroundColor: activeTab === tab.id ? '#f4b100' : 'rgba(180, 123, 33, 0.1)',
                  color: activeTab === tab.id ? '#4d3930' : '#4d3930',
                  border: activeTab === tab.id ? '1px solid #b47b21' : '1px solid transparent'
                }}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="mr-2">{tab.icon}</span>
                <span className="text-sm">{tab.title.replace(/^[^\s]+\s/, '')}</span>
                {tab.closable && (
                  <button
                    className="ml-2 btn btn-xs btn-circle btn-ghost"
                    style={{ color: '#4d3930' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      closeTab(tab.id)
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Contenido de las Pestañas */}
        <div className="p-6">
          {/* Pestaña Dashboard */}
          {activeTab === 'dashboard' && (
            <>
              {/* Mensaje de Bienvenida */}
              <div className="hero rounded-box mb-6" style={{ background: 'linear-gradient(135deg, #4d3930 0%, #b47b21 100%)' }}>
                <div className="hero-content text-center">
                  <div className="max-w-md">
                    <h1 className="text-4xl font-bold mb-3" style={{ color: '#ffffff' }}>¡Bienvenido!</h1>
                    <p className="text-lg mb-4" style={{ color: '#ffffff' }}>
                      {userInfo.nombre} {userInfo.primer_apellido} {userInfo.segundo_apellido}
                    </p>
                    <p className="text-base" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                      Sistema de Admisión 2025 - Panel de Administración
                    </p>
                  </div>
                </div>
              </div>

              {/* Estadísticas Principales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {/* Total de Preguntas */}
                <div className="stat shadow-xl rounded-box" style={{ backgroundColor: '#ffffff', border: '1px solid #b47b21' }}>
                  <div className="stat-figure text-3xl" style={{ color: '#f4b100' }}>📝</div>
                  <div className="stat-title" style={{ color: '#4d3930' }}>Total de Preguntas</div>
                  <div className="stat-value" style={{ color: '#4d3930' }}>
                    {statsLoading ? '...' : stats?.total_preguntas || 0}
                  </div>
                  <div className="stat-desc" style={{ color: '#b47b21' }}>En el sistema</div>
                </div>

                {/* Total de Usuarios */}
                <div className="stat shadow-xl rounded-box" style={{ backgroundColor: '#ffffff', border: '1px solid #b47b21' }}>
                  <div className="stat-figure text-3xl" style={{ color: '#f4b100' }}>👥</div>
                  <div className="stat-title" style={{ color: '#4d3930' }}>Total de Usuarios</div>
                  <div className="stat-value" style={{ color: '#4d3930' }}>
                    {statsLoading ? '...' : stats?.total_usuarios || 0}
                  </div>
                  <div className="stat-desc" style={{ color: '#b47b21' }}>En el sistema</div>
                </div>

                {/* Usuarios Activos */}
                <div className="stat shadow-xl rounded-box" style={{ backgroundColor: '#ffffff', border: '1px solid #b47b21' }}>
                  <div className="stat-figure text-3xl" style={{ color: '#f4b100' }}>✅</div>
                  <div className="stat-title" style={{ color: '#4d3930' }}>Usuarios Activos</div>
                  <div className="stat-value" style={{ color: '#4d3930' }}>
                    {statsLoading ? '...' : stats?.usuarios_activos || 0}
                  </div>
                  <div className="stat-desc" style={{ color: '#b47b21' }}>Actualmente activos</div>
                </div>
              </div>

              {/* Mensaje de Estado */}
              <div className="alert" style={{ backgroundColor: 'rgba(244, 177, 0, 0.1)', border: '1px solid #f4b100' }}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6" style={{ color: '#f4b100' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <span style={{ color: '#4d3930' }}>
                  Panel de administración activo. Tienes acceso completo a todas las funcionalidades del sistema.
                </span>
              </div>
            </>
          )}

          {/* Pestaña Gestión de Preguntas */}
          {activeTab === 'preguntas' && (
            <GestionPreguntas />
          )}

          {/* Pestaña Gestión de Usuarios */}
          {activeTab === 'usuarios' && (
            <GestionUsuarios />
          )}

          {/* Pestaña Gestión de Categorías */}
          {activeTab === 'categorias' && (
            <GestionCategorias />
          )}

          {/* Pestaña Configuración de la Prueba */}
          {activeTab === 'configuracion' && (
            <ConfiguracionPrueba />
          )}

          {/* Pestaña Estadísticas */}
          {activeTab === 'estadisticas' && (
            <Estadisticas />
          )}

          {/* Pestaña Reportes */}
          {activeTab === 'reportes' && (
            <Reportes />
          )}

        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
