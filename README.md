# Sistema de Admisión 2025

Sistema completo de gestión de admisión para instituciones educativas, desarrollado con React.js y Supabase.

## 🚀 Características Principales

### Para Estudiantes
- **Dashboard Personalizado**: Información personal, oportunidades disponibles e historial de intentos
- **Quiz Dinámico**: Preguntas aleatorias por categoría asignada, opciones aleatorizadas
- **Resultados Detallados**: Puntuación, tiempo utilizado y análisis de respuestas
- **Gestión de Intentos**: Control automático de oportunidades disponibles

### Para Administradores
- **Dashboard Principal**: Estadísticas generales del sistema
- **Gestión de Usuarios**: Crear, editar y asignar categorías a estudiantes
- **Gestión de Preguntas**: Crear, editar preguntas con imágenes y opciones múltiples
- **Gestión de Categorías**: Administrar categorías de preguntas
- **Configuración**: Ajustar tiempo límite, total de preguntas e intentos permitidos

## 🛠️ Tecnologías Utilizadas

- **Frontend**: React.js 18, Vite, Tailwind CSS, DaisyUI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Autenticación**: Supabase Auth con roles (Administrador, Estudiante, Profesor)
- **Almacenamiento**: Supabase Storage para imágenes
- **UI/UX**: SweetAlert2 para alertas, React Router para navegación

## 📁 Estructura del Proyecto

```
admision2025/
├── public/
│   ├── img/
│   │   ├── bg/                    # Imágenes de fondo
│   │   │   ├── 01.jpg
│   │   │   └── escudovok.png
│   │   ├── ico/                   # Iconos y favicon
│   │   │   ├── admision2025.ico
│   │   │   └── admision2025.png
│   │   └── questions/             # Imágenes de preguntas
│   └── index.html
├── src/
│   ├── components/                # Componentes React
│   │   ├── AdminDashboard.jsx     # Dashboard principal de administración
│   │   ├── ConfiguracionPrueba.jsx # Configuración del quiz
│   │   ├── ErrorBoundary.jsx     # Manejo de errores
│   │   ├── EstudianteDashboard.jsx # Dashboard del estudiante
│   │   ├── GestionCategorias.jsx # Gestión de categorías
│   │   ├── GestionPreguntas.jsx  # Gestión de preguntas
│   │   ├── GestionUsuarios.jsx  # Gestión de usuarios
│   │   ├── LoadingSpinner.jsx    # Componente de carga
│   │   ├── Login.jsx             # Página de inicio de sesión
│   │   ├── ProtectedRoute.jsx    # Protección de rutas
│   │   ├── Quiz.jsx              # Interfaz del quiz
│   │   ├── QuizResult.jsx        # Resultados del quiz
│   │   └── ThemeToggle.jsx       # Toggle de tema
│   ├── contexts/
│   │   └── AuthContext.jsx       # Contexto de autenticación
│   ├── hooks/
│   │   └── useLocalStorage.js    # Hook para localStorage
│   ├── lib/
│   │   ├── supabase.js           # Configuración de Supabase
│   │   └── supabaseConfig.js     # Configuración adicional
│   ├── services/                 # Servicios de datos
│   │   ├── configuracionService.js # Configuración del quiz
│   │   ├── geografiaService.js   # Datos geográficos de Costa Rica
│   │   ├── institucionService.js # Información institucional
│   │   ├── quizService.js        # Lógica del quiz
│   │   ├── storageService.js     # Gestión de archivos
│   │   └── usuarioCategoriasService.js # Asignación de categorías
│   ├── utils/
│   │   └── validation.js         # Utilidades de validación
│   ├── App.jsx                   # Componente principal
│   ├── main.jsx                  # Punto de entrada
│   └── index.css                 # Estilos globales
├── database_setup.sql            # Script de configuración inicial
├── crear_tabla_usuario_categorias.sql # Script de tabla de categorías
├── package.json                  # Dependencias del proyecto
├── tailwind.config.js           # Configuración de Tailwind
├── vite.config.js               # Configuración de Vite
└── README.md                    # Este archivo
```

## 🗄️ Base de Datos

### Tablas Principales
- **usuarios**: Información de usuarios (administradores, estudiantes, profesores)
- **preguntas_quiz**: Preguntas del quiz con imágenes opcionales
- **opciones_respuesta**: Opciones múltiples para cada pregunta
- **categorias_quiz**: Categorías disponibles para las preguntas
- **usuario_categorias**: Asignación de categorías a usuarios
- **intentos_quiz**: Registro de intentos de los estudiantes
- **respuestas_estudiante**: Respuestas individuales de cada intento
- **configuracion_quiz**: Configuración global del sistema
- **informacion_institucional**: Datos de la institución educativa

### Características de Seguridad
- **Row Level Security (RLS)**: Políticas de seguridad a nivel de fila
- **Autenticación por roles**: Control de acceso basado en roles
- **Validación de datos**: Validaciones tanto en frontend como backend

## 🎨 Paleta de Colores

El sistema utiliza una paleta de colores consistente:
- **Primario**: Marrón/Dorado (`#f4b100`, `#amber-600`)
- **Secundario**: Grises (`#gray-50`, `#gray-800`)
- **Acentos**: Verde para respuestas correctas, Rojo para incorrectas
- **Fondo**: Gradientes suaves con tonos tierra

## 🚀 Instalación y Configuración

### Prerrequisitos
- Node.js 18+
- npm o yarn
- Cuenta de Supabase

### Pasos de Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repository-url>
   cd admision2025
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   cp env.example .env.local
   ```
   Editar `.env.local` con tus credenciales de Supabase:
   ```
   VITE_SUPABASE_URL=tu_supabase_url
   VITE_SUPABASE_ANON_KEY=tu_supabase_anon_key
   ```

### 🚀 Despliegue en Vercel

1. **Conectar repositorio a Vercel**
   - Ve a [vercel.com](https://vercel.com)
   - Importa el repositorio `yerlingcr/admision2025`

2. **Configurar variables de entorno en Vercel**
   - En el dashboard de Vercel, ve a tu proyecto
   - Settings → Environment Variables
   - Agrega las siguientes variables:
     ```
     VITE_SUPABASE_URL = https://tu-proyecto.supabase.co
     VITE_SUPABASE_ANON_KEY = tu_clave_anonima_de_supabase
     ```

3. **Hacer deploy**
   - Vercel detectará automáticamente que es un proyecto Vite
   - El deploy se realizará automáticamente
   - Si las variables no están configuradas, verás una pantalla de configuración

4. **Configurar la base de datos**
   - Ejecutar `database_setup.sql` en tu instancia de Supabase
   - Ejecutar `crear_tabla_usuario_categorias.sql` si es necesario

5. **Iniciar el servidor de desarrollo**
   ```bash
   npm run dev
   ```

## 📱 Funcionalidades Detalladas

### Sistema de Quiz
- **Preguntas Aleatorias**: Algoritmo Fisher-Yates para aleatorización robusta
- **Opciones Aleatorizadas**: Las opciones de respuesta se mezclan automáticamente
- **Categorización**: Cada estudiante ve solo preguntas de su categoría asignada
- **Control de Tiempo**: Timer automático con límite configurable
- **Validación**: Verificación de disponibilidad de preguntas por categoría

### Gestión de Usuarios
- **Campos Opcionales**: Provincia, Cantón, Distrito y Email son opcionales
- **Asignación de Categorías**: Un estudiante puede tener una sola categoría
- **Reset de Oportunidades**: Los administradores pueden resetear intentos de estudiantes
- **Datos Geográficos**: Integración con datos completos de Costa Rica

### Gestión de Contenido
- **Subida de Imágenes**: Compresión automática y validación de formatos
- **Eliminación Inteligente**: Las imágenes canceladas se eliminan del storage
- **Categorización Dinámica**: Las categorías se cargan desde la base de datos
- **Validación de Formularios**: Validación en tiempo real

## 🔧 Scripts Disponibles

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Construcción para producción
npm run preview      # Vista previa de la construcción
npm run lint         # Linter de código
npm run lint:fix     # Corregir errores de linting automáticamente
npm run format       # Formatear código con Prettier
npm run clean        # Limpiar dependencias y reinstalar

# Sistema de Versionado
npm run version:patch "Descripción del bug corregido"
npm run version:minor "Descripción de la nueva funcionalidad"
npm run version:major "Descripción del cambio mayor"
```

## 🐛 Solución de Problemas

### Problemas Comunes
1. **Error de conexión a Supabase**: Verificar variables de entorno
2. **Imágenes no cargan**: Verificar políticas RLS del storage
3. **Quiz no inicia**: Verificar que el estudiante tenga categoría asignada
4. **Permisos denegados**: Verificar políticas RLS de las tablas

### Logs de Debug
El sistema incluye logs detallados en la consola del navegador para facilitar el debugging.

## 📋 Sistema de Versionado

El proyecto utiliza **Semantic Versioning** (SemVer) para el control de versiones:

- **MAJOR (X)**: Cambios incompatibles con versiones anteriores
- **MINOR (Y)**: Nuevas funcionalidades compatibles hacia atrás  
- **PATCH (Z)**: Correcciones de bugs

### Comandos de Versionado

```bash
# Corrección de bugs (1.0.0 → 1.0.1)
npm run version:patch "Descripción del bug corregido"

# Nueva funcionalidad (1.0.0 → 1.1.0)
npm run version:minor "Descripción de la nueva funcionalidad"

# Cambio mayor (1.0.0 → 2.0.0)
npm run version:major "Descripción del cambio mayor"
```

### Documentación

- **`CHANGELOG.md`**: Historial completo de cambios
- **`VERSIONING.md`**: Documentación detallada del sistema
- **`scripts/update-version.js`**: Script automatizado de versionado

## 📄 Licencia

Este proyecto es privado y está destinado para uso interno de la institución educativa.

## 👥 Contribuidores

- **Desarrollador Principal**: Sistema desarrollado para admisión 2025
- **Institución**: Centro Educativo con especialidad en Secretariado Ejecutivo

---

**Última actualización**: Septiembre 2025
**Versión**: 1.0.0