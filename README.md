# 🎓 Sistema de Admisión 2025

Sistema de gestión de admisiones para centros educativos con sistema de quiz personalizado para estudiantes.

## 🚀 Características

- **Sistema de Login Personalizado** - Autenticación directa con Supabase (sin Supabase Auth)
- **Gestión de Roles** - Estudiante, Administrador, Profesor
- **Sistema de Quiz Inteligente** - Preguntas aleatorias con opciones aleatorizadas
- **Interfaz Moderna** - Diseño "Liquid Glass" con Tailwind CSS y DaisyUI
- **Responsive Design** - Optimizado para móvil y desktop
- **Gestión de Sesiones** - Persistencia de login con localStorage

## 🛠️ Tecnologías

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS 3.4 + DaisyUI
- **Backend:** Supabase (PostgreSQL)
- **Routing:** React Router DOM
- **Estado:** React Context API
- **Autenticación:** Sistema personalizado con Supabase

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuenta de Supabase

## 🚀 Instalación

1. **Clonar el repositorio:**
```bash
git clone https://github.com/yerlingcr/admision2025.git
cd admision2025
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Configurar variables de entorno:**
```bash
cp .env.example .env.local
```

Editar `.env.local` con tus credenciales de Supabase:
```env
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_anon_key_de_supabase
```

4. **Ejecutar en desarrollo:**
```bash
npm run dev
```

## 🗄️ Configuración de Base de Datos

### 1. Crear Tabla de Usuarios
```sql
CREATE TABLE usuarios (
  identificacion VARCHAR(20) PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  primer_apellido VARCHAR(100) NOT NULL,
  segundo_apellido VARCHAR(100),
  sexo VARCHAR(20) CHECK (sexo IN ('Femenino', 'Masculino')),
  fecha_nacimiento DATE,
  provincia VARCHAR(100),
  canton VARCHAR(100),
  distrito VARCHAR(100),
  otras_senas TEXT,
  rol VARCHAR(20) CHECK (rol IN ('Estudiante', 'Administrador', 'Profesor')),
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  estado VARCHAR(20) DEFAULT 'Activo'
);
```

### 2. Crear Tablas del Quiz
```sql
-- Tabla de preguntas
CREATE TABLE preguntas_quiz (
  id SERIAL PRIMARY KEY,
  pregunta TEXT NOT NULL,
  imagen_url VARCHAR(500),
  categoria VARCHAR(100),
  nivel_dificultad VARCHAR(20),
  orden_mostrar INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT true,
  usuario_creador VARCHAR(20) REFERENCES usuarios(identificacion),
  usuario_modificador VARCHAR(20) REFERENCES usuarios(identificacion),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de opciones de respuesta
CREATE TABLE opciones_respuesta (
  id SERIAL PRIMARY KEY,
  pregunta_id INTEGER REFERENCES preguntas_quiz(id),
  texto_opcion TEXT NOT NULL,
  es_correcta BOOLEAN DEFAULT false,
  orden_mostrar INTEGER DEFAULT 0,
  activa BOOLEAN DEFAULT true,
  usuario_creador VARCHAR(20) REFERENCES usuarios(identificacion),
  usuario_modificador VARCHAR(20) REFERENCES usuarios(identificacion),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de intentos de quiz
CREATE TABLE intentos_quiz (
  id SERIAL PRIMARY KEY,
  estudiante_id VARCHAR(20) REFERENCES usuarios(identificacion),
  estado VARCHAR(20) DEFAULT 'En Progreso',
  fecha_inicio TIMESTAMP DEFAULT NOW(),
  fecha_fin TIMESTAMP,
  tiempo_utilizado_segundos INTEGER,
  puntuacion INTEGER,
  preguntas_respondidas INTEGER,
  respuestas_correctas INTEGER
);

-- Tabla de respuestas del estudiante
CREATE TABLE respuestas_estudiante (
  id SERIAL PRIMARY KEY,
  intento_id INTEGER REFERENCES intentos_quiz(id),
  pregunta_id INTEGER REFERENCES preguntas_quiz(id),
  opcion_seleccionada_id INTEGER REFERENCES opciones_respuesta(id),
  tiempo_respuesta_segundos INTEGER,
  es_correcta BOOLEAN,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de configuración del quiz
CREATE TABLE configuracion_quiz (
  id SERIAL PRIMARY KEY,
  tiempo_limite_minutos INTEGER DEFAULT 5,
  total_preguntas INTEGER DEFAULT 5,
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Configurar RLS (Row Level Security)
```sql
-- Política para usuarios
CREATE POLICY "Permitir acceso a usuarios" ON usuarios FOR SELECT USING (true);

-- Política para intentos de quiz
CREATE POLICY "Permitir gestión de intentos" ON intentos_quiz 
FOR ALL USING (true);

-- Política para respuestas del estudiante
CREATE POLICY "Permitir gestión de respuestas" ON respuestas_estudiante 
FOR ALL USING (true);
```

## 👥 Usuarios de Prueba

### Administrador
- **Identificación:** ADMIN001
- **Contraseña:** admin123
- **Rol:** Administrador

### Estudiante
- **Identificación:** EST001
- **Contraseña:** est123
- **Rol:** Estudiante

## 🎯 Funcionalidades por Rol

### 👨‍🎓 Estudiante
- Pantalla de bienvenida personalizada
- Sistema de quiz con cronómetro
- Preguntas aleatorias con opciones aleatorizadas
- Navegación entre preguntas
- Resultados finales con puntuación

### 👨‍💼 Administrador
- Dashboard de configuración
- Gestión de preguntas y opciones
- Configuración del sistema

### 👨‍🏫 Profesor
- Dashboard específico (en desarrollo)

## 🎨 Características de UI/UX

- **Diseño "Liquid Glass"** - Efectos de transparencia y blur
- **Tema Responsive** - Adaptable a todos los dispositivos
- **Navegación Intuitiva** - Flujo claro y sencillo
- **Feedback Visual** - Indicadores de progreso y estado
- **Accesibilidad** - Contraste y legibilidad optimizados

## 📱 Responsive Design

- **Mobile First** - Optimizado para dispositivos móviles
- **Breakpoints** - Adaptable a tablets y desktop
- **Touch Friendly** - Interacciones táctiles optimizadas

## 🚀 Scripts Disponibles

```bash
npm run dev          # Desarrollo local
npm run build        # Build de producción
npm run preview      # Preview del build
npm run lint         # Linting del código
npm run lint:fix     # Auto-fix de linting
npm run format       # Formateo del código
npm run clean        # Limpieza de archivos
```

## 🔧 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── Login.jsx       # Sistema de autenticación
│   ├── Quiz.jsx        # Sistema de quiz
│   ├── QuizResult.jsx  # Resultados del quiz
│   └── ...
├── contexts/           # Contextos de React
│   └── AuthContext.jsx # Contexto de autenticación
├── services/           # Servicios de API
│   └── quizService.js  # Servicio del quiz
├── hooks/              # Hooks personalizados
├── utils/              # Utilidades
└── ...
```

## 🐛 Solución de Problemas

### Error de Conexión a Supabase
- Verificar variables de entorno
- Confirmar credenciales en Supabase
- Verificar políticas RLS

### Problemas de Autenticación
- Limpiar localStorage
- Verificar estructura de tabla usuarios
- Confirmar campos de contraseña

### Quiz No Funciona
- Verificar datos en tablas del quiz
- Confirmar relaciones entre tablas
- Revisar políticas RLS

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 👨‍💻 Autor

**Yerling** - [yerlingcr@gmail.com](mailto:yerlingcr@gmail.com)

## 🙏 Agradecimientos

- **Arakary Solutions** - Desarrollo y soporte técnico
- **Supabase** - Backend as a Service
- **Tailwind CSS** - Framework de estilos
- **DaisyUI** - Componentes UI

---

⭐ **Si te gusta este proyecto, dale una estrella en GitHub!**
