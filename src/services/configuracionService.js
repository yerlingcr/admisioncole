import { supabase } from '../lib/supabaseConfig';

export const configuracionService = {
  // Obtener la configuración activa de la prueba
  async getConfiguracionActiva() {
    try {
      const { data, error } = await supabase
        .from('configuracion_quiz')
        .select('*')
        .eq('activa', true)
        .single();

      if (error) {
        console.error('Error obteniendo configuración:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en getConfiguracionActiva:', error);
      throw error;
    }
  },

  // Obtener todas las configuraciones
  async getAllConfiguraciones() {
    try {
      const { data, error } = await supabase
        .from('configuracion_quiz')
        .select('*')
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.error('Error obteniendo configuraciones:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en getAllConfiguraciones:', error);
      throw error;
    }
  },

  // Crear nueva configuración
  async crearConfiguracion(configuracion, usuario) {
    try {
      // Desactivar configuraciones anteriores
      await supabase
        .from('configuracion_quiz')
        .update({ activa: false })
        .eq('activa', true);

      // Crear nueva configuración
      const { data, error } = await supabase
        .from('configuracion_quiz')
        .insert({
          ...configuracion,
          usuario_modificador: usuario,
          activa: true
        })
        .select()
        .single();

      if (error) {
        console.error('Error creando configuración:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en crearConfiguracion:', error);
      throw error;
    }
  },

  // Actualizar configuración existente
  async actualizarConfiguracion(id, configuracion, usuario) {
    try {
      const { data, error } = await supabase
        .from('configuracion_quiz')
        .update({
          ...configuracion,
          usuario_modificador: usuario
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error actualizando configuración:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en actualizarConfiguracion:', error);
      throw error;
    }
  },

  // Eliminar configuración
  async eliminarConfiguracion(id) {
    try {
      const { error } = await supabase
        .from('configuracion_quiz')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error eliminando configuración:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error en eliminarConfiguracion:', error);
      throw error;
    }
  },

  // Activar configuración específica
  async activarConfiguracion(id, usuario) {
    try {
      // Desactivar todas las configuraciones
      await supabase
        .from('configuracion_quiz')
        .update({ activa: false });

      // Activar la configuración seleccionada
      const { data, error } = await supabase
        .from('configuracion_quiz')
        .update({ 
          activa: true,
          usuario_modificador: usuario
        })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error activando configuración:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error en activarConfiguracion:', error);
      throw error;
    }
  },

  // Obtener configuración por defecto
  getConfiguracionPorDefecto() {
    return {
      tiempo_limite_minutos: 5,
      numero_preguntas: 5,
      puntaje_minimo_aprobacion: 70,
      intentos_permitidos: 2,
      puntaje_por_pregunta: 20,
      orden_preguntas_aleatorio: true,
      orden_opciones_aleatorio: true,
      activa: true
    };
  },

  // Validar configuración
  validarConfiguracion(configuracion) {
    const errores = [];

    if (configuracion.tiempo_limite_minutos < 1 || configuracion.tiempo_limite_minutos > 120) {
      errores.push('El tiempo límite debe estar entre 1 y 120 minutos');
    }

    if (configuracion.numero_preguntas < 1 || configuracion.numero_preguntas > 50) {
      errores.push('El número de preguntas debe estar entre 1 y 50');
    }

    if (configuracion.puntaje_minimo_aprobacion < 0 || configuracion.puntaje_minimo_aprobacion > 100) {
      errores.push('El puntaje mínimo debe estar entre 0 y 100');
    }

    if (configuracion.intentos_permitidos < 1 || configuracion.intentos_permitidos > 10) {
      errores.push('Los intentos permitidos deben estar entre 1 y 10');
    }

    if (configuracion.puntaje_por_pregunta < 1 || configuracion.puntaje_por_pregunta > 100) {
      errores.push('El puntaje por pregunta debe estar entre 1 y 100');
    }

    return errores;
  }
};
