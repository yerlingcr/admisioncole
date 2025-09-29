-- =====================================================
-- LIMPIAR DUPLICADOS Y AGREGAR CONSTRAINT ÚNICO
-- =====================================================

-- PASO 1: Identificar duplicados
SELECT 
    intento_id, 
    pregunta_id, 
    COUNT(*) as cantidad_duplicados
FROM respuestas_estudiante 
GROUP BY intento_id, pregunta_id 
HAVING COUNT(*) > 1
ORDER BY cantidad_duplicados DESC;

-- PASO 2: Eliminar duplicados, manteniendo solo la respuesta más reciente
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

-- PASO 3: Verificar que no quedan duplicados
SELECT 
    intento_id, 
    pregunta_id, 
    COUNT(*) as cantidad
FROM respuestas_estudiante 
GROUP BY intento_id, pregunta_id 
HAVING COUNT(*) > 1;

-- PASO 4: Agregar constraint único (ahora debería funcionar)
ALTER TABLE respuestas_estudiante 
ADD CONSTRAINT unique_respuesta_por_intento_pregunta 
UNIQUE (intento_id, pregunta_id);

-- PASO 5: Verificar que el constraint se agregó
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'respuestas_estudiante'::regclass 
AND conname = 'unique_respuesta_por_intento_pregunta';
