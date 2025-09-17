import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseConfig'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const Reportes = () => {
  const [loading, setLoading] = useState(false)
  const [datosReporte, setDatosReporte] = useState([])
  const [filtros, setFiltros] = useState({
    categoria: 'todas',
    estado: 'todos'
  })
  const [categorias, setCategorias] = useState([])

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
      console.log('📊 Cargando datos para reporte...')

      // Consulta simplificada para obtener intentos completados
      console.log('🔍 Iniciando consulta de reportes...')
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

      console.log('📊 Intentos encontrados:', intentos?.length || 0)

      if (!intentos || intentos.length === 0) {
        setDatosReporte([])
        return
      }

      // Obtener información de usuarios para cada intento
      const datosProcesados = await Promise.all(
        intentos.map(async (intento) => {
          try {
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

            // Obtener categoría del usuario
            const { data: categoriaData, error: errorCategoria } = await supabase
              .from('usuario_categorias')
              .select('categoria')
              .eq('usuario_id', intento.estudiante_id)
              .eq('activa', true)
              .single()

            const categoria = categoriaData?.categoria || 'Sin categoría'

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
              categoria: categoria,
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
      console.log('📊 Datos cargados para reporte:', datosFinales.length, 'registros')

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
    loadDatosReporte()
  }

  const limpiarFiltros = () => {
    setFiltros({
      categoria: 'todas',
      estado: 'todos'
    })
  }

  const generarExcel = () => {
    try {
      // Preparar datos para Excel
      const datosExcel = datosReporte.map(item => ({
        'Identificación': item.identificacion,
        'Nombre': item.nombre,
        'Apellidos': item.apellidos,
        'Nota Obtenida': item.notaObtenida,
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

      console.log('✅ Reporte Excel generado exitosamente')
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
        item.categoria,
        item.fechaRealizacion
      ])

      // Generar tabla
      doc.autoTable({
        startY: 45,
        head: [['Identificación', 'Nombre', 'Apellidos', 'Nota', 'Categoría', 'Fecha']],
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
          4: { halign: 'center', cellWidth: 30 }, // Categoría
          5: { halign: 'center', cellWidth: 25 }  // Fecha
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

      console.log('✅ Reporte PDF generado exitosamente')
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
                    <th>Categoría</th>
                    <th>Fecha</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {datosReporte.slice(0, 10).map((item, index) => (
                    <tr key={index}>
                      <td className="font-mono text-sm">{item.identificacion}</td>
                      <td>{item.nombre}</td>
                      <td>{item.apellidos}</td>
                      <td>
                        <span className={`badge ${
                          item.notaObtenida >= 70 ? 'badge-success' : 'badge-error'
                        }`}>
                          {item.notaObtenida}%
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
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {datosReporte.length > 10 && (
                <div className="text-center mt-4">
                  <p className="text-sm text-gray-500">
                    Mostrando los primeros 10 de {datosReporte.length} registros
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reportes
