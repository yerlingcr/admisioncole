-- =====================================================
-- MIGRACIÓN COMPLETA: estudiante_id VARCHAR → UUID
-- =====================================================

-- PASO 1: Crear backup completo de intentos_quiz
CREATE TABLE intentos_quiz_backup AS 
SELECT * FROM intentos_quiz;

-- Verificar que el backup se creó
SELECT COUNT(*) as total_backup FROM intentos_quiz_backup;

-- PASO 2: Analizar datos existentes
SELECT 
    estudiante_id,
    COUNT(*) as cantidad_intentos
FROM intentos_quiz 
GROUP BY estudiante_id
ORDER BY cantidad_intentos DESC;

-- PASO 3: Verificar usuarios en auth.users
SELECT 
    id as uuid,
    email,
    raw_user_meta_data
FROM auth.users 
WHERE raw_user_meta_data->>'identificacion' IN (
    SELECT DISTINCT estudiante_id FROM intentos_quiz
);

-- PASO 4: Crear tabla temporal para mapear estudiante_id → UUID
CREATE TEMP TABLE mapeo_estudiantes AS
SELECT 
    iq.estudiante_id,
    au.id as uuid_estudiante
FROM intentos_quiz iq
LEFT JOIN auth.users au ON au.raw_user_meta_data->>'identificacion' = iq.estudiante_id;

-- Mostrar mapeo
SELECT * FROM mapeo_estudiantes;
