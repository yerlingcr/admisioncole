-- =====================================================
-- ARREGLAR RLS POLICY PARA respuestas_estudiante
-- =====================================================

-- PASO 1: Verificar políticas RLS existentes
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'respuestas_estudiante';

-- PASO 2: Eliminar políticas existentes problemáticas
DROP POLICY IF EXISTS "Estudiantes pueden insertar sus propias respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Estudiantes pueden ver sus propias respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Profesores pueden ver todas las respuestas" ON respuestas_estudiante;

-- PASO 3: Crear políticas RLS correctas
-- Política para INSERT: Estudiantes pueden insertar respuestas en sus propios intentos
CREATE POLICY "Estudiantes pueden insertar respuestas en sus intentos" ON respuestas_estudiante
FOR INSERT 
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM intentos_quiz 
        WHERE intentos_quiz.id = respuestas_estudiante.intento_id 
        AND intentos_quiz.estudiante_id = auth.uid()::text
    )
);

-- Política para SELECT: Estudiantes pueden ver sus propias respuestas
CREATE POLICY "Estudiantes pueden ver sus propias respuestas" ON respuestas_estudiante
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM intentos_quiz 
        WHERE intentos_quiz.id = respuestas_estudiante.intento_id 
        AND intentos_quiz.estudiante_id = auth.uid()::text
    )
);

-- Política para UPDATE: Estudiantes pueden actualizar sus propias respuestas
CREATE POLICY "Estudiantes pueden actualizar sus propias respuestas" ON respuestas_estudiante
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

-- Política para profesores: Pueden ver todas las respuestas
CREATE POLICY "Profesores pueden ver todas las respuestas" ON respuestas_estudiante
FOR SELECT 
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM usuarios 
        WHERE usuarios.identificacion = auth.uid()::text 
        AND usuarios.rol = 'Profesor'
    )
);

-- PASO 4: Verificar que las políticas se crearon correctamente
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'respuestas_estudiante'
ORDER BY policyname;

-- PASO 5: Verificar que RLS está habilitado
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename = 'respuestas_estudiante';
