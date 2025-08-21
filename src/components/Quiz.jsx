import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import quizService from '../services/quizService'

const Quiz = () => {
  const { user, logout, getUserInfo } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState({})
  const [timeLeft, setTimeLeft] = useState(5 * 60) // 5 minutos en segundos
  const [showImageModal, setShowImageModal] = useState(false)
  const [currentImage, setCurrentImage] = useState('')

  const [questions, setQuestions] = useState([])
  const [quizConfig, setQuizConfig] = useState(null)
  const [currentAttempt, setCurrentAttempt] = useState(null)

  useEffect(() => {
    loadUserInfo()
  }, [])

  useEffect(() => {
    if (userInfo?.identificacion) {
      loadQuizData()
    }
  }, [userInfo])

  // Cronómetro
  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    } else {
      // Tiempo agotado, finalizar quiz
      handleFinishQuiz()
    }
  }, [timeLeft])

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

  const loadQuizData = async () => {
    try {
      if (!userInfo?.identificacion) {
        console.error('userInfo no está disponible')
        return
      }

      setLoading(true)
      console.log('Cargando datos del quiz para:', userInfo.identificacion)
      
      // Verificar si el estudiante puede realizar el quiz
      const canTakeQuiz = await quizService.canStudentTakeQuiz(userInfo.identificacion)
      if (!canTakeQuiz.canTake) {
        alert(canTakeQuiz.reason)
        navigate('/estudiante/dashboard')
        return
      }

      // Obtener configuración del quiz
      const config = await quizService.getQuizConfig()
      setQuizConfig(config)
      setTimeLeft(config.tiempo_limite_minutos * 60)

      // Obtener preguntas del quiz
      const quizQuestions = await quizService.getQuizQuestions(config.total_preguntas)
      console.log('Preguntas obtenidas:', quizQuestions)
      console.log('Estructura de la primera pregunta:', quizQuestions[0])
      console.log('¿Tiene opciones?', quizQuestions[0]?.opciones)
      console.log('Número de opciones:', quizQuestions[0]?.opciones?.length)
      console.log('Primera opción:', quizQuestions[0]?.opciones?.[0])
      setQuestions(quizQuestions)

      // Verificar si hay un intento activo para reanudar
      if (canTakeQuiz.hasActiveAttempt && canTakeQuiz.attemptId) {
        console.log('Reanudando intento existente:', canTakeQuiz.attemptId)
        const activeAttempt = await quizService.getActiveAttemptWithAnswers(userInfo.identificacion)
        if (activeAttempt) {
          setCurrentAttempt(activeAttempt)
          
          // Cargar respuestas existentes
          const existingAnswers = {}
          if (activeAttempt.respuestas_estudiante) {
            activeAttempt.respuestas_estudiante.forEach(respuesta => {
              existingAnswers[respuesta.pregunta_id] = respuesta.opcion_seleccionada_id
            })
          }
          setAnswers(existingAnswers)
          
          // Para debugging: siempre empezar con tiempo completo
          setTimeLeft(config.tiempo_limite_minutos * 60)
          
          console.log('Intento reanudado con respuestas:', existingAnswers)
          return
        }
      }

      // Crear nuevo intento de quiz
      console.log('Creando nuevo intento de quiz')
      const attempt = await quizService.createQuizAttempt(userInfo.identificacion)
      setCurrentAttempt(attempt)

    } catch (error) {
      console.error('Error cargando datos del quiz:', error)
      alert('Error cargando el quiz. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleAnswerSelect = async (questionId, optionId) => {
    try {
      // Actualizar estado local
      setAnswers(prev => ({
        ...prev,
        [questionId]: optionId
      }))

      // Guardar respuesta en Supabase si hay un intento activo
      if (currentAttempt) {
        const question = questions.find(q => q.id === questionId)
        const selectedOption = question?.opciones.find(opt => opt.id === optionId)
        const isCorrect = selectedOption?.es_correcta || false

        await quizService.saveStudentAnswer(
          currentAttempt.id,
          questionId,
          optionId,
          0, // tiempo_respuesta (por ahora 0)
          isCorrect
        )
      }
    } catch (error) {
      console.error('Error guardando respuesta:', error)
      // No mostrar error al usuario para no interrumpir el quiz
    }
  }

  const handleImageClick = (imageUrl) => {
    setCurrentImage(imageUrl)
    setShowImageModal(true)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1)
    }
  }

  const handleFinishQuiz = async () => {
    try {
      if (!currentAttempt) {
        alert('Error: No se encontró el intento del quiz')
        return
      }

      // Calcular puntuación
      let correctAnswers = 0
      const totalQuestions = questions.length

      questions.forEach(question => {
        const userAnswer = answers[question.id]
        if (userAnswer) {
          const selectedOption = question.opciones.find(opt => opt.id === userAnswer)
          if (selectedOption && selectedOption.es_correcta) {
            correctAnswers++
          }
        }
      })

      const score = Math.round((correctAnswers / totalQuestions) * 100)
      const timeUsed = (quizConfig.tiempo_limite_minutos * 60) - timeLeft

      // Finalizar intento en Supabase
      await quizService.finishQuizAttempt(
        currentAttempt.id,
        timeUsed,
        score,
        Object.keys(answers).length,
        correctAnswers
      )

      // Navegar a los resultados
      navigate('/estudiante/resultado', {
        state: {
          quizData: {
            answers,
            questions,
            timeLeft,
            userInfo,
            score,
            correctAnswers,
            totalQuestions,
            timeUsed
          }
        }
      })

    } catch (error) {
      console.error('Error finalizando quiz:', error)
      alert('Error al finalizar el quiz. Por favor, intenta de nuevo.')
    }
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getCurrentQuestion = () => questions[currentQuestion]

  const isAllQuestionsAnswered = () => {
    return questions.every(q => answers[q.id])
  }

  if (loading) {
    return <LoadingSpinner text="Cargando quiz..." />
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <div className="alert alert-error">
          <span>Error cargando información del usuario</span>
        </div>
      </div>
    )
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex items-center justify-center">
        <LoadingSpinner text="Cargando preguntas del quiz..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
      
      {/* Header Fijo */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-xl border-b border-white/20">
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
        
        {/* Información del estudiante y cronómetro */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
            <div className="text-center">
              <p className="text-sm text-blue-200">Estudiante</p>
              <p className="font-semibold">{userInfo.nombre} {userInfo.primer_apellido}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-200">Identificación</p>
              <p className="font-semibold">{userInfo.identificacion}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-blue-200">Tiempo Restante</p>
              <p className={`font-bold text-2xl ${timeLeft <= 60 ? 'text-red-400' : 'text-green-400'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal con padding-top para el header fijo */}
      <div className="pt-40 px-4 pb-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Progreso de Preguntas */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Pregunta {currentQuestion + 1} de {questions.length}</h2>
              <div className="flex space-x-2">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                      index === currentQuestion
                        ? 'bg-blue-600 text-white'
                        : answers[questions[index].id]
                        ? 'bg-green-600 text-white'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Barra de progreso */}
            <div className="w-full bg-white/20 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Pregunta Actual */}
          <div className="card bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl mb-8">
            <div className="card-body">
              <h3 className="card-title text-xl text-white mb-6">
                {getCurrentQuestion()?.pregunta || 'Pregunta no disponible'}
              </h3>
              
              {/* Imagen de la pregunta (si existe) */}
              {getCurrentQuestion()?.imagen_url && (
                <div className="mb-6 text-center">
                  <img
                    src={getCurrentQuestion().imagen_url}
                    alt="Imagen de la pregunta"
                    className="max-w-full h-auto max-h-64 mx-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick(getCurrentQuestion().imagen_url)}
                  />
                  <p className="text-sm text-blue-200 mt-2">Haz clic en la imagen para ampliarla</p>
                </div>
              )}
              
              {/* Opciones de respuesta */}
              <div className="space-y-3">
                {getCurrentQuestion()?.opciones && getCurrentQuestion().opciones.length > 0 ? (
                  getCurrentQuestion().opciones.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        answers[getCurrentQuestion().id] === option.id
                          ? 'border-blue-500 bg-blue-500/20'
                          : 'border-white/30 hover:border-white/50 bg-white/5'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`question-${getCurrentQuestion().id}`}
                        value={option.id}
                        checked={answers[getCurrentQuestion().id] === option.id}
                        onChange={() => handleAnswerSelect(getCurrentQuestion().id, option.id)}
                        className="radio radio-primary mr-3"
                      />
                      <span className="text-white font-medium">
                        {option.texto || option.texto_opcion}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-center text-red-400 p-4">
                    <p>No hay opciones disponibles para esta pregunta</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Navegación */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
              className="btn btn-outline text-white border-white/30 hover:bg-white/20 disabled:opacity-50"
            >
              ← Anterior
            </button>
            
            <div className="text-center text-white">
              <span className="text-sm text-blue-200">Progreso:</span>
              <span className="ml-2 font-bold">
                {Object.keys(answers).length} / {questions.length} preguntas respondidas
              </span>
            </div>
            
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={handleFinishQuiz}
                disabled={!isAllQuestionsAnswered()}
                className="btn btn-primary bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0 disabled:opacity-50"
              >
                🏁 Finalizar Quiz
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="btn btn-primary bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0"
              >
                Siguiente →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal para ampliar imagen */}
      {showImageModal && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
          <div className="relative max-w-4xl max-h-full">
            <img
              src={currentImage}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain"
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute top-4 right-4 btn btn-circle btn-sm bg-white/20 hover:bg-white/30 text-white border-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Quiz
