import React, { useState, useEffect } from 'react';
import { configuracionService } from '../services/configuracionService';
import { institucionService } from '../services/institucionService';
import Swal from 'sweetalert2';

const ConfiguracionPrueba = () => {
  const [configuraciones, setConfiguraciones] = useState([]);
  const [configuracionActiva, setConfiguracionActiva] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [informacionInstitucional, setInformacionInstitucional] = useState(null);
  const [showInstitucionForm, setShowInstitucionForm] = useState(false);
  const [institucionFormData, setInstitucionFormData] = useState({
    nombre_centro_educativo: '',
    escudo_centro_url: '',
    nombre_especialidad: '',
    logo_especialidad_url: '',
    descripcion_centro: '',
    descripcion_especialidad: ''
  });
  const [formData, setFormData] = useState({
    tiempo_limite_minutos: 5,
    numero_preguntas: 5,
    puntaje_minimo_aprobacion: 70,
    intentos_permitidos: 1,
    puntaje_por_pregunta: 20,
    orden_preguntas_aleatorio: true,
    orden_opciones_aleatorio: true
  });

  // Paleta de colores del sistema
  const colors = {
    primary: '#4d3930',
    secondary: '#f4b100',
    accent: '#b47b21',
    white: '#ffffff'
  };

  useEffect(() => {
    loadConfiguraciones();
    loadInformacionInstitucional();
  }, []);

  const loadConfiguraciones = async () => {
    try {
      setLoading(true);
      const [allConfigs, activeConfig] = await Promise.all([
        configuracionService.getAllConfiguraciones(),
        configuracionService.getConfiguracionActiva()
      ]);
      
      setConfiguraciones(allConfigs);
      setConfiguracionActiva(activeConfig);
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar las configuraciones',
        confirmButtonColor: colors.primary
      });
    } finally {
      setLoading(false);
    }
  };

  const loadInformacionInstitucional = async () => {
    try {
      const info = await institucionService.getInformacionActiva();
      setInformacionInstitucional(info);
    } catch (error) {
      console.error('Error cargando información institucional:', error);
      // Usar información por defecto si hay error
      setInformacionInstitucional(institucionService.getInformacionPorDefecto());
    }
  };

  const handleInstitucionInputChange = (e) => {
    const { name, value } = e.target;
    setInstitucionFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleEditInstitucion = () => {
    if (informacionInstitucional) {
      setInstitucionFormData({
        nombre_centro_educativo: informacionInstitucional.nombre_centro_educativo || '',
        escudo_centro_url: informacionInstitucional.escudo_centro_url || '',
        nombre_especialidad: informacionInstitucional.nombre_especialidad || '',
        logo_especialidad_url: informacionInstitucional.logo_especialidad_url || '',
        descripcion_centro: informacionInstitucional.descripcion_centro || '',
        descripcion_especialidad: informacionInstitucional.descripcion_especialidad || ''
      });
    }
    setShowInstitucionForm(true);
  };

  const handleSubmitInstitucion = async (e) => {
    e.preventDefault();
    
    // Validar información institucional
    const errores = institucionService.validarInformacion(institucionFormData);
    if (errores.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Información inválida',
        html: errores.map(error => `<p>• ${error}</p>`).join(''),
        confirmButtonColor: colors.primary
      });
      return;
    }

    try {
      const userInfo = localStorage.getItem('userInfo');
      let usuario = 'ADMIN';
      
      if (userInfo) {
        const userData = JSON.parse(userInfo);
        usuario = `${userData.nombre} ${userData.primer_apellido} ${userData.segundo_apellido}`.trim();
      }

      if (informacionInstitucional) {
        await institucionService.actualizarInformacion(
          informacionInstitucional.id,
          institucionFormData,
          usuario
        );
        Swal.fire({
          icon: 'success',
          title: '¡Información actualizada!',
          text: 'Los cambios se han guardado correctamente',
          confirmButtonColor: colors.primary
        });
      } else {
        await institucionService.crearInformacion(institucionFormData, usuario);
        Swal.fire({
          icon: 'success',
          title: '¡Información creada!',
          text: 'La información institucional ha sido guardada',
          confirmButtonColor: colors.primary
        });
      }
      
      setShowInstitucionForm(false);
      loadInformacionInstitucional();
    } catch (error) {
      console.error('Error guardando información institucional:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar la información institucional',
        confirmButtonColor: colors.primary
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : 
              type === 'number' ? parseInt(value) : value
    }));
  };

  const resetForm = () => {
    setFormData(configuracionService.getConfiguracionPorDefecto());
    setEditingConfig(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar configuración
    const errores = configuracionService.validarConfiguracion(formData);
    if (errores.length > 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Configuración inválida',
        html: errores.map(error => `<p>• ${error}</p>`).join(''),
        confirmButtonColor: colors.primary
      });
      return;
    }

    try {
      // Obtener información del usuario desde localStorage
      const userInfo = localStorage.getItem('userInfo');
      let usuario = 'ADMIN';
      
      if (userInfo) {
        const userData = JSON.parse(userInfo);
        usuario = `${userData.nombre} ${userData.primer_apellido} ${userData.segundo_apellido}`.trim();
      }
      
      if (configuracionActiva) {
        await configuracionService.actualizarConfiguracion(
          configuracionActiva.id, 
          formData, 
          usuario
        );
        Swal.fire({
          icon: 'success',
          title: '¡Configuración actualizada!',
          text: 'Los cambios se han guardado correctamente',
          confirmButtonColor: colors.primary
        });
      } else {
        await configuracionService.crearConfiguracion(formData, usuario);
        Swal.fire({
          icon: 'success',
          title: '¡Configuración creada!',
          text: 'La configuración está ahora activa',
          confirmButtonColor: colors.primary
        });
      }
      
      setShowForm(false);
      resetForm();
      loadConfiguraciones();
    } catch (error) {
      console.error('Error guardando configuración:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo guardar la configuración',
        confirmButtonColor: colors.primary
      });
    }
  };

  const handleEdit = (config) => {
    setFormData({
      tiempo_limite_minutos: config.tiempo_limite_minutos,
      numero_preguntas: config.numero_preguntas,
      puntaje_minimo_aprobacion: config.puntaje_minimo_aprobacion,
      intentos_permitidos: config.intentos_permitidos,
      puntaje_por_pregunta: config.puntaje_por_pregunta,
      orden_preguntas_aleatorio: config.orden_preguntas_aleatorio,
      orden_opciones_aleatorio: config.orden_opciones_aleatorio
    });
    setEditingConfig(config);
    setShowForm(true);
  };

  const handleDelete = async (config) => {
    const result = await Swal.fire({
      icon: 'warning',
      title: '¿Eliminar configuración?',
      text: 'Esta acción no se puede deshacer',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
      cancelButtonColor: colors.primary
    });

    if (result.isConfirmed) {
      try {
        await configuracionService.eliminarConfiguracion(config.id);
        Swal.fire({
          icon: 'success',
          title: '¡Eliminado!',
          text: 'La configuración ha sido eliminada',
          confirmButtonColor: colors.primary
        });
        loadConfiguraciones();
      } catch (error) {
        console.error('Error eliminando configuración:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo eliminar la configuración',
          confirmButtonColor: colors.primary
        });
      }
    }
  };

  const handleActivar = async (config) => {
    try {
      // Obtener información del usuario desde localStorage
      const userInfo = localStorage.getItem('userInfo');
      let usuario = 'ADMIN';
      
      if (userInfo) {
        const userData = JSON.parse(userInfo);
        usuario = `${userData.nombre} ${userData.primer_apellido} ${userData.segundo_apellido}`.trim();
      }
      await configuracionService.activarConfiguracion(config.id, usuario);
      Swal.fire({
        icon: 'success',
        title: '¡Configuración activada!',
        text: 'Esta configuración está ahora activa',
        confirmButtonColor: colors.primary
      });
      loadConfiguraciones();
    } catch (error) {
      console.error('Error activando configuración:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo activar la configuración',
        confirmButtonColor: colors.primary
      });
    }
  };

  const handleRestaurarDefecto = async () => {
    const result = await Swal.fire({
      icon: 'question',
      title: '¿Restaurar valores por defecto?',
      text: 'Se actualizará la configuración actual con los valores por defecto',
      showCancelButton: true,
      confirmButtonText: 'Sí, restaurar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: colors.primary,
      cancelButtonColor: '#6c757d'
    });

    if (result.isConfirmed) {
      try {
        // Obtener información del usuario desde localStorage
        const userInfo = localStorage.getItem('userInfo');
        let usuario = 'ADMIN';
        
        if (userInfo) {
          const userData = JSON.parse(userInfo);
          usuario = `${userData.nombre} ${userData.primer_apellido} ${userData.segundo_apellido}`.trim();
        }
        
        if (configuracionActiva) {
          // Actualizar la configuración existente
          await configuracionService.actualizarConfiguracion(
            configuracionActiva.id,
            configuracionService.getConfiguracionPorDefecto(),
            usuario
          );
        } else {
          // Si no hay configuración activa, crear una nueva
          await configuracionService.crearConfiguracion(
            configuracionService.getConfiguracionPorDefecto(), 
            usuario
          );
        }
        
        Swal.fire({
          icon: 'success',
          title: '¡Restaurado!',
          text: 'Los valores por defecto han sido aplicados',
          confirmButtonColor: colors.primary
        });
        loadConfiguraciones();
      } catch (error) {
        console.error('Error restaurando configuración:', error);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo restaurar la configuración',
          confirmButtonColor: colors.primary
        });
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading loading-spinner loading-lg" style={{ color: colors.primary }}></div>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ backgroundColor: colors.white }}>


      {/* Título de la sección */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: colors.primary }}>
            Configuración de la Prueba
          </h2>
          <p className="text-gray-600 mt-1">
            Gestiona los parámetros de la prueba de admisión
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEditInstitucion}
            className="btn btn-outline"
            style={{ 
              borderColor: colors.accent, 
              color: colors.accent 
            }}
          >
            ✏️ Editar Información Institucional
          </button>
          <button
            onClick={handleRestaurarDefecto}
            className="btn btn-outline"
            style={{ 
              borderColor: colors.primary, 
              color: colors.primary 
            }}
          >
            Restaurar Valores por Defecto
          </button>
          {configuracionActiva && (
            <button
              onClick={() => handleEdit(configuracionActiva)}
              className="btn"
              style={{ backgroundColor: colors.primary, color: colors.white }}
            >
              Editar Configuración
            </button>
          )}
        </div>
      </div>

      {/* Configuración Activa */}
      {configuracionActiva && (
        <div className="card mb-6" style={{ backgroundColor: colors.secondary + '20' }}>
          <div className="card-body">
            <h3 className="card-title flex items-center gap-2">
              <span className="badge badge-success">ACTIVA</span>
              Configuración Actual
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
              <div>
                <label className="text-sm font-semibold">Tiempo límite:</label>
                <p className="text-lg">{configuracionActiva.tiempo_limite_minutos} minutos</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Preguntas:</label>
                <p className="text-lg">{configuracionActiva.numero_preguntas}</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Puntaje mínimo:</label>
                <p className="text-lg">{configuracionActiva.puntaje_minimo_aprobacion}%</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Intentos:</label>
                <p className="text-lg">{configuracionActiva.intentos_permitidos}</p>
              </div>
            </div>
            <div className="mt-4 text-sm text-gray-600">
              <p>Modificado por: {configuracionActiva.usuario_modificador}</p>
              <p>Última actualización: {new Date(configuracionActiva.updated_at).toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Formulario */}
      {showForm && (
        <div className="card mb-6">
          <div className="card-body">
            <h3 className="card-title mb-4">
              Editar Configuración de la Prueba
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Tiempo límite (minutos)</span>
                  </label>
                  <input
                    type="number"
                    name="tiempo_limite_minutos"
                    value={formData.tiempo_limite_minutos}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    min="1"
                    max="120"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Número de preguntas</span>
                  </label>
                  <input
                    type="number"
                    name="numero_preguntas"
                    value={formData.numero_preguntas}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    min="1"
                    max="50"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Puntaje mínimo para aprobar (%)</span>
                  </label>
                  <input
                    type="number"
                    name="puntaje_minimo_aprobacion"
                    value={formData.puntaje_minimo_aprobacion}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    min="0"
                    max="100"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Intentos permitidos</span>
                  </label>
                  <input
                    type="number"
                    name="intentos_permitidos"
                    value={formData.intentos_permitidos}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    min="1"
                    max="10"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Puntaje por pregunta</span>
                  </label>
                  <input
                    type="number"
                    name="puntaje_por_pregunta"
                    value={formData.puntaje_por_pregunta}
                    onChange={handleInputChange}
                    className="input input-bordered"
                    min="1"
                    max="100"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text font-semibold">Orden de preguntas aleatorio</span>
                    <input
                      type="checkbox"
                      name="orden_preguntas_aleatorio"
                      checked={formData.orden_preguntas_aleatorio}
                      onChange={handleInputChange}
                      className="checkbox"
                      style={{ accentColor: colors.primary }}
                    />
                  </label>
                </div>

                <div className="form-control">
                  <label className="label cursor-pointer">
                    <span className="label-text font-semibold">Orden de opciones aleatorio</span>
                    <input
                      type="checkbox"
                      name="orden_opciones_aleatorio"
                      checked={formData.orden_opciones_aleatorio}
                      onChange={handleInputChange}
                      className="checkbox"
                      style={{ accentColor: colors.primary }}
                    />
                  </label>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="btn"
                  style={{ backgroundColor: colors.primary, color: colors.white }}
                >
                  Actualizar Configuración
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="btn btn-outline"
                  style={{ borderColor: colors.primary, color: colors.primary }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Formulario de Información Institucional */}
      {showInstitucionForm && (
        <div className="card mb-6">
          <div className="card-body">
            <h3 className="card-title mb-4">
              Editar Información Institucional
            </h3>
            <form onSubmit={handleSubmitInstitucion} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Nombre del Centro Educativo</span>
                  </label>
                  <input
                    type="text"
                    name="nombre_centro_educativo"
                    value={institucionFormData.nombre_centro_educativo}
                    onChange={handleInstitucionInputChange}
                    className="input input-bordered"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">URL del Escudo del Centro</span>
                  </label>
                  <input
                    type="text"
                    name="escudo_centro_url"
                    value={institucionFormData.escudo_centro_url}
                    onChange={handleInstitucionInputChange}
                    className="input input-bordered"
                    placeholder="/img/ico/admision2025.png"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Nombre de la Especialidad</span>
                  </label>
                  <input
                    type="text"
                    name="nombre_especialidad"
                    value={institucionFormData.nombre_especialidad}
                    onChange={handleInstitucionInputChange}
                    className="input input-bordered"
                    required
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">URL del Logo de la Especialidad</span>
                  </label>
                  <input
                    type="text"
                    name="logo_especialidad_url"
                    value={institucionFormData.logo_especialidad_url}
                    onChange={handleInstitucionInputChange}
                    className="input input-bordered"
                    placeholder="/img/ico/secretariado.png"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Descripción del Centro</span>
                  </label>
                  <input
                    type="text"
                    name="descripcion_centro"
                    value={institucionFormData.descripcion_centro}
                    onChange={handleInstitucionInputChange}
                    className="input input-bordered"
                    placeholder="Institución de Educación Superior"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-semibold">Descripción de la Especialidad</span>
                  </label>
                  <input
                    type="text"
                    name="descripcion_especialidad"
                    value={institucionFormData.descripcion_especialidad}
                    onChange={handleInstitucionInputChange}
                    className="input input-bordered"
                    placeholder="Especialidad"
                  />
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  type="submit"
                  className="btn"
                  style={{ backgroundColor: colors.accent, color: colors.white }}
                >
                  Guardar Información Institucional
                </button>
                <button
                  type="button"
                  onClick={() => setShowInstitucionForm(false)}
                  className="btn btn-outline"
                  style={{ borderColor: colors.accent, color: colors.accent }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Información de la Configuración */}
      <div className="card">
        <div className="card-body">
          <h3 className="card-title mb-4">Información de la Configuración</h3>
          {configuracionActiva ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold">Tiempo límite:</label>
                <p className="text-lg">{configuracionActiva.tiempo_limite_minutos} minutos</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Número de preguntas:</label>
                <p className="text-lg">{configuracionActiva.numero_preguntas}</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Puntaje mínimo para aprobar:</label>
                <p className="text-lg">{configuracionActiva.puntaje_minimo_aprobacion}%</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Intentos permitidos:</label>
                <p className="text-lg">{configuracionActiva.intentos_permitidos}</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Puntaje por pregunta:</label>
                <p className="text-lg">{configuracionActiva.puntaje_por_pregunta}</p>
              </div>
              <div>
                <label className="text-sm font-semibold">Orden aleatorio:</label>
                <p className="text-lg">
                  {configuracionActiva.orden_preguntas_aleatorio ? 'Preguntas y opciones' : 'Solo opciones'}
                </p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold">Última modificación:</label>
                <p className="text-lg">{new Date(configuracionActiva.updated_at).toLocaleString()}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-semibold">Modificado por:</label>
                <p className="text-lg">{configuracionActiva.usuario_modificador}</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">No hay configuración activa</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ConfiguracionPrueba;


