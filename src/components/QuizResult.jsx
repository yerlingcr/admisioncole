import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate, useLocation } from 'react-router-dom'
import LoadingSpinner from './LoadingSpinner'
import { institucionService } from '../services/institucionService'
import quizService from '../services/quizService'
import { supabase } from '../lib/supabaseConfig'

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
  const [informacionInstitucional, setInformacionInstitucional] = useState(null)
  const [quizConfig, setQuizConfig] = useState(null)
  const [intentosUsados, setIntentosUsados] = useState(0)
  const [timeUsed, setTimeUsed] = useState(0)
  const [timeLimit, setTimeLimit] = useState(0)
  const [categoriaEstudiante, setCategoriaEstudiante] = useState('')

  // Paleta de colores del sistema
  const colors = {
    primary: '#4d3930',
    secondary: '#f4b100',
    accent: '#b47b21',
    white: '#ffffff'
  }

  useEffect(() => {
    loadUserInfo()
    loadQuizData()
    loadInformacionInstitucional()
    loadQuizConfig()
  }, [])

  useEffect(() => {
    if (userInfo?.identificacion) {
      loadIntentosUsados().then(count => setIntentosUsados(count));
      loadCategoriaEstudiante();
    }
  }, [userInfo?.identificacion])

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
      
      // Extraer información de tiempo
      if (quizState.timeUsed !== undefined) {
        setTimeUsed(quizState.timeUsed)
      }
      if (quizState.timeLeft !== undefined) {
        setTimeLimit(quizState.timeLeft)
      }
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

  const loadQuizConfig = async () => {
    try {
      const config = await quizService.getQuizConfig();
      setQuizConfig(config);
    } catch (error) {
      console.error('Error cargando configuración del quiz:', error);
      // Usar configuración por defecto si hay error
      setQuizConfig({
        intentos_permitidos: 1
      });
    }
  };

  const loadIntentosUsados = async () => {
    try {
      const { data, error } = await supabase
        .from('intentos_quiz')
        .select('id')
        .eq('estudiante_id', userInfo.identificacion)
        .not('fecha_fin', 'is', null); // Solo intentos completados

      if (error) {
        console.error('Error cargando intentos usados:', error);
        return 0;
      }

      return data.length;
    } catch (error) {
      console.error('Error en loadIntentosUsados:', error);
      return 0;
    }
  };

  const loadCategoriaEstudiante = async () => {
    try {
      const { data, error } = await supabase
        .from('usuario_categorias')
        .select('categoria')
        .eq('usuario_id', userInfo.identificacion)
        .eq('activa', true)
        .single();

      if (error) {
        console.error('Error cargando categoría del estudiante:', error);
        setCategoriaEstudiante('Secretariado Ejecutivo'); // Fallback
        return;
      }

      if (data?.categoria) {
        setCategoriaEstudiante(data.categoria);
      } else {
        setCategoriaEstudiante('Secretariado Ejecutivo'); // Fallback
      }
    } catch (error) {
      console.error('Error en loadCategoriaEstudiante:', error);
      setCategoriaEstudiante('Secretariado Ejecutivo'); // Fallback
    }
  };

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleReturnToDashboard = () => {
    navigate('/estudiante/dashboard')
  }

  const oportunidadesDisponibles = quizConfig ? (quizConfig.intentos_permitidos - intentosUsados) : 0
  const seAgotaronIntentos = oportunidadesDisponibles <= 0

  const getScoreColor = () => {
    if (score >= 70) return 'text-green-400'
    return 'text-red-400'
  }

  const getScoreMessage = () => {
    if (score >= 90) return '¡Excelente! Has demostrado un dominio excepcional del tema.'
    if (score >= 80) return '¡Muy bien! Has mostrado un buen conocimiento del material.'
    if (score >= 70) return '¡Aprobado! Has alcanzado el nivel mínimo requerido para la admisión.'
    return 'No aprobado. Necesitas obtener al menos 70 puntos para ser admitido. Te recomendamos estudiar más el material.'
  }

  const getScoreEmoji = () => {
    if (score >= 70) return '🎉'
    return '📚'
  }

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getTotalTimeLimit = () => {
    if (quizConfig?.tiempo_limite_minutos) {
      return quizConfig.tiempo_limite_minutos * 60
    }
    return timeLimit + timeUsed
  }

  if (loading) {
    return <LoadingSpinner text="Cargando resultados..." />
  }

  if (!userInfo || !quizData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent}, ${colors.primary})` }}>
        <div className="alert alert-error">
          <span>Error cargando resultados del quiz</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ background: `linear-gradient(to bottom right, ${colors.primary}, ${colors.accent}, ${colors.primary})` }}>
      
      {/* Header */}
      <div style={{ backgroundColor: colors.primary + '20', backdropFilter: 'blur(10px)', borderBottom: '1px solid ' + colors.accent + '40' }}>
        <div className="navbar py-2">
          <div className="flex-1">
            <h1 className="text-lg font-bold" style={{ color: colors.white }}>
              🎓 {informacionInstitucional?.nombre_centro_educativo || 'Centro Educativo'} | {categoriaEstudiante || informacionInstitucional?.nombre_especialidad || 'Secretariado Ejecutivo'}
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
      </div>

      {/* Contenido Principal optimizado para pantallas pequeñas */}
      <div className="pt-28 px-4 pb-4">
        <div className="max-w-4xl mx-auto">
          
          {/* Tarjeta de Resultados Compacta */}
          <div className="card shadow-2xl mb-4" style={{ backgroundColor: colors.white + '10', backdropFilter: 'blur(10px)', border: '1px solid ' + colors.accent + '40' }}>
            <div className="card-body p-4 text-center">
              
              {/* Título */}
              <div className="mb-4">
                <h2 className="text-2xl font-bold mb-1" style={{ color: colors.white }}>Resultados de la Prueba</h2>
                <p className="text-sm" style={{ color: colors.secondary }}>Evaluación de Conocimientos, {categoriaEstudiante || 'Secretariado Ejecutivo'}</p>
              </div>

              {/* Información del Estudiante Compacta */}
              <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: colors.white + '05', backdropFilter: 'blur(10px)', border: '1px solid ' + colors.white + '10' }}>
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-center">
                    <p className="text-xs" style={{ color: colors.secondary }}>Estudiante</p>
                    <p className="font-semibold text-sm" style={{ color: colors.white }}>{userInfo.nombre} {userInfo.primer_apellido}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs" style={{ color: colors.secondary }}>Identificación</p>
                    <p className="font-semibold text-sm" style={{ color: colors.white }}>{userInfo.identificacion}</p>
                  </div>
                </div>
              </div>

              {/* Mensaje de Agradecimiento */}
              <div className="mb-4">
                <div className="text-4xl font-bold mb-2" style={{ color: colors.secondary }}>
                  🙏
                </div>
                <div className="text-2xl font-bold mb-2 p-3 rounded-lg" style={{ 
                  color: colors.white,
                  backgroundColor: colors.secondary + '30',
                  border: '2px solid ' + colors.secondary
                }}>
                  ¡Gracias por completar la prueba!
                </div>
                <p className="text-sm mb-1" style={{ color: colors.white }}>
                  Has respondido {totalQuestions} preguntas
                </p>
                <p className="text-xs" style={{ color: colors.secondary }}>
                  Los resultados han sido registrados en el sistema y serán evaluados por nuestro equipo académico.
                </p>
              </div>

              {/* Información General de la Prueba */}
              <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: colors.white + '05', backdropFilter: 'blur(10px)', border: '1px solid ' + colors.white + '10' }}>
                <h3 className="text-lg font-bold mb-2" style={{ color: colors.white }}>Información de la Prueba</h3>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: colors.accent + '20', border: '1px solid ' + colors.accent + '40' }}>
                    <p className="text-lg font-bold" style={{ color: colors.white }}>{totalQuestions}</p>
                    <p className="text-xs" style={{ color: colors.secondary }}>Preguntas</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: colors.secondary + '20', border: '1px solid ' + colors.secondary + '40' }}>
                    <p className="text-lg font-bold" style={{ color: colors.white }}>{formatTime(getTotalTimeLimit())}</p>
                    <p className="text-xs" style={{ color: colors.secondary }}>Duración Total</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: colors.accent + '20', border: '1px solid ' + colors.accent + '40' }}>
                    <p className="text-lg font-bold" style={{ color: colors.white }}>{formatTime(timeUsed)}</p>
                    <p className="text-xs" style={{ color: colors.secondary }}>Tiempo Usado</p>
                  </div>
                </div>
              </div>

              {/* Mensaje de Procesamiento */}
              <div className="rounded-xl p-3 mb-4" style={{ backgroundColor: colors.white + '05', backdropFilter: 'blur(10px)', border: '1px solid ' + colors.white + '10' }}>
                <div className="text-center">
                  <div style={{ color: colors.secondary }}>
                    <p className="text-lg font-bold mb-1">📋 Prueba Completada</p>
                    <p className="text-xs" style={{ color: colors.white }}>Tu evaluación ha sido enviada para revisión. Próximamente se publicarán los resultados, pregunta al Administrador.</p>
                  </div>
                </div>
              </div>

              {/* Botón de Acción */}
              <div className="flex justify-center">
                <button
                  onClick={handleReturnToDashboard}
                  className="btn btn-lg border-0 font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  style={{ backgroundColor: colors.secondary, color: colors.white }}
                >
                  🏠 Volver al Dashboard
                </button>
              </div>

              {/* Aviso Importante Compacto */}
              <div className="mt-4 p-2 rounded-xl" style={{ backgroundColor: colors.secondary + '20', border: '1px solid ' + colors.secondary + '30' }}>
                <p className="text-xs" style={{ color: colors.secondary }}>
                  <strong>⚠️ Importante:</strong> Esta prueba solo puede realizarse {quizConfig?.intentos_permitidos || 1} {(quizConfig?.intentos_permitidos || 1) === 1 ? 'vez' : 'veces'}. 
                  {seAgotaronIntentos ? 'Has agotado todas tus oportunidades.' : `Te quedan ${oportunidadesDisponibles} oportunidad${oportunidadesDisponibles === 1 ? '' : 'es'} disponible${oportunidadesDisponibles === 1 ? '' : 's'}.`}
                  Los resultados han sido registrados en el sistema. Haz clic en "Volver al Dashboard" para continuar.
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
