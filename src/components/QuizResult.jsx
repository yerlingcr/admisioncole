import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'

const QuizResult = () => {
  const { user, logout, getUserInfo } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quizData, setQuizData] = useState(null)
  const [score, setScore] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(0)
  const [correctAnswers, setCorrectAnswers] = useState(0)

  useEffect(() => {
    loadUserInfo()
    loadQuizData()
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

  const loadQuizData = () => {
    // Obtener datos del quiz desde el estado de navegación o localStorage
    const quizState = location.state?.quizData
    if (quizState) {
      setQuizData(quizState)
      calculateScore(quizState.answers, quizState.questions)
    } else {
      // Si no hay datos, redirigir al dashboard
      navigate('/estudiante/dashboard')
    }
  }

  const calculateScore = (answers, questions) => {
    let correct = 0
    const total = questions.length

    questions.forEach(question => {
      const userAnswer = answers[question.id]
      if (userAnswer) {
        const selectedOption = question.opciones.find(opt => opt.id === userAnswer)
        if (selectedOption && selectedOption.es_correcta) {
          correct++
        }
      }
    })

    setCorrectAnswers(correct)
    setTotalQuestions(total)
    setScore(Math.round((correct / total) * 100))
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleReturnToDashboard = () => {
    navigate('/estudiante/dashboard')
  }

  const getScoreColor = () => {
    if (score >= 80) return 'text-green-400'
    if (score >= 60) return 'text-yellow-400'
    return 'text-red-400'
  }

  const getScoreMessage = () => {
    if (score >= 90) return '¡Excelente! Has demostrado un dominio excepcional del tema.'
    if (score >= 80) return '¡Muy bien! Has mostrado un buen conocimiento del material.'
    if (score >= 70) return 'Bien hecho. Has alcanzado un nivel satisfactorio.'
    if (score >= 60) return 'Aprobado. Considera revisar algunos conceptos.'
    return 'Necesitas mejorar. Te recomendamos estudiar más el material.'
  }

  const getScoreEmoji = () => {
    if (score >= 80) return '🎉'
    if (score >= 60) return '👍'
    return '📚'
  }

  if (loading) {
    return <LoadingSpinner text="Cargando resultados..." />
  }

  if (!userInfo || !quizData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="alert alert-error">
          <span>Error cargando resultados del quiz</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      
      {/* Header */}
      <div className="bg-white/10 backdrop-blur-xl border-b border-white/20">
        <div className="navbar">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">🎓 Centro Educativo</h1>
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
                <li><button onClick={handleLogout} className="text-red-600">Cerrar Sesión</button></li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Tarjeta de Resultados */}
          <div className="card bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-8">
            <div className="card-body text-center">
              
              {/* Logo del Centro Educativo */}
              <div className="mb-6">
                <img
                  src="/img/ico/admision2025.png"
                  alt="Logo Centro Educativo"
                  className="w-24 h-24 mx-auto mb-4"
                />
                <h2 className="text-3xl font-bold text-white mb-2">Resultados del Quiz</h2>
                <p className="text-blue-200">Evaluación de Conocimientos 2025</p>
              </div>

              {/* Información del Estudiante */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white">
                  <div className="text-center">
                    <p className="text-sm text-blue-200">Estudiante</p>
                    <p className="font-semibold text-lg">{userInfo.nombre} {userInfo.primer_apellido}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-blue-200">Identificación</p>
                    <p className="font-semibold text-lg">{userInfo.identificacion}</p>
                  </div>
                </div>
              </div>

              {/* Puntuación */}
              <div className="mb-8">
                <div className={`text-8xl font-bold mb-4 ${getScoreColor()}`}>
                  {getScoreEmoji()}
                </div>
                <div className={`text-6xl font-bold mb-4 ${getScoreColor()}`}>
                  {score}%
                </div>
                <p className="text-white text-lg mb-2">
                  {correctAnswers} de {totalQuestions} preguntas correctas
                </p>
                <p className="text-blue-200 text-base">
                  {getScoreMessage()}
                </p>
              </div>

              {/* Detalles del Quiz */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/10">
                <h3 className="text-xl font-bold text-white mb-4">Detalles del Quiz</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-400">{totalQuestions}</p>
                    <p className="text-sm text-blue-200">Total Preguntas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-400">{correctAnswers}</p>
                    <p className="text-sm text-blue-200">Correctas</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-400">{totalQuestions - correctAnswers}</p>
                    <p className="text-sm text-blue-200">Incorrectas</p>
                  </div>
                </div>
              </div>

              {/* Mensaje de Estado */}
              <div className="bg-white/5 backdrop-blur-sm rounded-xl p-6 mb-8 border border-white/10">
                <div className="text-center">
                  {score >= 60 ? (
                    <div className="text-green-400">
                      <p className="text-2xl font-bold mb-2">✅ ¡APROBADO!</p>
                      <p className="text-white">Has completado exitosamente la evaluación de admisión.</p>
                    </div>
                  ) : (
                    <div className="text-red-400">
                      <p className="text-2xl font-bold mb-2">❌ NO APROBADO</p>
                      <p className="text-white">Necesitas mejorar tu puntuación para ser admitido.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleReturnToDashboard}
                  className="btn btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0"
                >
                  🏠 Volver al Dashboard
                </button>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline text-white border-white/30 hover:bg-white/20"
                >
                  🚪 Cerrar Sesión
                </button>
              </div>

              {/* Aviso Importante */}
              <div className="mt-8 p-4 bg-yellow-500/20 border border-yellow-500/30 rounded-xl">
                <p className="text-yellow-200 text-sm">
                  <strong>⚠️ Importante:</strong> Este quiz solo puede realizarse una vez. 
                  Los resultados han sido registrados en el sistema.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuizResult
