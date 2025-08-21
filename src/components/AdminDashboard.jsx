import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'

const AdminDashboard = () => {
  const { user, logout, getUserInfo } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)

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
      const { data, error } = await supabase.rpc('obtener_estadisticas_sistema')
      
      if (error) {
        console.error('Error cargando estadísticas:', error)
        return
      }
      
      if (data && data.length > 0) {
        setStats(data[0])
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
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
    <div className="min-h-screen bg-base-200">
      {/* Header */}
      <div className="navbar bg-base-100 shadow-lg">
        <div className="flex-1">
          <h1 className="text-xl font-bold">⚙️ Dashboard Administrador</h1>
        </div>
        <div className="flex-none gap-2">
          <ThemeToggle />
          <div className="dropdown dropdown-end">
            <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar">
              <div className="w-10 rounded-full bg-primary text-primary-content flex items-center justify-center">
                <span className="text-lg font-bold">
                  {userInfo.nombre.charAt(0)}{userInfo.primer_apellido.charAt(0)}
                </span>
              </div>
            </div>
            <ul tabIndex={0} className="mt-3 z-[1] menu menu-sm dropdown-content bg-base-100 rounded-box w-52 shadow">
              <li>
                <a className="justify-between">
                  Perfil
                  <span className="badge">Admin</span>
                </a>
              </li>
              <li><a>Configuración del Sistema</a></li>
              <li><button onClick={handleLogout}>Cerrar Sesión</button></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="container mx-auto px-4 py-8">
        {/* Mensaje de Bienvenida */}
        <div className="hero bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-box mb-8">
          <div className="hero-content text-center">
            <div className="max-w-md">
              <h1 className="text-5xl font-bold mb-4">¡Bienvenido!</h1>
              <p className="text-xl mb-6">
                {userInfo.nombre} {userInfo.primer_apellido} {userInfo.segundo_apellido}
              </p>
              <p className="text-lg opacity-90">
                Sistema de Admisión 2025 - Panel de Administración
              </p>
            </div>
          </div>
        </div>

        {/* Estadísticas del Sistema */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="stat bg-base-100 shadow-xl rounded-box">
            <div className="stat-figure text-primary text-3xl">👥</div>
            <div className="stat-title">Total Usuarios</div>
            <div className="stat-value text-primary">
              {statsLoading ? '...' : stats?.total_usuarios || 0}
            </div>
            <div className="stat-desc">En el sistema</div>
          </div>

          <div className="stat bg-base-100 shadow-xl rounded-box">
            <div className="stat-figure text-secondary text-3xl">🎓</div>
            <div className="stat-title">Estudiantes</div>
            <div className="stat-value text-secondary">
              {statsLoading ? '...' : stats?.estudiantes || 0}
            </div>
            <div className="stat-desc">Activos</div>
          </div>

          <div className="stat bg-base-100 shadow-xl rounded-box">
            <div className="stat-figure text-accent text-3xl">👨‍🏫</div>
            <div className="stat-title">Profesores</div>
            <div className="stat-value text-accent">
              {statsLoading ? '...' : stats?.profesores || 0}
            </div>
            <div className="stat-desc">En el sistema</div>
          </div>

          <div className="stat bg-base-100 shadow-xl rounded-box">
            <div className="stat-figure text-info text-3xl">⚙️</div>
            <div className="stat-title">Administradores</div>
            <div className="stat-value text-info">
              {statsLoading ? '...' : stats?.administradores || 0}
            </div>
            <div className="stat-desc">Con acceso total</div>
          </div>
        </div>

        {/* Información del Usuario */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Perfil del Usuario */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">👤 Perfil de Administrador</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Identificación:</span>
                  <span className="badge badge-primary">{userInfo.identificacion}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold">Nombre Completo:</span>
                  <span>{userInfo.nombre} {userInfo.primer_apellido} {userInfo.segundo_apellido}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold">Rol:</span>
                  <span className="badge badge-error">{userInfo.rol}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold">Email:</span>
                  <span className="text-primary">{userInfo.email}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold">Estado:</span>
                  <span className={`badge ${userInfo.estado === 'Activo' ? 'badge-success' : 'badge-error'}`}>
                    {userInfo.estado}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Estado del Sistema */}
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">🔧 Estado del Sistema</h2>
              
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Usuarios Activos:</span>
                  <span className="badge badge-success">
                    {statsLoading ? '...' : stats?.usuarios_activos || 0}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold">Usuarios Inactivos:</span>
                  <span className="badge badge-warning">
                    {statsLoading ? '...' : stats?.usuarios_inactivos || 0}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold">Último Registro:</span>
                  <span className="text-sm">
                    {statsLoading ? '...' : stats?.ultimo_registro ? 
                      new Date(stats.ultimo_registro).toLocaleDateString('es-ES') : 'N/A'
                    }
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-semibold">Sesión Activa:</span>
                  <span className="badge badge-success">Activa</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Acciones de Administración */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
            <div className="card-body text-center">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="card-title justify-center">Gestionar Usuarios</h3>
              <p className="text-sm text-gray-600">Administrar usuarios del sistema</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
            <div className="card-body text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="card-title justify-center">Estadísticas</h3>
              <p className="text-sm text-gray-600">Ver reportes detallados</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
            <div className="card-body text-center">
              <div className="text-4xl mb-4">⚙️</div>
              <h3 className="card-title justify-center">Configuración</h3>
              <p className="text-sm text-gray-600">Configurar parámetros del sistema</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
            <div className="card-body text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="card-title justify-center">Logs del Sistema</h3>
              <p className="text-sm text-gray-600">Revisar actividad del sistema</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
            <div className="card-body text-center">
              <div className="text-4xl mb-4">🔒</div>
              <h3 className="card-title justify-center">Seguridad</h3>
              <p className="text-sm text-gray-600">Configurar políticas de seguridad</p>
            </div>
          </div>

          <div className="card bg-base-100 shadow-xl hover:shadow-2xl transition-shadow cursor-pointer">
            <div className="card-body text-center">
              <div className="text-4xl mb-4">📈</div>
              <h3 className="card-title justify-center">Backup</h3>
              <p className="text-sm text-gray-600">Gestionar respaldos</p>
            </div>
          </div>
        </div>

        {/* Distribución por Provincias */}
        {stats && stats.usuarios_por_provincia && (
          <div className="card bg-base-100 shadow-xl mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl mb-4">🗺️ Distribución por Provincias</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats.usuarios_por_provincia).map(([provincia, count]) => (
                  <div key={provincia} className="flex justify-between items-center p-3 bg-base-200 rounded-lg">
                    <span className="font-medium">{provincia}</span>
                    <span className="badge badge-primary">{count} usuarios</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de Estado */}
        <div className="alert alert-info">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span>
            Panel de administración activo. Tienes acceso completo a todas las funcionalidades del sistema.
          </span>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
