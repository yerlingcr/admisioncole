import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import usuarioCategoriasService from '../services/usuarioCategoriasService'
import OptimizedStatsService from '../services/optimizedStatsService'
import Swal from 'sweetalert2'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js'
import { Bar } from 'react-chartjs-2'
import ProfesorGestionPreguntas from './ProfesorGestionPreguntas'
import ProfesorGestionEstudiantes from './ProfesorGestionEstudiantes'

// Registrar componentes de Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

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
  const [notasEstudiantes, setNotasEstudiantes] = useState([])
  const [loadingNotas, setLoadingNotas] = useState(false)
  const [busquedaNotas, setBusquedaNotas] = useState('')
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null)
  const [detallesPrueba, setDetallesPrueba] = useState(null)
  const [loadingDetalles, setLoadingDetalles] = useState(false)
  const [topEstudiantesData, setTopEstudiantesData] = useState(null)
  const [preguntasFallidasData, setPreguntasFallidasData] = useState(null)
  const [preguntasAcertadasData, setPreguntasAcertadasData] = useState(null)
  const [mostrarNotas, setMostrarNotas] = useState(false)
  const [mostrarGraficos, setMostrarGraficos] = useState(false)
  const [seccionActiva, setSeccionActiva] = useState('dashboard')

  useEffect(() => {
    loadUserInfo()
  }, [])

  useEffect(() => {
    if (categoriaAsignada && userInfo) {
      loadEstadisticas(categoriaAsignada)
      loadNotasEstudiantes()
      loadTopEstudiantes()
      loadPreguntasFallidas()
      loadPreguntasAcertadas()
    }
  }, [categoriaAsignada, userInfo])

  // Refrescar estadísticas cuando se regresa al dashboard
  useEffect(() => {
    if (categoriaAsignada && userInfo && seccionActiva === 'dashboard') {
      console.log('🔄 Refrescando estadísticas del dashboard...')
      loadEstadisticas(categoriaAsignada)
      loadTopEstudiantes()
      loadPreguntasFallidas()
      loadPreguntasAcertadas()
    }
  }, [seccionActiva, categoriaAsignada, userInfo])

  // Cargar notas cuando se cambie a la sección de notas
  useEffect(() => {
    if (categoriaAsignada && userInfo && seccionActiva === 'notas') {
      console.log('🔄 Cargando notas de estudiantes...')
      loadNotasEstudiantes()
    }
  }, [seccionActiva, categoriaAsignada, userInfo])

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
      console.log('🚀 Cargando datos del profesor...')
      
      try {
        // Intentar usar el servicio optimizado primero
        const professorData = await OptimizedStatsService.getProfessorData(identificacion)
        
        if (professorData?.categoria_asignada) {
          setCategoriaAsignada(professorData.categoria_asignada)
          setEstadisticas({
            totalPreguntas: professorData.total_preguntas_categoria || 0,
            preguntasCreadas: 0,
            totalEstudiantes: professorData.total_estudiantes || 0,
            estudiantesActivos: professorData.estudiantes_activos || 0,
            totalIntentos: professorData.intentos_categoria || 0
          })
          console.log('✅ Datos del profesor cargados con RPC:', professorData)
          return
        }
      } catch (rpcError) {
        // Usando método original (RPC no disponible)
      }
      
      // Fallback al método original
      const categorias = await usuarioCategoriasService.getCategoriasByUsuario(identificacion)
      
      if (categorias && categorias.length > 0 && categorias[0]) {
        const nombreCategoria = typeof categorias[0] === 'string' ? categorias[0] : categorias[0].nombre
        
        if (nombreCategoria) {
          setCategoriaAsignada(nombreCategoria)
          // Categoría cargada exitosamente
        }
      }
    } catch (error) {
      console.error('Error cargando datos del profesor:', error)
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

  // Función para exportar notas a Excel
  const exportarAExcel = () => {
    try {
      const datosParaExportar = getNotasFiltradas().map((estudiante, index) => ({
        '#': index + 1,
        'Identificación': estudiante.identificacion,
        'Nombre': estudiante.nombre,
        'Apellidos': `${estudiante.primer_apellido} ${estudiante.segundo_apellido || ''}`.trim(),
        'Nota Obtenida': estudiante.notaObtenida,
        'Puntos': estudiante.puntosObtenidos,
        '%': estudiante.porcentajePonderado
      }))

      // Crear libro de trabajo
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(datosParaExportar)

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Notas de Estudiantes')

      // Generar archivo Excel
      const nombreArchivo = `Notas_${categoriaAsignada}_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(wb, nombreArchivo)

      Swal.fire({
        title: '¡Excel Generado!',
        text: 'El archivo Excel se ha descargado exitosamente',
        icon: 'success',
        confirmButtonColor: '#f97316'
      })
    } catch (error) {
      console.error('Error generando Excel:', error)
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al generar el archivo Excel',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      })
    }
  }

  // Función para exportar notas a PDF
  const exportarAPDF = () => {
    try {
      const doc = new jsPDF('landscape', 'mm', 'a4')
      
      // Título
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Notas de Estudiantes', 20, 20)
      
      // Información de la especialidad
      doc.setFontSize(12)
      doc.setFont('helvetica', 'normal')
      doc.text(`Especialidad: ${categoriaAsignada}`, 20, 30)
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-CR')}`, 20, 35)
      doc.text(`Total de estudiantes: ${getNotasFiltradas().length}`, 20, 40)

      // Preparar datos para la tabla
      const datosTabla = getNotasFiltradas().map((estudiante, index) => [
        index + 1,
        estudiante.identificacion,
        estudiante.nombre,
        `${estudiante.primer_apellido} ${estudiante.segundo_apellido || ''}`.trim(),
        estudiante.notaObtenida,
        estudiante.puntosObtenidos,
        `${estudiante.porcentajePonderado}%`
      ])

      // Crear tabla
      autoTable(doc, {
        startY: 50,
        head: [['#', 'Identificación', 'Nombre', 'Apellidos', 'Nota Obtenida', 'Puntos', '%']],
        body: datosTabla,
        styles: {
          fontSize: 10,
          cellPadding: 3,
        },
        headStyles: {
          fillColor: [77, 57, 48], // Color café
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        margin: { left: 20, right: 20 }
      })

      // Pie de página
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.text(`Sistema de Admisión 2025 - Página ${i} de ${pageCount}`, 20, doc.internal.pageSize.getHeight() - 10)
      }

      // Guardar archivo
      const nombreArchivo = `Notas_${categoriaAsignada}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(nombreArchivo)

      Swal.fire({
        title: '¡PDF Generado!',
        text: 'El archivo PDF se ha descargado exitosamente',
        icon: 'success',
        confirmButtonColor: '#f97316'
      })
    } catch (error) {
      console.error('Error generando PDF:', error)
      Swal.fire({
        title: 'Error',
        text: 'Ocurrió un error al generar el archivo PDF',
        icon: 'error',
        confirmButtonColor: '#dc3545'
      })
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
      
      yPosition += 15
      
      // Agregar resumen de estadísticas usando datos reales
      doc.setFontSize(14)
      doc.setFont('times', 'bold')
      doc.text('Resumen de Resultados:', margin, yPosition)
      yPosition += 12
      
      doc.setFontSize(12)
      doc.setFont('times', 'normal')
      doc.text(`• Preguntas correctas: ${detallesPrueba.intento.preguntas_correctas}`, margin + 5, yPosition)
      yPosition += 8
      doc.text(`• Preguntas incorrectas: ${detallesPrueba.intento.preguntas_respondidas - detallesPrueba.intento.preguntas_correctas}`, margin + 5, yPosition)
      yPosition += 8
      doc.text(`• Preguntas sin responder: ${estudianteSeleccionado.totalPreguntas - detallesPrueba.intento.preguntas_respondidas}`, margin + 5, yPosition)
      yPosition += 8
      doc.text(`• Total de preguntas: ${detallesPrueba.intento.preguntas_respondidas}`, margin + 5, yPosition)
      
      yPosition += 20
      
      // Agregar preguntas y respuestas
      doc.setFontSize(14)
      doc.setFont('times', 'bold')
      doc.text('Preguntas y Respuestas:', margin, yPosition)
      yPosition += 15
      
      // El PDF refleja SOLO los datos oficiales de la Base de Datos
      // Usamos estudianteSeleccionado que viene directamente de intentos_quiz
      
      // Para mostrar en el PDF, simplemente usamos los datos de BD
      // y marcamos las preguntas según las respuestas guardadas
      for (let index = 0; index < detallesPrueba.todasLasPreguntas.length; index++) {
        const pregunta = detallesPrueba.todasLasPreguntas[index]
        
        // Verificar si esta pregunta fue respondida correctamente
        const respuestaEstudiante = detallesPrueba.respuestas.find(r => 
          r.pregunta.id === pregunta.id
        )
        
        // Solo mostrar visualmente - sin análisis de conteo problemático
        
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
        
        // Usar la respuestaEstudiante ya declarada arriba
        
        // Agregar opciones
        doc.setFontSize(12)
        doc.setFont('times', 'normal')
        
        pregunta.opciones_respuesta.forEach((opcion, opcionIndex) => {
          const esRespuestaEstudiante = respuestaEstudiante && respuestaEstudiante.opcion_seleccionada_id === opcion.id
          const esLaRespuestaCorrecta = opcion.es_correcta
          
          let textoOpcion = `${String.fromCharCode(97 + opcionIndex)}. ${opcion.texto_opcion}`
          if (esRespuestaEstudiante) textoOpcion += ' ✓ (R/ Estudiante)'
          if (esLaRespuestaCorrecta) textoOpcion += ' ✓ (Correcta)'
          
          const opcionLines = doc.splitTextToSize(textoOpcion, contentWidth - 10)
          doc.text(opcionLines, margin + 10, yPosition)
          yPosition += (opcionLines.length * 6) + 2
        })
        
        // Solo mostrar visualmente - sin conteo problemático
        
        yPosition += 10
      }
      
      // El PDF usa SOLO los datos oficiales de intentos_quiz
      // No hay análisis de discrepancias - fuente única de verdad
      
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

  const loadTopEstudiantes = async () => {
    if (!categoriaAsignada) return
    
    try {
      console.log('🚀 Cargando top estudiantes...')
      
      try {
        // Intentar usar el servicio optimizado primero
        const topStudents = await OptimizedStatsService.getTopStudents(categoriaAsignada, 10)
        
        if (topStudents && topStudents.length > 0) {
          // Procesar datos para el formato esperado por el gráfico
          const estudiantesConMejoresNotas = topStudents.map(estudiante => ({
            identificacion: estudiante.estudiante_id,
            nombre: estudiante.nombre_completo.split(' ')[0] || '',
            apellidos: estudiante.nombre_completo.split(' ').slice(1).join(' ') || '',
            notaObtenida: estudiante.puntuacion_total || 0,
            fechaIntento: estudiante.fecha_fin || null
          }))
          
          console.log('✅ Top estudiantes cargados con RPC:', estudiantesConMejoresNotas.length)
          
          // Continuar con el procesamiento normal
          processTopStudentsData(estudiantesConMejoresNotas)
          return
        }
      } catch (rpcError) {
        // Usando método original (RPC no disponible)
      }
      
      // Fallback al método original
        // Usando método original para top estudiantes
      
      // Obtener estudiantes de la categoría del profesor
      const { data: estudiantesCategoria, error: errorEstudiantes } = await supabase
        .from('usuario_categorias')
        .select(`
          usuario_id,
          usuarios!inner(
            identificacion,
            nombre,
            primer_apellido,
            segundo_apellido,
            estado
          )
        `)
        .eq('categoria', categoriaAsignada)
        .eq('usuarios.rol', 'Estudiante')

      if (errorEstudiantes) {
        console.error('❌ Error cargando estudiantes para top:', errorEstudiantes)
        return
      }

      if (!estudiantesCategoria || estudiantesCategoria.length === 0) {
        setTopEstudiantesData(null)
        return
      }

      // Obtener intentos de los estudiantes
      const estudianteIds = estudiantesCategoria.map(item => item.usuario_id)
      const { data: intentos, error: errorIntentos } = await supabase
        .from('intentos_quiz')
        .select('estudiante_id, puntuacion_total, fecha_fin')
        .in('estudiante_id', estudianteIds)
        .not('fecha_fin', 'is', null)
        .not('puntuacion_total', 'is', null)

      if (errorIntentos) {
        console.error('❌ Error cargando intentos para top:', errorIntentos)
        return
      }

      // Procesar datos para obtener la mejor nota de cada estudiante
      const estudiantesConMejoresNotas = estudiantesCategoria.map(estudiante => {
        const intentosEstudiante = intentos?.filter(i => i.estudiante_id === estudiante.usuario_id) || []
        
        // Obtener la mejor puntuación del estudiante
        const mejorIntento = intentosEstudiante.reduce((mejor, actual) => {
          return actual.puntuacion_total > mejor.puntuacion_total ? actual : mejor
        }, { puntuacion_total: 0 })

        return {
          identificacion: estudiante.usuarios.identificacion,
          nombre: estudiante.usuarios.nombre,
          apellidos: `${estudiante.usuarios.primer_apellido} ${estudiante.usuarios.segundo_apellido || ''}`.trim(),
          notaObtenida: mejorIntento.puntuacion_total || 0,
          fechaIntento: mejorIntento.fecha_fin || null
        }
      })
      
      // Top estudiantes cargados exitosamente
      
      // Procesar los datos
      processTopStudentsData(estudiantesConMejoresNotas)
      
    } catch (error) {
      console.error('❌ Error cargando top estudiantes:', error)
      setTopEstudiantesData(null)
    }
  }

  // Función helper para procesar los datos de top estudiantes
  const processTopStudentsData = (estudiantesConMejoresNotas) => {
    try {
      // Filtrar estudiantes con notas > 0 y ordenar por nota descendente
      const estudiantesConNotas = estudiantesConMejoresNotas
        .filter(estudiante => estudiante.notaObtenida > 0)
        .sort((a, b) => b.notaObtenida - a.notaObtenida)
        .slice(0, 10) // Top 10

      // Preparar datos para el gráfico
      if (estudiantesConNotas.length > 0) {
        const chartData = {
          labels: estudiantesConNotas.map(estudiante => 
            `${estudiante.nombre} ${estudiante.apellidos}`
          ),
          datasets: [
            {
              label: 'Nota Obtenida',
              data: estudiantesConNotas.map(estudiante => estudiante.notaObtenida),
              backgroundColor: [
                '#4d3930', // Color primario
                '#b47b21', // Color secundario
                '#f4b100', // Color accent
                '#10b981', // Verde
                '#3b82f6', // Azul
                '#8b5cf6', // Púrpura
                '#f59e0b', // Amarillo
                '#ef4444', // Rojo
                '#06b6d4', // Cian
                '#84cc16'  // Verde lima
              ],
              borderColor: [
                '#2d2119',
                '#8b5c0f',
                '#c49100',
                '#059669',
                '#2563eb',
                '#7c3aed',
                '#d97706',
                '#dc2626',
                '#0891b2',
                '#65a30d'
              ],
              borderWidth: 2
            }
          ]
        }

        setTopEstudiantesData(chartData)
      } else {
        setTopEstudiantesData(null)
      }
    } catch (error) {
      console.error('❌ Error procesando datos de top estudiantes:', error)
      setTopEstudiantesData(null)
    }
  }

  // Función para cargar las 3 preguntas que más fallaron
  const loadPreguntasFallidas = async () => {
    if (!categoriaAsignada) return
    
    try {
      console.log('🚀 Cargando preguntas que más fallaron...')
      
      // Intentar primero con consulta optimizada
      try {
        const { data: respuestasIncorrectas, error } = await supabase
          .from('respuestas_estudiante')
          .select(`
            pregunta_id,
            intento_id,
            preguntas_quiz!inner(
              id,
              pregunta,
              categoria
            )
          `)
          .eq('preguntas_quiz.categoria', categoriaAsignada)
          .eq('es_correcta', false)

        if (error) {
          // Silenciar error de RPC no disponible para usuarios finales
          throw error
        }

        await processPreguntasFallidas(respuestasIncorrectas)
        return

      } catch (optimizedError) {
        // Usando método original para preguntas fallidas
        
        // Método original con consultas separadas
        const { data: preguntas, error: preguntasError } = await supabase
          .from('preguntas_quiz')
          .select('id, pregunta, categoria')
          .eq('categoria', categoriaAsignada)

        if (preguntasError) {
          console.error('❌ Error cargando preguntas:', preguntasError)
          setPreguntasFallidasData(null)
          return
        }

        const { data: respuestas, error: respuestasError } = await supabase
          .from('respuestas_estudiante')
          .select('pregunta_id, es_correcta, intento_id')
          .eq('es_correcta', false)
          .in('pregunta_id', preguntas.map(p => p.id))

        if (respuestasError) {
          console.error('❌ Error cargando respuestas:', respuestasError)
          setPreguntasFallidasData(null)
          return
        }

        // Obtener opciones para cada pregunta
        const preguntasConOpciones = await Promise.all(
          preguntas.map(async (pregunta) => {
            const { data: opciones } = await supabase
              .from('opciones_quiz')
              .select('id, opcion_texto, es_correcta')
              .eq('pregunta_id', pregunta.id)
            
            return {
              ...pregunta,
              opciones_quiz: opciones || []
            }
          })
        )

        // Procesar respuestas con datos de preguntas
        const respuestasConPreguntas = respuestas.map(respuesta => ({
          pregunta_id: respuesta.pregunta_id,
          es_correcta: respuesta.es_correcta,
          preguntas_quiz: preguntasConOpciones.find(p => p.id === respuesta.pregunta_id)
        }))

        await processPreguntasFallidas(respuestasConPreguntas)
      }

    } catch (error) {
      console.error('❌ Error cargando preguntas fallidas:', error)
      setPreguntasFallidasData(null)
    }
  }

  // Función helper para procesar preguntas fallidas
  const processPreguntasFallidas = async (respuestasIncorrectas) => {
    try {
      // Contar estudiantes únicos que fallaron cada pregunta
      const conteoFallidas = {}
      respuestasIncorrectas?.forEach(respuesta => {
        const preguntaId = respuesta.pregunta_id
        if (!conteoFallidas[preguntaId]) {
          conteoFallidas[preguntaId] = {
            id: preguntaId,
            pregunta: respuesta.preguntas_quiz.pregunta,
            opciones: respuesta.preguntas_quiz.opciones_quiz || [],
            estudiantesFallidos: new Set() // Usar Set para intentos únicos
          }
        }
        // Agregar el intento único que falló (usando intento_id como identificador único)
        conteoFallidas[preguntaId].estudiantesFallidos.add(respuesta.intento_id)
      })

      // Convertir Sets a números para el gráfico
      Object.keys(conteoFallidas).forEach(preguntaId => {
        conteoFallidas[preguntaId].fallos = conteoFallidas[preguntaId].estudiantesFallidos.size
      })

      // Obtener las 3 preguntas que más fallaron
      const top3Fallidas = Object.values(conteoFallidas)
        .sort((a, b) => b.fallos - a.fallos)
        .slice(0, 3)

      if (top3Fallidas.length > 0) {
        const chartData = {
          labels: top3Fallidas.map(p => `ID: ${p.id}`),
          datasets: [
            {
              label: 'Intentos que Fallaron',
              data: top3Fallidas.map(p => p.fallos),
              backgroundColor: ['#ef4444', '#f97316', '#eab308'],
              borderColor: ['#dc2626', '#ea580c', '#ca8a04'],
              borderWidth: 2,
              // Agregar datos completos para tooltips
              fullData: top3Fallidas
            }
          ]
        }
        setPreguntasFallidasData(chartData)
        // Preguntas fallidas cargadas exitosamente
      } else {
        setPreguntasFallidasData(null)
        console.log('ℹ️ No hay datos de preguntas fallidas para mostrar')
      }
    } catch (error) {
      console.error('❌ Error procesando preguntas fallidas:', error)
      setPreguntasFallidasData(null)
    }
  }

  // Función para cargar las 3 preguntas que más acertaron
  const loadPreguntasAcertadas = async () => {
    if (!categoriaAsignada) return
    
    try {
      console.log('🚀 Cargando preguntas que más acertaron...')
      
      // Intentar primero con consulta optimizada
      try {
        const { data: respuestasCorrectas, error } = await supabase
          .from('respuestas_estudiante')
          .select(`
            pregunta_id,
            intento_id,
            preguntas_quiz!inner(
              id,
              pregunta,
              categoria
            )
          `)
          .eq('preguntas_quiz.categoria', categoriaAsignada)
          .eq('es_correcta', true)

        if (error) {
          // Silenciar error de RPC no disponible para usuarios finales
          throw error
        }

        await processPreguntasAcertadas(respuestasCorrectas)
        return

      } catch (optimizedError) {
        // Usando método original para preguntas acertadas
        
        // Método original con consultas separadas
        const { data: preguntas, error: preguntasError } = await supabase
          .from('preguntas_quiz')
          .select('id, pregunta, categoria')
          .eq('categoria', categoriaAsignada)

        if (preguntasError) {
          console.error('❌ Error cargando preguntas:', preguntasError)
          setPreguntasAcertadasData(null)
          return
        }

        const { data: respuestas, error: respuestasError } = await supabase
          .from('respuestas_estudiante')
          .select('pregunta_id, es_correcta, intento_id')
          .eq('es_correcta', true)
          .in('pregunta_id', preguntas.map(p => p.id))

        if (respuestasError) {
          console.error('❌ Error cargando respuestas:', respuestasError)
          setPreguntasAcertadasData(null)
          return
        }

        // Obtener opciones para cada pregunta
        const preguntasConOpciones = await Promise.all(
          preguntas.map(async (pregunta) => {
            const { data: opciones } = await supabase
              .from('opciones_quiz')
              .select('id, opcion_texto, es_correcta')
              .eq('pregunta_id', pregunta.id)
            
            return {
              ...pregunta,
              opciones_quiz: opciones || []
            }
          })
        )

        // Procesar respuestas con datos de preguntas
        const respuestasConPreguntas = respuestas.map(respuesta => ({
          pregunta_id: respuesta.pregunta_id,
          es_correcta: respuesta.es_correcta,
          preguntas_quiz: preguntasConOpciones.find(p => p.id === respuesta.pregunta_id)
        }))

        await processPreguntasAcertadas(respuestasConPreguntas)
      }

    } catch (error) {
      console.error('❌ Error cargando preguntas acertadas:', error)
      setPreguntasAcertadasData(null)
    }
  }

  // Función helper para procesar preguntas acertadas
  const processPreguntasAcertadas = async (respuestasCorrectas) => {
    try {
      // Contar estudiantes únicos que acertaron cada pregunta
      const conteoAcertadas = {}
      respuestasCorrectas?.forEach(respuesta => {
        const preguntaId = respuesta.pregunta_id
        if (!conteoAcertadas[preguntaId]) {
          conteoAcertadas[preguntaId] = {
            id: preguntaId,
            pregunta: respuesta.preguntas_quiz.pregunta,
            opciones: respuesta.preguntas_quiz.opciones_quiz || [],
            estudiantesAcertados: new Set() // Usar Set para intentos únicos
          }
        }
        // Agregar el intento único que acertó (usando intento_id como identificador único)
        conteoAcertadas[preguntaId].estudiantesAcertados.add(respuesta.intento_id)
      })

      // Convertir Sets a números para el gráfico
      Object.keys(conteoAcertadas).forEach(preguntaId => {
        conteoAcertadas[preguntaId].aciertos = conteoAcertadas[preguntaId].estudiantesAcertados.size
      })

      // Obtener las 3 preguntas que más acertaron
      const top3Acertadas = Object.values(conteoAcertadas)
        .sort((a, b) => b.aciertos - a.aciertos)
        .slice(0, 3)

      if (top3Acertadas.length > 0) {
        const chartData = {
          labels: top3Acertadas.map(p => `ID: ${p.id}`),
          datasets: [
            {
              label: 'Intentos que Acertaron',
              data: top3Acertadas.map(p => p.aciertos),
              backgroundColor: ['#10b981', '#06b6d4', '#8b5cf6'],
              borderColor: ['#059669', '#0891b2', '#7c3aed'],
              borderWidth: 2,
              // Agregar datos completos para tooltips
              fullData: top3Acertadas
            }
          ]
        }
        setPreguntasAcertadasData(chartData)
        // Preguntas acertadas cargadas exitosamente
      } else {
        setPreguntasAcertadasData(null)
        console.log('ℹ️ No hay datos de preguntas acertadas para mostrar')
      }
    } catch (error) {
      console.error('❌ Error procesando preguntas acertadas:', error)
      setPreguntasAcertadasData(null)
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
        .select('estudiante_id, puntuacion_total, fecha_fin, preguntas_correctas, preguntas_respondidas')
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

        // Determinar si el estudiante ha realizado intentos
        const haRealizadoIntento = intentosEstudiante.length > 0 && mejorIntento.puntuacion_total > 0
        
        let totalPreguntasEstudiante = totalPreguntas // Valor por defecto de configuración
        let puntosObtenidos = 0
        let preguntasCorrectas = 0
        let preguntasIncorrectas = 0
        let preguntasSinResponder = 0
        
        if (haRealizadoIntento) {
          // Estudiante SÍ tiene intentos válidos
          totalPreguntasEstudiante = Math.max(mejorIntento.preguntas_respondidas || 0, totalPreguntas)
          puntosObtenidos = mejorIntento.preguntas_correctas || 0
          preguntasCorrectas = mejorIntento.preguntas_correctas || 0
          preguntasIncorrectas = (mejorIntento.preguntas_respondidas || 0) - (mejorIntento.preguntas_correctas || 0)
          preguntasSinResponder = Math.max(0, totalPreguntasEstudiante - (mejorIntento.preguntas_respondidas || 0))
        } else {
          // Estudiante NO tiene intentos válidos - valores por defecto
          totalPreguntasEstudiante = totalPreguntas
          puntosObtenidos = 0
          preguntasCorrectas = 0
          preguntasIncorrectas = 0
          preguntasSinResponder = 0 // DEBE ser 0 porque no ha respondido nada
        }
        const porcentajePonderado = ((mejorIntento.puntuacion_total * porcentajePrueba) / 100).toFixed(2)

        return {
          identificacion: estudiante.usuarios.identificacion,
          nombre: estudiante.usuarios.nombre,
          primer_apellido: estudiante.usuarios.primer_apellido,
          segundo_apellido: estudiante.usuarios.segundo_apellido,
          categoria: categoriaAsignada, // Agregar la categoría del profesor
          notaObtenida: mejorIntento.puntuacion_total || 0,
          puntosObtenidos,
          preguntasCorrectas,
          preguntasIncorrectas,
          preguntasSinResponder,
          totalPreguntas: totalPreguntasEstudiante, // Usar el total específico del estudiante
          porcentajePonderado,
          intentosRealizados: intentosEstudiante.length,
          puntuacionMinima: puntuacionMinima
        }
      })

      // Filtrar solo estudiantes que han realizado la prueba
      const estudiantesConPrueba = notasConEstudiantes.filter(estudiante => 
        estudiante.intentosRealizados > 0 && estudiante.notaObtenida > 0
      )

      // Ordenar por nota obtenida (mayor a menor)
      estudiantesConPrueba.sort((a, b) => b.notaObtenida - a.notaObtenida)

      setNotasEstudiantes(estudiantesConPrueba)
      
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

  // Funciones de navegación
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToNotas = () => {
    const notasSection = document.getElementById('notas-estudiantes')
    if (notasSection) {
      notasSection.scrollIntoView({ behavior: 'smooth' })
    }
  }

  const irAInicio = () => {
    setMostrarNotas(false)
    setMostrarGraficos(false)
    setSeccionActiva('dashboard')
    scrollToTop()
  }

  const irAGraficos = () => {
    setMostrarNotas(false)
    setMostrarGraficos(true)
    setSeccionActiva('graficos')
    scrollToTop()
  }

  const irANotas = () => {
    setMostrarNotas(true)
    setMostrarGraficos(false)
    setSeccionActiva('notas')
    setTimeout(scrollToNotas, 100)
  }

  const irAPreguntas = () => {
    setMostrarNotas(false)
    setMostrarGraficos(false)
    setSeccionActiva('preguntas')
    scrollToTop()
  }

  const irAEstudiantes = () => {
    setMostrarNotas(false)
    setMostrarGraficos(false)
    setSeccionActiva('estudiantes')
    scrollToTop()
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
              onClick={irAInicio}
              className={`py-4 px-1 border-b-2 ${seccionActiva === 'dashboard' ? 'border-amber-500 text-amber-600 font-medium' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Dashboard
            </button>
            <button
              onClick={irAPreguntas}
              className={`py-4 px-1 border-b-2 ${seccionActiva === 'preguntas' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Mis Preguntas
            </button>
            <button
              onClick={irAEstudiantes}
              className={`py-4 px-1 border-b-2 ${seccionActiva === 'estudiantes' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Mis Estudiantes
            </button>
            <button
              onClick={irAGraficos}
              className={`py-4 px-1 border-b-2 ${seccionActiva === 'graficos' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Gráficos
            </button>
            <button
              onClick={irANotas}
              className={`py-4 px-1 border-b-2 ${seccionActiva === 'notas' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Notas
            </button>
          </nav>
        </div>
      </div>


      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas - Solo en Dashboard */}
        {seccionActiva === 'dashboard' && (
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
        )}

        {/* Información de la Categoría - Solo en Dashboard */}
        {categoriaAsignada && seccionActiva === 'dashboard' && (
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

        {/* Acciones Rápidas - Solo en Dashboard */}
        {seccionActiva === 'dashboard' && (
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
        )}

        {/* Sección de Notas de Estudiantes */}
        {categoriaAsignada && (seccionActiva === 'notas') && (
          <div id="notas-estudiantes" className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="card-title text-xl text-gray-800">
                    📊 Notas de Estudiantes - "{typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}"
                  </h2>
                  <div className="flex gap-2">
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
                    <button
                      onClick={exportarAExcel}
                      className="btn btn-sm btn-success"
                      disabled={loadingNotas || getNotasFiltradas().length === 0}
                    >
                      📊 Excel
                    </button>
                    <button
                      onClick={exportarAPDF}
                      className="btn btn-sm btn-error"
                      disabled={loadingNotas || getNotasFiltradas().length === 0}
                    >
                      📄 PDF
                    </button>
                  </div>
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
                          <th className="text-gray-700 font-semibold text-center">Puntos</th>
                          <th className="text-gray-700 font-semibold text-center">%</th>
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
                            <td className="text-center">
                              <div className="flex items-center justify-center space-x-1">
                                <span className="badge badge-info badge-sm">
                                  {estudiante.puntosObtenidos}
                                </span>
                                <span className="text-xs text-gray-500">pts</span>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="badge badge-warning badge-sm">
                                {estudiante.porcentajePonderado}%
                              </span>
                            </td>
                            <td>
                              <div className="flex items-center justify-center">
                                <span 
                                  className={`badge font-medium px-3 ${
                                    estudiante.notaObtenida > estudiante.puntuacionMinima 
                                      ? 'badge-success' 
                                      : 'badge-error'
                                  }`}
                                >
                                  {estudiante.notaObtenida > estudiante.puntuacionMinima 
                                    ? '✓ Ganó' 
                                    : '✗ Falló'
                                  }
                                </span>
                              </div>
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
                        ? `No hay resultados que coincidan con "${busquedaNotas}".`
                        : 'Aún no hay estudiantes que hayan completado la prueba.'
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
                        <div className="text-sm text-gray-600">✓ Ganaron</div>
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-red-600">
                          {notasEstudiantes.filter(e => e.notaObtenida <= e.puntuacionMinima).length}
                        </div>
                        <div className="text-sm text-gray-600">✗ Fallaron</div>
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
                      <div className="flex items-center mt-2 space-x-2">
                        <span className="badge badge-info badge-lg font-bold text-lg">
                          {estudianteSeleccionado.puntosObtenidos}
                        </span>
                        <span className="text-sm text-gray-500">
                          de {estudianteSeleccionado.totalPreguntas} preguntas
                        </span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">Porcentaje:</span>
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

        {/* Sección de Mis Preguntas - Solo en Dashboard - DESHABILITADA */}
        {false && seccionActiva === 'dashboard' && (
          <div className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-xl text-gray-800 mb-6">
                  📝 Mis Preguntas
                </h2>
                <ProfesorGestionPreguntas />
              </div>
            </div>
          </div>
        )}

        {/* Sección de Mis Estudiantes - Solo en Dashboard - DESHABILITADA */}
        {false && seccionActiva === 'dashboard' && (
          <div className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <h2 className="card-title text-xl text-gray-800 mb-6">
                  👥 Mis Estudiantes
                </h2>
                <ProfesorGestionEstudiantes />
              </div>
            </div>
          </div>
        )}

        {/* Gráfico Top 10 Estudiantes - DESHABILITADO DEL DASHBOARD */}
        {categoriaAsignada && topEstudiantesData && (seccionActiva === 'graficos') && (
          <div className="mt-8 chart-print-container">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
             <div className="flex justify-between items-center mb-6">
               <h2 className="card-title text-xl text-gray-800">
                 🏆 Top 10 Estudiantes - Mejores Notas
               </h2>
               <div className="flex gap-2">
                 <button
                   onClick={loadTopEstudiantes}
                   className="btn btn-sm btn-outline"
                 >
                   🔄 Actualizar
                 </button>
                 <button
                   onClick={async () => {
                     try {
                       // Obtener el canvas del gráfico
                       const chartCanvas = document.querySelector('.chart-print-container canvas')
                       
                       if (!chartCanvas) {
                         Swal.fire({
                           icon: 'error',
                           title: 'Error',
                           text: 'No se pudo encontrar el gráfico para imprimir',
                           confirmButtonColor: '#dc3545'
                         })
                         return
                       }

                       // Convertir canvas a imagen
                       const chartImage = chartCanvas.toDataURL('image/png')
                       
                       // Crear una nueva ventana para imprimir
                       const printWindow = window.open('', '_blank')
                       
                       printWindow.document.write(`
                         <html>
                           <head>
                             <title>Top 10 Estudiantes - Mejores Notas</title>
                             <style>
                               body { 
                                 font-family: Arial, sans-serif; 
                                 margin: 0; 
                                 padding: 20px;
                                 background: white;
                               }
                               .print-container { 
                                 max-width: 800px;
                                 margin: 0 auto;
                                 border: 1px solid #ccc; 
                                 border-radius: 8px; 
                                 padding: 30px; 
                                 box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                               }
                               .header { 
                                 text-align: center;
                                 margin-bottom: 30px;
                                 border-bottom: 2px solid #4d3930;
                                 padding-bottom: 20px;
                               }
                               .card-title { 
                                 font-size: 2rem; 
                                 font-weight: bold; 
                                 color: #4d3930; 
                                 margin: 0 0 15px 0;
                               }
                               .info-section {
                                 display: flex;
                                 justify-content: space-between;
                                 margin-bottom: 30px;
                                 font-size: 1.1rem;
                               }
                               .info-item {
                                 flex: 1;
                                 text-align: center;
                               }
                               .chart-container {
                                 text-align: center;
                                 margin: 20px 0;
                               }
                               .chart-image {
                                 max-width: 100%;
                                 height: auto;
                                 border: 1px solid #ddd;
                                 border-radius: 8px;
                                 box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                               }
                               .footer {
                                 text-align: center;
                                 color: #666;
                                 margin-top: 30px;
                                 font-size: 0.9rem;
                                 border-top: 1px solid #eee;
                                 padding-top: 20px;
                               }
                               @media print {
                                 body { margin: 0; padding: 15px; }
                                 .print-container { box-shadow: none; border: 2px solid #000; }
                                 .card-title { font-size: 1.8rem; }
                               }
                             </style>
                           </head>
                           <body>
                             <div class="print-container">
                               <div class="header">
                                 <h1 class="card-title">🏆 Top 10 Estudiantes - Mejores Notas</h1>
                               </div>
                               
                               <div class="info-section">
                                 <div class="info-item">
                                   <strong>Categoría:</strong><br>
                                   ${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}
                                 </div>
                                 <div class="info-item">
                                   <strong>Fecha de impresión:</strong><br>
                                   ${new Date().toLocaleDateString('es-CR')}
                                 </div>
                                 <div class="info-item">
                                   <strong>Estudiantes:</strong><br>
                                   ${topEstudiantesData.labels.length} registros
                                 </div>
                               </div>
                               
                               <div class="chart-container">
                                 <img src="${chartImage}" alt="Gráfico Top 10 Estudiantes" class="chart-image" />
                               </div>
                               
                               <div class="footer">
                                 <p><strong>Sistema de Admisión 2025</strong></p>
                                 <p>Este documento muestra los estudiantes con las mejores notas de la categoría asignada al profesor.</p>
                               </div>
                             </div>
                           </body>
                         </html>
                       `)
                       
                       printWindow.document.close()
                       printWindow.focus()
                       
                       // Esperar a que se cargue la imagen antes de imprimir
                       setTimeout(() => {
                         printWindow.print()
                         printWindow.close()
                       }, 1000)
                       
                     } catch (error) {
                       console.error('Error al imprimir:', error)
                       Swal.fire({
                         icon: 'error',
                         title: 'Error',
                         text: 'Ocurrió un error al generar la impresión',
                         confirmButtonColor: '#dc3545'
                       })
                     }
                   }}
                   className="btn btn-sm btn-primary"
                 >
                   🖨️ Imprimir
                 </button>
               </div>
             </div>
                
                <div className="h-96">
                  <Bar 
                    data={topEstudiantesData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        title: {
                          display: true,
                          text: `Top 10 Estudiantes con Mejores Notas - ${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}`,
                          font: {
                            size: 16,
                            weight: 'bold'
                          },
                          color: '#4d3930'
                        },
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            title: function(context) {
                              return `Estudiante: ${context[0].label}`
                            },
                         label: function(context) {
                           return `Nota: ${context.parsed.y}`
                         }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                       max: 100,
                       title: {
                         display: true,
                         text: 'Nota Obtenida',
                         font: {
                           weight: 'bold'
                         },
                         color: '#4d3930'
                       },
                          grid: {
                            color: 'rgba(0,0,0,0.1)'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Estudiantes',
                            font: {
                              weight: 'bold'
                            },
                            color: '#4d3930'
                          },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                              size: 10
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Gráfico que muestra los 10 estudiantes con las mejores notas de la categoría
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráfico de Preguntas que Más Fallaron */}
        {categoriaAsignada && preguntasFallidasData && seccionActiva === 'graficos' && (
          <div className="mt-8 chart-print-container">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="card-title text-xl text-gray-800">
                    ❌ Top 3 Preguntas que Más Fallaron
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={loadPreguntasFallidas}
                      className="btn btn-sm btn-outline"
                    >
                      🔄 Actualizar
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          // Obtener el canvas del gráfico
                          const chartCanvas = document.querySelector('.chart-fallidas-container canvas')
                          
                          if (!chartCanvas) {
                            Swal.fire({
                              icon: 'error',
                              title: 'Error',
                              text: 'No se pudo encontrar el gráfico para imprimir',
                              confirmButtonColor: '#dc3545'
                            })
                            return
                          }
                          
                          // Convertir canvas a imagen
                          const chartImage = chartCanvas.toDataURL('image/png')
                          
                          // Crear ventana de impresión
                          const printWindow = window.open('', '_blank')
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Top 3 Preguntas que Más Fallaron</title>
                                <style>
                                  body {
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                    margin: 0;
                                    padding: 20px;
                                    background-color: #f8f9fa;
                                  }
                                  .print-container {
                                    background: white;
                                    padding: 30px;
                                    border-radius: 10px;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                                    max-width: 800px;
                                    margin: 0 auto;
                                  }
                                  .header {
                                    text-align: center;
                                    margin-bottom: 30px;
                                    border-bottom: 3px solid #ef4444;
                                    padding-bottom: 20px;
                                  }
                                  .card-title {
                                    color: #ef4444;
                                    font-size: 2rem;
                                    margin: 0;
                                    font-weight: bold;
                                  }
                                  .info-section {
                                    display: flex;
                                    justify-content: space-between;
                                    margin-bottom: 30px;
                                    font-size: 1.1rem;
                                  }
                                  .info-item {
                                    flex: 1;
                                    text-align: center;
                                  }
                                  .chart-container {
                                    text-align: center;
                                    margin: 20px 0;
                                  }
                                  .chart-image {
                                    max-width: 100%;
                                    height: auto;
                                    border: 1px solid #ddd;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                  }
                                  .footer {
                                    text-align: center;
                                    color: #666;
                                    margin-top: 30px;
                                    font-size: 0.9rem;
                                    border-top: 1px solid #eee;
                                    padding-top: 20px;
                                  }
                                  @media print {
                                    body { margin: 0; padding: 15px; }
                                    .print-container { box-shadow: none; border: 2px solid #000; }
                                    .card-title { font-size: 1.8rem; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="print-container">
                                  <div class="header">
                                    <h1 class="card-title">❌ Top 3 Preguntas que Más Fallaron</h1>
                                  </div>
                                  
                                  <div class="info-section">
                                    <div class="info-item">
                                      <strong>Categoría:</strong><br>
                                      ${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}
                                    </div>
                                    <div class="info-item">
                                      <strong>Fecha de impresión:</strong><br>
                                      ${new Date().toLocaleDateString('es-CR')}
                                    </div>
                                    <div class="info-item">
                                      <strong>Preguntas:</strong><br>
                                      ${preguntasFallidasData.labels.length} registros
                                    </div>
                                  </div>
                                  
                                  <div class="chart-container">
                                    <img src="${chartImage}" alt="Gráfico Top 3 Preguntas Fallidas" class="chart-image" />
                                  </div>
                                  
                                  <div class="footer">
                                    <p><strong>Sistema de Admisión 2025</strong></p>
                                    <p>Este documento muestra las 3 preguntas con más respuestas incorrectas de la categoría asignada al profesor.</p>
                                  </div>
                                </div>
                              </body>
                            </html>
                          `)
                          
                          printWindow.document.close()
                          printWindow.focus()
                          
                          // Esperar a que se cargue la imagen antes de imprimir
                          setTimeout(() => {
                            printWindow.print()
                            printWindow.close()
                          }, 1000)
                          
                        } catch (error) {
                          console.error('Error al imprimir:', error)
                          Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Ocurrió un error al generar la impresión',
                            confirmButtonColor: '#dc3545'
                          })
                        }
                      }}
                      className="btn btn-sm btn-primary"
                    >
                      🖨️ Imprimir
                    </button>
                  </div>
                </div>
                
                <div className="h-96 chart-fallidas-container">
                  <Bar
                    data={preguntasFallidasData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        title: {
                          display: true,
                          text: `Top 3 Preguntas que Más Fallaron - ${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}`,
                          font: {
                            size: 16,
                            weight: 'bold'
                          },
                          color: '#4d3930'
                        },
                        legend: {
                          display: false
                        },
                        tooltip: {
                          titleFont: { size: 14, weight: 'bold' },
                          bodyFont: { size: 12 },
                          padding: 12,
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#ffffff',
                          bodyColor: '#ffffff',
                          borderColor: '#ef4444',
                          borderWidth: 2,
                          cornerRadius: 8,
                          displayColors: false,
                          callbacks: {
                            title: function(context) {
                              if (!context || !context[0] || !context[0].dataset || !context[0].dataset.fullData) {
                                return '❌ Pregunta'
                              }
                              const preguntaData = context[0].dataset.fullData[context[0].dataIndex]
                              return `❌ Pregunta ID: ${preguntaData.id}`
                            },
                            label: function(context) {
                              if (!context || !context[0] || !context[0].dataset || !context[0].dataset.fullData) {
                                return [`🔴 Fallos: ${context?.parsed?.y || 0}`]
                              }
                              const preguntaData = context[0].dataset.fullData[context[0].dataIndex]
                              return [
                                `📝 ${preguntaData.pregunta}`,
                                '',
                                `🔴 Intentos que fallaron: ${context.parsed.y}`,
                                '',
                                '📋 Opciones:'
                              ]
                            },
                            afterBody: function(context) {
                              if (!context || !context[0] || !context[0].dataset || !context[0].dataset.fullData) {
                                return []
                              }
                              const preguntaData = context[0].dataset.fullData[context[0].dataIndex]
                              const opciones = preguntaData.opciones || []
                              const opcionesTexto = opciones.map((op, index) => {
                                const correcta = op.es_correcta ? '✅' : '❌'
                                return `  ${String.fromCharCode(65 + index)}) ${correcta} ${op.opcion_texto}`
                              })
                              return opcionesTexto
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Intentos que Fallaron',
                            font: {
                              weight: 'bold'
                            },
                            color: '#4d3930'
                          },
                          grid: {
                            color: 'rgba(0,0,0,0.1)'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Preguntas',
                            font: {
                              weight: 'bold'
                            },
                            color: '#4d3930'
                          },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                              size: 10
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Gráfico que muestra las 3 preguntas con más respuestas incorrectas
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gráfico de Preguntas que Más Acertaron */}
        {categoriaAsignada && preguntasAcertadasData && seccionActiva === 'graficos' && (
          <div className="mt-8 chart-print-container">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="card-title text-xl text-gray-800">
                    ✅ Top 3 Preguntas que Más Acertaron
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={loadPreguntasAcertadas}
                      className="btn btn-sm btn-outline"
                    >
                      🔄 Actualizar
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          // Obtener el canvas del gráfico
                          const chartCanvas = document.querySelector('.chart-acertadas-container canvas')
                          
                          if (!chartCanvas) {
                            Swal.fire({
                              icon: 'error',
                              title: 'Error',
                              text: 'No se pudo encontrar el gráfico para imprimir',
                              confirmButtonColor: '#dc3545'
                            })
                            return
                          }
                          
                          // Convertir canvas a imagen
                          const chartImage = chartCanvas.toDataURL('image/png')
                          
                          // Crear ventana de impresión
                          const printWindow = window.open('', '_blank')
                          printWindow.document.write(`
                            <html>
                              <head>
                                <title>Top 3 Preguntas que Más Acertaron</title>
                                <style>
                                  body {
                                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                                    margin: 0;
                                    padding: 20px;
                                    background-color: #f8f9fa;
                                  }
                                  .print-container {
                                    background: white;
                                    padding: 30px;
                                    border-radius: 10px;
                                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                                    max-width: 800px;
                                    margin: 0 auto;
                                  }
                                  .header {
                                    text-align: center;
                                    margin-bottom: 30px;
                                    border-bottom: 3px solid #10b981;
                                    padding-bottom: 20px;
                                  }
                                  .card-title {
                                    color: #10b981;
                                    font-size: 2rem;
                                    margin: 0;
                                    font-weight: bold;
                                  }
                                  .info-section {
                                    display: flex;
                                    justify-content: space-between;
                                    margin-bottom: 30px;
                                    font-size: 1.1rem;
                                  }
                                  .info-item {
                                    flex: 1;
                                    text-align: center;
                                  }
                                  .chart-container {
                                    text-align: center;
                                    margin: 20px 0;
                                  }
                                  .chart-image {
                                    max-width: 100%;
                                    height: auto;
                                    border: 1px solid #ddd;
                                    border-radius: 8px;
                                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                                  }
                                  .footer {
                                    text-align: center;
                                    color: #666;
                                    margin-top: 30px;
                                    font-size: 0.9rem;
                                    border-top: 1px solid #eee;
                                    padding-top: 20px;
                                  }
                                  @media print {
                                    body { margin: 0; padding: 15px; }
                                    .print-container { box-shadow: none; border: 2px solid #000; }
                                    .card-title { font-size: 1.8rem; }
                                  }
                                </style>
                              </head>
                              <body>
                                <div class="print-container">
                                  <div class="header">
                                    <h1 class="card-title">✅ Top 3 Preguntas que Más Acertaron</h1>
                                  </div>
                                  
                                  <div class="info-section">
                                    <div class="info-item">
                                      <strong>Categoría:</strong><br>
                                      ${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}
                                    </div>
                                    <div class="info-item">
                                      <strong>Fecha de impresión:</strong><br>
                                      ${new Date().toLocaleDateString('es-CR')}
                                    </div>
                                    <div class="info-item">
                                      <strong>Preguntas:</strong><br>
                                      ${preguntasAcertadasData.labels.length} registros
                                    </div>
                                  </div>
                                  
                                  <div class="chart-container">
                                    <img src="${chartImage}" alt="Gráfico Top 3 Preguntas Acertadas" class="chart-image" />
                                  </div>
                                  
                                  <div class="footer">
                                    <p><strong>Sistema de Admisión 2025</strong></p>
                                    <p>Este documento muestra las 3 preguntas con más respuestas correctas de la categoría asignada al profesor.</p>
                                  </div>
                                </div>
                              </body>
                            </html>
                          `)
                          
                          printWindow.document.close()
                          printWindow.focus()
                          
                          // Esperar a que se cargue la imagen antes de imprimir
                          setTimeout(() => {
                            printWindow.print()
                            printWindow.close()
                          }, 1000)
                          
                        } catch (error) {
                          console.error('Error al imprimir:', error)
                          Swal.fire({
                            icon: 'error',
                            title: 'Error',
                            text: 'Ocurrió un error al generar la impresión',
                            confirmButtonColor: '#dc3545'
                          })
                        }
                      }}
                      className="btn btn-sm btn-primary"
                    >
                      🖨️ Imprimir
                    </button>
                  </div>
                </div>
                
                <div className="h-96 chart-acertadas-container">
                  <Bar
                    data={preguntasAcertadasData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        title: {
                          display: true,
                          text: `Top 3 Preguntas que Más Acertaron - ${typeof categoriaAsignada === 'string' ? categoriaAsignada : categoriaAsignada.nombre}`,
                          font: {
                            size: 16,
                            weight: 'bold'
                          },
                          color: '#4d3930'
                        },
                        legend: {
                          display: false
                        },
                        tooltip: {
                          titleFont: { size: 14, weight: 'bold' },
                          bodyFont: { size: 12 },
                          padding: 12,
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          titleColor: '#ffffff',
                          bodyColor: '#ffffff',
                          borderColor: '#10b981',
                          borderWidth: 2,
                          cornerRadius: 8,
                          displayColors: false,
                          callbacks: {
                            title: function(context) {
                              if (!context || !context[0] || !context[0].dataset || !context[0].dataset.fullData) {
                                return '✅ Pregunta'
                              }
                              const preguntaData = context[0].dataset.fullData[context[0].dataIndex]
                              return `✅ Pregunta ID: ${preguntaData.id}`
                            },
                            label: function(context) {
                              if (!context || !context[0] || !context[0].dataset || !context[0].dataset.fullData) {
                                return [`🟢 Aciertos: ${context?.parsed?.y || 0}`]
                              }
                              const preguntaData = context[0].dataset.fullData[context[0].dataIndex]
                              return [
                                `📝 ${preguntaData.pregunta}`,
                                '',
                                `🟢 Intentos que acertaron: ${context.parsed.y}`,
                                '',
                                '📋 Opciones:'
                              ]
                            },
                            afterBody: function(context) {
                              if (!context || !context[0] || !context[0].dataset || !context[0].dataset.fullData) {
                                return []
                              }
                              const preguntaData = context[0].dataset.fullData[context[0].dataIndex]
                              const opciones = preguntaData.opciones || []
                              const opcionesTexto = opciones.map((op, index) => {
                                const correcta = op.es_correcta ? '✅' : '❌'
                                return `  ${String.fromCharCode(65 + index)}) ${correcta} ${op.opcion_texto}`
                              })
                              return opcionesTexto
                            }
                          }
                        }
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          title: {
                            display: true,
                            text: 'Intentos que Acertaron',
                            font: {
                              weight: 'bold'
                            },
                            color: '#4d3930'
                          },
                          grid: {
                            color: 'rgba(0,0,0,0.1)'
                          }
                        },
                        x: {
                          title: {
                            display: true,
                            text: 'Preguntas',
                            font: {
                              weight: 'bold'
                            },
                            color: '#4d3930'
                          },
                          ticks: {
                            maxRotation: 45,
                            minRotation: 45,
                            font: {
                              size: 10
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
                
                <div className="mt-4 text-center">
                  <p className="text-sm text-gray-600">
                    Gráfico que muestra las 3 preguntas con más respuestas correctas
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje cuando no hay datos para el gráfico */}
        {categoriaAsignada && !topEstudiantesData && (
          <div className="mt-8">
            <div className="card bg-white border border-gray-300 shadow-lg">
              <div className="card-body">
                <div className="text-center py-8">
                  <div className="text-6xl mb-4">📊</div>
                  <h3 className="text-lg font-semibold text-gray-700 mb-2">
                    No hay datos para mostrar
                  </h3>
                  <p className="text-gray-500">
                    Los estudiantes de esta categoría aún no han realizado pruebas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sección de Mis Preguntas - Vista individual */}
        {seccionActiva === 'preguntas' && (
          <div className="mt-8">
            <ProfesorGestionPreguntas />
          </div>
        )}

        {/* Sección de Mis Estudiantes - Vista individual */}
        {seccionActiva === 'estudiantes' && (
          <div className="mt-8">
            <ProfesorGestionEstudiantes />
          </div>
        )}
      </div>

      {/* Botón flotante para regresar al inicio */}
      {seccionActiva !== 'dashboard' && (
        <button
          onClick={irAInicio}
          className="fixed bottom-6 right-6 btn btn-circle btn-primary shadow-lg z-50"
          title="Regresar al inicio"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default ProfesorDashboard


