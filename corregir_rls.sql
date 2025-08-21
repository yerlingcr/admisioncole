-- =====================================================
-- CORREGIR POLÍTICAS RLS PARA INTENTOS DE QUIZ
-- =====================================================

-- 1. Eliminar políticas existentes problemáticas
DROP POLICY IF EXISTS "Estudiantes ven sus intentos" ON intentos_quiz;
DROP POLICY IF EXISTS "Estudiantes ven sus respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Permitir insertar intentos" ON intentos_quiz;
DROP POLICY IF EXISTS "Permitir insertar respuestas" ON respuestas_estudiante;
DROP POLICY IF EXISTS "Permitir actualizar intentos" ON intentos_quiz;

-- 2. Crear políticas correctas para intentos_quiz
CREATE POLICY "Permitir insertar intentos de quiz" ON intentos_quiz
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir ver intentos propios" ON intentos_quiz
    FOR SELECT USING (true);

CREATE POLICY "Permitir actualizar intentos propios" ON intentos_quiz
    FOR UPDATE USING (true);

-- 3. Crear políticas correctas para respuestas_estudiante
CREATE POLICY "Permitir insertar respuestas" ON respuestas_estudiante
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Permitir ver respuestas propias" ON respuestas_estudiante
    FOR SELECT USING (true);

-- 4. Verificar que las políticas se crearon
SELECT 'Políticas de intentos_quiz:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'intentos_quiz';

SELECT 'Políticas de respuestas_estudiante:' as info;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'respuestas_estudiante';
