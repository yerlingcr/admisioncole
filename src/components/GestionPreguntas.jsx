import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import storageService from '../services/storageService'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import usuarioCategoriasService from '../services/usuarioCategoriasService'
import Swal from 'sweetalert2'

const GestionPreguntas = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [preguntas, setPreguntas] = useState([])
  const [opciones, setOpciones] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingPregunta, setEditingPregunta] = useState(null)
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
  const fileInputRef = useRef(null)
  const dropZoneRef = useRef(null)
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([])
  const [categoriaFiltro, setCategoriaFiltro] = useState('')

  const niveles = ['Fácil', 'Medio', 'Difícil']

  useEffect(() => {
    loadUserInfo()
    loadPreguntas()
    loadCategorias()
  }, [])

  const loadCategorias = async () => {
    try {
      const categorias = await usuarioCategoriasService.getCategoriasDisponibles()
      setCategoriasDisponibles(categorias)
    } catch (error) {
      console.error('Error cargando categorías:', error)
    }
  }

  const preguntasFiltradas = categoriaFiltro 
    ? preguntas.filter(pregunta => pregunta.categoria === categoriaFiltro)
    : preguntas

  const loadUserInfo = async () => {
    try {
      // Usar el contexto de autenticación personalizado
      if (user && user.identificacion) {
        const { data: userData, error } = await supabase
          .from('usuarios')
          .select('*')
          .eq('identificacion', user.identificacion)
          .single()
        
        if (error) throw error
        setUserInfo(userData)
      }
    } catch (error) {
      console.error('Error cargando información del usuario:', error)
    }
  }

  const loadPreguntas = async () => {
    try {
      setLoading(true)
      
      // Mostrar indicador de progreso
      Swal.fire({
        title: 'Cargando preguntas...',
        text: 'Por favor espera mientras se cargan las preguntas',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        didOpen: () => {
          Swal.showLoading()
        },
        background: '#ffffff',
        color: '#4d3930',
        customClass: {
          popup: 'swal2-popup-custom',
          title: 'swal2-title-custom',
          content: 'swal2-content-custom'
        }
      })
      
      // Cargar preguntas
      const { data: preguntasData, error: preguntasError } = await supabase
        .from('preguntas_quiz')
        .select('*')
        .order('orden_mostrar')

      if (preguntasError) throw preguntasError

      // Cargar opciones para cada pregunta
      const { data: opcionesData, error: opcionesError } = await supabase
        .from('opciones_respuesta')
        .select('*')
        .order('orden_mostrar')

      if (opcionesError) throw opcionesError

      setPreguntas(preguntasData || [])
      setOpciones(opcionesData || [])
    } catch (error) {
      console.error('Error cargando preguntas:', error)
      // Cerrar indicador de progreso en caso de error
      Swal.close()
    } finally {
      setLoading(false)
      // Cerrar indicador de progreso
      Swal.close()
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
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

  const resetForm = () => {
    setFormData({
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
    setEditingPregunta(null)
    setShowForm(false)
    setSelectedFile(null)
    setUploadingImage(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      if (editingPregunta) {
        
        const updateData = {
          pregunta: formData.pregunta,
          imagen_url: formData.imagen_url || null,
          categoria: formData.categoria,
          nivel_dificultad: formData.nivel_dificultad,
          orden_mostrar: formData.orden_mostrar
        }
        
        
        // Actualizar pregunta existente
        const { data: preguntaData, error: preguntaError } = await supabase
          .from('preguntas_quiz')
          .update(updateData)
          .eq('id', editingPregunta.id)
          .select()

        if (preguntaError) throw preguntaError

        // Eliminar opciones existentes
        const { error: deleteError } = await supabase
          .from('opciones_respuesta')
          .delete()
          .eq('pregunta_id', editingPregunta.id)

        if (deleteError) throw deleteError

        // Recrear opciones
        for (let i = 0; i < formData.opciones.length; i++) {
          const opcion = formData.opciones[i]
          if (opcion.texto_opcion.trim()) {
            const opcionData = {
              pregunta_id: editingPregunta.id,
              texto_opcion: opcion.texto_opcion,
              es_correcta: opcion.es_correcta,
              orden_mostrar: i + 1
            }
            
            
            const { error: opcionError } = await supabase
              .from('opciones_respuesta')
              .insert(opcionData)

            if (opcionError) throw opcionError
          }
        }
      } else {
        // Crear nueva pregunta
        const preguntaData = {
          pregunta: formData.pregunta,
          imagen_url: formData.imagen_url || null,
          categoria: formData.categoria,
          nivel_dificultad: formData.nivel_dificultad,
          orden_mostrar: formData.orden_mostrar
        }
        
        
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
              orden_mostrar: i + 1
            }
            
            
            const { error: opcionError } = await supabase
              .from('opciones_respuesta')
              .insert(opcionData)

            if (opcionError) throw opcionError
          }
        }
      }

      
      // Actualizar la lista primero
      await loadPreguntas()
      
      // Mostrar mensaje de éxito
      await Swal.fire({
        title: editingPregunta ? '¡Pregunta Actualizada!' : '¡Pregunta Creada!',
        text: editingPregunta ? 'La pregunta ha sido actualizada exitosamente.' : 'La pregunta ha sido creada exitosamente.',
        icon: 'success',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f97316',
        background: '#ffffff',
        color: '#4d3930',
        customClass: {
          popup: 'swal2-popup-custom',
          title: 'swal2-title-custom',
          content: 'swal2-content-custom',
          confirmButton: 'swal2-confirm-custom'
        }
      })
      
      // Cerrar formulario después del mensaje
      resetForm()
    } catch (error) {
      console.error('❌ Error guardando pregunta:', error)
      console.error('🔍 Detalles del error:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      Swal.fire({
        title: 'Error',
        text: `Error guardando la pregunta: ${error.message}`,
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (pregunta) => {
    const preguntaOpciones = opciones.filter(op => op.pregunta_id === pregunta.id)
    
    setFormData({
      pregunta: pregunta.pregunta,
      imagen_url: pregunta.imagen_url || '',
      categoria: pregunta.categoria,
      nivel_dificultad: pregunta.nivel_dificultad,
      orden_mostrar: pregunta.orden_mostrar,
      opciones: [
        { texto_opcion: preguntaOpciones[0]?.texto_opcion || '', es_correcta: preguntaOpciones[0]?.es_correcta || false },
        { texto_opcion: preguntaOpciones[1]?.texto_opcion || '', es_correcta: preguntaOpciones[1]?.es_correcta || false },
        { texto_opcion: preguntaOpciones[2]?.texto_opcion || '', es_correcta: preguntaOpciones[2]?.es_correcta || false },
        { texto_opcion: preguntaOpciones[3]?.texto_opcion || '', es_correcta: preguntaOpciones[3]?.es_correcta || false }
      ]
    })
    
    setEditingPregunta(pregunta)
    setShowForm(true)
  }

  const handleDelete = async (preguntaId) => {
    const result = await Swal.fire({
      title: '¿Eliminar pregunta?',
      text: '¿Estás seguro de que quieres eliminar esta pregunta? Esta acción no se puede deshacer.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#4d3930',
      customClass: {
        popup: 'swal2-popup-custom',
        title: 'swal2-title-custom',
        content: 'swal2-content-custom',
        confirmButton: 'swal2-confirm-custom',
        cancelButton: 'swal2-cancel-custom'
      },
      buttonsStyling: true,
      allowOutsideClick: false,
      allowEscapeKey: false
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      setLoading(true)

      // Eliminar opciones primero
      const { error: opcionesError } = await supabase
        .from('opciones_respuesta')
        .delete()
        .eq('pregunta_id', preguntaId)

      if (opcionesError) throw opcionesError

      // Eliminar pregunta
      const { error: preguntaError } = await supabase
        .from('preguntas_quiz')
        .delete()
        .eq('id', preguntaId)

      if (preguntaError) throw preguntaError

      // Actualizar la lista primero
      await loadPreguntas()
      
      // Mostrar mensaje de éxito
      await Swal.fire({
        title: '¡Pregunta Eliminada!',
        text: 'La pregunta ha sido eliminada exitosamente.',
        icon: 'success',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f97316',
        background: '#ffffff',
        color: '#4d3930',
        customClass: {
          popup: 'swal2-popup-custom',
          title: 'swal2-title-custom',
          content: 'swal2-content-custom',
          confirmButton: 'swal2-confirm-custom'
        }
      })
    } catch (error) {
      console.error('Error eliminando pregunta:', error)
      Swal.fire({
        title: 'Error',
        text: 'Error eliminando la pregunta. Por favor, intenta de nuevo.',
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
    } finally {
      setLoading(false)
    }
  }

  // Función para manejar la selección de archivo
  const handleFileSelect = (e) => {
    const file = e.target.files[0]
    if (file) {
      processSelectedFile(file)
    }
  }

  // Función para procesar archivo seleccionado
  const processSelectedFile = (file) => {
    const validation = storageService.validateFile(file)
    if (validation.isValid) {
      setSelectedFile(file)
      setFormData(prev => ({ ...prev, imagen_url: '' })) // Limpiar URL si hay archivo
    } else {
      Swal.fire({
        title: 'Error en el archivo',
        html: validation.errors.join('<br>'),
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
      if (fileInputRef.current) {
        fileInputRef.current.value = '' // Limpiar input
      }
    }
  }

  // Funciones para drag & drop
  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDragIn = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true)
    }
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
        title: 'Error subiendo imagen',
        text: `Error subiendo imagen: ${error.message}`,
        icon: 'error',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
    } finally {
      setUploadingImage(false)
    }
  }

  // Función para eliminar imagen
  const handleRemoveImage = async () => {
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

  return (
    <div className="min-h-screen bg-gray-50">

      {/* Contenido Principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Botón para Agregar Nueva Pregunta */}
          <div className="mb-8 text-center">
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-lg border-0 font-bold text-xl px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105"
              style={{ backgroundColor: '#f4b100', color: '#ffffff' }}
            >
              ➕ Agregar Nueva Pregunta
            </button>
          </div>

          {/* Formulario de Pregunta */}
          {showForm && (
            <div className="card bg-white border border-gray-300 shadow-lg mb-8">
              <div className="card-body">
                <h2 className="card-title text-2xl text-gray-800 mb-6">
                  {editingPregunta ? '✏️ Editar Pregunta' : '➕ Nueva Pregunta'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Pregunta */}
                  <div>
                    <label className="label">
                      <span className="label-text text-gray-700">Pregunta *</span>
                    </label>
                    <textarea
                      value={formData.pregunta}
                      onChange={(e) => handleInputChange('pregunta', e.target.value)}
                      className="textarea textarea-bordered w-full bg-white border-gray-300 text-gray-800"
                      placeholder="Escribe la pregunta aquí..."
                      required
                      rows={3}
                    />
                  </div>

                  {/* Subida de Imagen */}
                  <div>
                    <label className="label">
                      <span className="label-text text-gray-700">Imagen de la Pregunta (opcional)</span>
                    </label>
                    
                    {/* Zona de Drag & Drop */}
                    <div 
                      ref={dropZoneRef}
                      onDragEnter={handleDragIn}
                      onDragLeave={handleDragOut}
                      onDragOver={handleDrag}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200 ${
                        dragActive 
                          ? 'border-amber-400 bg-amber-100 scale-105' 
                          : 'border-gray-300 bg-gray-50 hover:border-amber-400 hover:bg-amber-50'
                      }`}
                    >
                      {dragActive ? (
                        <div className="text-amber-400">
                          <div className="text-2xl mb-2">📁</div>
                          <p className="font-semibold">¡Suelta la imagen aquí!</p>
                        </div>
                      ) : (
                        <div className="text-gray-600">
                          <div className="text-3xl mb-3">📁</div>
                          <p className="font-semibold mb-2">Arrastra y suelta tu imagen aquí</p>
                          <p className="text-sm mb-4">O haz clic para seleccionar</p>
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-outline btn-sm text-gray-700 border-gray-300 hover:bg-gray-100"
                          >
                            📂 Seleccionar Archivo
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Input de archivo (oculto) */}
                    <div className="hidden">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileSelect}
                      />
                    </div>

                    <p className="text-xs text-gray-500 mt-2 text-center">
                      Formatos permitidos: JPEG, PNG, GIF, WebP. 
                      <br />
                      Las imágenes grandes se comprimirán automáticamente.
                    </p>

                    {/* Botón para subir imagen seleccionada */}
                    {selectedFile && (
                      <div className="mb-3">
                        <button
                          type="button"
                          onClick={handleUploadImage}
                          disabled={uploadingImage}
                          className="btn btn-primary btn-sm bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 border-0"
                        >
                          {uploadingImage ? (
                            <>
                              <span className="loading loading-spinner loading-sm"></span>
                              Subiendo...
                            </>
                          ) : (
                            '📤 Subir Imagen'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="btn btn-outline btn-sm text-red-400 border-red-400/30 hover:bg-red-400/20 ml-2"
                        >
                          ❌ Cancelar
                        </button>
                      </div>
                    )}

                    {/* URL de imagen (para edición o URL externa) */}
                    <div className="mb-3">
                      <label className="label">
                        <span className="label-text text-gray-700 text-sm">O ingresa una URL externa:</span>
                      </label>
                      <input
                        type="url"
                        value={formData.imagen_url}
                        onChange={(e) => handleInputChange('imagen_url', e.target.value)}
                        className="input input-bordered w-full bg-white border-gray-300 text-gray-800"
                        placeholder="https://ejemplo.com/imagen.jpg"
                      />
                    </div>

                    {/* Vista previa de la imagen */}
                    {formData.imagen_url && (
                      <div className="mb-3">
                        <label className="label">
                          <span className="label-text text-gray-700 text-sm">Vista previa:</span>
                        </label>
                        <div className="relative">
                          <img
                            src={formData.imagen_url}
                            alt="Vista previa"
                            className="max-w-full h-auto max-h-32 rounded-lg border border-gray-300"
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.nextSibling.style.display = 'block'
                            }}
                          />
                          <div className="hidden text-center text-gray-500 text-sm py-4 bg-gray-100 rounded-lg">
                            Imagen no disponible
                          </div>
                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="btn btn-circle btn-sm btn-error absolute top-2 right-2"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Categoría y Nivel */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text text-gray-700">Categoría *</span>
                      </label>
                      <select
                        value={formData.categoria}
                        onChange={(e) => handleInputChange('categoria', e.target.value)}
                        className="select select-bordered w-full bg-white border-gray-300 text-gray-800"
                        required
                      >
                        <option value="">Selecciona una categoría</option>
                        {categoriasDisponibles.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="label">
                        <span className="label-text text-gray-700">Nivel de Dificultad *</span>
                      </label>
                      <select
                        value={formData.nivel_dificultad}
                        onChange={(e) => handleInputChange('nivel_dificultad', e.target.value)}
                        className="select select-bordered w-full bg-white border-gray-300 text-gray-800"
                        required
                      >
                        {niveles.map(nivel => (
                          <option key={nivel} value={nivel}>{nivel}</option>
                        ))}
                      </select>
                    </div>
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
                      className="btn btn-outline text-gray-700 border-gray-300 hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0"
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
                📋 Base de Datos de Preguntas ({preguntasFiltradas.length})
              </h2>
              
              {/* Filtro por categoría */}
              <div className="mb-6">
                <label className="label">
                  <span className="label-text font-medium text-gray-700">Filtrar por categoría:</span>
                </label>
                <select 
                  className="select select-bordered w-full max-w-xs"
                  value={categoriaFiltro}
                  onChange={(e) => setCategoriaFiltro(e.target.value)}
                >
                  <option value="">Todas las categorías</option>
                  {categoriasDisponibles.length > 0 ? (
                    categoriasDisponibles.map((categoriaNombre, index) => (
                      <option key={`categoria-${index}`} value={categoriaNombre}>
                        {categoriaNombre}
                      </option>
                    ))
                  ) : (
                    <option key="loading" disabled>Cargando categorías...</option>
                  )}
                </select>
              </div>
              
              {preguntasFiltradas.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  {categoriaFiltro ? (
                    <>
                      <p className="text-lg">No hay preguntas en la categoría "{categoriaFiltro}".</p>
                      <p className="text-sm">Selecciona otra categoría o agrega preguntas a esta categoría.</p>
                    </>
                  ) : (
                    <>
                      <p className="text-lg">No hay preguntas configuradas.</p>
                      <p className="text-sm">Haz clic en "Agregar Nueva Pregunta" para comenzar.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {preguntasFiltradas.map((pregunta) => {
                    const preguntaOpciones = opciones.filter(op => op.pregunta_id === pregunta.id)
                    const opcionCorrecta = preguntaOpciones.find(op => op.es_correcta)
                    
                    return (
                      <div key={pregunta.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-800 text-lg mb-2">{pregunta.pregunta}</h3>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="badge bg-amber-600 text-white border-0">{pregunta.categoria}</span>
                              <span className="badge bg-gray-600 text-white border-0">{pregunta.nivel_dificultad}</span>
                              <span className="badge bg-blue-600 text-white border-0">👤 {pregunta.usuario_creador || 'Sistema'}</span>
                            </div>
                            {pregunta.imagen_url && (
                              <div className="mb-3">
                                <img
                                  src={pregunta.imagen_url}
                                  alt="Imagen de la pregunta"
                                  className="max-w-full h-auto max-h-32 rounded-lg border border-gray-300"
                                  onError={(e) => {
                                    e.target.style.display = 'none'
                                    e.target.nextSibling.style.display = 'block'
                                  }}
                                />
                                <div className="hidden text-center text-gray-500 text-sm py-2 bg-gray-100 rounded-lg">
                                  Imagen no disponible
                                </div>
                              </div>
                            )}
                            <div className="space-y-1">
                              {preguntaOpciones.map((opcion, index) => (
                                <div key={opcion.id} className="flex items-center gap-2">
                                  <span className={`text-sm ${opcion.es_correcta ? 'text-green-600 font-bold' : 'text-gray-600'}`}>
                                    {opcion.es_correcta ? '✅' : '❌'} {opcion.texto_opcion}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            <button
                              onClick={() => handleEdit(pregunta)}
                              className="btn btn-sm bg-amber-600 text-white border-0 hover:bg-amber-700"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDelete(pregunta.id)}
                              className="btn btn-sm bg-red-600 text-white border-0 hover:bg-red-700"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
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
    </div>
  )
}

export default GestionPreguntas
