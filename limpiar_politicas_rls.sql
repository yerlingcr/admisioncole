-- =====================================================
-- LIMPIAR TODAS LAS POLÍTICAS RLS Y CREAR NUEVAS
-- =====================================================

-- PASO 1: Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Permitir insertar respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Permitir ver respuestas propias" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes pueden ver sus respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes pueden crear respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes pueden actualizar sus respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Administradores pueden eliminar respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes pueden insertar respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes pueden ver respuestas" ON respuestas_estudiante;

-- PASO 2: Crear UNA SOLA política por acción (sin conflictos)

-- Política para INSERT: Estudiantes pueden insertar respuestas
CREATE POLICY "Estudiantes_insertar_respuestas" ON respuestas_estudiante
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM intentos_quiz 
        WHERE intentos_quiz.id = respuestas_estudiante.intento_id 
        AND intentos_quiz.estudiante_id = auth.uid()::text
    )
);

-- Política para SELECT: Estudiantes pueden ver sus respuestas
CREATE POLICY "Estudiantes_ver_respuestas" ON respuestas_estudiante
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM intentos_quiz 
        WHERE intentos_quiz.id = respuestas_estudiante.intento_id 
        AND intentos_quiz.estudiante_id = auth.uid()::text
    )
);

-- Política para UPDATE: Estudiantes pueden actualizar sus respuestas
CREATE POLICY "Estudiantes_actualizar_respuestas" ON respuestas_estudiante
FOR UPDATE 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM intentos_quiz 
        WHERE intentos_quiz.id = respuestas_estudiante.intento_id 
        AND intentos_quiz.estudiante_id = auth.uid()::text
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM intentos_quiz 
        WHERE intentos_quiz.id = respuestas_estudiante.intento_id 
        AND intentos_quiz.estudiante_id = auth.uid()::text
    )
);

-- PASO 3: Verificar que solo quedan 3 políticas
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'respuestas_estudiante'
ORDER BY cmd, policyname;
