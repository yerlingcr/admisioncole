-- =====================================================
-- VERIFICAR ESTRUCTURA DE PREGUNTAS Y OPCIONES
-- =====================================================

-- 1. Ver todas las preguntas
SELECT 'Preguntas en la base de datos:' as info;
SELECT id, pregunta, categoria, activa FROM preguntas_quiz ORDER BY orden_mostrar;

-- 2. Ver todas las opciones
SELECT 'Opciones en la base de datos:' as info;
SELECT id, pregunta_id, texto_opcion, es_correcta, activa FROM opciones_respuesta ORDER BY pregunta_id, orden_mostrar;

-- 3. Ver preguntas con sus opciones (JOIN)
SELECT 'Preguntas con opciones (JOIN):' as info;
SELECT 
    pq.id as pregunta_id,
    pq.pregunta,
    pq.categoria,
    op.id as opcion_id,
    op.texto_opcion,
    op.es_correcta,
    op.activa as opcion_activa
FROM preguntas_quiz pq
LEFT JOIN opciones_respuesta op ON pq.id = op.pregunta_id
WHERE pq.activa = true
ORDER BY pq.orden_mostrar, op.orden_mostrar;

-- 4. Contar opciones por pregunta
SELECT 'Conteo de opciones por pregunta:' as info;
SELECT 
    pq.id,
    pq.pregunta,
    COUNT(op.id) as total_opciones,
    COUNT(CASE WHEN op.es_correcta = true THEN 1 END) as opciones_correctas
FROM preguntas_quiz pq
LEFT JOIN opciones_respuesta op ON pq.id = op.pregunta_id
WHERE pq.activa = true
GROUP BY pq.id, pq.pregunta
ORDER BY pq.orden_mostrar;
