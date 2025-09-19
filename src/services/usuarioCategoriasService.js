import { supabase } from '../lib/supabaseConfig'

class UsuarioCategoriasService {
  // Obtener categorías asignadas a un usuario (solo las que existen en categorias_quiz)
  async getCategoriasByUsuario(usuarioId) {
    try {
      
      // Primero obtener las categorías asignadas al usuario
      const { data: categoriasAsignadas, error: errorAsignadas } = await supabase
        .from('usuario_categorias')
        .select('categoria, activa, created_at')
        .eq('usuario_id', usuarioId)
        .eq('activa', true)
        .order('categoria')

      if (errorAsignadas) throw errorAsignadas

      if (!categoriasAsignadas || categoriasAsignadas.length === 0) {
        return []
      }

      // Verificar cuáles de estas categorías existen en categorias_quiz
      const nombresCategorias = categoriasAsignadas.map(c => c.categoria)
      const { data: categoriasExistentes, error: errorExistentes } = await supabase
        .from('categorias_quiz')
        .select('nombre')
        .eq('activa', true)
        .in('nombre', nombresCategorias)

      if (errorExistentes) throw errorExistentes

      // Filtrar solo las categorías que existen
      const nombresExistentes = categoriasExistentes.map(c => c.nombre)
      const categoriasValidas = nombresCategorias.filter(c => nombresExistentes.includes(c))
      
      return categoriasValidas
    } catch (error) {
      console.error('❌ Error obteniendo categorías del usuario:', error)
      return []
    }
  }

  // Asignar categorías a un usuario
  async asignarCategorias(usuarioId, categorias, usuarioCreador = 'SISTEMA') {
    try {

      // Validar que las categorías existan en categorias_quiz
      if (categorias && categorias.length > 0) {
        const { data: categoriasExistentes, error: errorValidacion } = await supabase
          .from('categorias_quiz')
          .select('nombre')
          .eq('activa', true)
          .in('nombre', categorias)

        if (errorValidacion) throw errorValidacion

        const nombresExistentes = categoriasExistentes.map(c => c.nombre)
        const categoriasInvalidas = categorias.filter(c => !nombresExistentes.includes(c))
        
        if (categoriasInvalidas.length > 0) {
          console.warn('⚠️ Categorías inválidas ignoradas:', categoriasInvalidas)
          categorias = categorias.filter(c => nombresExistentes.includes(c))
        }
      }

      // Primero desactivar todas las categorías existentes
      const { error: errorDesactivar } = await supabase
        .from('usuario_categorias')
        .update({ activa: false, usuario_modificador: usuarioCreador })
        .eq('usuario_id', usuarioId)

      if (errorDesactivar) throw errorDesactivar

      // Luego insertar las nuevas categorías (solo las válidas)
      if (categorias && categorias.length > 0) {
        const categoriasData = categorias.map(categoria => ({
          usuario_id: usuarioId,
          categoria: categoria,
          activa: true,
          usuario_creador: usuarioCreador,
          usuario_modificador: usuarioCreador
        }))


        const { error } = await supabase
          .from('usuario_categorias')
          .upsert(categoriasData, { 
            onConflict: 'usuario_id,categoria',
            ignoreDuplicates: false 
          })

        if (error) throw error
      } else {
      }

      return { success: true }
    } catch (error) {
      console.error('❌ Error asignando categorías:', error)
      return { success: false, error: error.message }
    }
  }

  // Obtener todas las categorías disponibles
  async getCategoriasDisponibles() {
    try {
      const { data, error } = await supabase
        .from('categorias_quiz')
        .select('nombre')
        .eq('activa', true)
        .order('nombre')

      if (error) throw error
      
      // Retornar los nombres de las categorías
      return data.map(item => item.nombre)
    } catch (error) {
      console.error('Error obteniendo categorías disponibles:', error)
      return []
    }
  }

  // Obtener estadísticas de categorías por usuario
  async getEstadisticasCategorias(usuarioId) {
    try {
      const { data, error } = await supabase
        .from('usuario_categorias')
        .select(`
          categoria,
          activa,
          preguntas_quiz!inner(count)
        `)
        .eq('usuario_id', usuarioId)
        .eq('activa', true)

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error)
      return []
    }
  }

  // Verificar si un usuario tiene categorías asignadas
  async tieneCategoriasAsignadas(usuarioId) {
    try {
      const { data, error } = await supabase
        .from('usuario_categorias')
        .select('id')
        .eq('usuario_id', usuarioId)
        .eq('activa', true)
        .limit(1)

      if (error) throw error
      return data.length > 0
    } catch (error) {
      console.error('Error verificando categorías:', error)
      return false
    }
  }

  // Obtener usuarios con sus categorías asignadas
  async getUsuariosConCategorias() {
    try {
      const { data, error } = await supabase
        .from('usuario_categorias')
        .select(`
          usuario_id,
          categoria,
          activa,
          usuarios!inner(nombre, primer_apellido, segundo_apellido, rol)
        `)
        .eq('activa', true)
        .order('usuario_id')

      if (error) throw error
      
      // Agrupar por usuario
      const usuariosAgrupados = {}
      data.forEach(item => {
        if (!usuariosAgrupados[item.usuario_id]) {
          usuariosAgrupados[item.usuario_id] = {
            usuario_id: item.usuario_id,
            nombre: item.usuarios.nombre,
            primer_apellido: item.usuarios.primer_apellido,
            segundo_apellido: item.usuarios.segundo_apellido,
            rol: item.usuarios.rol,
            categorias: []
          }
        }
        usuariosAgrupados[item.usuario_id].categorias.push(item.categoria)
      })

      return Object.values(usuariosAgrupados)
    } catch (error) {
      console.error('Error obteniendo usuarios con categorías:', error)
      return []
    }
  }
}

export default new UsuarioCategoriasService()
