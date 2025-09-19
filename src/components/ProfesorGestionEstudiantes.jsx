import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseConfig'
import LoadingSpinner from './LoadingSpinner'
import ThemeToggle from './ThemeToggle'
import usuarioCategoriasService from '../services/usuarioCategoriasService'
import Swal from 'sweetalert2'

const ProfesorGestionEstudiantes = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userInfo, setUserInfo] = useState(null)
  const [estudiantes, setEstudiantes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEstudiante, setEditingEstudiante] = useState(null)
  const [categoriaAsignada, setCategoriaAsignada] = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos') // 'todos', 'activos', 'inactivos'
  const [formData, setFormData] = useState({
    identificacion: '',
    nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    email: '',
    rol: 'Estudiante',
    activo: true,
    categoria: ''
  })

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
        const categoria = categorias[0]
        setCategoriaAsignada(categoria)
        setFormData(prev => ({ ...prev, categoria: categoria }))
        await loadEstudiantes(categoria)
      } else {
      }
    } catch (error) {
      console.error('❌ ProfesorGestionEstudiantes - Error cargando categoría asignada:', error)
    }
  }

  const loadEstudiantes = async (categoria) => {
    try {
      setLoading(true)
      
      // Primero obtener los IDs de estudiantes de la categoría
      const { data: categoriaData, error: categoriaError } = await supabase
        .from('usuario_categorias')
        .select('usuario_id')
        .eq('categoria', categoria)
        .eq('activa', true)

      if (categoriaError) {
        console.error('❌ Error en consulta de categorías:', categoriaError)
        throw categoriaError
      }


      if (!categoriaData || categoriaData.length === 0) {
        setEstudiantes([])
        return
      }

      // Obtener datos completos de los estudiantes
      const estudianteIds = categoriaData.map(item => item.usuario_id)
      const { data: estudiantesData, error: estudiantesError } = await supabase
        .from('usuarios')
        .select('*')
        .in('identificacion', estudianteIds)
        .eq('rol', 'Estudiante')
        .order('nombre')

      if (estudiantesError) {
        console.error('❌ Error en consulta de estudiantes:', estudiantesError)
        throw estudiantesError
      }


      const estudiantesCategoria = estudiantesData?.map(estudiante => ({
        ...estudiante,
        apellido: estudiante.primer_apellido + (estudiante.segundo_apellido ? ' ' + estudiante.segundo_apellido : ''),
        activo: estudiante.estado === 'Activo'
      })) || []

      setEstudiantes(estudiantesCategoria)
    } catch (error) {
      console.error('❌ ProfesorGestionEstudiantes - Error cargando estudiantes:', error)
      setEstudiantes([])
    } finally {
      setLoading(false)
    }
  }

  // Función para filtrar estudiantes por estado
  const getEstudiantesFiltrados = () => {
    if (filtroEstado === 'todos') {
      return estudiantes
    } else if (filtroEstado === 'activos') {
      return estudiantes.filter(estudiante => estudiante.activo)
    } else if (filtroEstado === 'inactivos') {
      return estudiantes.filter(estudiante => !estudiante.activo)
    }
    return estudiantes
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Mostrar loading dentro del SweetAlert
    Swal.fire({
      title: editingEstudiante ? 'Actualizando...' : 'Guardando...',
      text: 'Por favor espera mientras procesamos el estudiante',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })
    
    try {
      if (editingEstudiante) {
        
        // Actualizar usuario
        const { error: usuarioError } = await supabase
          .from('usuarios')
          .update({
            nombre: formData.nombre,
            primer_apellido: formData.primer_apellido,
            segundo_apellido: formData.segundo_apellido || null,
            email: formData.email || null,
            estado: formData.activo ? 'Activo' : 'Inactivo'
          })
          .eq('identificacion', editingEstudiante.identificacion)

        if (usuarioError) throw usuarioError

      } else {
        
        // Crear usuario
        const usuarioData = {
          identificacion: formData.identificacion,
          nombre: formData.nombre,
          primer_apellido: formData.primer_apellido,
          segundo_apellido: formData.segundo_apellido || null,
          email: formData.email || null,
          rol: 'Estudiante',
          estado: 'Activo',
          fecha_nacimiento: '2000-01-01', // Fecha por defecto para estudiantes
          provincia: 'San José', // Provincia por defecto
          canton: 'San José', // Cantón por defecto
          distrito: 'Carmen', // Distrito por defecto
          password: formData.identificacion // La clave es la misma identificación
        }
        
        console.log('📤 Datos a insertar en usuario:', usuarioData)
        
        const { error: usuarioError } = await supabase
          .from('usuarios')
          .insert(usuarioData)

        if (usuarioError) throw usuarioError

        // Asignar categoría al estudiante
        const categoriaData = {
          usuario_id: formData.identificacion,
          categoria: categoriaAsignada,
          activa: true,
          usuario_creador: userInfo.identificacion,
          usuario_modificador: userInfo.identificacion
        }
        
        console.log('📤 Datos a insertar en usuario_categorias:', categoriaData)
        
        const { error: categoriaError } = await supabase
          .from('usuario_categorias')
          .insert(categoriaData)

        if (categoriaError) throw categoriaError

      }

      // Actualizar la lista localmente sin recargar toda la página
      if (editingEstudiante) {
        // Actualizar estudiante existente en la lista
        setEstudiantes(prev => prev.map(e => 
          e.identificacion === editingEstudiante.identificacion 
            ? { 
                ...e, 
                nombre: formData.nombre, 
                primer_apellido: formData.primer_apellido,
                segundo_apellido: formData.segundo_apellido,
                email: formData.email,
                activo: formData.activo,
                estado: formData.activo ? 'Activo' : 'Inactivo',
                apellido: formData.primer_apellido + (formData.segundo_apellido ? ' ' + formData.segundo_apellido : '')
              }
            : e
        ))
      } else {
        // Agregar nuevo estudiante a la lista
        const nuevoEstudiante = {
          identificacion: formData.identificacion,
          nombre: formData.nombre,
          primer_apellido: formData.primer_apellido,
          segundo_apellido: formData.segundo_apellido,
          email: formData.email,
          rol: 'Estudiante',
          estado: 'Activo',
          activo: true,
          apellido: formData.primer_apellido + (formData.segundo_apellido ? ' ' + formData.segundo_apellido : '')
        }
        setEstudiantes(prev => [...prev, nuevoEstudiante])
      }
      
      // Limpiar formulario
      resetForm()
      
      console.log('🎉 Proceso completado exitosamente')
      
      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: editingEstudiante ? '¡Actualizado!' : '¡Creado!',
        text: editingEstudiante ? 'El estudiante ha sido actualizado exitosamente.' : 'El estudiante ha sido creado exitosamente.',
        confirmButtonColor: '#10b981',
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('❌ Error en el proceso:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al guardar el estudiante: ' + error.message,
        confirmButtonColor: '#d33'
      })
    }
  }

  const resetForm = () => {
    setFormData({
      identificacion: '',
      nombre: '',
      primer_apellido: '',
      segundo_apellido: '',
      email: '',
      rol: 'Estudiante',
      activo: true,
      categoria: categoriaAsignada?.nombre || ''
    })
    setEditingEstudiante(null)
    setShowForm(false)
  }

  const handleEdit = (estudiante) => {
    setEditingEstudiante(estudiante)
    setFormData({
      identificacion: estudiante.identificacion,
      nombre: estudiante.nombre,
      primer_apellido: estudiante.primer_apellido || '',
      segundo_apellido: estudiante.segundo_apellido || '',
      email: estudiante.email || '',
      rol: estudiante.rol,
      activo: estudiante.activo,
      categoria: categoriaAsignada?.nombre || ''
    })
    setShowForm(true)
  }

  const handleDelete = async (estudiante) => {
    const result = await Swal.fire({
      title: '¿Eliminar estudiante?',
      text: `¿Estás seguro de que quieres eliminar al estudiante "${estudiante.nombre} ${estudiante.apellido}"?`,
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
      text: 'Por favor espera mientras eliminamos el estudiante',
      icon: 'info',
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading()
      }
    })

    try {
      // Eliminar de usuario_categorias primero
      const { error: categoriaError } = await supabase
        .from('usuario_categorias')
        .delete()
        .eq('usuario_id', estudiante.identificacion)
        .eq('categoria', categoriaAsignada)

      if (categoriaError) throw categoriaError

      // Eliminar usuario
      const { error: usuarioError } = await supabase
        .from('usuarios')
        .delete()
        .eq('identificacion', estudiante.identificacion)

      if (usuarioError) throw usuarioError

      // Actualizar la lista localmente sin recargar toda la página
      setEstudiantes(prev => prev.filter(e => e.identificacion !== estudiante.identificacion))
      
      
      // Mostrar mensaje de éxito
      Swal.fire({
        icon: 'success',
        title: '¡Eliminado!',
        text: 'El estudiante ha sido eliminado exitosamente.',
        confirmButtonColor: '#10b981',
        timer: 2000,
        timerProgressBar: true
      })
    } catch (error) {
      console.error('❌ Error eliminando estudiante:', error)
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error al eliminar el estudiante: ' + error.message,
        confirmButtonColor: '#d33'
      })
    }
  }

  const handleToggleEstado = async (estudiante) => {
    try {
      const nuevoEstado = estudiante.estado === 'Activo' ? 'Inactivo' : 'Activo'
      const accion = nuevoEstado === 'Activo' ? 'activar' : 'desactivar'
      
      // Mostrar confirmación con SweetAlert2
      const result = await Swal.fire({
        title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} estudiante?`,
        html: `
          <div style="text-align: left;">
            <p><strong>Esta acción cambiará el estado del estudiante:</strong></p>
            <br>
            <p><strong>${estudiante.nombre} ${estudiante.apellido}</strong></p>
            <p><strong>ID:</strong> ${estudiante.identificacion}</p>
            <br>
            <p><strong>Estado actual:</strong> ${estudiante.estado}</p>
            <p><strong>Nuevo estado:</strong> ${nuevoEstado}</p>
            <br>
            <p><strong>⚠️ IMPORTANTE:</strong></p>
            <ul style="margin-left: 20px;">
              <li>Los estudiantes inactivos no podrán iniciar sesión</li>
              <li>Los estudiantes inactivos no podrán tomar la prueba</li>
              <li>Los estudiantes activos podrán acceder normalmente</li>
            </ul>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: nuevoEstado === 'Activo' ? '#10b981' : '#d33',
        cancelButtonColor: '#6b7280',
        confirmButtonText: `Sí, ${accion}`,
        cancelButtonText: 'Cancelar'
      })

      if (result.isConfirmed) {
        // Mostrar loading dentro del SweetAlert
        Swal.fire({
          title: `${accion.charAt(0).toUpperCase() + accion.slice(1)}ando...`,
          text: 'Por favor espera mientras procesamos el cambio',
          icon: 'info',
          allowOutsideClick: false,
          allowEscapeKey: false,
          showConfirmButton: false,
          didOpen: () => {
            Swal.showLoading()
          }
        })

        // Actualizar el estado del estudiante
        const { error } = await supabase
          .from('usuarios')
          .update({ estado: nuevoEstado })
          .eq('identificacion', estudiante.identificacion)

        if (error) throw error

        // Actualizar la lista localmente sin recargar toda la página
        setEstudiantes(prev => prev.map(e => 
          e.identificacion === estudiante.identificacion 
            ? { 
                ...e, 
                estado: nuevoEstado,
                activo: nuevoEstado === 'Activo'
              }
            : e
        ))

        await Swal.fire({
          icon: 'success',
          title: `¡Estudiante ${accion}do!`,
          text: `El estudiante ${estudiante.nombre} ha sido ${accion}do exitosamente.`,
          confirmButtonText: 'Entendido',
          confirmButtonColor: '#10b981',
          timer: 2000,
          timerProgressBar: true
        })
      }
    } catch (error) {
      console.error('Error cambiando estado del estudiante:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo cambiar el estado del estudiante.',
        confirmButtonText: 'Entendido',
        confirmButtonColor: '#d33'
      })
    }
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  if (loading) {
    return <LoadingSpinner text="Cargando gestión de estudiantes..." />
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
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-800">Mis Estudiantes</h1>
              <span className="badge bg-blue-600 text-white border-0">
                👤 {userInfo.nombre} {userInfo.apellido}
              </span>
              <span className="badge bg-amber-600 text-white border-0">
                📚 {categoriaAsignada}
              </span>
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
              className="py-4 px-1 border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
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
              className="py-4 px-1 border-b-2 border-amber-500 text-amber-600 font-medium"
            >
              Mis Estudiantes
            </button>
          </nav>
        </div>
      </div>

      {/* Contenido Principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Botón para agregar nuevo estudiante y filtro */}
        <div className="mb-6 flex justify-between items-center">
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary btn-lg"
          >
            + Agregar Nuevo Estudiante
          </button>
          
          {/* Filtro por estado */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium text-gray-700">Filtrar por:</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="select select-bordered select-sm bg-white border-gray-300 text-gray-800"
            >
              <option value="todos">Todos los estudiantes</option>
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
            </select>
          </div>
        </div>

        {/* Formulario de estudiante */}
        {showForm && (
          <div className="card bg-white border border-gray-300 shadow-lg mb-8">
            <div className="card-body">
              <h2 className="card-title text-2xl text-gray-800 mb-6">
                {editingEstudiante ? '✏️ Editar Estudiante' : '➕ Agregar Nuevo Estudiante'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Identificación */}
                  <div>
                    <label className="label">
                      <span className="label-text text-gray-700">Identificación *</span>
                    </label>
                    <input
                      type="text"
                      value={formData.identificacion}
                      onChange={(e) => setFormData(prev => ({ ...prev, identificacion: e.target.value }))}
                      className="input input-bordered w-full bg-white border-gray-300 text-gray-800"
                      placeholder="Ej: EST001"
                      required
                      disabled={!!editingEstudiante}
                    />
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="label">
                      <span className="label-text text-gray-700">Nombre *</span>
                    </label>
                    <input
                      type="text"
                      value={formData.nombre}
                      onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                      className="input input-bordered w-full bg-white border-gray-300 text-gray-800"
                      placeholder="Nombre del estudiante"
                      required
                    />
                  </div>

                  {/* Primer Apellido */}
                  <div>
                    <label className="label">
                      <span className="label-text text-gray-700">Primer Apellido *</span>
                    </label>
                    <input
                      type="text"
                      value={formData.primer_apellido}
                      onChange={(e) => setFormData(prev => ({ ...prev, primer_apellido: e.target.value }))}
                      className="input input-bordered w-full bg-white border-gray-300 text-gray-800"
                      placeholder="Primer apellido del estudiante"
                      required
                    />
                  </div>

                  {/* Segundo Apellido */}
                  <div>
                    <label className="label">
                      <span className="label-text text-gray-700">Segundo Apellido</span>
                    </label>
                    <input
                      type="text"
                      value={formData.segundo_apellido}
                      onChange={(e) => setFormData(prev => ({ ...prev, segundo_apellido: e.target.value }))}
                      className="input input-bordered w-full bg-white border-gray-300 text-gray-800"
                      placeholder="Segundo apellido del estudiante"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="label">
                      <span className="label-text text-gray-700">Email</span>
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      className="input input-bordered w-full bg-white border-gray-300 text-gray-800"
                      placeholder="email@ejemplo.com"
                    />
                  </div>
                </div>

                {/* Categoría (fija para profesores) */}
                <div>
                  <label className="label">
                    <span className="label-text text-gray-700">Categoría Asignada</span>
                  </label>
                  <input
                    type="text"
                    value={formData.categoria}
                    className="input input-bordered w-full bg-gray-100 border-gray-300 text-gray-600"
                    disabled
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Los estudiantes se asignarán automáticamente a tu categoría: {categoriaAsignada}
                  </p>
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
                    {loading ? 'Guardando...' : (editingEstudiante ? 'Actualizar' : 'Guardar')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lista de Estudiantes */}
        <div className="card bg-white border border-gray-300 shadow-lg">
          <div className="card-body">
            <h2 className="card-title text-2xl text-gray-800 mb-6">
              👥 Mis Estudiantes ({getEstudiantesFiltrados().length})
            </h2>
            
            {getEstudiantesFiltrados().length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                {estudiantes.length === 0 ? (
                  <>
                    <p className="text-lg">No hay estudiantes en tu categoría.</p>
                    <p className="text-sm">Haz clic en "Agregar Nuevo Estudiante" para comenzar.</p>
                  </>
                ) : (
                  <>
                    <p className="text-lg">No hay estudiantes que coincidan con el filtro seleccionado.</p>
                    <p className="text-sm">Cambia el filtro o agrega un nuevo estudiante.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Identificación</th>
                      <th>Nombre</th>
                      <th>Apellido</th>
                      <th>Email</th>
                      <th>Estado</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {getEstudiantesFiltrados().map((estudiante) => (
                      <tr key={estudiante.identificacion}>
                        <td className="font-mono">{estudiante.identificacion}</td>
                        <td>{estudiante.nombre}</td>
                        <td>{estudiante.apellido}</td>
                        <td>{estudiante.email || '-'}</td>
                        <td>
                          <span className={`badge ${estudiante.activo ? 'bg-green-600' : 'bg-red-600'} text-white border-0`}>
                            {estudiante.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEdit(estudiante)}
                              className="btn btn-sm btn-warning"
                            >
                              Editar
                            </button>
                            {/* Botón para activar/desactivar estudiante */}
                            <button
                              onClick={() => handleToggleEstado(estudiante)}
                              className={`btn btn-sm ${estudiante.activo ? 'btn-outline btn-error' : 'btn-outline btn-success'}`}
                              style={{ 
                                color: estudiante.activo ? '#d33' : '#10b981', 
                                borderColor: estudiante.activo ? '#d33' : '#10b981',
                                ':hover': { 
                                  backgroundColor: estudiante.activo ? '#d33' : '#10b981', 
                                  color: '#ffffff' 
                                }
                              }}
                            >
                              {estudiante.activo ? '⏸️ Desactivar' : '▶️ Activar'}
                            </button>
                            <button
                              onClick={() => handleDelete(estudiante)}
                              className="btn btn-sm btn-error"
                            >
                              Eliminar
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
  )
}

export default ProfesorGestionEstudiantes


