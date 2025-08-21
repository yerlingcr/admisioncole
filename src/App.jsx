import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './components/Login'
import EstudianteDashboard from './components/EstudianteDashboard'
import Quiz from './components/Quiz'
import QuizResult from './components/QuizResult'
import AdminDashboard from './components/AdminDashboard'
import ThemeToggle from './components/ThemeToggle'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen">
          <Routes>
            {/* Ruta de login */}
            <Route path="/login" element={<Login />} />
            
            {/* Ruta raíz - redirigir según autenticación */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Rutas protegidas para estudiantes */}
            <Route 
              path="/estudiante/*" 
              element={
                <ProtectedRoute requiredRoles={['Estudiante']}>
                  <Routes>
                    <Route path="dashboard" element={<EstudianteDashboard />} />
                    <Route path="quiz" element={<Quiz />} />
                    <Route path="resultado" element={<QuizResult />} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </ProtectedRoute>
              } 
            />
            
            {/* Rutas protegidas para administradores */}
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requiredRoles={['Administrador']}>
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </ProtectedRoute>
              } 
            />
            
            {/* Rutas protegidas para profesores */}
            <Route 
              path="/profesor/*" 
              element={
                <ProtectedRoute requiredRoles={['Profesor']}>
                  <Routes>
                    <Route path="dashboard" element={<div>Dashboard Profesor (Próximamente)</div>} />
                    <Route path="*" element={<Navigate to="dashboard" replace />} />
                  </Routes>
                </ProtectedRoute>
              } 
            />
            
            {/* Ruta catch-all - redirigir al login */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App
