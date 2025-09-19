import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseConfig'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Swal from 'sweetalert2'

const Reportes = () => {
  const [loading, setLoading] = useState(false)
  const [datosReporte, setDatosReporte] = useState([])
  const [filtros, setFiltros] = useState({
    categoria: 'todas',
    estado: 'todos'
  })
  const [categorias, setCategorias] = useState([])
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null)
  const [detallesPrueba, setDetallesPrueba] = useState(null)
  const [loadingDetalles, setLoadingDetalles] = useState(false)
  const [paginaActual, setPaginaActual] = useState(1)
  const [registrosPorPagina] = useState(10)

  const colors = {
    primary: '#4d3930',
    secondary: '#b47b21',
    accent: '#f4b100',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    info: '#3b82f6'
  }

  useEffect(() => {
    loadCategorias()
    loadDatosReporte()
  }, [])

  const loadCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('categorias_quiz')
        .select('nombre')
        .order('nombre')

      if (error) throw error
      setCategorias(data || [])
    } catch (error) {
      console.error('Error cargando categorías:', error)
    }
  }

  const loadDatosReporte = async () => {
    try {
      setLoading(true)
      // Consulta simplificada para obtener intentos completados
      let query = supabase
        .from('intentos_quiz')
        .select('*')
        .not('fecha_fin', 'is', null)
        .not('puntuacion_total', 'is', null)

      const { data: intentos, error } = await query.order('fecha_fin', { ascending: false })

      if (error) {
        console.error('❌ Error en consulta de intentos:', error)
        throw error
      }


      if (!intentos || intentos.length === 0) {
        setDatosReporte([])
        return
      }

      // Obtener configuración del quiz para calcular puntos correctos
      const { data: configQuiz, error: errorConfig } = await supabase
        .from('configuracion_quiz')
        .select('total_preguntas, puntaje_por_pregunta')
        .eq('activa', true)
        .single()

      if (errorConfig) {
        console.error('❌ Error obteniendo configuración del quiz:', errorConfig)
      }

      const totalPreguntas = configQuiz?.total_preguntas || 5
      const puntajePorPregunta = configQuiz?.puntaje_por_pregunta || 20

      // Obtener información de usuarios para cada intento
      const datosProcesados = await Promise.all(
        intentos.map(async (intento) => {
          try {
            // Calcular preguntas correctas (independiente del porcentaje de la categoría)
            const preguntasCorrectas = Math.round((intento.puntuacion_total / 100) * totalPreguntas)
            // Inicializar porcentaje ponderado; se recalcula cuando tengamos porcentajePrueba
            let porcentajePonderado = 0

            // Obtener datos del usuario
            const { data: usuario, error: errorUsuario } = await supabase
              .from('usuarios')
              .select('identificacion, nombre, primer_apellido, segundo_apellido, estado')
              .eq('identificacion', intento.estudiante_id)
              .single()

            if (errorUsuario) {
              console.error('❌ Error obteniendo usuario:', errorUsuario)
              return null
            }

            // Obtener categoría del usuario y su porcentaje
            const { data: categoriaData, error: errorCategoria } = await supabase
              .from('usuario_categorias')
              .select('categoria')
              .eq('usuario_id', intento.estudiante_id)
              .eq('activa', true)
              .single()

            const categoria = categoriaData?.categoria || 'Sin categoría'

            // Obtener porcentaje de la categoría (tolerante a no coincidencias)
            const { data: categoriaInfoArr, error: errorCategoriaInfo } = await supabase
              .from('categorias_quiz')
              .select('porcentaje_prueba, nombre, id')
              .eq('nombre', categoria)
              .limit(1)

            const porcentajePrueba = Array.isArray(categoriaInfoArr) && categoriaInfoArr.length > 0
              ? (categoriaInfoArr[0]?.porcentaje_prueba || 0)
              : 0

            // Ahora sí: calcular porcentaje ponderado con el valor obtenido
            porcentajePonderado = ((intento.puntuacion_total * porcentajePrueba) / 100).toFixed(2)

            // Aplicar filtros
            if (filtros.categoria !== 'todas' && categoria !== filtros.categoria) {
              return null
            }

            if (filtros.estado !== 'todos' && usuario.estado !== filtros.estado) {
              return null
            }

            return {
              identificacion: usuario.identificacion,
              nombre: usuario.nombre,
              apellidos: `${usuario.primer_apellido || ''} ${usuario.segundo_apellido || ''}`.trim(),
              notaObtenida: intento.puntuacion_total,
              preguntasCorrectas: preguntasCorrectas,
              porcentajePonderado: porcentajePonderado,
              categoria: categoria,
              categoriaId: categoriaInfoArr?.[0]?.id || null,
              estado: usuario.estado,
              fechaRealizacion: new Date(intento.fecha_fin).toLocaleDateString('es-CR'),
              horaRealizacion: new Date(intento.fecha_fin).toLocaleTimeString('es-CR', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })
            }
          } catch (error) {
            console.error('❌ Error procesando intento:', error)
            return null
          }
        })
      )

      // Filtrar valores nulos
      const datosFinales = datosProcesados.filter(item => item !== null)

      setDatosReporte(datosFinales)

    } catch (error) {
      console.error('❌ Error cargando datos del reporte:', error)
      console.error('❌ Detalles del error:', {
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code
      })
      setDatosReporte([])
    } finally {
      setLoading(false)
    }
  }

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const aplicarFiltros = () => {
    setPaginaActual(1) // Resetear a la primera página
    loadDatosReporte()
  }

  const limpiarFiltros = () => {
    setPaginaActual(1) // Resetear a la primera página
    setFiltros({
      categoria: 'todas',
      estado: 'todos'
    })
  }

  // Funciones de paginación
  const getDatosPaginados = () => {
    const inicio = (paginaActual - 1) * registrosPorPagina
    const fin = inicio + registrosPorPagina
    return datosReporte.slice(inicio, fin)
  }

  const getTotalPaginas = () => {
    return Math.ceil(datosReporte.length / registrosPorPagina)
  }

  const cambiarPagina = (nuevaPagina) => {
    setPaginaActual(nuevaPagina)
  }

  const irAPaginaAnterior = () => {
    if (paginaActual > 1) {
      setPaginaActual(paginaActual - 1)
    }
  }

  const irAPaginaSiguiente = () => {
    if (paginaActual < getTotalPaginas()) {
      setPaginaActual(paginaActual + 1)
    }
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

      // Verificar si la tabla respuestas_estudiante existe y tiene datos
      
      const { data: respuestas, error: errorRespuestas } = await supabase
        .from('respuestas_estudiante')
        .select('*')
        .eq('intento_id', intento.id)

      if (errorRespuestas) {
        console.error('❌ Error obteniendo respuestas:', errorRespuestas)
        
        // Continuar sin respuestas
        setDetallesPrueba({
          intento,
          respuestas: [],
          todasLasPreguntas: []
        })
        return
      }

      updateProgress(50, 'Obteniendo preguntas de la categoría...')

      // Obtener todas las preguntas de la categoría
      
      const { data: preguntasCategoria, error: errorPreguntas } = await supabase
        .from('preguntas_quiz')
        .select('*')
        .eq('categoria', estudiante.categoria)

      if (errorPreguntas) {
        console.error('❌ Error obteniendo preguntas:', errorPreguntas)
        console.error('❌ Detalles del error de preguntas:', {
          message: errorPreguntas.message,
          details: errorPreguntas.details,
          hint: errorPreguntas.hint,
          code: errorPreguntas.code
        })
        throw errorPreguntas
      }

      updateProgress(70, 'Procesando respuestas...')

      // Procesar las respuestas para obtener información completa
      const respuestasCompletas = []
      if (respuestas && respuestas.length > 0) {
        for (const respuesta of respuestas) {
          
          // Obtener la opción seleccionada
          const { data: opcionSeleccionada, error: errorOpcion } = await supabase
            .from('opciones_respuesta')
            .select(`
              id,
              texto_opcion,
              es_correcta,
              pregunta_id
            `)
            .eq('id', respuesta.opcion_seleccionada_id)
            .single()

          if (errorOpcion) {
            console.error('❌ Error obteniendo opción:', errorOpcion)
            continue
          }


          // Obtener la pregunta
          const { data: pregunta, error: errorPregunta } = await supabase
            .from('preguntas_quiz')
            .select('id, pregunta, imagen_url')
            .eq('id', opcionSeleccionada.pregunta_id)
            .single()

          if (errorPregunta) {
            console.error('❌ Error obteniendo pregunta:', errorPregunta)
            continue
          }


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
      
      // Cerrar el modal de progreso después de un breve delay
      setTimeout(() => {
        Swal.close()
      }, 500)

    } catch (error) {
      console.error('❌ Error cargando detalles de la prueba:', error)
      setDetallesPrueba(null)
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
      
      doc.text(`Estudiante: ${estudianteSeleccionado.nombre} ${estudianteSeleccionado.apellidos}`, margin, yPosition)
      yPosition += 8
      doc.text(`Identificación: ${estudianteSeleccionado.identificacion}`, margin, yPosition)
      yPosition += 8
      doc.text(`Categoría: ${estudianteSeleccionado.categoria}`, margin, yPosition)
      yPosition += 8
      doc.text(`Fecha de realización: ${estudianteSeleccionado.fechaRealizacion}`, margin, yPosition)
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
          imagenHeight = 50 // Espacio reservado para imagen (reducido a 50mm)
        }
        
        // Calcular espacio necesario para las opciones (mínimo 4 opciones)
        const opcionesHeight = 4 * 8 // 4 opciones * 8mm cada una
        
        // Espacio total necesario para esta pregunta completa
        const espacioNecesario = preguntaHeight + imagenHeight + opcionesHeight + 20 // 20mm de margen
        
        // Verificar si necesitamos una nueva página para la pregunta completa
        if (yPosition + espacioNecesario > 270) {
          doc.addPage()
          yPosition = margin + 10
        }
        
        // Agregar imagen primero si existe
        if (pregunta.imagen_url) {
          try {
            // Cargar la imagen
            const img = new Image()
            img.crossOrigin = 'anonymous'
            
            await new Promise((resolve, reject) => {
              img.onload = resolve
              img.onerror = reject
              img.src = pregunta.imagen_url
            })
            
            // Calcular dimensiones de la imagen (más pequeñas para compresión)
            const maxWidth = contentWidth
            const maxHeight = 40 // Reducido a 40mm para máxima compresión
            let imgWidth = img.width * 0.3 // Reducido a 0.3 para máxima compresión
            let imgHeight = img.height * 0.3
            
            // Redimensionar si es necesario
            if (imgWidth > maxWidth) {
              imgHeight = (imgHeight * maxWidth) / imgWidth
              imgWidth = maxWidth
            }
            if (imgHeight > maxHeight) {
              imgWidth = (imgWidth * maxHeight) / imgHeight
              imgHeight = maxHeight
            }
            
            // Agregar la imagen con compresión
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
          if (esRespuestaEstudiante) textoOpcion +=  ' ✓ (R/ Estudiante)'
          if (esCorrecta) textoOpcion += ' ✓ (Correcta)'
          
          // Dividir texto si es muy largo
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
      
      // Usar el método de guardado optimizado de jsPDF
      doc.save(nombreArchivo, { 
        returnPromise: false,
        compress: true,
        precision: 1 // Reduce la precisión decimal para menor tamaño
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

  const generarExcel = () => {
    try {
      // Preparar datos para Excel
      const datosExcel = datosReporte.map(item => ({
        'Identificación': item.identificacion,
        'Nombre': item.nombre,
        'Apellidos': item.apellidos,
        'Nota Obtenida': item.notaObtenida,
        'Puntos Obtenidos': item.preguntasCorrectas,
        'Porcentaje Ponderado': item.porcentajePonderado,
        'Categoría': item.categoria,
        'Estado': item.estado,
        'Fecha de Realización': item.fechaRealizacion,
        'Hora de Realización': item.horaRealizacion
      }))

      // Crear libro de trabajo
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(datosExcel)

      // Establecer ancho de columnas
      ws['!cols'] = [
        { wch: 15 }, // Identificación
        { wch: 20 }, // Nombre
        { wch: 25 }, // Apellidos
        { wch: 12 }, // Nota Obtenida
        { wch: 15 }, // Puntos Obtenidos
        { wch: 18 }, // Porcentaje Ponderado
        { wch: 20 }, // Categoría
        { wch: 10 }, // Estado
        { wch: 15 }, // Fecha
        { wch: 15 }  // Hora
      ]

      // Agregar hoja al libro
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte de Estudiantes')

      // Generar nombre de archivo con fecha
      const fecha = new Date().toISOString().split('T')[0]
      const nombreArchivo = `Reporte_Estudiantes_${fecha}.xlsx`

      // Descargar archivo
      XLSX.writeFile(wb, nombreArchivo)

    } catch (error) {
      console.error('❌ Error generando Excel:', error)
    }
  }

  const generarPDF = () => {
    try {
      // Crear documento PDF
      const doc = new jsPDF('l', 'mm', 'a4') // Orientación horizontal
      
      // Configurar fuente
      doc.setFont('helvetica')

      // Título del reporte
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.text('Reporte de Resultados de Estudiantes', 20, 20)

      // Información del reporte
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Generado el: ${new Date().toLocaleDateString('es-CR')}`, 20, 30)
      doc.text(`Total de registros: ${datosReporte.length}`, 20, 35)

      // Preparar datos para la tabla
      const datosTabla = datosReporte.map(item => [
        item.identificacion,
        item.nombre,
        item.apellidos,
        item.notaObtenida,
        item.preguntasCorrectas,
        `${item.porcentajePonderado}%`,
        item.categoria,
        item.fechaRealizacion
      ])

      // Generar tabla
      autoTable(doc, {
        startY: 45,
        head: [['Identificación', 'Nombre', 'Apellidos', 'Nota', 'Puntos Obtenidos', '%', 'Categoría', 'Fecha']],
        body: datosTabla,
        styles: {
          fontSize: 8,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'center'
        },
        headStyles: {
          fillColor: [77, 57, 48], // Color primary
          textColor: 255,
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245]
        },
        columnStyles: {
          0: { halign: 'center', cellWidth: 25 }, // Identificación
          1: { halign: 'left', cellWidth: 30 },   // Nombre
          2: { halign: 'left', cellWidth: 35 },   // Apellidos
          3: { halign: 'center', cellWidth: 15 }, // Nota
          4: { halign: 'center', cellWidth: 20 }, // Puntos Obtenidos
          5: { halign: 'center', cellWidth: 15 }, // Porcentaje
          6: { halign: 'center', cellWidth: 30 }, // Categoría
          7: { halign: 'center', cellWidth: 25 }  // Fecha
        },
        margin: { left: 20, right: 20 },
        pageBreak: 'auto'
      })

      // Pie de página
      const pageCount = doc.internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Página ${i} de ${pageCount}`, 20, doc.internal.pageSize.height - 10)
      }

      // Generar nombre de archivo con fecha
      const fecha = new Date().toISOString().split('T')[0]
      const nombreArchivo = `Reporte_Estudiantes_${fecha}.pdf`

      // Descargar archivo
      doc.save(nombreArchivo)

    } catch (error) {
      console.error('❌ Error generando PDF:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg" style={{ color: colors.primary }}></div>
        <span className="ml-4 text-lg" style={{ color: colors.primary }}>Cargando datos del reporte...</span>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
            📊 Reportes de Estudiantes
          </h2>
          <p className="text-gray-600 mt-1">
            Genera reportes en Excel y PDF con los resultados de los estudiantes
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total de registros</p>
          <p className="text-2xl font-bold" style={{ color: colors.primary }}>
            {datosReporte.length}
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card bg-white shadow-lg">
        <div className="card-body">
          <h3 className="card-title mb-4" style={{ color: colors.primary }}>
            🔍 Filtros de Búsqueda
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filtro por Categoría */}
            <div className="form-control">
              <label className="label">
                <span className="label-text" style={{ color: colors.primary }}>Categoría</span>
              </label>
              <select
                className="select select-bordered"
                value={filtros.categoria}
                onChange={(e) => handleFiltroChange('categoria', e.target.value)}
              >
                <option value="todas">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat.nombre} value={cat.nombre}>
                    {cat.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro por Estado */}
            <div className="form-control">
              <label className="label">
                <span className="label-text" style={{ color: colors.primary }}>Estado</span>
              </label>
              <select
                className="select select-bordered"
                value={filtros.estado}
                onChange={(e) => handleFiltroChange('estado', e.target.value)}
              >
                <option value="todos">Todos los estados</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>
          </div>

          {/* Botones de Filtros */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={aplicarFiltros}
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Aplicando...
                </>
              ) : (
                <>
                  🔍 Aplicar Filtros
                </>
              )}
            </button>
            <button
              onClick={limpiarFiltros}
              className="btn btn-outline"
              disabled={loading}
            >
              🗑️ Limpiar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Botones de Descarga */}
      <div className="card bg-white shadow-lg">
        <div className="card-body">
          <h3 className="card-title mb-4" style={{ color: colors.primary }}>
            📥 Descargar Reportes
          </h3>
          
          <div className="flex flex-wrap gap-4">
            <button
              onClick={generarExcel}
              className="btn btn-success btn-lg"
              disabled={datosReporte.length === 0}
            >
              📊 Descargar Excel
              <span className="badge badge-outline ml-2">
                {datosReporte.length} registros
              </span>
            </button>
            
            <button
              onClick={generarPDF}
              className="btn btn-error btn-lg"
              disabled={datosReporte.length === 0}
            >
              📄 Descargar PDF
              <span className="badge badge-outline ml-2">
                {datosReporte.length} registros
              </span>
            </button>
          </div>

          {datosReporte.length === 0 && (
            <div className="alert alert-warning mt-4">
              <span>⚠️ No hay datos para generar reportes. Ajusta los filtros o verifica que existan intentos completados.</span>
            </div>
          )}
        </div>
      </div>

      {/* Vista Previa de Datos */}
      {datosReporte.length > 0 && (
        <div className="card bg-white shadow-lg">
          <div className="card-body">
            <h3 className="card-title mb-4" style={{ color: colors.primary }}>
              👁️ Vista Previa de Datos
            </h3>
            
            <div className="overflow-x-auto">
              <table className="table table-zebra w-full">
                <thead>
                  <tr>
                    <th>Identificación</th>
                    <th>Nombre</th>
                    <th>Apellidos</th>
                    <th>Nota</th>
                    <th>Puntos Obtenidos</th>
                    <th>%</th>
                    <th>Categoría</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {getDatosPaginados().map((item, index) => (
                    <tr key={index}>
                      <td className="font-mono text-sm">{item.identificacion}</td>
                      <td>{item.nombre}</td>
                      <td>{item.apellidos}</td>
                      <td>
                        <span className={`badge ${
                          item.notaObtenida >= 70 ? 'badge-success' : 'badge-error'
                        }`}>
                          {item.notaObtenida}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">
                          {item.preguntasCorrectas}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-warning">
                          {item.porcentajePonderado}%
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-outline">
                          {item.categoria}
                        </span>
                      </td>
                      <td className="text-sm">{item.fechaRealizacion}</td>
                      <td>
                        <span className={`badge ${
                          item.estado === 'Activo' ? 'badge-success' : 'badge-error'
                        }`}>
                          {item.estado}
                        </span>
                      </td>
                      <td>
                        <button
                          onClick={() => cargarDetallesPrueba(item)}
                          className="btn btn-sm btn-outline"
                          disabled={loadingDetalles}
                        >
                          {loadingDetalles && estudianteSeleccionado?.identificacion === item.identificacion ? (
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
              
              {/* Controles de Paginación */}
              {getTotalPaginas() > 1 && (
                <div className="flex flex-col items-center mt-6 space-y-4">
                  {/* Información de registros */}
                  <div className="text-sm text-gray-600">
                    Mostrando {((paginaActual - 1) * registrosPorPagina) + 1} - {Math.min(paginaActual * registrosPorPagina, datosReporte.length)} de {datosReporte.length} registros
                  </div>
                  
                  {/* Controles de navegación */}
                  <div className="flex items-center space-x-2">
                    {/* Botón Anterior */}
                    <button
                      onClick={irAPaginaAnterior}
                      disabled={paginaActual === 1}
                      className={`btn btn-sm ${paginaActual === 1 ? 'btn-disabled' : 'btn-outline'}`}
                    >
                      ← Anterior
                    </button>
                    
                    {/* Números de página */}
                    <div className="flex space-x-1">
                      {Array.from({ length: getTotalPaginas() }, (_, i) => i + 1).map(numero => (
                        <button
                          key={numero}
                          onClick={() => cambiarPagina(numero)}
                          className={`btn btn-sm ${
                            numero === paginaActual 
                              ? 'btn-primary' 
                              : 'btn-outline'
                          }`}
                        >
                          {numero}
                        </button>
                      ))}
                    </div>
                    
                    {/* Botón Siguiente */}
                    <button
                      onClick={irAPaginaSiguiente}
                      disabled={paginaActual === getTotalPaginas()}
                      className={`btn btn-sm ${paginaActual === getTotalPaginas() ? 'btn-disabled' : 'btn-outline'}`}
                    >
                      Siguiente →
                    </button>
                  </div>
                  
                  {/* Información de página actual */}
                  <div className="text-xs text-gray-500">
                    Página {paginaActual} de {getTotalPaginas()}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Prueba */}
      {estudianteSeleccionado && detallesPrueba && (
        <div className="modal modal-open">
          <div className="modal-box max-w-6xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-lg" style={{ color: colors.primary }}>
                📋 Detalles de la Prueba - {estudianteSeleccionado.nombre} {estudianteSeleccionado.apellidos}
              </h3>
              <button
                className="btn btn-sm btn-circle btn-ghost"
                onClick={() => {
                  setEstudianteSeleccionado(null)
                  setDetallesPrueba(null)
                }}
              >
                ✕
              </button>
            </div>

            {/* Información del estudiante */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
              <div>
                <p><strong>Identificación:</strong> {estudianteSeleccionado.identificacion}</p>
                <p><strong>Categoría:</strong> {estudianteSeleccionado.categoria}</p>
                <p><strong>Fecha de realización:</strong> {estudianteSeleccionado.fechaRealizacion}</p>
              </div>
              <div>
                <p><strong>Nota obtenida:</strong> 
                  <span className={`badge ml-2 ${
                    estudianteSeleccionado.notaObtenida >= 70 ? 'badge-success' : 'badge-error'
                  }`}>
                    {estudianteSeleccionado.notaObtenida}
                  </span>
                </p>
                <p><strong>Puntos obtenidos:</strong> 
                  <span className="badge badge-info ml-2">
                    {estudianteSeleccionado.preguntasCorrectas}
                  </span>
                </p>
                <p><strong>Porcentaje ponderado:</strong> 
                  <span className="badge badge-warning ml-2">
                    {estudianteSeleccionado.porcentajePonderado}%
                  </span>
                </p>
              </div>
            </div>

            {/* Botón para descargar PDF */}
            <div className="mb-4">
              <button
                onClick={generarPDFIndividual}
                className="btn btn-primary"
              >
                📄 Descargar PDF Individual
              </button>
            </div>

            {/* Preguntas y respuestas */}
            <div className="space-y-6 max-h-96 overflow-y-auto">
              {detallesPrueba.respuestas.length === 0 && detallesPrueba.todasLasPreguntas.length > 0 && (
                <div className="alert alert-warning">
                  <span>⚠️ No se encontraron respuestas para este intento. Esto puede deberse a que el estudiante no completó la prueba o hay un problema con los datos.</span>
                </div>
              )}
              
              {detallesPrueba.todasLasPreguntas.length === 0 && (
                <div className="alert alert-error">
                  <span>❌ No se encontraron preguntas para esta categoría.</span>
                </div>
              )}
              
              {detallesPrueba.todasLasPreguntas.map((pregunta, index) => {
                const respuestaEstudiante = detallesPrueba.respuestas.find(r => 
                  r.pregunta.id === pregunta.id
                )
                
                return (
                  <div key={pregunta.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-semibold text-lg">
                        Pregunta {index + 1}
                      </h4>
                      <span className={`badge ${
                        respuestaEstudiante && respuestaEstudiante.opcion_seleccionada.es_correcta 
                          ? 'badge-success' 
                          : 'badge-error'
                      }`}>
                        {respuestaEstudiante && respuestaEstudiante.opcion_seleccionada.es_correcta 
                          ? 'Correcta' 
                          : 'Incorrecta'}
                      </span>
                    </div>
                    
                    <p className="mb-3 text-gray-700">{pregunta.pregunta}</p>
                    
                    {pregunta.imagen_url && (
                      <div className="mb-3">
                        <img 
                          src={pregunta.imagen_url} 
                          alt="Imagen de la pregunta"
                          className="max-w-xs rounded-lg border"
                        />
                      </div>
                    )}
                    
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
                                  ? 'bg-green-100 border-green-500' 
                                  : 'bg-red-100 border-red-500'
                                : esCorrecta 
                                  ? 'bg-green-50 border-green-300' 
                                  : 'bg-gray-50 border-gray-300'
                            }`}
                          >
                            <span className="font-medium">
                              {String.fromCharCode(97 + opcionIndex)}. {opcion.texto_opcion}
                            </span>
                            {esRespuestaEstudiante && (
                              <span className="badge badge-sm ml-2">Tu respuesta</span>
                            )}
                            {esCorrecta && (
                              <span className="badge badge-sm badge-success ml-2">Correcta</span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="modal-action">
              <button
                className="btn"
                onClick={() => {
                  setEstudianteSeleccionado(null)
                  setDetallesPrueba(null)
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reportes
