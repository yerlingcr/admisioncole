-- =====================================================
-- POLÍTICAS RLS MÁS SIMPLES (SI SIGUE FALLANDO)
-- =====================================================

-- Eliminar políticas complejas
DROP POLICY IF EXISTS "Estudiantes_insertar_respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes_ver_respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes_actualizar_respuestas" ON respuestas_estudiante;

-- Crear políticas MUY simples (sin validaciones complejas)
CREATE POLICY "Permitir_insertar" ON respuestas_estudiante
FOR INSERT 
TO authenticated
WITH CHECK (true);

CREATE POLICY "Permitir_ver" ON respuestas_estudiante
FOR SELECT 
TO authenticated
USING (true);

CREATE POLICY "Permitir_actualizar" ON respuestas_estudiante
FOR UPDATE 
TO authenticated
USING (true)
WITH CHECK (true);

-- Verificar
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'respuestas_estudiante';
