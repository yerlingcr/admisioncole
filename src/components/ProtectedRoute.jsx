import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import LoadingSpinner from './LoadingSpinner'

const ProtectedRoute = ({ children, requiredRoles = [], redirectTo = '/login' }) => {
  const { user, loading, isAuthenticated } = useAuth()
  const location = useLocation()

  // Mostrar spinner mientras se verifica la autenticación
  if (loading) {
    return <LoadingSpinner text="Verificando autenticación..." />
  }

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Si se especificaron roles requeridos, verificar que el usuario tenga uno de ellos
  if (requiredRoles.length > 0) {
    const hasRequiredRole = requiredRoles.some(role => user.rol === role)
    
    if (!hasRequiredRole) {
      // Redirigir según el rol del usuario
      switch (user.rol) {
        case 'Administrador':
          return <Navigate to="/admin/dashboard" replace />
        case 'Profesor':
          return <Navigate to="/profesor/dashboard" replace />
        case 'Estudiante':
          return <Navigate to="/estudiante/dashboard" replace />
        default:
          return <Navigate to="/dashboard" replace />
      }
    }
  }

  // Si pasa todas las validaciones, mostrar el contenido
  return children
}

export default ProtectedRoute
