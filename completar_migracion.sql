-- =====================================================
-- COMPLETAR MIGRACIÓN Y INSERTAR DATOS
-- =====================================================

-- 1. Agregar campos de usuario a preguntas_quiz
ALTER TABLE preguntas_quiz 
ADD COLUMN IF NOT EXISTS usuario_creador VARCHAR(20) REFERENCES usuarios(identificacion),
ADD COLUMN IF NOT EXISTS usuario_modificador VARCHAR(20) REFERENCES usuarios(identificacion);

-- 2. Agregar campos de usuario a opciones_respuesta
ALTER TABLE opciones_respuesta 
ADD COLUMN IF NOT EXISTS usuario_creador VARCHAR(20) REFERENCES usuarios(identificacion),
ADD COLUMN IF NOT EXISTS usuario_modificador VARCHAR(20) REFERENCES usuarios(identificacion);

-- 3. Limpiar datos existentes (si los hay)
DELETE FROM opciones_respuesta;
DELETE FROM preguntas_quiz;
DELETE FROM configuracion_quiz;

-- 4. Insertar preguntas de ejemplo con usuario creador
INSERT INTO preguntas_quiz (pregunta, imagen_url, categoria, nivel_dificultad, orden_mostrar, usuario_creador) VALUES
('¿Cuál es la capital de Costa Rica?', '/img/questions/pregunta1.jpg', 'Geografía', 'Fácil', 1, 'ADMIN001'),
('¿En qué año se independizó Costa Rica de España?', NULL, 'Historia', 'Fácil', 2, 'ADMIN001'),
('¿Cuál es el animal nacional de Costa Rica?', '/img/questions/pregunta3.jpg', 'Cultura', 'Medio', 3, 'ADMIN001'),
('¿Cuántas provincias tiene Costa Rica?', NULL, 'Geografía', 'Medio', 4, 'ADMIN001'),
('¿Cuál es el idioma oficial de Costa Rica?', NULL, 'Cultura', 'Fácil', 5, 'ADMIN001');

-- 5. Insertar opciones de respuesta con usuario creador
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

-- 6. Insertar configuración por defecto
INSERT INTO configuracion_quiz (nombre_config, tiempo_limite_minutos, total_preguntas, puntuacion_minima_aprobacion) VALUES
('Configuración Principal', 5, 5, 60);

-- 7. Verificar que todo se insertó correctamente
SELECT 'Verificando preguntas creadas:' as info;
SELECT id, pregunta, categoria, usuario_creador FROM preguntas_quiz ORDER BY orden_mostrar;

SELECT 'Verificando opciones creadas:' as info;
SELECT 
    pq.pregunta,
    op.texto_opcion,
    op.es_correcta,
    op.usuario_creador
FROM preguntas_quiz pq 
JOIN opciones_respuesta op ON pq.id = op.pregunta_id 
ORDER BY pq.orden_mostrar, op.orden_mostrar;

SELECT 'Verificando configuración:' as info;
SELECT * FROM configuracion_quiz;
