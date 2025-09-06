import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import Swal from 'sweetalert2'

const GestionCategorias = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [categorias, setCategorias] = useState([])
  const [preguntasPorCategoria, setPreguntasPorCategoria] = useState({})
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCategoria, setEditingCategoria] = useState(null)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    color: '#f4b100',
    activa: true
  })

  useEffect(() => {
    loadUserInfo()
    loadCategorias()
    loadPreguntasPorCategoria()
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
      }
    } catch (error) {
      console.error('Error cargando información del usuario:', error)
    }
  }

  const loadCategorias = async () => {
    try {
      setLoading(true)
      
      const { data: categoriasData, error } = await supabase
        .from('categorias_quiz')
        .select('*')
        .order('nombre')

      if (error) throw error
      setCategorias(categoriasData || [])
    } catch (error) {
      console.error('Error cargando categorías:', error)
      Swal.fire({
        title: 'Error',
        text: `Error cargando categorías: ${error.message}`,
        icon: 'error',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadPreguntasPorCategoria = async () => {
    try {
      const { data: preguntasData, error } = await supabase
        .from('preguntas_quiz')
        .select('categoria')

      if (error) throw error

      // Contar preguntas por categoría
      const conteo = {}
      preguntasData?.forEach(pregunta => {
        const categoria = pregunta.categoria || 'Sin categoría'
        conteo[categoria] = (conteo[categoria] || 0) + 1
      })

      setPreguntasPorCategoria(conteo)
    } catch (error) {
      console.error('Error cargando conteo de preguntas:', error)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      color: '#f4b100',
      activa: true
    })
    setEditingCategoria(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)

      if (editingCategoria) {
        // Actualizar categoría existente
        const updateData = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          color: formData.color,
          activa: formData.activa,
          usuario_modificador: userInfo.identificacion
        }

        const { error } = await supabase
          .from('categorias_quiz')
          .update(updateData)
          .eq('id', editingCategoria.id)

        if (error) throw error

        Swal.fire({
          title: '¡Actualizada!',
          text: 'Categoría actualizada exitosamente',
          icon: 'success',
          confirmButtonColor: '#b47b21',
          background: '#ffffff',
          color: '#4d3930'
        })
      } else {
        // Crear nueva categoría
        const categoriaData = {
          nombre: formData.nombre,
          descripcion: formData.descripcion,
          color: formData.color,
          activa: formData.activa,
          usuario_creador: userInfo.identificacion,
          usuario_modificador: userInfo.identificacion
        }

        const { error } = await supabase
          .from('categorias_quiz')
          .insert(categoriaData)

        if (error) throw error

        Swal.fire({
          title: '¡Creada!',
          text: 'Categoría creada exitosamente',
          icon: 'success',
          confirmButtonColor: '#b47b21',
          background: '#ffffff',
          color: '#4d3930'
        })
      }

      await loadCategorias()
      await loadPreguntasPorCategoria()
      resetForm()
    } catch (error) {
      console.error('Error guardando categoría:', error)
      Swal.fire({
        title: 'Error',
        text: `Error guardando la categoría: ${error.message}`,
        icon: 'error',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (categoria) => {
    setFormData({
      nombre: categoria.nombre,
      descripcion: categoria.descripcion || '',
      color: categoria.color,
      activa: categoria.activa
    })
    setEditingCategoria(categoria)
    setShowForm(true)
  }

  const handleDelete = async (categoriaId) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción eliminará la categoría. Las preguntas asociadas quedarán sin categoría.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#b47b21',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#4d3930'
    })

    if (!result.isConfirmed) return

    try {
      setLoading(true)

      Swal.fire({
        title: 'Eliminando categoría...',
        text: 'Por favor espera',
        allowOutsideClick: false,
        allowEscapeKey: false,
        showConfirmButton: false,
        willOpen: () => {
          Swal.showLoading()
        }
      })

      const { error } = await supabase
        .from('categorias_quiz')
        .delete()
        .eq('id', categoriaId)

      if (error) throw error

      await loadCategorias()
      await loadPreguntasPorCategoria()

      Swal.fire({
        title: '¡Eliminada!',
        text: 'La categoría ha sido eliminada exitosamente',
        icon: 'success',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
    } catch (error) {
      console.error('Error eliminando categoría:', error)
      Swal.fire({
        title: 'Error',
        text: 'Error eliminando la categoría. Por favor, intenta de nuevo.',
        icon: 'error',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return <LoadingSpinner text="Cargando gestión de categorías..." />
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

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8f9fa' }}>
      {/* Contenido Principal */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          
          {/* Botón para Agregar Nueva Categoría */}
          <div className="mb-8 text-center">
            <button
              onClick={() => setShowForm(true)}
              className="btn btn-lg border-0"
              style={{ 
                backgroundColor: '#f4b100', 
                color: '#ffffff',
                ':hover': { backgroundColor: '#b47b21' }
              }}
            >
              ➕ Agregar Nueva Categoría
            </button>
          </div>

          {/* Formulario de Categoría */}
          {showForm && (
            <div className="card shadow-xl mb-8" style={{ backgroundColor: '#ffffff', border: '1px solid #b47b21' }}>
              <div className="card-body">
                <h2 className="card-title text-2xl mb-6" style={{ color: '#4d3930' }}>
                  {editingCategoria ? '✏️ Editar Categoría' : '➕ Nueva Categoría'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Nombre */}
                  <div>
                    <label className="label">
                      <span className="label-text" style={{ color: '#4d3930' }}>Nombre de la Categoría *</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => handleInputChange('nombre', e.target.value)}
                      className="input input-bordered w-full"
                      style={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: '#b47b21',
                        color: '#4d3930'
                      }}
                      placeholder="Ej. Geografía"
                      required
                    />
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="label">
                      <span className="label-text" style={{ color: '#4d3930' }}>Descripción</span>
                    </label>
                    <textarea
                      value={formData.descripcion}
                      onChange={(e) => handleInputChange('descripcion', e.target.value)}
                      className="textarea textarea-bordered w-full"
                      style={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: '#b47b21',
                        color: '#4d3930'
                      }}
                      placeholder="Descripción de la categoría..."
                      rows="3"
                    />
                  </div>

                  {/* Color */}
                  <div>
                    <label className="label">
                      <span className="label-text" style={{ color: '#4d3930' }}>Color de la Categoría</span>
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="color"
                        value={formData.color}
                        onChange={(e) => handleInputChange('color', e.target.value)}
                        className="w-16 h-12 rounded border-2"
                        style={{ borderColor: '#b47b21' }}
                      />
                      <span className="text-sm" style={{ color: '#4d3930' }}>
                        {formData.color}
                      </span>
                    </div>
                  </div>

                  {/* Estado y Orden */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Estado</span>
                      </label>
                      <select
                        value={formData.activa ? 'true' : 'false'}
                        onChange={(e) => handleInputChange('activa', e.target.value === 'true')}
                        className="select select-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                      >
                        <option value="true">Activa</option>
                        <option value="false">Inactiva</option>
                      </select>
                    </div>

                    
                  </div>

                  {/* Botones */}
                  <div className="flex gap-4 justify-end">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn btn-outline"
                      style={{ 
                        color: '#4d3930', 
                        borderColor: '#b47b21',
                        ':hover': { backgroundColor: '#f4b100', color: '#ffffff' }
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn border-0"
                      style={{ 
                        backgroundColor: '#b47b21', 
                        color: '#ffffff',
                        ':hover': { backgroundColor: '#4d3930' }
                      }}
                      disabled={loading}
                    >
                      {loading ? 'Guardando...' : (editingCategoria ? 'Actualizar' : 'Guardar')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista de Categorías */}
          <div className="card shadow-xl" style={{ backgroundColor: '#ffffff', border: '1px solid #b47b21' }}>
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6" style={{ color: '#4d3930' }}>
                🏷️ Categorías del Quiz ({categorias.length})
              </h2>
              <div className="text-center mb-4">
                <span className="badge badge-lg" style={{ backgroundColor: '#f4b100', color: '#ffffff' }}>
                  📊 Total de preguntas: {Object.values(preguntasPorCategoria).reduce((sum, count) => sum + count, 0)}
                </span>
              </div>
              
              {categorias.length === 0 ? (
                <div className="text-center py-8" style={{ color: '#b47b21' }}>
                  <p className="text-lg">No hay categorías configuradas.</p>
                  <p className="text-sm">Haz clic en "Agregar Nueva Categoría" para comenzar.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categorias.map((categoria, index) => (
                    <div key={categoria.id} className="rounded-xl p-4 border" style={{ 
                      backgroundColor: index % 2 === 0 ? 'rgba(244, 177, 0, 0.05)' : 'rgba(180, 123, 33, 0.05)',
                      borderColor: categoria.color
                    }}>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <div 
                              className="w-4 h-4 rounded-full"
                              style={{ backgroundColor: categoria.color }}
                            />
                            <h3 className="font-semibold text-lg" style={{ color: '#4d3930' }}>
                              {categoria.nombre}
                            </h3>
                            <span className={`badge ${categoria.activa ? 'badge-success' : 'badge-error'}`}>
                              {categoria.activa ? 'Activa' : 'Inactiva'}
                            </span>
                          </div>
                          
                                                     {categoria.descripcion && (
                             <p className="text-sm mb-3" style={{ color: '#b47b21' }}>
                               {categoria.descripcion}
                             </p>
                           )}
                           
                           {/* Contador de preguntas */}
                           <div className="flex flex-wrap gap-2 mb-3">
                             <span className="badge" style={{ backgroundColor: '#4d3930', color: '#ffffff' }}>
                               📝 {preguntasPorCategoria[categoria.nombre] || 0} preguntas
                             </span>
                           </div>
                          
                          

                          {/* Historial de usuarios */}
                          <div className="border-t pt-3" style={{ borderColor: categoria.color }}>
                            <div className="flex flex-wrap gap-4 text-xs" style={{ color: '#b47b21' }}>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold">👤 Creado por:</span>
                                <span>{categoria.usuario_creador || 'N/A'}</span>
                              </div>
                              {categoria.usuario_modificador && categoria.usuario_modificador !== categoria.usuario_creador && (
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold">✏️ Modificado por:</span>
                                  <span>{categoria.usuario_modificador}</span>
                                </div>
                              )}
                              {categoria.created_at && (
                                <div className="flex items-center gap-1">
                                  <span className="font-semibold">📅 Creado:</span>
                                  <span>{new Date(categoria.created_at).toLocaleDateString('es-CR')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEdit(categoria)}
                          className="btn btn-sm btn-outline"
                          style={{ 
                            color: '#4d3930', 
                            borderColor: categoria.color,
                            ':hover': { backgroundColor: categoria.color, color: '#ffffff' }
                          }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() => handleDelete(categoria.id)}
                          className="btn btn-sm btn-outline"
                          style={{ 
                            color: '#b47b21', 
                            borderColor: '#b47b21',
                            ':hover': { backgroundColor: '#b47b21', color: '#ffffff' }
                          }}
                        >
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GestionCategorias
