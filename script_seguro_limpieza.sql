-- =====================================================
-- SCRIPT SEGURO: BACKUP + LIMPIEZA + CONSTRAINT
-- =====================================================

-- PASO 0: Crear tabla de respaldo (por seguridad)
CREATE TABLE respuestas_estudiante_backup AS 
SELECT * FROM respuestas_estudiante;

-- Verificar que el backup se creó
SELECT COUNT(*) as total_respaldos FROM respuestas_estudiante_backup;

-- PASO 1: Identificar duplicados
SELECT 
    intento_id, 
    pregunta_id, 
    COUNT(*) as cantidad_duplicados
FROM respuestas_estudiante 
GROUP BY intento_id, pregunta_id 
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicados DESC;

-- PASO 2: Mostrar qué se va a eliminar (sin eliminar aún)
WITH duplicados AS (
    SELECT 
        id,
        intento_id,
        pregunta_id,
        es_correcta,
        fecha_respuesta,
        ROW_NUMBER() OVER (
            PARTITION BY intento_id, pregunta_id 
            ORDER BY fecha_respuesta DESC, id DESC
        ) as rn
    FROM respuestas_estudiante
)
SELECT 
    'SE ELIMINARÁ' as accion,
    intento_id,
    pregunta_id,
    es_correcta,
    fecha_respuesta
FROM duplicados 
WHERE rn > 1
ORDER BY intento_id, pregunta_id;

-- PASO 3: Eliminar duplicados (manteniendo solo la más reciente)
WITH duplicados AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY intento_id, pregunta_id 
            ORDER BY fecha_respuesta DESC, id DESC
        ) as rn
    FROM respuestas_estudiante
)
DELETE FROM respuestas_estudiante 
WHERE id IN (
    SELECT id 
    FROM duplicados 
    WHERE rn > 1
);

-- PASO 4: Verificar que no quedan duplicados
SELECT 
    intento_id, 
    pregunta_id, 
    COUNT(*) as cantidad
FROM respuestas_estudiante 
GROUP BY intento_id, pregunta_id 
HAVING COUNT(*) > 1;

-- PASO 5: Agregar constraint único
ALTER TABLE respuestas_estudiante 
ADD CONSTRAINT unique_respuesta_por_intento_pregunta 
UNIQUE (intento_id, pregunta_id);

-- PASO 6: Verificar que el constraint se agregó
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'respuestas_estudiante'::regclass 
AND conname = 'unique_respuesta_por_intento_pregunta';

-- PASO 7: Comparar antes y después
SELECT 
    'ANTES (backup)' as estado,
    COUNT(*) as total_respuestas
FROM respuestas_estudiante_backup
UNION ALL
SELECT 
    'DESPUÉS (limpio)' as estado,
    COUNT(*) as total_respuestas
FROM respuestas_estudiante;
