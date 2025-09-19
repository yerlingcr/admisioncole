import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import usuarioCategoriasService from '../services/usuarioCategoriasService'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'

const ProfesorDashboard = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [categoriaAsignada, setCategoriaAsignada] = useState(null)
  const [estadisticas, setEstadisticas] = useState({
    totalPreguntas: 0,
    preguntasCreadas: 0,
    totalEstudiantes: 0,
    estudiantesActivos: 0
  })
  const [preguntasCategoria, setPreguntasCategoria] = useState([])
  const [estudiantesCategoria, setEstudiantesCategoria] = useState([])
  const [notasEstudiantes, setNotasEstudiantes] = useState([])
  const [loadingNotas, setLoadingNotas] = useState(false)
  const [busquedaNotas, setBusquedaNotas] = useState('')
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null)
  const [detallesPrueba, setDetallesPrueba] = useState(null)
  const [loadingDetalles, setLoadingDetalles] = useState(false)

  useEffect(() => {
    loadUserInfo()
  }, [])

  useEffect(() => {
    if (categoriaAsignada && userInfo) {
      loadEstadisticas(categoriaAsignada)
      loadNotasEstudiantes()
    }
  }, [categoriaAsignada, userInfo])

  const loadUserInfo = async () => {
    try {
      if (user && user.identificacion) {
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('identificacion', user.identificacion)
          .single()
        
        if (error) throw error
        if (userData) {
          setUserInfo(userData)
          
          // Cargar categoría asignada al profesor
          await loadCategoriaAsignada(userData.identificacion)
        }
      }
    } catch (error) {
      console.error('Error cargando información del usuario:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadCategoriaAsignada = async (identificacion) => {
    try {
      const categorias = await usuarioCategoriasService.getCategoriasByUsuario(identificacion)
      
      if (categorias && categorias.length > 0 && categorias[0]) {
        setCategoriaAsignada(categorias[0])
        
        // La categoría puede venir como string o como objeto
        const nombreCategoria = typeof categorias[0] === 'string' ? categorias[0] : categorias[0].nombre
        
        if (nombreCategoria) {
          setCategoriaAsignada(nombreCategoria)
        }
      }
    } catch (error) {
      console.error('Error cargando categoría asignada:', error)
    }
  }

  const loadEstadisticas = async (categoria) => {
    try {
      
      // Cargar todas las preguntas de la categoría
      const { data: preguntasData, count: totalPreguntas } = await supabase
        .from('preguntas_quiz')
        .select('*', { count: 'exact' })
        .eq('categoria', categoria)
        .eq('activa', true)
        .order('fecha_creacion', { ascending: false })


      // Contar preguntas creadas por este profesor
      const { data: preguntasCreadasData, count: preguntasCreadas } = await supabase
        .from('preguntas_quiz')
        .select('*', { count: 'exact' })
        .eq('usuario_creador', userInfo?.identificacion)
        .eq('categoria', categoria)


      // Cargar estudiantes de la categoría con sus datos completos
      const { data: estudiantesCategoriaData } = await supabase
        .from('usuario_categorias')
        .select(`
          usuario_id,
          usuarios!inner(
            identificacion,
            nombre,
            primer_apellido,
            segundo_apellido,
            email,
            estado,
            rol
          )
        `)
        .eq('categoria', categoria)
        .eq('activa', true)
        .eq('usuarios.rol', 'Estudiante')

      const estudiantesCategoria = estudiantesCategoriaData?.map(item => item.usuarios) || []
      const totalEstudiantes = estudiantesCategoria.length

      // Contar estudiantes activos (estado = 'Activo')
      const estudiantesActivosCount = estudiantesCategoria.filter(e => e.estado === 'Activo').length

      setEstadisticas({
        totalPreguntas: totalPreguntas || 0,
        preguntasCreadas: preguntasCreadas || 0,
        totalEstudiantes,
        estudiantesActivos: estudiantesActivosCount
      })

      setPreguntasCategoria(preguntasData || [])
      setEstudiantesCategoria(estudiantesCategoria)
    } catch (error) {
      console.error('Error cargando estadísticas:', error)
    }
  }

  const getNotasFiltradas = () => {
    if (!busquedaNotas.trim()) {
      return notasEstudiantes
    }
    
    const terminoBusqueda = busquedaNotas.toLowerCase()
    return notasEstudiantes.filter(estudiante => 
      estudiante.identificacion.toLowerCase().includes(terminoBusqueda) ||
      estudiante.nombre.toLowerCase().includes(terminoBusqueda) ||
      estudiante.primer_apellido.toLowerCase().includes(terminoBusqueda) ||
      estudiante.segundo_apellido.toLowerCase().includes(terminoBusqueda) ||
      `${estudiante.nombre} ${estudiante.primer_apellido} ${estudiante.segundo_apellido}`.toLowerCase().includes(terminoBusqueda)
    )
  }

  const cargarDetallesPrueba = async (estudiante) => {
    try {
      setLoadingDetalles(true)
      setEstudianteSeleccionado(estudiante)
      
      // Mostrar barra de progreso
      const progressSwal = Swal.fire({
        title: 'Cargando detalles de la prueba...',
        html: `
          <div class="w-full bg-gray-200 rounded-full h-2.5 mb-4">
            <div id="progress-bar" class="bg-orange-600 h-2.5 rounded-full transition-all duration-300" style="width: 0%"></div>
          </div>
          <div id="progress-text" class="text-sm text-gray-600">Iniciando...</div>
        `,
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })
      
      // Función para actualizar progreso
      const updateProgress = (percentage, text) => {
        const progressBar = document.getElementById('progress-bar')
        const progressText = document.getElementById('progress-text')
        if (progressBar) progressBar.style.width = `${percentage}%`
        if (progressText) progressText.textContent = text
      }
      
      updateProgress(10, 'Buscando intentos del estudiante...')
      
      // Obtener el intento más reciente del estudiante
      const { data: intentos, error: errorIntentos } = await supabase
        .from('intentos_quiz')
        .select('*')
        .eq('estudiante_id', estudiante.identificacion)
        .order('fecha_inicio', { ascending: false })
        .limit(1)

      if (errorIntentos) {
        console.error('❌ Error obteniendo intentos:', errorIntentos)
        throw errorIntentos
      }

      if (!intentos || intentos.length === 0) {
        setDetallesPrueba(null)
        return
      }

      const intento = intentos[0]
      updateProgress(30, 'Obteniendo respuestas del estudiante...')

      // Obtener las respuestas del estudiante
      const { data: respuestas, error: errorRespuestas } = await supabase
        .from('respuestas_estudiante')
        .select('*')
        .eq('intento_id', intento.id)

      if (errorRespuestas) {
        console.error('❌ Error obteniendo respuestas:', errorRespuestas)
        throw errorRespuestas
      }

      updateProgress(50, 'Obteniendo preguntas de la categoría...')

      // Obtener todas las preguntas de la categoría
      const { data: preguntasCategoria, error: errorPreguntas } = await supabase
        .from('preguntas_quiz')
        .select('*')
        .eq('categoria', estudiante.categoria)

      if (errorPreguntas) {
        console.error('❌ Error obteniendo preguntas:', errorPreguntas)
        throw errorPreguntas
      }

      updateProgress(70, 'Procesando respuestas...')

      // Procesar las respuestas para obtener información completa
      const respuestasCompletas = []
      if (respuestas && respuestas.length > 0) {
        for (const respuesta of respuestas) {
          const { data: opcionSeleccionada, error: errorOpcion } = await supabase
            .from('opciones_respuesta')
            .select('id, texto_opcion, es_correcta, pregunta_id')
            .eq('id', respuesta.opcion_seleccionada_id)
            .single()

          if (errorOpcion) continue

          const { data: pregunta, error: errorPregunta } = await supabase
            .from('preguntas_quiz')
            .select('id, pregunta, imagen_url')
            .eq('id', opcionSeleccionada.pregunta_id)
            .single()

          if (errorPregunta) continue

          respuestasCompletas.push({
            ...respuesta,
            opcion_seleccionada: opcionSeleccionada,
            pregunta: pregunta
          })
        }
      }
      
      updateProgress(85, 'Cargando opciones de respuesta...')

      // Procesar preguntas con sus opciones
      const preguntasConOpciones = []
      for (const pregunta of preguntasCategoria || []) {
        const { data: opciones, error: errorOpciones } = await supabase
          .from('opciones_respuesta')
          .select('*')
          .eq('pregunta_id', pregunta.id)

        if (errorOpciones) {
          console.error('❌ Error obteniendo opciones para pregunta', pregunta.id, ':', errorOpciones)
          continue
        }

        preguntasConOpciones.push({
          ...pregunta,
          opciones_respuesta: opciones || []
        })
      }

      setDetallesPrueba({
        intento,
        respuestas: respuestasCompletas,
        todasLasPreguntas: preguntasConOpciones
      })

      updateProgress(100, '¡Completado!')
      
      setTimeout(() => {
        Swal.close()
      }, 500)

    } catch (error) {
      console.error('❌ Error cargando detalles de la prueba:', error)
      setDetallesPrueba(null)
      Swal.close()
      Swal.fire({
        title: 'Error',
        text: 'Hubo un problema al cargar los detalles de la prueba',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      })
    } finally {
      setLoadingDetalles(false)
    }
  }

  const generarPDFIndividual = async () => {
    if (!estudianteSeleccionado || !detallesPrueba) return

    // Mostrar loading
    Swal.fire({
      title: 'Generando PDF...',
      text: 'Por favor espere mientras se genera el reporte',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      const doc = new jsPDF('p', 'mm', 'letter')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 2
      const contentWidth = pageWidth - (margin * 2)
      
      // Función para agregar pie de página
      const addFooter = (totalPages) => {
        doc.setFontSize(10)
        doc.setFont('times', 'normal')
        
        // Categoría del estudiante
        doc.text(estudianteSeleccionado.categoria, margin, pageHeight - 10)
        
        // Número de página
        const currentPage = doc.internal.getCurrentPageInfo().pageNumber
        const pageText = `Página ${currentPage} de ${totalPages}`
        const textWidth = doc.getTextWidth(pageText)
        doc.text(pageText, pageWidth - margin - textWidth, pageHeight - 10)
      }
      
      // Configuración del documento
      doc.setFontSize(18)
      doc.setFont('times', 'bold')
      doc.text('Reporte Individual de Prueba', margin, margin + 10)
      
      // Información del estudiante
      doc.setFontSize(12)
      doc.setFont('times', 'normal')
      let yPosition = margin + 30
      
      doc.text(`Estudiante: ${estudianteSeleccionado.nombre} ${estudianteSeleccionado.primer_apellido} ${estudianteSeleccionado.segundo_apellido || ''}`, margin, yPosition)
      yPosition += 8
      doc.text(`Identificación: ${estudianteSeleccionado.identificacion}`, margin, yPosition)
      yPosition += 8
      doc.text(`Categoría: ${estudianteSeleccionado.categoria}`, margin, yPosition)
      yPosition += 8
      doc.text(`Fecha de realización: ${new Date(detallesPrueba.intento.fecha_fin).toLocaleDateString('es-CR')}`, margin, yPosition)
      yPosition += 8
      doc.text(`Nota obtenida: ${estudianteSeleccionado.notaObtenida}`, margin, yPosition)
      
      yPosition += 20
      
      // Agregar preguntas y respuestas
      doc.setFontSize(14)
      doc.setFont('times', 'bold')
      doc.text('Preguntas y Respuestas:', margin, yPosition)
      yPosition += 15
      
      for (let index = 0; index < detallesPrueba.todasLasPreguntas.length; index++) {
        const pregunta = detallesPrueba.todasLasPreguntas[index]
        
        // Calcular espacio necesario para la pregunta completa
        doc.setFontSize(12)
        doc.setFont('times', 'bold')
        const preguntaText = `${index + 1}. ${pregunta.pregunta}`
        const preguntaLines = doc.splitTextToSize(preguntaText, contentWidth)
        const preguntaHeight = (preguntaLines.length * 6) + 5
        
        // Calcular espacio necesario para la imagen si existe
        let imagenHeight = 0
        if (pregunta.imagen_url) {
          imagenHeight = 50
        }
        
        // Calcular espacio necesario para las opciones
        const opcionesHeight = 4 * 8
        
        // Espacio total necesario para esta pregunta completa
        const espacioNecesario = preguntaHeight + imagenHeight + opcionesHeight + 20
        
        // Verificar si necesitamos una nueva página para la pregunta completa
        if (yPosition + espacioNecesario > 270) {
          doc.addPage()
          yPosition = margin + 10
        }
        
        // Agregar imagen primero si existe
        if (pregunta.imagen_url) {
          try {
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            await new Promise((resolve, reject) => {
              img.onload = resolve
              img.onerror = reject
              img.src = pregunta.imagen_url
            })
            
            const maxWidth = contentWidth
            const maxHeight = 40
            let imgWidth = img.width * 0.3
            let imgHeight = img.height * 0.3
            
            if (imgWidth > maxWidth) {
              imgHeight = (imgHeight * maxWidth) / imgWidth
              imgWidth = maxWidth
            }
            if (imgHeight > maxHeight) {
              imgWidth = (imgWidth * maxHeight) / imgHeight
              imgHeight = maxHeight
            }
            
            doc.addImage(img, 'JPEG', margin, yPosition, imgWidth, imgHeight, undefined, 'FAST')
            yPosition += imgHeight + 10
            
          } catch (error) {
            console.error('Error cargando imagen:', error)
            doc.setFontSize(10)
            doc.setFont('times', 'italic')
            doc.text('(Imagen no disponible)', margin, yPosition)
            yPosition += 8
          }
        }
        
        // Agregar título de la pregunta después de la imagen
        doc.setFontSize(12)
        doc.setFont('times', 'bold')
        doc.text(preguntaLines, margin, yPosition)
        yPosition += preguntaHeight
        
        // Buscar la respuesta del estudiante
        const respuestaEstudiante = detallesPrueba.respuestas.find(r => 
          r.pregunta.id === pregunta.id
        )
        
        // Agregar opciones
        doc.setFontSize(12)
        doc.setFont('times', 'normal')
        
        pregunta.opciones_respuesta.forEach((opcion, opcionIndex) => {
          const esRespuestaEstudiante = respuestaEstudiante && respuestaEstudiante.opcion_seleccionada_id === opcion.id
          const esCorrecta = opcion.es_correcta
          
          let textoOpcion = `${String.fromCharCode(97 + opcionIndex)}. ${opcion.texto_opcion}`
          if (esRespuestaEstudiante) textoOpcion += ' ✓ (R/ Estudiante)'
          if (esCorrecta) textoOpcion += ' ✓ (Correcta)'
          
          const opcionLines = doc.splitTextToSize(textoOpcion, contentWidth - 10)
          doc.text(opcionLines, margin + 10, yPosition)
          yPosition += (opcionLines.length * 6) + 2
        })
        
        yPosition += 10
      }
      
      // Obtener el número total de páginas
      const totalPages = doc.internal.getNumberOfPages()
      
      // Agregar pie de página a todas las páginas
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        addFooter(totalPages)
      }
      
      // Guardar el PDF con compresión
      const nombreArchivo = `${estudianteSeleccionado.identificacion}.pdf`
      
      doc.save(nombreArchivo, { 
        returnPromise: false,
        compress: true,
        precision: 1
      })
      
      // Cerrar loading
      Swal.close()
      
      // Mostrar mensaje de éxito
      Swal.fire({
        title: '¡PDF Generado!',
        text: 'El reporte se ha descargado exitosamente',
        icon: 'success',
        confirmButtonColor: '#f97316'
      })
      
    } catch (error) {
      console.error('Error generando PDF:', error)
      Swal.close()
      
      Swal.fire({
        title: 'Error',
        text: 'Hubo un problema al generar el PDF',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      })
    }
  }

  const loadNotasEstudiantes = async () => {
    if (!categoriaAsignada) return
    
    try {
      setLoadingNotas(true)
      
      // Obtener configuración activa (mínimo y total de preguntas)
      const { data: config, error: configError } = await supabase
        .from('configuracion_quiz')
        .select('puntuacion_minima_aprobacion, total_preguntas')
        .eq('activa', true)
        .single()
      
      const puntuacionMinima = config?.puntuacion_minima_aprobacion || 70
      const totalPreguntas = config?.total_preguntas || 5

      // Obtener porcentaje de la prueba para la categoría
      const nombreCategoria = typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada
      const { data: categoriaInfo } = await supabase
        .from('categorias_quiz')
        .select('porcentaje_prueba')
        .eq('nombre', nombreCategoria)
        .limit(1)

      const porcentajePrueba = Array.isArray(categoriaInfo) && categoriaInfo.length > 0
        ? (categoriaInfo[0]?.porcentaje_prueba || 0)
        : 0
      
      // Obtener estudiantes de la categoría del profesor
      const { data: estudiantesCategoria, error: errorEstudiantes } = await supabase
        .from('usuario_categorias')
        .select(`
          usuario_id,
          usuarios!inner(identificacion, nombre, primer_apellido, segundo_apellido, rol)
        `)
        .eq('categoria', categoriaAsignada)
        .eq('activa', true)
        .eq('usuarios.rol', 'Estudiante')

      if (errorEstudiantes) {
        console.error('❌ Error cargando estudiantes:', errorEstudiantes)
        return
      }


      if (!estudiantesCategoria || estudiantesCategoria.length === 0) {
        setNotasEstudiantes([])
        return
      }

      // Obtener intentos de los estudiantes
      const estudianteIds = estudiantesCategoria.map(e => e.usuario_id)
      const { data: intentos, error: errorIntentos } = await supabase
        .from('intentos_quiz')
        .select('estudiante_id, puntuacion_total, fecha_fin')
        .in('estudiante_id', estudianteIds)
        .not('fecha_fin', 'is', null)
        .not('puntuacion_total', 'is', null)

      if (errorIntentos) {
        console.error('❌ Error cargando intentos:', errorIntentos)
        return
      }


      // Procesar datos para obtener la mejor nota de cada estudiante
      const notasConEstudiantes = estudiantesCategoria.map(estudiante => {
        const intentosEstudiante = intentos?.filter(i => i.estudiante_id === estudiante.usuario_id) || []
        
        // Obtener la mejor puntuación del estudiante
        const mejorIntento = intentosEstudiante.reduce((mejor, actual) => {
          return actual.puntuacion_total > mejor.puntuacion_total ? actual : mejor
        }, { puntuacion_total: 0 })

        const puntosObtenidos = Math.round((mejorIntento.puntuacion_total / 100) * totalPreguntas)
        const porcentajePonderado = ((mejorIntento.puntuacion_total * porcentajePrueba) / 100).toFixed(2)

        return {
          identificacion: estudiante.usuarios.identificacion,
          nombre: estudiante.usuarios.nombre,
          primer_apellido: estudiante.usuarios.primer_apellido,
          segundo_apellido: estudiante.usuarios.segundo_apellido,
          categoria: categoriaAsignada, // Agregar la categoría del profesor
          notaObtenida: mejorIntento.puntuacion_total || 0,
          puntosObtenidos,
          porcentajePonderado,
          intentosRealizados: intentosEstudiante.length,
          puntuacionMinima: puntuacionMinima
        }
      })

      // Ordenar por nota obtenida (mayor a menor)
      notasConEstudiantes.sort((a, b) => b.notaObtenida - a.notaObtenida)

      setNotasEstudiantes(notasConEstudiantes)
      
    } catch (error) {
      console.error('❌ Error cargando notas:', error)
    } finally {
      setLoadingNotas(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return <LoadingSpinner text="Cargando dashboard del profesor..." />
  }

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-amber-900 to-slate-800 flex items-center justify-center">
        <div className="alert alert-error">
          <span>Error cargando información del usuario</span>
        </div>
      </div>
    )
  }

  // Removemos la verificación de categoría - el profesor puede acceder sin categoría asignada

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">Dashboard Profesor</h1>
              <span className="badge bg-blue-600 text-white border-0">
                👤 {userInfo?.nombre || 'Usuario'} {userInfo?.primer_apellido || ''}
              </span>
              {categoriaAsignada && (
                <span className="badge bg-amber-600 text-white border-0">
                  📚 {typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}
                </span>
              )}
              {!categoriaAsignada && (
                <span className="badge bg-gray-500 text-white border-0">
                  ⚠️ Sin categoría asignada
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className="btn btn-outline btn-sm text-gray-600 hover:bg-gray-100"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Navegación */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => navigate('/profesor/dashboard')}
              className="py-4 px-1 border-b-2 border-amber-500 text-amber-600 font-medium"
            >
              Dashboard
            </button>
            <button
              onClick={() => navigate('/profesor/gestion-preguntas')}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Mis Preguntas
            </button>
            <button
              onClick={() => navigate('/profesor/gestion-estudiantes')}
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            >
              Mis Estudiantes
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-lg">📚</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Preguntas de Categoría</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {categoriaAsignada ? estadisticas.totalPreguntas : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-lg">✏️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Mis Preguntas</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {categoriaAsignada ? estadisticas.preguntasCreadas : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-lg">👥</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Estudiantes</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {categoriaAsignada ? estadisticas.totalEstudiantes : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-lg">✅</span>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Estudiantes Activos</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {categoriaAsignada ? estadisticas.estudiantesActivos : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Información de la Categoría - Solo mostrar si hay categoría asignada */}
        {categoriaAsignada && (
          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-xl text-gray-800 mb-4">
                📚 Información de tu Categoría
              </h2>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">🎯</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-amber-800">{typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}</h3>
                    <p className="text-amber-700">
                      Como profesor de esta categoría, puedes crear preguntas y gestionar estudiantes específicamente para esta área.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay categoría asignada */}
        {!categoriaAsignada && (
          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <h2 className="card-title text-xl text-gray-800 mb-4">
                ⚠️ Sin Categoría Asignada
              </h2>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-center space-x-4">
                  <div className="flex-shrink-0">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-yellow-800">Contacta al Administrador</h3>
                    <p className="text-yellow-700">
                      No tienes una categoría asignada. Contacta al administrador para que te asigne una categoría de preguntas y puedas gestionar contenido específico.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg text-gray-800 mb-4">📝 Gestión de Preguntas</h3>
              <p className="text-gray-600 mb-4">
                {categoriaAsignada 
                  ? `Crea y edita preguntas para la categoría "${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}". Solo podrás gestionar preguntas de esta categoría.`
                  : 'Crea y edita preguntas. Contacta al administrador para asignarte una categoría específica.'
                }
              </p>
              <button
                onClick={() => navigate('/profesor/gestion-preguntas')}
                className="btn btn-primary w-full"
                disabled={!categoriaAsignada}
              >
                {categoriaAsignada ? 'Ir a Mis Preguntas' : 'Sin Categoría Asignada'}
              </button>
            </div>
          </div>

          <div className="card bg-white border border-gray-300 shadow-lg">
            <div className="card-body">
              <h3 className="card-title text-lg text-gray-800 mb-4">👥 Gestión de Estudiantes</h3>
              <p className="text-gray-600 mb-4">
                {categoriaAsignada 
                  ? `Agrega y gestiona estudiantes de la categoría "${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}". Solo podrás gestionar estudiantes de esta categoría.`
                  : 'Agrega y gestiona estudiantes. Contacta al administrador para asignarte una categoría específica.'
                }
              </p>
              <button
                onClick={() => navigate('/profesor/gestion-estudiantes')}
                className="btn btn-primary w-full"
                disabled={!categoriaAsignada}
              >
                {categoriaAsignada ? 'Ir a Mis Estudiantes' : 'Sin Categoría Asignada'}
              </button>
            </div>
          </div>
        </div>

        {/* Sección de Notas de Estudiantes */}
        {categoriaAsignada && (
          <div className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="card-title text-xl text-gray-800">
                    📊 Notas de Estudiantes - "{typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}"
                  </h2>
                  <button
                    onClick={loadNotasEstudiantes}
                    className="btn btn-sm btn-outline"
                    disabled={loadingNotas}
                  >
                    {loadingNotas ? (
                      <>
                        <span className="loading loading-spinner loading-xs"></span>
                        Cargando...
                      </>
                    ) : (
                      <>
                        🔄 Actualizar
                      </>
                    )}
                  </button>
                </div>

                {/* Barra de búsqueda */}
                <div className="mb-4">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar por identificación, nombre o apellidos..."
                      value={busquedaNotas}
                      onChange={(e) => setBusquedaNotas(e.target.value)}
                      className="input input-bordered w-full pl-10 pr-4"
                    />
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                      🔍
                    </span>
                  </div>
                </div>

                {loadingNotas ? (
                  <div className="flex justify-center items-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                    <span className="ml-2">Cargando notas...</span>
                  </div>
                ) : getNotasFiltradas().length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th className="text-gray-700 font-semibold">#</th>
                          <th className="text-gray-700 font-semibold">Identificación</th>
                          <th className="text-gray-700 font-semibold">Nombre</th>
                          <th className="text-gray-700 font-semibold">Apellidos</th>
                          <th className="text-gray-700 font-semibold">Nota Obtenida</th>
                          <th className="text-gray-700 font-semibold">Puntos Obtenidos</th>
                          <th className="text-gray-700 font-semibold">%</th>
                          <th className="text-gray-700 font-semibold">Estado</th>
                          <th className="text-gray-700 font-semibold">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getNotasFiltradas().map((estudiante, index) => (
                          <tr key={estudiante.identificacion}>
                            <td className="font-medium text-gray-600">
                              {index + 1}
                            </td>
                            <td className="font-medium text-gray-800">
                              {estudiante.identificacion}
                            </td>
                            <td className="text-gray-700">
                              {estudiante.nombre}
                            </td>
                            <td className="text-gray-700">
                              {estudiante.primer_apellido} {estudiante.segundo_apellido || ''}
                            </td>
                            <td>
                              <span 
                                className={`badge badge-lg font-bold ${
                                  estudiante.notaObtenida > estudiante.puntuacionMinima 
                                    ? 'badge-success' 
                                    : 'badge-error'
                                }`}
                              >
                                {estudiante.notaObtenida}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-info">
                                {estudiante.puntosObtenidos}
                              </span>
                            </td>
                            <td>
                              <span className="badge badge-warning">
                                {estudiante.porcentajePonderado}%
                              </span>
                            </td>
                            <td>
                              <span 
                                className={`badge badge-sm ${
                                  estudiante.notaObtenida > estudiante.puntuacionMinima 
                                    ? 'badge-success' 
                                    : 'badge-error'
                                }`}
                              >
                                {estudiante.notaObtenida > estudiante.puntuacionMinima 
                                  ? '✅ Aprobado' 
                                  : '❌ Reprobado'
                                }
                              </span>
                            </td>
                            <td>
                              <button
                                onClick={() => cargarDetallesPrueba(estudiante)}
                                className="btn btn-sm btn-outline"
                                disabled={loadingDetalles}
                              >
                                {loadingDetalles && estudianteSeleccionado?.identificacion === estudiante.identificacion ? (
                                  <>
                                    <span className="loading loading-spinner loading-xs"></span>
                                    Cargando...
                                  </>
                                ) : (
                                  <>
                                    👁️ Ver Prueba
                                  </>
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="text-gray-400 text-6xl mb-4">
                      {busquedaNotas.trim() ? '🔍' : '📝'}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-600 mb-2">
                      {busquedaNotas.trim() ? 'No se encontraron resultados' : 'No hay notas disponibles'}
                    </h3>
                    <p className="text-gray-500">
                      {busquedaNotas.trim() 
                        ? `No hay estudiantes que coincidan con "${busquedaNotas}".`
                        : 'Los estudiantes de esta categoría aún no han completado la prueba.'
                      }
                    </p>
                  </div>
                )}

                {notasEstudiantes.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
                      <div>
                        <div className="text-2xl font-bold text-green-600">
                          {notasEstudiantes.filter(e => e.notaObtenida > e.puntuacionMinima).length}
                        </div>
                        <div className="text-sm text-gray-600">Aprobados</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {notasEstudiantes.filter(e => e.notaObtenida <= e.puntuacionMinima).length}
                        </div>
                        <div className="text-sm text-gray-600">Reprobados</div>
                      </div>
                    </div>
                    <div className="mt-4 text-center">
                      <p className="text-sm text-gray-500">
                        Puntuación mínima para aprobar: <span className="font-semibold">{notasEstudiantes[0]?.puntuacionMinima || 70}%</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Preguntas de la Categoría */}
        {categoriaAsignada && (
          <div className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="card-title text-xl text-gray-800">
                    📚 Preguntas de la Categoría "{typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}"
                  </h2>
                  <span className="badge badge-primary">
                    {preguntasCategoria.length} preguntas
                  </span>
                </div>
                
                {preguntasCategoria.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No hay preguntas en esta categoría aún.</p>
                    <button
                      onClick={() => navigate('/profesor/gestion-preguntas')}
                      className="btn btn-primary"
                    >
                      Crear Primera Pregunta
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th>Pregunta</th>
                          <th>Creador</th>
                          <th>Fecha</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preguntasCategoria.map((pregunta) => (
                          <tr key={pregunta.id}>
                            <td>
                              <div className="max-w-xs">
                                <p className="font-medium truncate">{pregunta.pregunta}</p>
                                {pregunta.imagen_url && (
                                  <span className="text-xs text-gray-500">📷 Con imagen</span>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className={`badge ${pregunta.usuario_creador === userInfo?.identificacion ? 'badge-success' : 'badge-neutral'}`}>
                                {pregunta.usuario_creador === userInfo?.identificacion ? 'Tú' : pregunta.usuario_creador || 'Sistema'}
                              </span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-500">
                                {new Date(pregunta.fecha_creacion).toLocaleDateString()}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${pregunta.activa ? 'badge-success' : 'badge-error'}`}>
                                {pregunta.activa ? 'Activa' : 'Inactiva'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lista de Estudiantes de la Categoría */}
        {categoriaAsignada && (
          <div className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="card-title text-xl text-gray-800">
                    👥 Estudiantes de la Categoría "{typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}"
                  </h2>
                  <span className="badge badge-primary">
                    {estudiantesCategoria.length} estudiantes
                  </span>
                </div>
                
                {estudiantesCategoria.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 mb-4">No hay estudiantes asignados a esta categoría aún.</p>
                    <button
                      onClick={() => navigate('/profesor/gestion-estudiantes')}
                      className="btn btn-primary"
                    >
                      Agregar Primer Estudiante
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table table-zebra w-full">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Identificación</th>
                          <th>Email</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {estudiantesCategoria.map((estudiante) => (
                          <tr key={estudiante.identificacion}>
                            <td>
                              <div className="font-medium">
                                {estudiante.nombre} {estudiante.primer_apellido} {estudiante.segundo_apellido || ''}
                              </div>
                            </td>
                            <td>
                              <span className="text-sm font-mono">{estudiante.identificacion}</span>
                            </td>
                            <td>
                              <span className="text-sm text-gray-500">{estudiante.email || 'Sin email'}</span>
                            </td>
                            <td>
                              <span className={`badge ${estudiante.estado === 'Activo' ? 'badge-success' : 'badge-error'}`}>
                                {estudiante.estado}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Modal para mostrar detalles de la prueba */}
        {detallesPrueba && estudianteSeleccionado && (
          <div className="modal modal-open">
            <div className="modal-box w-11/12 max-w-5xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-bold text-lg text-gray-800">
                  📋 Detalles de la Prueba - {estudianteSeleccionado.nombre} {estudianteSeleccionado.primer_apellido}
                </h3>
                <button
                  onClick={() => {
                    setDetallesPrueba(null)
                    setEstudianteSeleccionado(null)
                  }}
                  className="btn btn-sm btn-ghost"
                >
                  ✕
                </button>
              </div>

              {/* Información del estudiante */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Información básica */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Identificación:</span>
                      <div className="text-lg font-semibold text-gray-800">{estudianteSeleccionado.identificacion}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Categoría:</span>
                      <div className="text-lg font-semibold text-gray-800">{estudianteSeleccionado.categoria}</div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Fecha de realización:</span>
                      <div className="text-lg font-semibold text-gray-800">
                        {detallesPrueba?.intento?.fecha_fin 
                          ? new Date(detallesPrueba.intento.fecha_fin).toLocaleDateString('es-CR')
                          : 'N/A'
                        }
                      </div>
                    </div>
                  </div>
                  
                  {/* Resultados de la prueba */}
                  <div className="space-y-4">
                    <div>
                      <span className="text-sm font-medium text-gray-600">Nota obtenida:</span>
                      <div className="flex items-center mt-2">
                        <span className={`badge badge-lg font-bold text-lg ${
                          estudianteSeleccionado.notaObtenida > estudianteSeleccionado.puntuacionMinima 
                            ? 'badge-success' 
                            : 'badge-error'
                        }`}>
                          {estudianteSeleccionado.notaObtenida}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Puntos obtenidos:</span>
                      <div className="flex items-center mt-2">
                        <span className="badge badge-info badge-lg font-bold text-lg">
                          {estudianteSeleccionado.puntosObtenidos}
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Porcentaje ponderado:</span>
                      <div className="flex items-center mt-2">
                        <span className="badge badge-warning badge-lg font-bold text-lg">
                          {estudianteSeleccionado.porcentajePonderado}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botón de descarga PDF */}
              <div className="flex justify-center mb-8">
                <button
                  onClick={generarPDFIndividual}
                  className="btn btn-primary btn-lg px-8 py-3 text-lg font-semibold"
                >
                  📄 Descargar PDF Individual
                </button>
              </div>

              {/* Preguntas y respuestas */}
              <div className="space-y-6 max-h-96 overflow-y-auto">
                {detallesPrueba.todasLasPreguntas.map((pregunta, index) => {
                  const respuestaEstudiante = detallesPrueba.respuestas.find(r => 
                    r.pregunta.id === pregunta.id
                  )
                  

                  return (
                    <div key={pregunta.id} className="border border-gray-200 rounded-lg p-4">
                      {/* Imagen si existe */}
                      {pregunta.imagen_url && (
                        <div className="mb-4">
                          <img
                            src={pregunta.imagen_url}
                            alt={`Imagen pregunta ${index + 1}`}
                            className="max-w-xs rounded-lg border"
                          />
                        </div>
                      )}
                      
                      {/* Pregunta */}
                      <div className="mb-4">
                        <h4 className="font-semibold text-gray-800 mb-2">
                          {index + 1}. {pregunta.pregunta}
                        </h4>
                      </div>

                      {/* Opciones */}
                      <div className="space-y-2">
                        {(pregunta.opciones_respuesta || []).map((opcion, opcionIndex) => {
                          const esRespuestaEstudiante = respuestaEstudiante && respuestaEstudiante.opcion_seleccionada_id === opcion.id
                          const esCorrecta = opcion.es_correcta
                          
                          
                          return (
                            <div
                              key={opcion.id}
                              className={`p-2 rounded border ${
                                esRespuestaEstudiante 
                                  ? esCorrecta 
                                    ? 'border-green-500 bg-green-50' 
                                    : 'border-red-500 bg-red-50'
                                  : esCorrecta 
                                    ? 'border-green-300 bg-green-25' 
                                    : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center">
                                <span className="font-medium mr-2">
                                  {String.fromCharCode(97 + opcionIndex)}.
                                </span>
                                <span className="flex-1">{opcion.texto_opcion}</span>
                                {esRespuestaEstudiante && (
                                  <span className="badge badge-sm ml-2">Tu respuesta</span>
                                )}
                                {esCorrecta && (
                                  <span className="badge badge-sm badge-success ml-2">Correcta</span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>

              {detallesPrueba.respuestas.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No se encontraron respuestas para este estudiante.</p>
                </div>
              )}

              {detallesPrueba.todasLasPreguntas.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No se encontraron preguntas para esta categoría.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ProfesorDashboard


