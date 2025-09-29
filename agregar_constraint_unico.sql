-- =====================================================
-- AGREGAR CONSTRAINT ÚNICO PARA EVITAR DUPLICADOS
-- =====================================================

-- Agregar constraint único en (intento_id, pregunta_id) para respuestas_estudiante
-- Esto permitirá que el upsert funcione correctamente

ALTER TABLE respuestas_estudiante 
ADD CONSTRAINT unique_respuesta_por_intento_pregunta 
UNIQUE (intento_id, pregunta_id);

-- Verificar que el constraint se agregó correctamente
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'respuestas_estudiante'::regclass 
AND conname = 'unique_respuesta_por_intento_pregunta';

-- Mostrar la estructura actualizada de la tabla
\d respuestas_estudiante;
