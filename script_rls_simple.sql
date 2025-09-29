-- =====================================================
-- SCRIPT SIMPLE: ARREGLAR RLS BÁSICO
-- =====================================================

-- Eliminar políticas existentes problemáticas
DROP POLICY IF EXISTS "Estudiantes pueden insertar sus propias respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes pueden ver sus propias respuestas" ON respuestas_estudiante;

-- Crear política simple para INSERT
CREATE POLICY "Estudiantes pueden insertar respuestas" ON respuestas_estudiante
FOR INSERT 
TO authenticated
WITH CHECK (true);

-- Crear política simple para SELECT  
CREATE POLICY "Estudiantes pueden ver respuestas" ON respuestas_estudiante
FOR SELECT 
TO authenticated
USING (true);

-- Verificar que se crearon
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'respuestas_estudiante';
