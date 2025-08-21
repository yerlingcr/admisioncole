-- =====================================================
-- SISTEMA DE QUIZ DE ADMISIÓN 2025 - SOLO TABLAS Y DATOS
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
    usuario_creador VARCHAR(20) REFERENCES usuarios(identificacion), -- Quién creó la pregunta
    usuario_modificador VARCHAR(20) REFERENCES usuarios(identificacion), -- Quién la modificó por última vez
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
    activa BOOLEAN DEFAULT true,
    usuario_creador VARCHAR(20) REFERENCES usuarios(identificacion), -- Quién creó la opción
    usuario_modificador VARCHAR(20) REFERENCES usuarios(identificacion), -- Quién la modificó por última vez
    fecha_creacion TIMESTAMP DEFAULT NOW(),
    fecha_modificacion TIMESTAMP DEFAULT NOW()
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

-- Limpiar datos existentes (opcional)
DELETE FROM opciones_respuesta;
DELETE FROM preguntas_quiz;
DELETE FROM configuracion_quiz;

-- Insertar preguntas de ejemplo
INSERT INTO preguntas_quiz (pregunta, imagen_url, categoria, nivel_dificultad, orden_mostrar, usuario_creador) VALUES
('¿Cuál es la capital de Costa Rica?', '/img/questions/pregunta1.jpg', 'Geografía', 'Fácil', 1, 'ADMIN001'),
('¿En qué año se independizó Costa Rica de España?', NULL, 'Historia', 'Fácil', 2, 'ADMIN001'),
('¿Cuál es el animal nacional de Costa Rica?', '/img/questions/pregunta3.jpg', 'Cultura', 'Medio', 3, 'ADMIN001'),
('¿Cuántas provincias tiene Costa Rica?', NULL, 'Geografía', 'Medio', 4, 'ADMIN001'),
('¿Cuál es el idioma oficial de Costa Rica?', NULL, 'Cultura', 'Fácil', 5, 'ADMIN001');

-- Insertar opciones de respuesta
INSERT INTO opciones_respuesta (pregunta_id, texto_opcion, es_correcta, orden_mostrar, usuario_creador) VALUES
-- Pregunta 1: Capital de Costa Rica
(1, 'San José', true, 1, 'ADMIN001'),
(1, 'Cartago', false, 2, 'ADMIN001'),
(1, 'Heredia', false, 3, 'ADMIN001'),
(1, 'Alajuela', false, 4, 'ADMIN001'),

-- Pregunta 2: Año de independencia
(2, '1810', false, 1, 'ADMIN001'),
(2, '1821', true, 2, 'ADMIN001'),
(2, '1830', false, 3, 'ADMIN001'),
(2, '1848', false, 4, 'ADMIN001'),

-- Pregunta 3: Animal nacional
(3, 'Jaguar', false, 1, 'ADMIN001'),
(3, 'Tucán', false, 2, 'ADMIN001'),
(3, 'Mono', false, 3, 'ADMIN001'),
(3, 'Yigüirro', true, 4, 'ADMIN001'),

-- Pregunta 4: Número de provincias
(4, '5', false, 1, 'ADMIN001'),
(4, '6', false, 2, 'ADMIN001'),
(4, '7', true, 3, 'ADMIN001'),
(4, '8', false, 4, 'ADMIN001'),

-- Pregunta 5: Idioma oficial
(5, 'Inglés', false, 1, 'ADMIN001'),
(5, 'Español', true, 2, 'ADMIN001'),
(5, 'Francés', false, 3, 'ADMIN001'),
(5, 'Portugués', false, 4, 'ADMIN001');

-- Insertar configuración por defecto
INSERT INTO configuracion_quiz (nombre_config, tiempo_limite_minutos, total_preguntas, puntuacion_minima_aprobacion) VALUES
('Configuración Principal', 5, 5, 60);

-- =====================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_preguntas_quiz_activa ON preguntas_quiz(activa);
CREATE INDEX IF NOT EXISTS idx_opciones_respuesta_pregunta ON opciones_respuesta(pregunta_id);
CREATE INDEX IF NOT EXISTS idx_intentos_quiz_estudiante ON intentos_quiz(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_estudiante_intento ON respuestas_estudiante(intento_id);
CREATE INDEX IF NOT EXISTS idx_configuracion_quiz_activa ON configuracion_quiz(activa);

-- =====================================================
-- VERIFICACIÓN DE DATOS
-- =====================================================

-- Mostrar las preguntas creadas
SELECT 'Preguntas creadas:' as info;
SELECT id, pregunta, categoria FROM preguntas_quiz ORDER BY orden_mostrar;

-- Mostrar las opciones creadas
SELECT 'Opciones creadas:' as info;
SELECT pq.pregunta, op.texto_opcion, op.es_correcta 
FROM preguntas_quiz pq 
JOIN opciones_respuesta op ON pq.id = op.pregunta_id 
ORDER BY pq.orden_mostrar, op.orden_mostrar;

-- Mostrar configuración
SELECT 'Configuración del quiz:' as info;
SELECT * FROM configuracion_quiz;
