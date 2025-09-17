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
  const [openDropdown, setOpenDropdown] = useState(null)
  const [searchFilter, setSearchFilter] = useState('')

  useEffect(() => {
    loadUserInfo()
    loadUsuarios()
    loadGeografia()
    loadCategoriasDisponibles()
  }, [])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('.relative')) {
        closeDropdown()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdown])

  // Efecto para limpiar categorías cuando se cambia el rol
  useEffect(() => {
    if (formData.rol !== 'Estudiante' && formData.rol !== 'Profesor') {
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
      
      // Cargar categorías para cada usuario
      const usuariosConCategorias = await Promise.all(
        (data || []).map(async (usuario) => {
          const { data: categoriasData, error: categoriasError } = await supabase
            .from('usuario_categorias')
            .select('categoria')
            .eq('usuario_id', usuario.identificacion)
            .eq('activa', true)

          if (categoriasError) {
            console.error('Error cargando categorías para usuario:', usuario.identificacion, categoriasError)
            return { ...usuario, categorias: [] }
          }

          return {
            ...usuario,
            categorias: categoriasData?.map(cat => cat.categoria) || []
          }
        })
      )

      setUsuarios(usuariosConCategorias)
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

  const handleToggleEstado = async (usuario) => {
    try {
      setLoading(true)
      
      const nuevoEstado = usuario.estado === 'Activo' ? 'Inactivo' : 'Activo'
      const accion = nuevoEstado === 'Activo' ? 'activar' : 'desactivar'
      
      // Mostrar confirmación con SweetAlert2
      const result = await Swal.fire({
        title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} usuario?`,
        html: `
          <div style="text-align: left;">
            <p><strong>Esta acción cambiará el estado del usuario:</strong></p>
            <br>
            <p><strong>${usuario.nombre} ${usuario.primer_apellido}</strong></p>
            <p><strong>ID:</strong> ${usuario.identificacion}</p>
            <p><strong>Rol:</strong> ${usuario.rol}</p>
            <br>
            <p><strong>Estado actual:</strong> ${usuario.estado}</p>
            <p><strong>Nuevo estado:</strong> ${nuevoEstado}</p>
            <br>
            <p><strong>⚠️ IMPORTANTE:</strong></p>
            <ul style="margin-left: 20px;">
              <li>Los usuarios inactivos no podrán iniciar sesión</li>
              <li>Los estudiantes inactivos no podrán tomar la prueba</li>
              <li>Los profesores inactivos no podrán gestionar contenido</li>
            </ul>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: nuevoEstado === 'Activo' ? '#10b981' : '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar',
        background: '#ffffff',
        color: '#4d3930'
      })

      if (result.isConfirmed) {
        // Actualizar el estado del usuario
        const { error } = await supabase
          .from('usuarios')
          .update({ estado: nuevoEstado })
          .eq('identificacion', usuario.identificacion)

        if (error) throw error

        await Swal.fire({
          icon: 'success',
          title: `¡Usuario ${accion}do!`,
          text: `El usuario ${usuario.nombre} ha sido ${accion}do exitosamente.`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#f4b100',
          background: '#ffffff',
          color: '#4d3930'
        })
        
        // Recargar la lista de usuarios
        await loadUsuarios()
      }
    } catch (error) {
      console.error('Error cambiando estado del usuario:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cambiar el estado del usuario.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
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

        // Si es un estudiante o profesor, también actualizar sus categorías
        if (formData.rol === 'Estudiante' || formData.rol === 'Profesor') {
          console.log('🔍 Actualizando categorías para', formData.rol.toLowerCase(), ':', editingUsuario.identificacion)
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
        const usuarioData = {
          ...formData,
          password: formData.identificacion // La contraseña será igual a la identificación
        }
        
        const { error } = await supabase
          .from('usuarios')
          .insert(usuarioData)

        if (error) throw error
        console.log('✅ Usuario creado')

        // Si es un estudiante o profesor, también asignar sus categorías
        if (formData.rol === 'Estudiante' || formData.rol === 'Profesor') {
          console.log('🔍 Asignando categorías para nuevo', formData.rol.toLowerCase(), ':', formData.identificacion)
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

      await Swal.fire({
        icon: 'success',
        title: '¡Usuario Guardado!',
        text: 'El usuario ha sido guardado exitosamente.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f4b100',
        background: '#ffffff',
        color: '#4d3930',
        timer: 2000,
        timerProgressBar: true
      })
      
      await loadUsuarios()
      resetForm()
    } catch (error) {
      console.error('❌ Error guardando usuario:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error al Guardar',
        text: `Error guardando usuario: ${error.message}`,
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#b47b21',
        background: '#ffffff',
        color: '#4d3930'
      })
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
    
    // Si es un estudiante o profesor, cargar sus categorías actuales
    if (usuario.rol === 'Estudiante' || usuario.rol === 'Profesor') {
      try {
        console.log('🔍 Cargando categorías del', usuario.rol.toLowerCase(), ':', usuario.identificacion)
        const categoriasActuales = await usuarioCategoriasService.getCategoriasByUsuario(usuario.identificacion)
        console.log('📚 Categorías actuales del', usuario.rol.toLowerCase(), ':', categoriasActuales)
        console.log('📚 Categorías disponibles:', categoriasDisponibles)
        setCategoriasUsuario(categoriasActuales)
      } catch (error) {
        console.error('❌ Error cargando categorías del', usuario.rol.toLowerCase(), ':', error)
        setCategoriasUsuario([])
      }
    } else {
      setCategoriasUsuario([])
    }
    
    setShowForm(true)
  }

  const handleDelete = async (identificacion) => {
    const result = await Swal.fire({
      title: '¿Eliminar Usuario?',
      html: `
        <div style="text-align: left;">
          <p><strong>¿Estás seguro de que quieres eliminar este usuario?</strong></p>
          <br>
          <p><strong>⚠️ IMPORTANTE:</strong></p>
          <ul style="margin-left: 20px;">
            <li>Esta acción <strong>NO se puede deshacer</strong></li>
            <li>Se eliminarán todos los datos del usuario</li>
            <li>Se eliminarán sus intentos de quiz</li>
            <li>Se eliminarán sus categorías asignadas</li>
          </ul>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#ffffff',
      color: '#4d3930'
    })

    if (!result.isConfirmed) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('usuarios')
        .delete()
        .eq('identificacion', identificacion)

      if (error) throw error
      
      await Swal.fire({
        icon: 'success',
        title: '¡Usuario Eliminado!',
        text: 'El usuario ha sido eliminado exitosamente.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#f4b100',
        background: '#ffffff',
        color: '#4d3930',
        timer: 2000,
        timerProgressBar: true
      })
      
      await loadUsuarios()
    } catch (error) {
      console.error('Error eliminando usuario:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error al Eliminar',
        text: 'Error eliminando usuario. Por favor, intenta de nuevo.',
        confirmButtonText: 'Entendido',
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

  const toggleDropdown = (identificacion) => {
    setOpenDropdown(openDropdown === identificacion ? null : identificacion)
  }

  const closeDropdown = () => {
    setOpenDropdown(null)
  }

  const getUsuariosFiltrados = () => {
    if (!searchFilter.trim()) {
      return usuarios
    }
    
    const filter = searchFilter.toLowerCase()
    return usuarios.filter(usuario => 
      usuario.identificacion.toLowerCase().includes(filter) ||
      usuario.nombre.toLowerCase().includes(filter) ||
      usuario.primer_apellido.toLowerCase().includes(filter) ||
      usuario.segundo_apellido.toLowerCase().includes(filter) ||
      usuario.email.toLowerCase().includes(filter) ||
      usuario.rol.toLowerCase().includes(filter) ||
      usuario.estado.toLowerCase().includes(filter)
    )
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

                  {/* Sección de Categorías - Para estudiantes y profesores */}
                  {(formData.rol === 'Estudiante' || formData.rol === 'Profesor') && (
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
                        {formData.rol === 'Estudiante' 
                          ? 'Selecciona la categoría de preguntas que aparecerá en la prueba de admisión de este estudiante:'
                          : 'Selecciona la categoría de preguntas que podrá gestionar este profesor:'
                        }
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
                            ⚠️ Si no seleccionas ninguna categoría, {formData.rol === 'Estudiante' ? 'el estudiante verá preguntas de todas las categorías disponibles' : 'el profesor no podrá gestionar preguntas específicas'}.
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
                        <span className="label-text" style={{ color: '#4d3930' }}>Contraseña</span>
                      </label>
                      <input
                        type="text"
                        value={formData.password || formData.identificacion}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        className="input input-bordered w-full"
                        style={{ 
                          backgroundColor: '#ffffff', 
                          borderColor: '#b47b21',
                          color: '#4d3930'
                        }}
                        placeholder="Se llena automáticamente con la identificación"
                        readOnly
                      />
                      <label className="label">
                        <span className="label-text-alt" style={{ color: '#b47b21' }}>
                          💡 La contraseña será igual a la identificación del usuario
                        </span>
                      </label>
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
              
              {/* Filtro de búsqueda */}
              <div className="mb-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="🔍 Buscar usuarios por identificación, nombre, email, rol o estado..."
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className="input input-bordered w-full"
                      style={{ 
                        backgroundColor: '#ffffff',
                        borderColor: '#b47b21',
                        color: '#4d3930'
                      }}
                    />
                  </div>
                  {searchFilter && (
                    <button
                      onClick={() => setSearchFilter('')}
                      className="btn btn-sm btn-outline"
                      style={{ 
                        color: '#b47b21', 
                        borderColor: '#b47b21',
                        ':hover': { backgroundColor: '#b47b21', color: '#ffffff' }
                      }}
                    >
                      ✕ Limpiar
                    </button>
                  )}
                </div>
                {searchFilter && (
                  <p className="text-sm mt-2" style={{ color: '#4d3930' }}>
                    Mostrando {getUsuariosFiltrados().length} de {usuarios.length} usuarios
                  </p>
                )}
              </div>
              
              {usuarios.length === 0 ? (
                <div className="text-center py-8" style={{ color: '#b47b21' }}>
                  <p className="text-lg">No hay usuarios registrados.</p>
                  <p className="text-sm">Haz clic en "Agregar Nuevo Usuario" para comenzar.</p>
                </div>
              ) : (
                                <div className="overflow-x-auto" style={{ position: 'relative' }}>
                  <table className="table table-zebra w-full rounded-lg" style={{ backgroundColor: 'rgba(77, 57, 48, 0.05)', border: '1px solid #b47b21' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#4d3930' }}>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Identificación</th>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Nombre Completo</th>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Rol</th>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Email</th>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Estado</th>
                        <th className="font-semibold border-r" style={{ color: '#ffffff', borderColor: '#b47b21' }}>Categoría</th>
                        <th className="font-semibold" style={{ color: '#ffffff' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getUsuariosFiltrados().map((usuario, index) => (
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
                          <td className="border-r" style={{ borderColor: '#b47b21' }}>
                            <span className="text-sm font-medium" style={{ color: '#4d3930' }}>
                              {usuario.categorias && usuario.categorias.length > 0 
                                ? usuario.categorias.join(', ') 
                                : 'Sin categoría'
                              }
                            </span>
                          </td>
                          <td>
                            <div className="relative">
                              <button
                                onClick={() => toggleDropdown(usuario.identificacion)}
                                className="btn btn-sm btn-outline"
                                style={{ 
                                  color: '#4d3930', 
                                  borderColor: '#b47b21',
                                  ':hover': { backgroundColor: '#f4b100', color: '#ffffff' }
                                }}
                              >
                                ⚙️ Acciones
                              </button>
                              
                              {openDropdown === usuario.identificacion && (
                                <div 
                                  className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border"
                                  style={{ 
                                    borderColor: '#b47b21',
                                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                                    maxHeight: '300px',
                                    overflowY: 'auto',
                                    zIndex: 9999
                                  }}
                                >
                                  <div className="py-1">
                                    <button
                                      onClick={() => {
                                        handleEdit(usuario)
                                        closeDropdown()
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                                      style={{ color: '#4d3930' }}
                                    >
                                      <span className="mr-2">✏️</span>
                                      Editar Usuario
                                    </button>
                                    
                                    <button
                                      onClick={() => {
                                        handleToggleEstado(usuario)
                                        closeDropdown()
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                                      style={{ 
                                        color: usuario.estado === 'Activo' ? '#d33' : '#10b981'
                                      }}
                                    >
                                      <span className="mr-2">
                                        {usuario.estado === 'Activo' ? '⏸️' : '▶️'}
                                      </span>
                                      {usuario.estado === 'Activo' ? 'Desactivar' : 'Activar'}
                                    </button>
                                    
                                    {usuario.rol === 'Estudiante' && (
                                      <button
                                        onClick={() => {
                                          handleResetearOportunidades(usuario)
                                          closeDropdown()
                                        }}
                                        className="flex items-center w-full px-4 py-2 text-sm hover:bg-gray-100"
                                        style={{ color: '#4d3930' }}
                                      >
                                        <span className="mr-2">🔄</span>
                                        Resetear Oportunidades
                                      </button>
                                    )}
                                    
                                    <hr style={{ borderColor: '#b47b21', margin: '4px 0' }} />
                                    
                                    <button
                                      onClick={() => {
                                        handleDelete(usuario.identificacion)
                                        closeDropdown()
                                      }}
                                      className="flex items-center w-full px-4 py-2 text-sm hover:bg-red-50"
                                      style={{ color: '#d33' }}
                                    >
                                      <span className="mr-2">🗑️</span>
                                      Eliminar Usuario
                                    </button>
                                  </div>
                                </div>
                              )}
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
