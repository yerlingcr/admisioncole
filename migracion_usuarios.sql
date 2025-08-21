-- =====================================================
-- MIGRACIÓN: AGREGAR CAMPOS DE USUARIO A LAS TABLAS
-- =====================================================

-- Agregar campos de usuario a preguntas_quiz
ALTER TABLE preguntas_quiz 
ADD COLUMN IF NOT EXISTS usuario_creador VARCHAR(20) REFERENCES usuarios(identificacion),
ADD COLUMN IF NOT EXISTS usuario_modificador VARCHAR(20) REFERENCES usuarios(identificacion);

-- Agregar campos de usuario a opciones_respuesta
ALTER TABLE opciones_respuesta 
ADD COLUMN IF NOT EXISTS usuario_creador VARCHAR(20) REFERENCES usuarios(identificacion),
ADD COLUMN IF NOT EXISTS usuario_modificador VARCHAR(20) REFERENCES usuarios(identificacion);

-- Actualizar las preguntas existentes con usuario creador
UPDATE preguntas_quiz 
SET usuario_creador = 'ADMIN001', 
    usuario_modificador = 'ADMIN001'
WHERE usuario_creador IS NULL;

-- Actualizar las opciones existentes con usuario creador
UPDATE opciones_respuesta 
SET usuario_creador = 'ADMIN001', 
    usuario_modificador = 'ADMIN001'
WHERE usuario_creador IS NULL;

-- Verificar que se actualizaron correctamente
SELECT 'Verificando preguntas actualizadas:' as info;
SELECT id, pregunta, usuario_creador, usuario_modificador FROM preguntas_quiz;

SELECT 'Verificando opciones actualizadas:' as info;
SELECT id, texto_opcion, usuario_creador, usuario_modificador FROM opciones_respuesta;
