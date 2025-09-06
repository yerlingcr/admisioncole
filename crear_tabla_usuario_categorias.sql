-- Crear tabla para asignar categorías específicas a usuarios
CREATE TABLE IF NOT EXISTS usuario_categorias (
    id SERIAL PRIMARY KEY,
    usuario_id VARCHAR(20) NOT NULL,
    categoria VARCHAR(50) NOT NULL,
    activa BOOLEAN DEFAULT true,
    usuario_creador VARCHAR(100) DEFAULT 'SISTEMA',
    usuario_modificador VARCHAR(100) DEFAULT 'SISTEMA',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Clave única para evitar duplicados
    UNIQUE(usuario_id, categoria),
    
    -- Referencia a usuarios (opcional, para integridad)
    FOREIGN KEY (usuario_id) REFERENCES usuarios(identificacion) ON DELETE CASCADE
);

-- Crear trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_usuario_categorias_updated_at 
    BEFORE UPDATE ON usuario_categorias 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_usuario_categorias_usuario_id ON usuario_categorias(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuario_categorias_categoria ON usuario_categorias(categoria);
CREATE INDEX IF NOT EXISTS idx_usuario_categorias_activa ON usuario_categorias(activa);

-- Políticas RLS (Row Level Security)
ALTER TABLE usuario_categorias ENABLE ROW LEVEL SECURITY;

-- Política para lectura (todos pueden leer)
CREATE POLICY "Permitir lectura de usuario_categorias" ON usuario_categorias
    FOR SELECT USING (true);

-- Política para inserción (solo administradores)
CREATE POLICY "Permitir inserción de usuario_categorias" ON usuario_categorias
    FOR INSERT WITH CHECK (true);

-- Política para actualización (solo administradores)
CREATE POLICY "Permitir actualización de usuario_categorias" ON usuario_categorias
    FOR UPDATE USING (true);

-- Política para eliminación (solo administradores)
CREATE POLICY "Permitir eliminación de usuario_categorias" ON usuario_categorias
    FOR DELETE USING (true);

-- Insertar algunas categorías de ejemplo para usuarios existentes
-- (Opcional: puedes comentar esto si no quieres datos de ejemplo)
-- Solo insertar si los usuarios existen en la tabla usuarios
INSERT INTO usuario_categorias (usuario_id, categoria, usuario_creador) 
SELECT 'EST001', 'Geografía', 'SISTEMA'
WHERE EXISTS (SELECT 1 FROM usuarios WHERE identificacion = 'EST001')
ON CONFLICT (usuario_id, categoria) DO NOTHING;

INSERT INTO usuario_categorias (usuario_id, categoria, usuario_creador) 
SELECT 'EST001', 'Historia', 'SISTEMA'
WHERE EXISTS (SELECT 1 FROM usuarios WHERE identificacion = 'EST001')
ON CONFLICT (usuario_id, categoria) DO NOTHING;

INSERT INTO usuario_categorias (usuario_id, categoria, usuario_creador) 
SELECT 'EST002', 'Ciencia', 'SISTEMA'
WHERE EXISTS (SELECT 1 FROM usuarios WHERE identificacion = 'EST002')
ON CONFLICT (usuario_id, categoria) DO NOTHING;

INSERT INTO usuario_categorias (usuario_id, categoria, usuario_creador) 
SELECT 'EST002', 'Matemáticas', 'SISTEMA'
WHERE EXISTS (SELECT 1 FROM usuarios WHERE identificacion = 'EST002')
ON CONFLICT (usuario_id, categoria) DO NOTHING;

-- Comentarios sobre la tabla
COMMENT ON TABLE usuario_categorias IS 'Tabla para asignar categorías específicas de preguntas a usuarios';
COMMENT ON COLUMN usuario_categorias.usuario_id IS 'Identificación del usuario';
COMMENT ON COLUMN usuario_categorias.categoria IS 'Categoría de preguntas asignada';
COMMENT ON COLUMN usuario_categorias.activa IS 'Si la asignación está activa';
COMMENT ON COLUMN usuario_categorias.usuario_creador IS 'Usuario que creó la asignación';
COMMENT ON COLUMN usuario_categorias.usuario_modificador IS 'Usuario que modificó por última vez';
