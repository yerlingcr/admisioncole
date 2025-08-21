-- =====================================================
-- LIMPIAR INTENTOS DE QUIZ EN PROGRESO
-- =====================================================

-- 1. Ver intentos existentes
SELECT 'Intentos existentes:' as info;
SELECT id, estudiante_id, estado, fecha_inicio, fecha_fin FROM intentos_quiz;

-- 2. Ver respuestas existentes
SELECT 'Respuestas existentes:' as info;
SELECT COUNT(*) as total_respuestas FROM respuestas_estudiante;

-- 3. Limpiar respuestas de intentos en progreso
DELETE FROM respuestas_estudiante 
WHERE intento_id IN (
    SELECT id FROM intentos_quiz 
    WHERE estudiante_id = 'EST001' AND estado = 'En Progreso'
);

-- 4. Limpiar intentos en progreso
DELETE FROM intentos_quiz 
WHERE estudiante_id = 'EST001' AND estado = 'En Progreso';

-- 5. Verificar que se limpiaron
SELECT 'Después de limpiar - Intentos:' as info;
SELECT id, estudiante_id, estado, fecha_inicio, fecha_fin FROM intentos_quiz;

SELECT 'Después de limpiar - Respuestas:' as info;
SELECT COUNT(*) as total_respuestas FROM respuestas_estudiante;

-- 6. Reiniciar secuencias si es necesario
SELECT 'Secuencias actuales:' as info;
SELECT 
    'intentos_quiz' as tabla,
    pg_get_serial_sequence('intentos_quiz', 'id') as secuencia,
    currval(pg_get_serial_sequence('intentos_quiz', 'id')) as valor_actual
UNION ALL
SELECT 
    'respuestas_estudiante' as tabla,
    pg_get_serial_sequence('respuestas_estudiante', 'id') as secuencia,
    currval(pg_get_serial_sequence('respuestas_estudiante', 'id')) as valor_actual;
