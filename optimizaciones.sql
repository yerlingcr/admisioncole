-- =====================================================
-- OPTIMIZACIONES DE BASE DE DATOS - ADMISIÓN 2025
-- =====================================================

-- Función RPC para obtener estadísticas del sistema en una sola consulta
CREATE OR REPLACE FUNCTION obtener_estadisticas_sistema()
RETURNS JSON AS $$
DECLARE
    resultado JSON;
BEGIN
    SELECT json_build_object(
        'total_usuarios', (
            SELECT COUNT(*) FROM usuarios
        ),
        'total_preguntas', (
            SELECT COUNT(*) FROM preguntas_quiz
        ),
        'usuarios_activos', (
            SELECT COUNT(*) FROM usuarios WHERE estado = 'Activo'
        ),
        'usuarios_inactivos', (
            SELECT COUNT(*) FROM usuarios WHERE estado != 'Activo'
        ),
        'total_intentos', (
            SELECT COUNT(*) FROM intentos_quiz
        ),
        'intentos_completados', (
            SELECT COUNT(*) FROM intentos_quiz WHERE estado = 'Completado'
        ),
        'promedio_puntuacion', (
            SELECT COALESCE(AVG(puntuacion_total), 0) FROM intentos_quiz WHERE estado = 'Completado'
        )
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- Función RPC para obtener datos del dashboard de profesor optimizado
CREATE OR REPLACE FUNCTION obtener_datos_profesor(p_usuario_id VARCHAR)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
    categoria_asignada VARCHAR;
BEGIN
    -- Obtener categoría asignada al profesor
    SELECT categoria INTO categoria_asignada
    FROM usuario_categorias 
    WHERE usuario_id = p_usuario_id AND activa = true
    LIMIT 1;
    
    -- Si no tiene categoría asignada, retornar datos básicos
    IF categoria_asignada IS NULL THEN
        SELECT json_build_object(
            'categoria_asignada', NULL,
            'total_estudiantes', 0,
            'estudiantes_activos', 0,
            'total_preguntas_categoria', 0,
            'intentos_categoria', 0
        ) INTO resultado;
    ELSE
        -- Obtener datos específicos de la categoría
        SELECT json_build_object(
            'categoria_asignada', categoria_asignada,
            'total_estudiantes', (
                SELECT COUNT(DISTINCT uc.usuario_id)
                FROM usuario_categorias uc
                JOIN usuarios u ON uc.usuario_id = u.identificacion
                WHERE uc.categoria = categoria_asignada AND uc.activa = true
                AND u.tipo_usuario = 'Estudiante'
            ),
            'estudiantes_activos', (
                SELECT COUNT(DISTINCT uc.usuario_id)
                FROM usuario_categorias uc
                JOIN usuarios u ON uc.usuario_id = u.identificacion
                WHERE uc.categoria = categoria_asignada AND uc.activa = true
                AND u.tipo_usuario = 'Estudiante' AND u.estado = 'Activo'
            ),
            'total_preguntas_categoria', (
                SELECT COUNT(*) FROM preguntas_quiz 
                WHERE categoria = categoria_asignada AND activa = true
            ),
            'intentos_categoria', (
                SELECT COUNT(DISTINCT iq.id)
                FROM intentos_quiz iq
                JOIN usuario_categorias uc ON iq.estudiante_id = uc.usuario_id
                WHERE uc.categoria = categoria_asignada AND uc.activa = true
            )
        ) INTO resultado;
    END IF;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;

-- Función RPC para obtener top 10 estudiantes por categoría
CREATE OR REPLACE FUNCTION obtener_top_estudiantes(p_categoria VARCHAR, p_limit INTEGER DEFAULT 10)
RETURNS TABLE(
    estudiante_id VARCHAR,
    nombre_completo TEXT,
    puntuacion_total INTEGER,
    preguntas_correctas INTEGER,
    fecha_fin TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        iq.estudiante_id,
        CONCAT(u.nombre, ' ', u.apellido) as nombre_completo,
        iq.puntuacion_total,
        iq.preguntas_correctas,
        iq.fecha_fin
    FROM intentos_quiz iq
    JOIN usuario_categorias uc ON iq.estudiante_id = uc.usuario_id
    JOIN usuarios u ON iq.estudiante_id = u.identificacion
    WHERE uc.categoria = p_categoria 
    AND uc.activa = true
    AND iq.estado = 'Completado'
    AND u.tipo_usuario = 'Estudiante'
    ORDER BY iq.puntuacion_total DESC, iq.preguntas_correctas DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Función RPC para obtener datos del estudiante optimizado
CREATE OR REPLACE FUNCTION obtener_datos_estudiante(p_estudiante_id VARCHAR)
RETURNS JSON AS $$
DECLARE
    resultado JSON;
BEGIN
    SELECT json_build_object(
        'categoria_asignada', (
            SELECT categoria FROM usuario_categorias 
            WHERE usuario_id = p_estudiante_id AND activa = true
            LIMIT 1
        ),
        'intentos_usados', (
            SELECT COUNT(*) FROM intentos_quiz 
            WHERE estudiante_id = p_estudiante_id AND fecha_fin IS NOT NULL
        ),
        'ultimo_intento', (
            SELECT json_build_object(
                'id', id,
                'estado', estado,
                'puntuacion_total', puntuacion_total,
                'fecha_inicio', fecha_inicio,
                'fecha_fin', fecha_fin
            )
            FROM intentos_quiz 
            WHERE estudiante_id = p_estudiante_id 
            ORDER BY fecha_inicio DESC 
            LIMIT 1
        ),
        'puede_realizar_quiz', (
            SELECT CASE 
                WHEN COUNT(*) < (SELECT intentos_permitidos FROM configuracion_quiz WHERE activa = true LIMIT 1)
                THEN true 
                ELSE false 
            END
            FROM intentos_quiz 
            WHERE estudiante_id = p_estudiante_id AND fecha_fin IS NOT NULL
        )
    ) INTO resultado;
    
    RETURN resultado;
END;
$$ LANGUAGE plpgsql;
