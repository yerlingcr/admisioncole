import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import storageService from '../services/storageService'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import usuarioCategoriasService from '../services/usuarioCategoriasService'
import Swal from 'sweetalert2'

const ProfesorGestionPreguntas = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [opciones, setOpciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPregunta, setEditingPregunta] = useState(null)
  const [categoriaAsignada, setCategoriaAsignada] = useState(null)
  const [formData, setFormData] = useState({
    pregunta: '',
    imagen_url: '',
    categoria: '',
    nivel_dificultad: 'Fácil',
    orden_mostrar: 0,
    opciones: [
      { texto_opcion: '', es_correcta: false },
      { texto_opcion: '', es_correcta: false },
      { texto_opcion: '', es_correcta: false },
      { texto_opcion: '', es_correcta: false }
    ]
  })
  
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [dragActive, setDragActive] = useState(false)
  const [filtroUsuario, setFiltroUsuario] = useState('todos') // 'todos', 'mis_preguntas', 'otros'
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)

  const niveles = ['Fácil', 'Medio', 'Difícil']

  useEffect(() => {
    loadUserInfo()
  }, [])

  const loadUserInfo = async () => {
    try {
      if (user && user.identificacion) {
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('identificacion', user.identificacion)
          .single()
        
        if (error) throw error
        setUserInfo(userData)
        
        // Cargar categoría asignada al profesor
        await loadCategoriaAsignada(userData.identificacion)
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
      
      if (categorias && categorias.length > 0) {
        setCategoriaAsignada(categorias[0])
        
        // La categoría puede venir como string o como objeto
        const nombreCategoria = typeof categorias[0] === 'string' ? categorias[0] : categorias[0].nombre
        
        setFormData(prev => ({ ...prev, categoria: nombreCategoria }))
        await loadPreguntas(nombreCategoria)
      } else {
      }
    } catch (error) {
      console.error('Error cargando categoría asignada:', error)
    }
  }

  const loadPreguntas = async (categoria) => {
    try {
      setLoading(true)
      
      // Cargar preguntas solo de la categoría asignada
      const { data: preguntasData, error: preguntasError } = await supabase
        .from('preguntas_quiz')
        .select('*')
        .eq('categoria', categoria)
        .order('orden_mostrar')

      if (preguntasError) {
        console.error('❌ Error en consulta de preguntas:', preguntasError)
        throw preguntasError
      }

      // Cargar opciones para cada pregunta
      const { data: opcionesData, error: opcionesError } = await supabase
        .from('opciones_respuesta')
        .select('*')
        .in('pregunta_id', preguntasData?.map(p => p.id) || [])

      if (opcionesError) {
        console.error('❌ Error en consulta de opciones:', opcionesError)
        throw opcionesError
      }

      setPreguntas(preguntasData || [])
      setOpciones(opcionesData || [])
    } catch (error) {
      console.error('❌ ProfesorGestionPreguntas - Error cargando preguntas:', error)
    } finally {
      setLoading(false)
    }
  }

  // Función para filtrar preguntas por usuario creador
  const getPreguntasFiltradas = () => {
    if (filtroUsuario === 'todos') {
      return preguntas
    } else if (filtroUsuario === 'mis_preguntas') {
      return preguntas.filter(pregunta => pregunta.usuario_creador === userInfo?.identificacion)
    } else if (filtroUsuario === 'otros') {
      return preguntas.filter(pregunta => pregunta.usuario_creador !== userInfo?.identificacion)
    }
    return preguntas
  }

  const handleOpcionChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      opciones: prev.opciones.map((opcion, i) => 
        i === index ? { ...opcion, [field]: value } : opcion
      )
    }))
  }

  const handleCorrectaChange = (index) => {
    setFormData(prev => ({
      ...prev,
      opciones: prev.opciones.map((opcion, i) => ({
        ...opcion,
        es_correcta: i === index
      }))
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Mostrar loading dentro del SweetAlert
    Swal.fire({
      title: editingPregunta ? 'Actualizando...' : 'Guardando...',
      text: 'Por favor espera mientras procesamos la pregunta',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })
    
    try {
      if (editingPregunta) {
        // Actualizar pregunta existente
        const { data: preguntaData, error: preguntaError } = await supabase
          .from('preguntas_quiz')
          .update({
            pregunta: formData.pregunta,
            imagen_url: formData.imagen_url || null,
            categoria: formData.categoria,
            nivel_dificultad: formData.nivel_dificultad,
            orden_mostrar: formData.orden_mostrar,
            usuario_modificador: userInfo.identificacion,
            fecha_modificacion: new Date().toISOString()
          })
          .eq('id', editingPregunta.id)
          .select()

        if (preguntaError) throw preguntaError

        // Eliminar opciones existentes
        const { error: deleteOpcionesError } = await supabase
          .from('opciones_respuesta')
          .delete()
          .eq('pregunta_id', editingPregunta.id)

        if (deleteOpcionesError) throw deleteOpcionesError

        // Crear nuevas opciones
        for (let i = 0; i < formData.opciones.length; i++) {
          const opcion = formData.opciones[i]
          if (opcion.texto_opcion.trim()) {
            const { error: opcionError } = await supabase
              .from('opciones_respuesta')
              .insert({
                pregunta_id: editingPregunta.id,
                texto_opcion: opcion.texto_opcion,
                es_correcta: opcion.es_correcta,
                orden_mostrar: i + 1,
                usuario_modificador: userInfo.identificacion
              })

            if (opcionError) throw opcionError
          }
        }

      } else {
        
        const preguntaData = {
          pregunta: formData.pregunta,
          imagen_url: formData.imagen_url || null,
          categoria: formData.categoria,
          nivel_dificultad: formData.nivel_dificultad,
          orden_mostrar: formData.orden_mostrar,
          usuario_creador: userInfo.identificacion,
          usuario_modificador: userInfo.identificacion
        }
        
        console.log('📤 Datos a insertar en pregunta:', preguntaData)
        
        const { data: preguntaInsertada, error: preguntaError } = await supabase
          .from('preguntas_quiz')
          .insert(preguntaData)
          .select()
          .single()

        if (preguntaError) throw preguntaError

        // Crear opciones
        for (let i = 0; i < formData.opciones.length; i++) {
          const opcion = formData.opciones[i]
          if (opcion.texto_opcion.trim()) {
            const opcionData = {
              pregunta_id: preguntaInsertada.id,
              texto_opcion: opcion.texto_opcion,
              es_correcta: opcion.es_correcta,
              orden_mostrar: i + 1,
              usuario_creador: userInfo.identificacion,
              usuario_modificador: userInfo.identificacion
            }
            
            console.log(`📤 Insertando opción ${i + 1}:`, opcionData)
            
            const { error: opcionError } = await supabase
              .from('opciones_respuesta')
              .insert(opcionData)

            if (opcionError) throw opcionError
          }
        }
      }

      // Actualizar la lista localmente sin recargar toda la página
      if (editingPregunta) {
        // Actualizar pregunta existente en la lista
        setPreguntas(prev => prev.map(p => 
          p.id === editingPregunta.id 
            ? { ...p, pregunta: formData.pregunta, imagen_url: formData.imagen_url, nivel_dificultad: formData.nivel_dificultad }
            : p
        ))
      } else {
        // Agregar nueva pregunta a la lista
        const nuevaPregunta = {
          id: Date.now(), // ID temporal para la UI
          pregunta: formData.pregunta,
          imagen_url: formData.imagen_url,
          categoria: formData.categoria,
          nivel_dificultad: formData.nivel_dificultad,
          usuario_creador: userInfo.identificacion,
          fecha_creacion: new Date().toISOString()
        }
        setPreguntas(prev => [...prev, nuevaPregunta])
      }
      
      // Limpiar formulario
      resetForm()
      
      console.log('🎉 Proceso completado exitosamente')
      
      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: editingPregunta ? '¡Actualizada!' : '¡Creada!',
        text: editingPregunta ? 'La pregunta ha sido actualizada exitosamente.' : 'La pregunta ha sido creada exitosamente.',
        confirmButtonColor: '#10b981',
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('❌ Error en el proceso:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al guardar la pregunta: ' + error.message,
        confirmButtonColor: '#d33'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      pregunta: '',
      imagen_url: '',
      categoria: categoriaAsignada?.nombre || '',
      nivel_dificultad: 'Fácil',
      orden_mostrar: 0,
      opciones: [
        { texto_opcion: '', es_correcta: false },
        { texto_opcion: '', es_correcta: false },
        { texto_opcion: '', es_correcta: false },
        { texto_opcion: '', es_correcta: false }
      ]
    })
    setEditingPregunta(null)
    setShowForm(false)
    setSelectedFile(null)
    setUploadingImage(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Funciones para manejo de imágenes
  const processSelectedFile = (file) => {
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file)
      console.log('📁 Archivo seleccionado:', file.name)
    } else {
      alert('Por favor selecciona un archivo de imagen válido')
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDragOut = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0]
      processSelectedFile(file)
      e.dataTransfer.clearData()
    }
  }

  // Función para subir imagen
  const handleUploadImage = async () => {
    if (!selectedFile) return

    try {
      setUploadingImage(true)

      const result = await storageService.uploadImage(selectedFile)
      
      if (result.success) {
        setFormData(prev => ({ ...prev, imagen_url: result.publicUrl }))
        setSelectedFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }
      }
    } catch (error) {
      console.error('❌ Error subiendo imagen:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: `Error subiendo imagen: ${error.message}`,
        confirmButtonColor: '#d33'
      })
    } finally {
      setUploadingImage(false)
    }
  }

  // Función para eliminar imagen
  const handleRemoveImage = async () => {
    const result = await Swal.fire({
      title: '¿Eliminar imagen?',
      text: '¿Estás seguro de que quieres eliminar la imagen seleccionada?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    try {
      // Si hay una URL de imagen, extraer la ruta completa del archivo y eliminar del storage
      if (formData.imagen_url) {
        // Extraer la ruta completa del archivo de la URL
        // Ejemplo: https://zvplbofvzizfqdmetkvh.supabase.co/storage/v1/object/public/quiz-images/admin/1757117388349_ft9jq0am0ak.png
        // Necesitamos: admin/1757117388349_ft9jq0am0ak.png
        const urlParts = formData.imagen_url.split('/')
        const bucketIndex = urlParts.findIndex(part => part === 'quiz-images')
        if (bucketIndex !== -1 && bucketIndex + 1 < urlParts.length) {
          const filePath = urlParts.slice(bucketIndex + 1).join('/')
          
          await storageService.deleteImage(filePath)
        } else {
          console.error('❌ No se pudo extraer la ruta del archivo de la URL:', formData.imagen_url)
        }
      }
    } catch (error) {
      console.error('❌ Error eliminando imagen del storage:', error)
      // Continuar con la limpieza del formulario aunque falle la eliminación
    }
    
    // Limpiar el formulario
    setFormData(prev => ({ ...prev, imagen_url: '' }))
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    // Mostrar mensaje de éxito
    Swal.fire({
      icon: 'success',
      title: '¡Eliminada!',
      text: 'La imagen ha sido eliminada exitosamente.',
      confirmButtonColor: '#10b981'
    })
  }

  const handleEdit = async (pregunta) => {
    try {
      
      // Mostrar loading dentro del SweetAlert
      Swal.fire({
        title: 'Cargando...',
        text: 'Por favor espera mientras cargamos la pregunta',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading()
        }
      })

      setEditingPregunta(pregunta)
      setFormData(prev => ({
        ...prev,
        pregunta: pregunta.pregunta,
        imagen_url: pregunta.imagen_url || '',
        categoria: pregunta.categoria,
        nivel_dificultad: pregunta.nivel_dificultad,
        orden_mostrar: pregunta.orden_mostrar
      }))

      // Cargar opciones de la pregunta
      const { data: opcionesData, error } = await supabase
        .from('opciones_respuesta')
        .select('*')
        .eq('pregunta_id', pregunta.id)
        .order('orden_mostrar')

      if (error) throw error

      const opcionesFormateadas = [
        { texto_opcion: '', es_correcta: false },
        { texto_opcion: '', es_correcta: false },
        { texto_opcion: '', es_correcta: false },
        { texto_opcion: '', es_correcta: false }
      ]

      opcionesData.forEach((opcion, index) => {
        if (index < 4) {
          opcionesFormateadas[index] = {
            texto_opcion: opcion.texto_opcion,
            es_correcta: opcion.es_correcta
          }
        }
      })

      setFormData(prev => ({ ...prev, opciones: opcionesFormateadas }))
      setShowForm(true)
      
      // Cerrar el loading y mostrar éxito
      Swal.fire({
        icon: 'success',
        title: '¡Listo!',
        text: 'Pregunta cargada para editar',
        confirmButtonColor: '#10b981',
        timer: 1500,
        timerProgressBar: true
      })
      
    } catch (error) {
      console.error('❌ ProfesorGestionPreguntas - Error cargando pregunta para editar:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al cargar la pregunta para editar',
        confirmButtonColor: '#d33'
      })
    }
  }

  const handleDelete = async (pregunta) => {
    const result = await Swal.fire({
      title: '¿Eliminar pregunta?',
      text: `¿Estás seguro de que quieres eliminar la pregunta "${pregunta.pregunta.substring(0, 50)}${pregunta.pregunta.length > 50 ? '...' : ''}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    })

    if (!result.isConfirmed) return

    // Mostrar loading dentro del SweetAlert
    Swal.fire({
      title: 'Eliminando...',
      text: 'Por favor espera mientras eliminamos la pregunta',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      // Eliminar opciones primero
      const { error: opcionesError } = await supabase
        .from('opciones_respuesta')
        .delete()
        .eq('pregunta_id', pregunta.id)

      if (opcionesError) throw opcionesError

      // Eliminar pregunta
      const { error: preguntaError } = await supabase
        .from('preguntas_quiz')
        .delete()
        .eq('id', pregunta.id)

      if (preguntaError) throw preguntaError

      // Actualizar la lista localmente sin recargar toda la página
      setPreguntas(prev => prev.filter(p => p.id !== pregunta.id))
      setOpciones(prev => prev.filter(op => op.pregunta_id !== pregunta.id))
      
      
      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Eliminada!',
        text: 'La pregunta ha sido eliminada exitosamente.',
        confirmButtonColor: '#10b981',
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('❌ Error eliminando pregunta:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al eliminar la pregunta: ' + error.message,
        confirmButtonColor: '#d33'
      })
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return <LoadingSpinner text="Cargando gestión de preguntas..." />
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

  if (!categoriaAsignada) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-800 via-amber-900 to-slate-800 flex items-center justify-center">
        <div className="alert alert-warning">
          <span>No tienes una categoría asignada. Contacta al administrador.</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">


      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón para agregar nueva pregunta y filtro */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary btn-lg"
          >
            + Agregar Nueva Pregunta
          </button>
          
          {/* Filtro por usuario creador */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por:</label>
            <select
              value={filtroUsuario}
              onChange={(e) => setFiltroUsuario(e.target.value)}
              className="select select-bordered select-sm bg-white border-gray-300 text-gray-800"
            >
              <option value="todos">Todas las preguntas</option>
              <option value="mis_preguntas">Mis preguntas</option>
              <option value="otros">Preguntas de otros</option>
            </select>
          </div>
        </div>

        {/* Formulario de pregunta */}
        {showForm && (
          <div className="card bg-white border border-gray-300 shadow-lg mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl text-gray-800 mb-6">
                {editingPregunta ? '✏️ Editar Pregunta' : '➕ Agregar Nueva Pregunta'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Enunciado de la Pregunta */}
                <div>
                  <label className="label">
                    <span className="label-text text-gray-700">Enunciado de la Pregunta *</span>
                  </label>
                  <textarea
                    value={formData.pregunta}
                    onChange={(e) => setFormData(prev => ({ ...prev, pregunta: e.target.value }))}
                    className="textarea textarea-bordered w-full bg-white border-gray-300 text-gray-800"
                    placeholder="Escribe aquí el enunciado de la pregunta..."
                    rows={3}
                    required
                  />
                </div>

                {/* Sección de Imagen */}
                <div>
                  <label className="label">
                    <span className="label-text text-gray-700">Imagen de la Pregunta (Opcional)</span>
                  </label>
                  
                  {/* Zona de arrastrar y soltar */}
                  <div
                    ref={dropZoneRef}
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      dragActive 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 bg-gray-50 hover:border-gray-400'
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDragOut={handleDragOut}
                    onDrop={handleDrop}
                  >
                    <div className="space-y-4">
                      <div className="text-gray-500">
                        <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">
                          Arrastra y suelta una imagen aquí, o{' '}
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="text-blue-600 hover:text-blue-500 font-medium"
                          >
                            haz clic para seleccionar
                          </button>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          PNG, JPG, GIF hasta 10MB
                        </p>
                      </div>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* Archivo seleccionado */}
                  {selectedFile && (
                    <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <svg className="h-8 w-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-blue-900">{selectedFile.name}</p>
                            <p className="text-xs text-blue-700">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={handleUploadImage}
                            disabled={uploadingImage}
                            className="btn btn-sm btn-primary"
                          >
                            {uploadingImage ? (
                              <>
                                <span className="loading loading-spinner loading-xs"></span>
                                Subiendo...
                              </>
                            ) : (
                              'Subir Imagen'
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFile(null)
                              if (fileInputRef.current) fileInputRef.current.value = ''
                            }}
                            className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                          >
                            ✕ Cancelar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Imagen subida */}
                  {formData.imagen_url && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-green-900">Imagen subida</h4>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="btn btn-xs btn-ghost text-red-600 hover:bg-red-50"
                        >
                          ✕ Eliminar
                        </button>
                      </div>
                      <div className="relative">
                        <img
                          src={formData.imagen_url}
                          alt="Vista previa"
                          className="max-w-full h-48 object-contain rounded-lg border border-gray-200"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.nextSibling.style.display = 'block'
                          }}
                        />
                        <div className="hidden text-center text-gray-500 py-8">
                          <p>Error al cargar la imagen</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Categoría (fija para profesores) */}
                <div>
                  <label className="label">
                    <span className="label-text text-gray-700">Categoría</span>
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    className="input input-bordered w-full bg-gray-100 border-gray-300 text-gray-600"
                    disabled
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Solo puedes crear preguntas para tu categoría asignada: {categoriaAsignada.nombre}
                  </p>
                </div>

                {/* Nivel de Dificultad */}
                <div>
                  <label className="label">
                    <span className="label-text text-gray-700">Nivel de Dificultad *</span>
                  </label>
                  <select
                    value={formData.nivel_dificultad}
                    onChange={(e) => setFormData(prev => ({ ...prev, nivel_dificultad: e.target.value }))}
                    className="select select-bordered w-full bg-white border-gray-300 text-gray-800"
                    required
                  >
                    {niveles.map(nivel => (
                      <option key={nivel} value={nivel}>{nivel}</option>
                    ))}
                  </select>
                </div>

                {/* Opciones de Respuesta */}
                <div>
                  <label className="label">
                    <span className="label-text text-gray-700">Opciones de Respuesta *</span>
                  </label>
                  <p className="text-sm text-gray-600 mb-3">
                    Las primeras 2 opciones son obligatorias. Las opciones 3 y 4 son opcionales.
                  </p>
                  <div className="space-y-3">
                    {formData.opciones.map((opcion, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="correcta"
                          checked={opcion.es_correcta}
                          onChange={() => handleCorrectaChange(index)}
                          className="radio radio-primary"
                        />
                        <input
                          type="text"
                          value={opcion.texto_opcion}
                          onChange={(e) => handleOpcionChange(index, 'texto_opcion', e.target.value)}
                          className="input input-bordered flex-1 bg-white border-gray-300 text-gray-800"
                          placeholder={index < 2 ? `Opción ${index + 1} (requerida)` : `Opción ${index + 1} (opcional)`}
                          required={index < 2}
                        />
                        <span className="text-sm text-gray-700">
                          {opcion.es_correcta ? '✅ Correcta' : '❌ Incorrecta'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="btn btn-outline"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Guardando...' : (editingPregunta ? 'Actualizar' : 'Guardar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de Preguntas */}
        <div className="card bg-white border border-gray-300 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-2xl text-gray-800 mb-6">
              📋 Mis Preguntas ({getPreguntasFiltradas().length})
            </h2>
            
            {getPreguntasFiltradas().length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {preguntas.length === 0 ? (
                  <>
                    <p className="text-lg">No hay preguntas en tu categoría.</p>
                    <p className="text-sm">Haz clic en "Agregar Nueva Pregunta" para comenzar.</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg">No hay preguntas que coincidan con el filtro seleccionado.</p>
                    <p className="text-sm">Cambia el filtro o agrega una nueva pregunta.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {getPreguntasFiltradas().map((pregunta) => {
                  const preguntaOpciones = opciones.filter(op => op.pregunta_id === pregunta.id)
                  const opcionCorrecta = preguntaOpciones.find(op => op.es_correcta)
                  
                  return (
                    <div key={pregunta.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 text-lg mb-2">{pregunta.pregunta}</h3>
                          
                          {/* Imagen de la pregunta */}
                          {pregunta.imagen_url && (
                            <div className="mb-3">
                              <img
                                src={pregunta.imagen_url}
                                alt="Imagen de la pregunta"
                                className="max-w-xs h-32 object-contain rounded-lg border border-gray-200 bg-white p-2"
                                onError={(e) => {
                                  e.target.style.display = 'none'
                                  e.target.nextSibling.style.display = 'block'
                                }}
                              />
                              <div className="hidden text-center text-gray-500 py-4 text-sm">
                                <p>Error al cargar la imagen</p>
                              </div>
                            </div>
                          )}
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <span className="badge bg-amber-600 text-white border-0">{pregunta.categoria}</span>
                            <span className="badge bg-gray-600 text-white border-0">{pregunta.nivel_dificultad}</span>
                            <span className="badge bg-blue-600 text-white border-0">👤 {pregunta.usuario_creador || 'Sistema'}</span>
                          </div>
                          
                          {/* Opciones */}
                          <div className="space-y-2">
                            {preguntaOpciones.map((opcion, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <span className={`badge ${opcion.es_correcta ? 'bg-green-600' : 'bg-red-600'} text-white border-0`}>
                                  {opcion.es_correcta ? '✅' : '❌'}
                                </span>
                                <span className="text-gray-700">{opcion.texto_opcion}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        {/* Solo mostrar botones de editar/eliminar si la pregunta fue creada por este profesor */}
                        {pregunta.usuario_creador === userInfo?.identificacion && (
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(pregunta)}
                              className="btn btn-sm btn-warning"
                            >
                              Editar
                            </button>
                            <button
                              onClick={() => handleDelete(pregunta)}
                              className="btn btn-sm btn-error"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                        
                        {/* Mostrar mensaje si no puede editar */}
                        {pregunta.usuario_creador !== userInfo?.identificacion && (
                          <div className="ml-4">
                            <span className="text-sm text-gray-500 italic">
                              Solo puedes editar tus propias preguntas
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfesorGestionPreguntas


