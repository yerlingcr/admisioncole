import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import geografiaService from '../services/geografiaService'
import usuarioCategoriasService from '../services/usuarioCategoriasService'
import quizService from '../services/quizService'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import Swal from 'sweetalert2'

const GestionUsuarios = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingUsuario, setEditingUsuario] = useState(null)
  const [formData, setFormData] = useState({
    identificacion: '',
    nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    sexo: 'Masculino',
    fecha_nacimiento: '',
    provincia: '',
    canton: '',
    distrito: '',
    otras_senas: '',
    rol: 'Estudiante',
    password: '',
    email: '',
    estado: 'Activo'
  })

  const sexos = ['Masculino', 'Femenino']
  const roles = ['Estudiante', 'Administrador', 'Profesor']
  const estados = ['Activo', 'Inactivo']
  const [provincias, setProvincias] = useState([])
  const [cantones, setCantones] = useState([])
  const [distritos, setDistritos] = useState([])
  
  // Estados para categorías
  const [categoriasDisponibles, setCategoriasDisponibles] = useState([])
  const [categoriasUsuario, setCategoriasUsuario] = useState([])

  useEffect(() => {
    loadUserInfo()
    loadUsuarios()
    loadGeografia()
    loadCategoriasDisponibles()
  }, [])

  // Efecto para limpiar categorías cuando se cambia el rol
  useEffect(() => {
    if (formData.rol !== 'Estudiante') {
      setCategoriasUsuario([])
    }
  }, [formData.rol])

  const loadGeografia = () => {
    const provinciasData = geografiaService.getProvincias()
    setProvincias(provinciasData)
  }

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

  const loadUsuarios = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('identificacion')

      if (error) throw error
      setUsuarios(data || [])
    } catch (error) {
      console.error('Error cargando usuarios:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))

    // Si cambia la provincia, resetear cantón y distrito
    if (field === 'provincia') {
      const cantonesData = geografiaService.getCantones(value)
      setCantones(cantonesData)
      setDistritos([])
      setFormData(prev => ({
        ...prev,
        canton: '',
        distrito: ''
      }))
    }

    // Si cambia el cantón, resetear distrito
    if (field === 'canton') {
      const distritosData = geografiaService.getDistritos(formData.provincia, value)
      setDistritos(distritosData)
      setFormData(prev => ({
        ...prev,
        distrito: ''
      }))
    }
  }

  const resetForm = () => {
    setFormData({
      identificacion: '',
      nombre: '',
      primer_apellido: '',
      segundo_apellido: '',
      sexo: 'Masculino',
      fecha_nacimiento: '',
      provincia: '',
      canton: '',
      distrito: '',
      otras_senas: '',
      rol: 'Estudiante',
      password: '',
      email: '',
      estado: 'Activo'
    })
    setEditingUsuario(null)
    setCategoriasUsuario([])
    setShowForm(false)
  }

  // Funciones para manejar categorías
  const loadCategoriasDisponibles = async () => {
    try {
      console.log('🔍 Cargando categorías disponibles...')
      const categorias = await usuarioCategoriasService.getCategoriasDisponibles()
      console.log('📚 Categorías obtenidas:', categorias)
      setCategoriasDisponibles(categorias)
    } catch (error) {
      console.error('❌ Error cargando categorías disponibles:', error)
    }
  }




  const handleResetearOportunidades = async (usuario) => {
    try {
      // Mostrar confirmación con SweetAlert2
      const result = await Swal.fire({
        title: '¿Resetear oportunidades?',
        html: `
          <div style="text-align: left;">
            <p><strong>Esta acción reseteará las oportunidades del estudiante:</strong></p>
            <br>
            <p><strong>${usuario.nombre} ${usuario.primer_apellido}</strong></p>
            <p><strong>ID:</strong> ${usuario.identificacion}</p>
            <br>
            <p><strong>⚠️ ADVERTENCIA:</strong></p>
            <ul style="margin-left: 20px;">
              <li>Se eliminará todo el historial de intentos</li>
              <li>Se resetearán las oportunidades a 0</li>
              <li>El estudiante podrá volver a tomar la prueba</li>
              <li><strong>Esta acción NO se puede deshacer</strong></li>
            </ul>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, Resetear',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#b47b21',
        cancelButtonColor: '#6c757d',
        allowOutsideClick: false
      })

      if (result.isConfirmed) {
        setLoading(true)
        
        // Llamar al servicio para resetear oportunidades
        const resetResult = await quizService.resetearOportunidadesEstudiante(usuario.identificacion)
        
        if (resetResult.success) {
          await Swal.fire({
            icon: 'success',
            title: 'Oportunidades reseteadas',
            text: `Las oportunidades de ${usuario.nombre} han sido reseteadas correctamente.`,
            confirmButtonText: 'Entendido',
            confirmButtonColor: '#f4b100'
          })
          
          // Recargar la lista de usuarios
          await loadUsuarios()
        } else {
          throw new Error(resetResult.error)
        }
      }
    } catch (error) {
      console.error('Error reseteando oportunidades:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron resetear las oportunidades del estudiante.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#b47b21'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      console.log('🚀 Guardando usuario...')

      if (editingUsuario) {
        // Actualizar usuario existente
        const { error } = await supabase
          .from('usuarios')
          .update({
            nombre: formData.nombre,
            primer_apellido: formData.primer_apellido,
            segundo_apellido: formData.segundo_apellido,
            sexo: formData.sexo,
            fecha_nacimiento: formData.fecha_nacimiento,
            provincia: formData.provincia,
            canton: formData.canton,
            distrito: formData.distrito,
            otras_senas: formData.otras_senas,
            rol: formData.rol,
            email: formData.email,
            estado: formData.estado
          })
          .eq('identificacion', editingUsuario.identificacion)

        if (error) throw error
        console.log('✅ Usuario actualizado')

        // Si es un estudiante, también actualizar sus categorías
        if (formData.rol === 'Estudiante') {
          console.log('🔍 Actualizando categorías para estudiante:', editingUsuario.identificacion)
          console.log('📚 Categorías a asignar:', categoriasUsuario)
          
          const result = await usuarioCategoriasService.asignarCategorias(
            editingUsuario.identificacion,
            categoriasUsuario,
            userInfo?.nombre + ' ' + userInfo?.primer_apellido || 'Administrador'
          )
          
          if (!result.success) {
            console.error('❌ Error actualizando categorías:', result.error)
          } else {
            console.log('✅ Categorías actualizadas correctamente')
          }
        }
      } else {
        // Crear nuevo usuario
        const { error } = await supabase
          .from('usuarios')
          .insert(formData)

        if (error) throw error
        console.log('✅ Usuario creado')

        // Si es un estudiante, también asignar sus categorías
        if (formData.rol === 'Estudiante') {
          console.log('🔍 Asignando categorías para nuevo estudiante:', formData.identificacion)
          console.log('📚 Categorías a asignar:', categoriasUsuario)
          
          const result = await usuarioCategoriasService.asignarCategorias(
            formData.identificacion,
            categoriasUsuario,
            userInfo?.nombre + ' ' + userInfo?.primer_apellido || 'Administrador'
          )
          
          if (!result.success) {
            console.error('❌ Error asignando categorías:', result.error)
          } else {
            console.log('✅ Categorías asignadas correctamente')
          }
        }
      }

      await loadUsuarios()
      resetForm()
    } catch (error) {
      console.error('❌ Error guardando usuario:', error)
      alert(`Error guardando usuario: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = async (usuario) => {
    setFormData({
      identificacion: usuario.identificacion,
      nombre: usuario.nombre,
      primer_apellido: usuario.primer_apellido,
      segundo_apellido: usuario.segundo_apellido,
      sexo: usuario.sexo,
      fecha_nacimiento: usuario.fecha_nacimiento,
      provincia: usuario.provincia,
      canton: usuario.canton,
      distrito: usuario.distrito,
      otras_senas: usuario.otras_senas,
      rol: usuario.rol,
      password: '', // No mostrar contraseña
      email: usuario.email,
      estado: usuario.estado
    })
    
    setEditingUsuario(usuario)
    
    // Si es un estudiante, cargar sus categorías actuales
    if (usuario.rol === 'Estudiante') {
      try {
        console.log('🔍 Cargando categorías del estudiante:', usuario.identificacion)
        const categoriasActuales = await usuarioCategoriasService.getCategoriasByUsuario(usuario.identificacion)
        console.log('📚 Categorías actuales del estudiante:', categoriasActuales)
        console.log('📚 Categorías disponibles:', categoriasDisponibles)
        setCategoriasUsuario(categoriasActuales)
      } catch (error) {
        console.error('❌ Error cargando categorías del estudiante:', error)
        setCategoriasUsuario([])
      }
    } else {
      setCategoriasUsuario([])
    }
    
    setShowForm(true)
  }

  const handleDelete = async (identificacion) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('identificacion', identificacion)

      if (error) throw error
      await loadUsuarios()
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      alert('Error eliminando usuario. Por favor, intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return <LoadingSpinner text="Cargando gestión de usuarios..." />
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
          
          {/* Botón para Agregar Nuevo Usuario */}
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
              ➕ Agregar Nuevo Usuario
            </button>
          </div>

          {/* Formulario de Usuario */}
          {showForm && (
            <div className="card shadow-xl mb-8" style={{ backgroundColor: '#ffffff', border: '1px solid #b47b21' }}>
              <div className="card-body">
                <h2 className="card-title text-2xl mb-6" style={{ color: '#4d3930' }}>
                  {editingUsuario ? '✏️ Editar Usuario' : '➕ Nuevo Usuario'}
                </h2>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Identificación */}
                  <div>
                    <label className="label">
                      <span className="label-text" style={{ color: '#4d3930' }}>Identificación *</span>
                    </label>
                    <input
                      type="text"
                      value={formData.identificacion}
                      onChange={(e) => handleInputChange('identificacion', e.target.value)}
                      className="input input-bordered w-full"
                      style={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: '#b47b21',
                        color: '#4d3930'
                      }}
                      placeholder="Ej: 109860742"
                      required
                      disabled={!!editingUsuario}
                    />
                  </div>

                  {/* Nombre y Apellidos */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Nombre *</span>
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
                        placeholder="Nombre"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Primer Apellido *</span>
                      </label>
                      <input
                        type="text"
                        value={formData.primer_apellido}
                        onChange={(e) => handleInputChange('primer_apellido', e.target.value)}
                        className="input input-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        placeholder="Primer Apellido"
                        required
                      />
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Segundo Apellido</span>
                      </label>
                      <input
                        type="text"
                        value={formData.segundo_apellido}
                        onChange={(e) => handleInputChange('segundo_apellido', e.target.value)}
                        className="input input-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        placeholder="Segundo Apellido"
                      />
                    </div>
                  </div>

                  {/* Sexo y Fecha de Nacimiento */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Sexo *</span>
                      </label>
                      <select
                        value={formData.sexo}
                        onChange={(e) => handleInputChange('sexo', e.target.value)}
                        className="select select-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        required
                      >
                        {sexos.map(sexo => (
                          <option key={sexo} value={sexo}>{sexo}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Fecha de Nacimiento *</span>
                      </label>
                      <input
                        type="date"
                        value={formData.fecha_nacimiento}
                        onChange={(e) => handleInputChange('fecha_nacimiento', e.target.value)}
                        className="input input-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        required
                      />
                    </div>
                  </div>

                  {/* Dirección */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Provincia</span>
                      </label>
                      <select
                        value={formData.provincia}
                        onChange={(e) => handleInputChange('provincia', e.target.value)}
                        className="select select-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                      >
                        <option value="">Selecciona una provincia</option>
                        {provincias.map(provincia => (
                          <option key={provincia} value={provincia}>{provincia}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Cantón</span>
                      </label>
                      <select
                        value={formData.canton}
                        onChange={(e) => handleInputChange('canton', e.target.value)}
                        className="select select-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        disabled={!formData.provincia}
                      >
                        <option value="">{formData.provincia ? 'Selecciona un cantón' : 'Primero selecciona una provincia'}</option>
                        {cantones.map(canton => (
                          <option key={canton} value={canton}>{canton}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Distrito</span>
                      </label>
                      <select
                        value={formData.distrito}
                        onChange={(e) => handleInputChange('distrito', e.target.value)}
                        className="select select-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        disabled={!formData.canton}
                      >
                        <option value="">{formData.canton ? 'Selecciona un distrito' : 'Primero selecciona un cantón'}</option>
                        {distritos.map(distrito => (
                          <option key={distrito} value={distrito}>{distrito}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Otras Señas */}
                  <div>
                    <label className="label">
                      <span className="label-text" style={{ color: '#4d3930' }}>Otras Señas</span>
                    </label>
                    <textarea
                      value={formData.otras_senas}
                      onChange={(e) => handleInputChange('otras_senas', e.target.value)}
                      className="textarea textarea-bordered w-full"
                      style={{ 
                        backgroundColor: '#ffffff', 
                        borderColor: '#b47b21',
                        color: '#4d3930'
                      }}
                      placeholder="Dirección específica, puntos de referencia..."
                      rows={2}
                    />
                  </div>

                  {/* Rol, Email y Estado */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Rol *</span>
                      </label>
                      <select
                        value={formData.rol}
                        onChange={(e) => handleInputChange('rol', e.target.value)}
                        className="select select-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        required
                      >
                        {roles.map(rol => (
                          <option key={rol} value={rol}>{rol}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Email</span>
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleInputChange('email', e.target.value)}
                        className="input input-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        placeholder="email@ejemplo.com"
                      />
                    </div>
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Estado *</span>
                      </label>
                      <select
                        value={formData.estado}
                        onChange={(e) => handleInputChange('estado', e.target.value)}
                        className="select select-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        required
                      >
                        {estados.map(estado => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Sección de Categorías - Solo para estudiantes */}
                  {formData.rol === 'Estudiante' && (
                    <div className="mt-6 p-4 rounded-lg" style={{ backgroundColor: '#f4b100', border: '1px solid #b47b21' }}>
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold" style={{ color: '#4d3930' }}>
                          📚 Categoría de Preguntas
                        </h3>
                        <button
                          type="button"
                          onClick={loadCategoriasDisponibles}
                          className="btn btn-xs"
                          style={{ backgroundColor: '#4d3930', color: '#ffffff' }}
                        >
                          🔄 Recargar
                        </button>
                      </div>
                      <p className="text-sm mb-4" style={{ color: '#4d3930' }}>
                        Selecciona la categoría de preguntas que aparecerá en la prueba de admisión de este estudiante:
                      </p>
                      
                      {categoriasDisponibles.length === 0 && (
                        <div className="alert alert-error mb-4">
                          <span className="text-xs">
                            ❌ No se encontraron categorías disponibles. Verifica que existan categorías en la base de datos.
                          </span>
                        </div>
                      )}
                      
                      <div className="text-xs mb-2" style={{ color: '#4d3930' }}>
                        📊 Categorías disponibles: {categoriasDisponibles.length}
                      </div>
                      
                      <div className="space-y-3 mb-4">
                        {categoriasDisponibles.map(categoria => (
                          <label key={categoria} className="flex items-center space-x-3 cursor-pointer p-3 rounded-lg hover:bg-white hover:bg-opacity-20 transition-colors">
                            <input
                              type="radio"
                              name="categoriaSeleccionada"
                              value={categoria}
                              checked={categoriasUsuario.includes(categoria)}
                              onChange={() => setCategoriasUsuario([categoria])}
                              className="radio radio-sm"
                              style={{ accentColor: '#4d3930' }}
                            />
                            <span className="text-sm font-medium" style={{ color: '#4d3930' }}>
                              {categoria}
                            </span>
                          </label>
                        ))}
                      </div>

                      {categoriasUsuario.length === 0 && (
                        <div className="alert alert-warning">
                          <span className="text-xs">
                            ⚠️ Si no seleccionas ninguna categoría, el estudiante verá preguntas de todas las categorías disponibles.
                          </span>
                        </div>
                      )}

                      {categoriasUsuario.length > 0 && (
                        <div className="alert alert-success">
                          <span className="text-xs">
                            ✅ Categoría seleccionada: <strong>{categoriasUsuario[0]}</strong>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contraseña */}
                  {!editingUsuario && (
                    <div>
                      <label className="label">
                        <span className="label-text" style={{ color: '#4d3930' }}>Contraseña *</span>
                      </label>
                      <input
                        type="password"
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="input input-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        placeholder="Contraseña"
                        required
                        minLength={6}
                      />
                    </div>
                  )}

                  {/* Botones de Acción */}
                  <div className="flex justify-end gap-3">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="btn btn-outline"
                      style={{ 
                        color: '#b47b21', 
                        borderColor: '#b47b21',
                        ':hover': { backgroundColor: '#b47b21', color: '#ffffff' }
                      }}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn border-0"
                      style={{ 
                        backgroundColor: '#f4b100', 
                        color: '#ffffff',
                        ':hover': { backgroundColor: '#b47b21' }
                      }}
                      disabled={loading}
                    >
                      {loading ? 'Guardando...' : (editingUsuario ? 'Actualizar' : 'Guardar')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Lista de Usuarios */}
          <div className="card backdrop-blur-xl border shadow-2xl" style={{ backgroundColor: 'rgba(77, 57, 48, 0.1)', borderColor: '#b47b21' }}>
            <div className="card-body">
              <h2 className="card-title text-2xl mb-6" style={{ color: '#4d3930' }}>
                📋 Usuarios del Sistema ({usuarios.length})
              </h2>
              
              {usuarios.length === 0 ? (
                <div className="text-center py-8" style={{ color: '#b47b21' }}>
                  <p className="text-lg">No hay usuarios registrados.</p>
                  <p className="text-sm">Haz clic en "Agregar Nuevo Usuario" para comenzar.</p>
                </div>
              ) : (
                                <div className="overflow-x-auto">
                  <table className="table table-zebra w-full rounded-lg" style={{ backgroundColor: 'rgba(77, 57, 48, 0.05)', border: '1px solid #b47b21' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#4d3930' }}>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Identificación</th>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Nombre Completo</th>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Rol</th>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Email</th>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Estado</th>
                        <th className="font-semibold" style={{ color: '#ffffff' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usuarios.map((usuario, index) => (
                        <tr key={usuario.identificacion} className="transition-colors" style={{ 
                          backgroundColor: index % 2 === 0 ? 'rgba(180, 123, 33, 0.05)' : 'rgba(180, 123, 33, 0.1)',
                          ':hover': { backgroundColor: 'rgba(244, 177, 0, 0.15)' }
                        }}>
                          <td className="font-mono font-medium border-r" style={{ color: '#4d3930', borderColor: '#b47b21' }}>{usuario.identificacion}</td>
                          <td className="border-r" style={{ borderColor: '#b47b21' }}>
                            <div>
                              <div className="font-bold" style={{ color: '#4d3930' }}>{usuario.nombre} {usuario.primer_apellido}</div>
                              {usuario.segundo_apellido && (
                                <div className="text-sm" style={{ color: '#b47b21' }}>{usuario.segundo_apellido}</div>
                              )}
                            </div>
                          </td>
                          <td className="border-r" style={{ borderColor: '#b47b21' }}>
                            <span className="badge" style={{ 
                              backgroundColor: usuario.rol === 'Administrador' ? '#f4b100' : 
                                             usuario.rol === 'Profesor' ? '#b47b21' : '#4d3930',
                              color: '#ffffff'
                            }}>
                              {usuario.rol}
                            </span>
                          </td>
                          <td className="font-medium border-r" style={{ color: '#4d3930', borderColor: '#b47b21' }}>{usuario.email}</td>
                          <td className="border-r" style={{ borderColor: '#b47b21' }}>
                            <span className="badge" style={{ 
                              backgroundColor: usuario.estado === 'Activo' ? '#4d3930' : '#b47b21',
                              color: '#ffffff'
                            }}>
                              {usuario.estado}
                            </span>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleEdit(usuario)}
                                className="btn btn-sm btn-outline"
                                style={{ 
                                  color: '#4d3930', 
                                  borderColor: '#b47b21',
                                  ':hover': { backgroundColor: '#f4b100', color: '#ffffff' }
                                }}
                              >
                                ✏️ Editar
                              </button>
                              {/* Solo mostrar botón de resetear oportunidades para estudiantes */}
                              {usuario.rol === 'Estudiante' && (
                                <button
                                  onClick={() => handleResetearOportunidades(usuario)}
                                  className="btn btn-sm btn-outline"
                                  style={{ 
                                    color: '#4d3930', 
                                    borderColor: '#b47b21',
                                    ':hover': { backgroundColor: '#b47b21', color: '#ffffff' }
                                  }}
                                >
                                  🔄 Resetear
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(usuario.identificacion)}
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
      </div>

    </div>
  )
}

export default GestionUsuarios
