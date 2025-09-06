import { supabase } from '../lib/supabaseConfig';

export const institucionService = {
  // Obtener información institucional activa
  async getInformacionActiva() {
    try {
      const { data, error } = await supabase
        .from('informacion_institucional')
        .select('*')
        .eq('activa', true)
        .single();

      if (error) {
        console.error('Error obteniendo información institucional:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en getInformacionActiva:', error);
      // Retornar información por defecto si hay error
      return this.getInformacionPorDefecto();
    }
  },

  // Obtener toda la información institucional
  async getAllInformacion() {
    try {
      const { data, error } = await supabase
        .from('informacion_institucional')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error obteniendo información institucional:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en getAllInformacion:', error);
      throw error;
    }
  },

  // Actualizar información institucional
  async actualizarInformacion(id, informacion, usuario) {
    try {
      const { data, error } = await supabase
        .from('informacion_institucional')
        .update({
          ...informacion,
          usuario_modificador: usuario
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando información institucional:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en actualizarInformacion:', error);
      throw error;
    }
  },

  // Crear nueva información institucional
  async crearInformacion(informacion, usuario) {
    try {
      // Desactivar información anterior
      await supabase
        .from('informacion_institucional')
        .update({ activa: false })
        .eq('activa', true);

      // Crear nueva información
      const { data, error } = await supabase
        .from('informacion_institucional')
        .insert({
          ...informacion,
          usuario_modificador: usuario,
          activa: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando información institucional:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en crearInformacion:', error);
      throw error;
    }
  },

  // Obtener información por defecto
  getInformacionPorDefecto() {
    return {
      nombre_centro_educativo: 'Centro Educativo',
      escudo_centro_url: '/img/ico/admision2025.png',
      nombre_especialidad: 'Secretariado Ejecutivo',
      logo_especialidad_url: '/img/ico/secretariado.png',
      descripcion_centro: 'Institución de Educación Superior',
      descripcion_especialidad: 'Especialidad',
      activa: true
    };
  },

  // Validar información institucional
  validarInformacion(informacion) {
    const errores = [];

    if (!informacion.nombre_centro_educativo || informacion.nombre_centro_educativo.trim() === '') {
      errores.push('El nombre del centro educativo es requerido');
    }

    if (!informacion.nombre_especialidad || informacion.nombre_especialidad.trim() === '') {
      errores.push('El nombre de la especialidad es requerido');
    }

    if (informacion.nombre_centro_educativo && informacion.nombre_centro_educativo.length > 255) {
      errores.push('El nombre del centro educativo no puede exceder 255 caracteres');
    }

    if (informacion.nombre_especialidad && informacion.nombre_especialidad.length > 255) {
      errores.push('El nombre de la especialidad no puede exceder 255 caracteres');
    }

    return errores;
  }
};

