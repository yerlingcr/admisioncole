import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import quizService from '../services/quizService'
import { institucionService } from '../services/institucionService'
import Swal from 'sweetalert2'

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
  const [informacionInstitucional, setInformacionInstitucional] = useState(null)
  const [isProgressRestored, setIsProgressRestored] = useState(false)

  // Paleta de colores del sistema
  const colors = {
    primary: '#4d3930',
    secondary: '#f4b100',
    accent: '#b47b21',
    white: '#ffffff'
  }

  useEffect(() => {
    loadUserInfo()
  }, [])

  // Guardar progreso en localStorage cada vez que cambien las respuestas o el tiempo
  useEffect(() => {
    if (userInfo?.identificacion && questions.length > 0) {
      const progressData = {
        studentId: userInfo.identificacion,
        answers: answers,
        timeLeft: timeLeft,
        currentQuestion: currentQuestion,
        questions: questions,
        quizConfig: quizConfig,
        currentAttempt: currentAttempt,
        timestamp: Date.now()
      }
      localStorage.setItem('quizProgress', JSON.stringify(progressData))
    }
  }, [answers, timeLeft, currentQuestion, userInfo?.identificacion, questions, quizConfig, currentAttempt])


  useEffect(() => {
    if (userInfo?.identificacion) {
      // Primero verificar si hay progreso guardado
      const savedProgress = localStorage.getItem('quizProgress')
      if (savedProgress) {
        try {
          const progressData = JSON.parse(savedProgress)
          const isRecent = Date.now() - progressData.timestamp < 24 * 60 * 60 * 1000
          const isSameStudent = progressData.studentId === userInfo.identificacion
          
          if (isSameStudent && isRecent && progressData.questions?.length > 0) {
            console.log('🔄 Cargando progreso guardado en lugar de datos nuevos...')
            setAnswers(progressData.answers || {})
            setTimeLeft(progressData.timeLeft || 0)
            setCurrentQuestion(progressData.currentQuestion || 0)
            setQuestions(progressData.questions || [])
            setQuizConfig(progressData.quizConfig || null)
            setCurrentAttempt(progressData.currentAttempt || null)
            setIsProgressRestored(true) // Marcar que se restauró el progreso
            
            // Mostrar mensaje de progreso restaurado
            Swal.fire({
              title: 'Progreso Restaurado',
              text: 'Se ha restaurado tu progreso anterior. Puedes continuar donde lo dejaste.',
              icon: 'info',
              timer: 3000,
              timerProgressBar: true,
              showConfirmButton: false
            })
            
            // Solo cargar información institucional, no datos del quiz
            loadInformacionInstitucional()
            return // Salir temprano para no cargar datos nuevos
          }
        } catch (error) {
          console.error('Error cargando progreso guardado:', error)
          localStorage.removeItem('quizProgress')
        }
      }
      
      // Si no hay progreso guardado válido, cargar datos normalmente
      loadQuizData()
      loadInformacionInstitucional()
    }
  }, [userInfo])

  // Cronómetro
  useEffect(() => {
    // No iniciar el cronómetro si se acaba de restaurar el progreso
    if (isProgressRestored) {
      // Esperar 3 segundos antes de reanudar el cronómetro
      const resumeTimer = setTimeout(() => {
        setIsProgressRestored(false)
      }, 3000)
      return () => clearTimeout(resumeTimer)
    }
    
    if (timeLeft > 0 && !isProgressRestored) {
      const timer = setInterval(() => {
        setTimeLeft(prev => prev - 1)
      }, 1000)
      return () => clearInterval(timer)
    } else if (timeLeft === 0 && !isProgressRestored) {
      // Tiempo agotado, finalizar quiz
      handleFinishQuiz(true) // Pasar true para indicar que se acabó el tiempo
    }
  }, [timeLeft, isProgressRestored])

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

      // Obtener preguntas del quiz (con categorías específicas del usuario)
      const quizQuestions = await quizService.getQuizQuestions(config.numero_preguntas, null, userInfo.identificacion)
      console.log('Preguntas obtenidas:', quizQuestions)
      console.log('Estructura de la primera pregunta:', quizQuestions[0])
      console.log('¿Tiene opciones?', quizQuestions[0]?.opciones)
      console.log('Número de opciones:', quizQuestions[0]?.opciones?.length)
      console.log('Primera opción:', quizQuestions[0]?.opciones?.[0])
      
      // Validar que hay preguntas disponibles
      if (!quizQuestions || quizQuestions.length === 0) {
        console.warn('⚠️ No hay preguntas disponibles para este usuario')
        await Swal.fire({
          icon: 'warning',
          title: 'Prueba aún no disponible',
          text: 'Contacta al Administrador del Sistema para que habilite la Prueba.',
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#f4b100',
          allowOutsideClick: false
        })
        navigate('/estudiante/dashboard')
        return
      }
      
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
      await Swal.fire({
        icon: 'error',
        title: 'Error al cargar el quiz',
        text: 'Hubo un problema al cargar las preguntas. Por favor, intenta de nuevo.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f4b100'
      })
      navigate('/estudiante/dashboard')
    } finally {
      setLoading(false)
    }
  }

  const loadInformacionInstitucional = async () => {
    try {
      const info = await institucionService.getInformacionActiva();
      setInformacionInstitucional(info);
    } catch (error) {
      console.error('Error cargando información institucional:', error);
      // Usar información por defecto si hay error
      setInformacionInstitucional(institucionService.getInformacionPorDefecto());
    }
  };

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

  // Función para limpiar progreso guardado
  const clearSavedProgress = () => {
    localStorage.removeItem('quizProgress')
  }

  const handleFinishQuiz = async (isTimeUp = false) => {
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
        questions.filter(q => answers[q.id]).length,
        correctAnswers
      )

      // Limpiar progreso guardado al completar el quiz
      localStorage.removeItem('quizProgress')

      // Mostrar mensaje específico si se acabó el tiempo
      if (isTimeUp) {
        await Swal.fire({
          title: '⏰ Tiempo Agotado',
          html: `
            <div style="text-align: left;">
              <p><strong>Se ha agotado el tiempo para completar la prueba.</strong></p>
              <br>
              <p><strong>Tu prueba ha sido enviada automáticamente con:</strong></p>
              <ul style="margin-left: 20px;">
                <li><strong>Preguntas respondidas:</strong> ${questions.filter(q => answers[q.id]).length} de ${totalQuestions}</li>
                <li><strong>Tiempo utilizado:</strong> ${Math.floor(timeUsed / 60)}:${(timeUsed % 60).toString().padStart(2, '0')}</li>
                <li><strong>Respuestas correctas:</strong> ${correctAnswers}</li>
              </ul>
              <br>
              <p><strong>Los resultados serán evaluados y publicados próximamente.</strong></p>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'Ver Resultados',
          confirmButtonColor: '#f4b100',
          background: '#ffffff',
          color: '#4d3930',
          timer: 8000,
          timerProgressBar: true
        })
      }

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
            timeUsed,
            isTimeUp // Agregar flag para saber si se acabó el tiempo
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
    <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent}, ${colors.primary})` }}>
      
      {/* Header Fijo Compacto */}
      <div className="fixed top-0 left-0 right-0 z-50" style={{ backgroundColor: colors.primary + '20', backdropFilter: 'blur(10px)', borderBottom: '1px solid ' + colors.accent + '40' }}>
        <div className="navbar py-2">
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: colors.white }}>
              🎓 {informacionInstitucional?.nombre_centro_educativo || 'Centro Educativo'} | {informacionInstitucional?.nombre_especialidad || 'Secretariado Ejecutivo'}
            </h1>
          </div>
          <div className="flex-none">
            <div className="w-8 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: colors.accent }}>
              <span className="text-sm font-bold">
                {userInfo.nombre.charAt(0)}{userInfo.primer_apellido.charAt(0)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Información del estudiante y cronómetro compacto */}
        <div className="px-4 pb-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2" style={{ color: colors.white }}>
            <div className="text-center">
              <p className="text-xs" style={{ color: colors.secondary }}>Estudiante</p>
              <p className="text-sm font-semibold">{userInfo.nombre} {userInfo.primer_apellido}</p>
            </div>
            <div className="text-center">
              <p className="text-xs" style={{ color: colors.secondary }}>Identificación</p>
              <p className="text-sm font-semibold">{userInfo.identificacion}</p>
            </div>
            <div className="text-center">
              <p className="text-xs" style={{ color: colors.secondary }}>Tiempo Restante</p>
              <p className={`font-bold text-xl ${timeLeft <= 60 ? 'text-red-400' : 'text-green-400'}`}>
                {formatTime(timeLeft)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contenido Principal optimizado para pantallas pequeñas */}
      <div className="pt-28 px-4 pb-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Espacio inicial para mejor separación */}
          <div className="mb-6">
            
          </div>
          
          {/* Progreso de Preguntas Compacto */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg font-bold" style={{ color: colors.white }}>Pregunta {currentQuestion + 1} de {questions.length}</h2>
              <div className="flex space-x-1">
                {questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestion(index)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      index === currentQuestion
                        ? 'text-white'
                        : answers[questions[index].id]
                        ? 'text-white'
                        : 'text-white hover:bg-opacity-30'
                    }`}
                    style={{
                      backgroundColor: index === currentQuestion 
                        ? colors.accent 
                        : answers[questions[index].id]
                        ? colors.secondary
                        : colors.primary + '40'
                    }}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Barra de progreso */}
            <div className="w-full rounded-full h-1.5" style={{ backgroundColor: colors.primary + '40' }}>
              <div 
                className="h-1.5 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((currentQuestion + 1) / questions.length) * 100}%`,
                  backgroundColor: colors.accent
                }}
              ></div>
            </div>
          </div>

          {/* Pregunta Actual Compacta */}
          <div className="card shadow-2xl mb-4" style={{ backgroundColor: colors.white + '10', backdropFilter: 'blur(10px)', border: '1px solid ' + colors.accent + '40' }}>
            <div className="card-body p-4">
              {/* Imagen de la pregunta (si existe) */}
              {getCurrentQuestion()?.imagen_url && (
                <div className="mb-3 text-center">
                  <img
                    src={getCurrentQuestion().imagen_url}
                    alt="Imagen de la pregunta"
                    className="max-w-full h-auto max-h-48 mx-auto rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => handleImageClick(getCurrentQuestion().imagen_url)}
                  />
                  <p className="text-xs text-blue-200 mt-1">Haz clic en la imagen para ampliarla</p>
                </div>
              )}
              
              <h3 className="card-title text-lg mb-3" style={{ color: colors.white }}>
                {getCurrentQuestion()?.pregunta || 'Pregunta no disponible'}
              </h3>
              
              {/* Opciones de respuesta compactas */}
              <div className="space-y-2">
                {getCurrentQuestion()?.opciones && getCurrentQuestion().opciones.length > 0 ? (
                  getCurrentQuestion().opciones.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-all`}
                      style={{
                        borderColor: answers[getCurrentQuestion().id] === option.id
                          ? colors.accent
                          : colors.white + '30',
                        backgroundColor: answers[getCurrentQuestion().id] === option.id
                          ? colors.accent + '20'
                          : colors.white + '05',
                        ':hover': {
                          borderColor: answers[getCurrentQuestion().id] === option.id
                            ? colors.accent
                            : colors.white + '50'
                        }
                      }}
                    >
                      <input
                        type="radio"
                        name={`question-${getCurrentQuestion().id}`}
                        value={option.id}
                        checked={answers[getCurrentQuestion().id] === option.id}
                        onChange={() => handleAnswerSelect(getCurrentQuestion().id, option.id)}
                        className="radio mr-2"
                        style={{ accentColor: colors.accent }}
                      />
                      <span className="text-sm" style={{ color: colors.white }}>
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

          {/* Navegación Compacta */}
          <div className="flex justify-between items-center">
            <button
              onClick={handlePreviousQuestion}
              disabled={currentQuestion === 0}
              className="btn btn-sm btn-outline disabled:opacity-50"
              style={{ 
                color: colors.white, 
                borderColor: colors.white + '30',
                ':hover': { backgroundColor: colors.white + '20' }
              }}
            >
              ← Anterior
            </button>
            
            <div className="text-center" style={{ color: colors.white }}>
              <span className="text-xs" style={{ color: colors.secondary }}>Progreso:</span>
              <span className="ml-1 text-sm font-bold">
                {questions.filter(q => answers[q.id]).length} / {questions.length}
              </span>
            </div>
            
            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={() => handleFinishQuiz(false)}
                disabled={!isAllQuestionsAnswered()}
                className="btn btn-sm border-0 disabled:opacity-50"
                style={{ backgroundColor: colors.secondary, color: colors.white }}
              >
                🏁 Finalizar
              </button>
            ) : (
              <button
                onClick={handleNextQuestion}
                className="btn btn-sm border-0"
                style={{ backgroundColor: colors.accent, color: colors.white }}
              >
                Siguiente →
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Modal para ampliar imagen */}
      {showImageModal && (
        <div 
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 cursor-pointer"
          style={{ backgroundColor: colors.primary + 'E6' }}
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-w-4xl max-h-full">
            <img
              src={currentImage}
              alt="Imagen ampliada"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              onClick={() => setShowImageModal(false)}
              className="absolute -top-2 -right-2 btn btn-circle btn-sm text-white border-0"
              style={{ backgroundColor: colors.accent }}
            >
              ✕
            </button>
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-center">
              <p className="text-sm" style={{ color: colors.white }}>
                Haz clic en cualquier lugar para cerrar
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Quiz
