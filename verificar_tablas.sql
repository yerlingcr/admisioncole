-- =====================================================
-- VERIFICACIÓN DE TABLAS DEL QUIZ
-- =====================================================

-- Verificar si las tablas existen
SELECT 'Verificando existencia de tablas:' as info;

SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN '✅ EXISTE'
        ELSE '❌ NO EXISTE'
    END as estado
FROM information_schema.tables 
WHERE table_name IN (
    'preguntas_quiz',
    'opciones_respuesta', 
    'intentos_quiz',
    'respuestas_estudiante',
    'configuracion_quiz'
)
AND table_schema = 'public';

-- Verificar datos en preguntas_quiz
SELECT 'Verificando datos en preguntas_quiz:' as info;
SELECT COUNT(*) as total_preguntas FROM preguntas_quiz;

-- Verificar datos en opciones_respuesta
SELECT 'Verificando datos en opciones_respuesta:' as info;
SELECT COUNT(*) as total_opciones FROM opciones_respuesta;

-- Verificar datos en configuracion_quiz
SELECT 'Verificando datos en configuracion_quiz:' as info;
SELECT COUNT(*) as total_configuraciones FROM configuracion_quiz;

-- Ver las preguntas que existen
SELECT 'Preguntas existentes:' as info;
SELECT id, pregunta, categoria, activa FROM preguntas_quiz ORDER BY orden_mostrar;

-- Ver las opciones que existen
SELECT 'Opciones existentes:' as info;
SELECT 
    pq.pregunta,
    op.texto_opcion,
    op.es_correcta,
    op.activa
FROM preguntas_quiz pq 
JOIN opciones_respuesta op ON pq.id = op.pregunta_id 
ORDER BY pq.orden_mostrar, op.orden_mostrar;

-- Ver configuración
SELECT 'Configuración del quiz:' as info;
SELECT * FROM configuracion_quiz;
