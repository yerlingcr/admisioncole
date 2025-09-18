-- Agregar columna porcentaje_prueba a la tabla categorias_quiz
ALTER TABLE categorias_quiz 
ADD COLUMN IF NOT EXISTS porcentaje_prueba INTEGER DEFAULT 0 CHECK (porcentaje_prueba >= 0 AND porcentaje_prueba <= 100);

-- Verificar que la columna se agregó correctamente
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'categorias_quiz'
ORDER BY ordinal_position;
