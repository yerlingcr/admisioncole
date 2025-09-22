# Changelog

Todos los cambios notables de este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.1] - 2025-09-19

### Corregido
- Limpieza completa de logs de debug del sistema y mejoras en el Ver Prueba de las Notas de Estudiantes de Dashboard de Profesor, donde se incluye la opción correcta y la que marcó el estudiante

## [1.0.2] - 2025-09-19

### Corregido
- Actualización patch

## [1.1.0] - 2025-09-22

### Agregado
- Nuevas funcionalidades: botones de imprimir en gráficos, búsqueda en estudiantes, mejoras en UI

## [1.1.1] - 2025-09-22

### Corregido
- Corrección del script de actualización de versión

## [1.1.2] - 2025-09-22

### Corregido
- Corrección del bug de categoría en formulario de preguntas

## [1.0.0] - 2025-09-18

### Agregado
- 🎯 **Sistema de Quiz completo** con preguntas aleatorias y opciones aleatorizadas
- 👥 **Gestión de usuarios** con roles (Administrador, Profesor, Estudiante)
- 📊 **Dashboard de estadísticas** con gráficos interactivos y reportes
- 📝 **Gestión de preguntas** con subida de imágenes y opciones múltiples
- 🏷️ **Gestión de categorías** con porcentaje de prueba configurable
- ⚙️ **Configuración del sistema** (tiempo límite, total de preguntas, intentos permitidos)
- 🔐 **Sistema de autenticación** con Supabase Auth
- 📱 **Interfaz responsive** con Tailwind CSS y DaisyUI
- 🎨 **Tema moderno** con paleta de colores tierra/dorado
- 📄 **Generación de PDF** para reportes individuales de estudiantes
- 📊 **Exportación a Excel** para reportes masivos
- 🔄 **SweetAlert2** para todas las alertas y confirmaciones
- 📈 **Gráficos interactivos** con Chart.js para estadísticas
- 🖼️ **Compresión de imágenes** automática para preguntas
- 🔍 **Búsqueda y filtros** en todas las secciones
- 📋 **Modal de detalles** para ver pruebas completas de estudiantes

### Funcionalidades por Rol

#### Administrador
- Dashboard principal con estadísticas generales
- Gestión completa de usuarios (crear, editar, eliminar, activar/desactivar)
- Gestión de preguntas con imágenes y opciones
- Gestión de categorías con porcentaje configurable
- Configuración del sistema de quiz
- Reportes detallados con exportación PDF/Excel
- Vista previa de pruebas individuales de estudiantes

#### Profesor
- Dashboard específico para su categoría asignada
- Gestión de preguntas solo para su categoría
- Gestión de estudiantes de su categoría
- Vista de notas y resultados de sus estudiantes
- Modal "Ver Prueba" para revisar respuestas de estudiantes
- Generación de PDF individual por estudiante

#### Estudiante
- Dashboard personalizado con información de la prueba
- Interfaz de quiz con timer automático
- Resultados detallados con análisis de respuestas
- Validación de estado activo/inactivo
- Persistencia de progreso en localStorage

### Técnico
- **Frontend**: React 19.1.1, Vite 7.1.2, Tailwind CSS 3.4.17
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI/UX**: DaisyUI 5.0.50, SweetAlert2 11.22.5
- **Gráficos**: Chart.js 4.5.0, react-chartjs-2 5.3.0
- **PDF**: jsPDF 3.0.2, jspdf-autotable 5.0.2
- **Excel**: xlsx 0.18.5
- **Imágenes**: browser-image-compression 2.0.2

### Base de Datos
- **Tablas principales**: usuarios, preguntas_quiz, opciones_respuesta, categorias_quiz, usuario_categorias, intentos_quiz, respuestas_estudiante, configuracion_quiz
- **Seguridad**: Row Level Security (RLS) implementado en todas las tablas
- **Storage**: Supabase Storage para imágenes de preguntas
- **Políticas**: Control de acceso basado en roles y categorías

### Despliegue
- **Plataforma**: Vercel con auto-deploy desde GitHub
- **Configuración**: Variables de entorno para Supabase
- **Routing**: SPA con vercel.json para client-side routing
- **Dominio**: Configurado para admisión 2025

---

## Próximas Versiones

### [1.0.1] - Próxima
- [ ] Correcciones menores de UI/UX
- [ ] Optimizaciones de rendimiento
- [ ] Mejoras en la experiencia móvil

### [1.1.0] - Futuro
- [ ] Notificaciones por email
- [ ] Exportación de reportes programada
- [ ] Dashboard de estadísticas mejorado
- [ ] Sistema de logs de auditoría

### [2.0.0] - Largo plazo
- [ ] Refactorización completa del frontend
- [ ] Migración a nueva arquitectura
- [ ] Integración con sistemas externos
- [ ] API REST completa

---

**Nota**: Este changelog se actualizará con cada nueva versión del sistema.
