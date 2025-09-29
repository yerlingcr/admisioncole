-- =====================================================
-- SOLUCIÓN SIMPLE: DESHABILITAR RLS TEMPORALMENTE
-- =====================================================

-- PASO 1: Deshabilitar RLS en respuestas_estudiante temporalmente
ALTER TABLE respuestas_estudiante DISABLE ROW LEVEL SECURITY;

-- PASO 2: Verificar que RLS está deshabilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'respuestas_estudiante';

-- PASO 3: Eliminar todas las políticas RLS (ya no son necesarias)
DROP POLICY IF EXISTS "Estudiantes_insertar_respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes_ver_respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes_actualizar_respuestas" ON respuestas_estudiante;

-- PASO 4: Verificar que no quedan políticas
SELECT policyname FROM pg_policies WHERE tablename = 'respuestas_estudiante';

-- PASO 5: Verificar que el constraint único sigue activo
SELECT 
    conname as constraint_name,
    contype as constraint_type
FROM pg_constraint 
WHERE conrelid = 'respuestas_estudiante'::regclass 
AND conname = 'unique_respuesta_por_intento_pregunta';
