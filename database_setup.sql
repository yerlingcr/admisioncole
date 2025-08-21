-- =====================================================
-- SISTEMA DE QUIZ DE ADMISIÓN 2025
-- =====================================================

-- Tabla para las preguntas del quiz
CREATE TABLE IF NOT EXISTS preguntas_quiz (
    id SERIAL PRIMARY KEY,
    pregunta TEXT NOT NULL,
    imagen_url TEXT, -- URL de la imagen (opcional)
    categoria VARCHAR(100) DEFAULT 'General',
    nivel_dificultad VARCHAR(20) DEFAULT 'Medio', -- Fácil, Medio, Difícil
    puntos INTEGER DEFAULT 1,
    activa BOOLEAN DEFAULT true,
    orden_mostrar INTEGER DEFAULT 0,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_modificacion TIMESTAMP DEFAULT NOW()
);

-- Tabla para las opciones de respuesta
CREATE TABLE IF NOT EXISTS opciones_respuesta (
    id SERIAL PRIMARY KEY,
    pregunta_id INTEGER REFERENCES preguntas_quiz(id) ON DELETE CASCADE,
    texto_opcion TEXT NOT NULL,
    es_correcta BOOLEAN DEFAULT false,
    orden_mostrar INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT true
);

-- Tabla para los intentos de quiz por estudiante
CREATE TABLE IF NOT EXISTS intentos_quiz (
    id SERIAL PRIMARY KEY,
    estudiante_id VARCHAR(20) REFERENCES usuarios(identificacion) ON DELETE CASCADE,
    fecha_inicio TIMESTAMP DEFAULT NOW(),
    fecha_fin TIMESTAMP,
    tiempo_total_segundos INTEGER,
    estado VARCHAR(20) DEFAULT 'En Progreso', -- En Progreso, Completado, Expirado
    puntuacion_total INTEGER DEFAULT 0,
    preguntas_respondidas INTEGER DEFAULT 0,
    preguntas_correctas INTEGER DEFAULT 0
);

-- Tabla para las respuestas individuales del estudiante
CREATE TABLE IF NOT EXISTS respuestas_estudiante (
    id SERIAL PRIMARY KEY,
    intento_id INTEGER REFERENCES intentos_quiz(id) ON DELETE CASCADE,
    pregunta_id INTEGER REFERENCES preguntas_quiz(id) ON DELETE CASCADE,
    opcion_seleccionada_id INTEGER REFERENCES opciones_respuesta(id) ON DELETE CASCADE,
    es_correcta BOOLEAN,
    tiempo_respuesta_segundos INTEGER,
    fecha_respuesta TIMESTAMP DEFAULT NOW()
);

-- Tabla para configuraciones del quiz
CREATE TABLE IF NOT EXISTS configuracion_quiz (
    id SERIAL PRIMARY KEY,
    nombre_config VARCHAR(100) DEFAULT 'Configuración Principal',
    tiempo_limite_minutos INTEGER DEFAULT 5,
    total_preguntas INTEGER DEFAULT 5,
    puntuacion_minima_aprobacion INTEGER DEFAULT 60,
    permitir_reintentos BOOLEAN DEFAULT false,
    mostrar_resultados_inmediato BOOLEAN DEFAULT true,
    activa BOOLEAN DEFAULT true,
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_modificacion TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- DATOS DE EJEMPLO
-- =====================================================

-- Insertar preguntas de ejemplo
INSERT INTO preguntas_quiz (pregunta, imagen_url, categoria, nivel_dificultad, orden_mostrar) VALUES
('¿Cuál es la capital de Costa Rica?', '/img/questions/pregunta1.jpg', 'Geografía', 'Fácil', 1),
('¿En qué año se independizó Costa Rica de España?', NULL, 'Historia', 'Fácil', 2),
('¿Cuál es el animal nacional de Costa Rica?', '/img/questions/pregunta3.jpg', 'Cultura', 'Medio', 3),
('¿Cuántas provincias tiene Costa Rica?', NULL, 'Geografía', 'Medio', 4),
('¿Cuál es el idioma oficial de Costa Rica?', NULL, 'Cultura', 'Fácil', 5);

-- Insertar opciones de respuesta
INSERT INTO opciones_respuesta (pregunta_id, texto_opcion, es_correcta, orden_mostrar) VALUES
-- Pregunta 1: Capital de Costa Rica
(1, 'San José', true, 1),
(1, 'Cartago', false, 2),
(1, 'Heredia', false, 3),
(1, 'Alajuela', false, 4),

-- Pregunta 2: Año de independencia
(2, '1810', false, 1),
(2, '1821', true, 2),
(2, '1830', false, 3),
(2, '1848', false, 4),

-- Pregunta 3: Animal nacional
(3, 'Jaguar', false, 1),
(3, 'Tucán', false, 2),
(3, 'Mono', false, 3),
(3, 'Yigüirro', true, 4),

-- Pregunta 4: Número de provincias
(4, '5', false, 1),
(4, '6', false, 2),
(4, '7', true, 3),
(4, '8', false, 4),

-- Pregunta 5: Idioma oficial
(5, 'Inglés', false, 1),
(5, 'Español', true, 2),
(5, 'Francés', false, 3),
(5, 'Portugués', false, 4);

-- Insertar configuración por defecto
INSERT INTO configuracion_quiz (nombre_config, tiempo_limite_minutos, total_preguntas, puntuacion_minima_aprobacion) VALUES
('Configuración Principal', 5, 5, 60);

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- =====================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE preguntas_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE opciones_respuesta ENABLE ROW LEVEL SECURITY;
ALTER TABLE intentos_quiz ENABLE ROW LEVEL SECURITY;
ALTER TABLE respuestas_estudiante ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_quiz ENABLE ROW LEVEL SECURITY;

-- Política para preguntas_quiz (lectura pública)
CREATE POLICY "Permitir lectura de preguntas" ON preguntas_quiz
    FOR SELECT USING (activa = true);

-- Política para opciones_respuesta (lectura pública)
CREATE POLICY "Permitir lectura de opciones" ON opciones_respuesta
    FOR SELECT USING (activa = true);

-- Política para configuracion_quiz (lectura pública)
CREATE POLICY "Permitir lectura de configuración" ON configuracion_quiz
    FOR SELECT USING (activa = true);

-- Política para intentos_quiz (estudiantes solo pueden ver sus propios intentos)
CREATE POLICY "Estudiantes ven sus intentos" ON intentos_quiz
    FOR SELECT USING (
        estudiante_id = current_setting('app.current_user_id', true)::VARCHAR
    );

-- Política para respuestas_estudiante (estudiantes solo pueden ver sus propias respuestas)
CREATE POLICY "Estudiantes ven sus respuestas" ON respuestas_estudiante
    FOR SELECT USING (
        intento_id IN (
            SELECT id FROM intentos_quiz 
            WHERE estudiante_id = current_setting('app.current_user_id', true)::VARCHAR
        )
    );

-- =====================================================
-- FUNCIONES ÚTILES
-- =====================================================

-- Función para obtener preguntas aleatorias para un quiz
CREATE OR REPLACE FUNCTION obtener_preguntas_quiz(
    p_total_preguntas INTEGER DEFAULT 5,
    p_categoria VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    pregunta TEXT,
    imagen_url TEXT,
    categoria VARCHAR,
    nivel_dificultad VARCHAR,
    opciones JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pq.id,
        pq.pregunta,
        pq.imagen_url,
        pq.categoria,
        pq.nivel_dificultad,
        json_agg(
            json_build_object(
                'id', op.id,
                'texto', op.texto_opcion,
                'es_correcta', op.es_correcta
            ) ORDER BY op.orden_mostrar
        ) as opciones
    FROM preguntas_quiz pq
    LEFT JOIN opciones_respuesta op ON pq.id = op.pregunta_id
    WHERE pq.activa = true 
        AND op.activa = true
        AND (p_categoria IS NULL OR pq.categoria = p_categoria)
    GROUP BY pq.id, pq.pregunta, pq.imagen_url, pq.categoria, pq.nivel_dificultad
    ORDER BY RANDOM()
    LIMIT p_total_preguntas;
END;
$$ LANGUAGE plpgsql;

-- Función para calcular puntuación de un intento
CREATE OR REPLACE FUNCTION calcular_puntuacion_intento(p_intento_id INTEGER)
RETURNS INTEGER AS $$
DECLARE
    puntuacion INTEGER;
BEGIN
    SELECT COALESCE(SUM(
        CASE WHEN re.es_correcta THEN 1 ELSE 0 END
    ), 0) INTO puntuacion
    FROM respuestas_estudiante re
    WHERE re.intento_id = p_intento_id;
    
    RETURN puntuacion;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX idx_preguntas_quiz_activa ON preguntas_quiz(activa);
CREATE INDEX idx_opciones_respuesta_pregunta ON opciones_respuesta(pregunta_id);
CREATE INDEX idx_intentos_quiz_estudiante ON intentos_quiz(estudiante_id);
CREATE INDEX idx_respuestas_estudiante_intento ON respuestas_estudiante(intento_id);
CREATE INDEX idx_configuracion_quiz_activa ON configuracion_quiz(activa);
