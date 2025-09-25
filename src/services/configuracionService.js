import { supabase } from '../lib/supabaseConfig';

export const configuracionService = {
  // Obtener la configuración activa de la prueba (general o para una categoría específica)
  async getConfiguracionActiva(categoria = null) {
    try {
      let query = supabase
        .from('configuracion_quiz')
        .select('*')
        .eq('activa', true);

      if (categoria) {
        // Buscar configuración específica para la categoría
        query = query.eq('categoria', categoria);
      } else {
        // Buscar configuración general (categoría 'General' o NULL)
        query = query.or('categoria.is.null,categoria.eq.General');
      }

      const { data, error } = await query.single();

      if (error && error.code === 'PGRST116') {
        // Si no encuentra configuración específica para la categoría, buscar la general
        if (categoria) {
          const { data: generalData, error: generalError } = await supabase
            .from('configuracion_quiz')
            .select('*')
            .eq('activa', true)
            .or('categoria.is.null,categoria.eq.General')
            .single();

          if (generalError) {
            console.error('Error obteniendo configuración general:', generalError);
            throw generalError;
          }
          return generalData;
        }
        throw error;
      }

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
        .order('categoria', { ascending: true })
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

  // Obtener configuraciones por categoría
  async getConfiguracionesPorCategoria(categoria) {
    try {
      const { data, error } = await supabase
        .from('configuracion_quiz')
        .select('*')
        .eq('categoria', categoria)
        .order('fecha_creacion', { ascending: false });

      if (error) {
        console.error('Error obteniendo configuraciones por categoría:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error en getConfiguracionesPorCategoria:', error);
      throw error;
    }
  },

  // Obtener todas las categorías que tienen configuraciones
  async getCategoriasConConfiguracion() {
    try {
      const { data, error } = await supabase
        .from('configuracion_quiz')
        .select('categoria')
        .not('categoria', 'is', null)
        .neq('categoria', '');

      if (error) {
        console.error('Error obteniendo categorías:', error);
        throw error;
      }

      // Extraer categorías únicas
      const categoriasUnicas = [...new Set(data.map(item => item.categoria))];
      return categoriasUnicas;
    } catch (error) {
      console.error('Error en getCategoriasConConfiguracion:', error);
      throw error;
    }
  },

  // Crear nueva configuración
  async crearConfiguracion(configuracion, usuario, categoria = 'General') {
    try {
      // Desactivar configuraciones anteriores de la misma categoría
      await supabase
        .from('configuracion_quiz')
        .update({ activa: false })
        .eq('activa', true)
        .eq('categoria', categoria);

      // Mapear campos del formulario a la base de datos
      const configData = {
        nombre_config: configuracion.nombre_config || `Configuración ${categoria}`,
        categoria: categoria,
        tiempo_limite_minutos: configuracion.tiempo_limite_minutos,
        total_preguntas: configuracion.total_preguntas,
        puntuacion_minima_aprobacion: configuracion.puntaje_minimo_aprobacion,
        intentos_permitidos: configuracion.intentos_permitidos,
        puntaje_por_pregunta: configuracion.puntaje_por_pregunta,
        orden_preguntas_aleatorio: configuracion.orden_preguntas_aleatorio,
        orden_opciones_aleatorio: configuracion.orden_opciones_aleatorio,
        usuario_creador: usuario,
        usuario_modificador: usuario,
        activa: true
      };

      // Crear nueva configuración
      const { data, error } = await supabase
        .from('configuracion_quiz')
        .insert(configData)
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
      // Mapear campos del formulario a la base de datos
      const configData = {
        tiempo_limite_minutos: configuracion.tiempo_limite_minutos,
        total_preguntas: configuracion.total_preguntas,
        puntuacion_minima_aprobacion: configuracion.puntaje_minimo_aprobacion,
        intentos_permitidos: configuracion.intentos_permitidos,
        puntaje_por_pregunta: configuracion.puntaje_por_pregunta,
        orden_preguntas_aleatorio: configuracion.orden_preguntas_aleatorio,
        orden_opciones_aleatorio: configuracion.orden_opciones_aleatorio,
        usuario_modificador: usuario,
        fecha_modificacion: new Date().toISOString()
      };


      const { data, error } = await supabase
        .from('configuracion_quiz')
        .update(configData)
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
      total_preguntas: 5,
      puntaje_minimo_aprobacion: 70,
      intentos_permitidos: 2,
      puntaje_por_pregunta: 20,
      orden_preguntas_aleatorio: true,
      orden_opciones_aleatorio: true,
      activa: true
    };
  },

  // Mapear configuración de la base de datos al formulario
  mapearConfiguracionParaFormulario(configuracion) {
    return {
      nombre_config: configuracion.nombre_config || '',
      categoria: configuracion.categoria || 'General',
      tiempo_limite_minutos: configuracion.tiempo_limite_minutos || 5,
      total_preguntas: configuracion.total_preguntas || configuracion.numero_preguntas || 5,
      puntaje_minimo_aprobacion: configuracion.puntuacion_minima_aprobacion || configuracion.puntaje_minimo_aprobacion || 70,
      intentos_permitidos: configuracion.intentos_permitidos || 2,
      puntaje_por_pregunta: configuracion.puntaje_por_pregunta || 20,
      orden_preguntas_aleatorio: configuracion.orden_preguntas_aleatorio !== undefined ? configuracion.orden_preguntas_aleatorio : true,
      orden_opciones_aleatorio: configuracion.orden_opciones_aleatorio !== undefined ? configuracion.orden_opciones_aleatorio : true,
      activa: configuracion.activa || false
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
