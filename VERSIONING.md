# Sistema de Versionado

Este documento explica cómo funciona el sistema de versionado del Sistema de Admisión 2025.

## 📋 Versión Actual

**Versión**: 1.0.0  
**Fecha**: Septiembre 18, 2025  
**Estado**: Estable

## 🔄 Cómo Actualizar Versiones

### Comandos Rápidos

```bash
# Corrección de bugs (1.0.0 → 1.0.1)
npm run version:patch "Descripción del bug corregido"

# Nueva funcionalidad (1.0.0 → 1.1.0)
npm run version:minor "Descripción de la nueva funcionalidad"

# Cambio mayor (1.0.0 → 2.0.0)
npm run version:major "Descripción del cambio mayor"
```

### Comando Manual

```bash
# Uso directo del script
node scripts/update-version.js [tipo] [mensaje]

# Ejemplos
node scripts/update-version.js patch "Corrección de bug en login"
node scripts/update-version.js minor "Agregada funcionalidad de exportación"
node scripts/update-version.js major "Refactorización completa del sistema"
```

## 📝 Qué Actualiza el Script

Cuando ejecutas el comando de versionado, automáticamente se actualizan:

1. **`package.json`** - Campo `version`
2. **`src/components/Login.jsx`** - Copyright con versión
3. **`CHANGELOG.md`** - Nueva entrada con fecha y cambios

## 🎯 Tipos de Versión

### PATCH (Z) - Correcciones
- ✅ Corrección de bugs
- ✅ Mejoras menores de UI/UX
- ✅ Optimizaciones de rendimiento
- ✅ Corrección de textos
- ✅ Mejoras de accesibilidad

**Ejemplos:**
- `1.0.0` → `1.0.1` - "Corrección de bug en descarga de PDF"
- `1.0.1` → `1.0.2` - "Mejora en responsive del dashboard"

### MINOR (Y) - Nuevas Funcionalidades
- ✅ Nuevas funcionalidades compatibles
- ✅ Mejoras significativas de UI
- ✅ Nuevas opciones de configuración
- ✅ Integraciones nuevas

**Ejemplos:**
- `1.0.0` → `1.1.0` - "Agregado sistema de notificaciones"
- `1.1.0` → `1.2.0` - "Nueva funcionalidad de reportes programados"

### MAJOR (X) - Cambios Importantes
- ✅ Cambios incompatibles con versiones anteriores
- ✅ Refactorización completa
- ✅ Cambios en la base de datos
- ✅ Nuevas arquitecturas

**Ejemplos:**
- `1.0.0` → `2.0.0` - "Migración a nueva base de datos"
- `2.0.0` → `3.0.0` - "Refactorización completa del frontend"

## 📋 Proceso de Release

### 1. Desarrollo
```bash
# Trabajar en las funcionalidades
git checkout -b feature/nueva-funcionalidad
# ... desarrollar ...
git commit -m "feat: agregar nueva funcionalidad"
```

### 2. Testing
```bash
# Probar localmente
npm run dev
# ... pruebas ...
```

### 3. Versionado
```bash
# Actualizar versión
npm run version:minor "Nueva funcionalidad de reportes"
```

### 4. Release
```bash
# Commit y tag
git add .
git commit -m "v1.1.0: Nueva funcionalidad de reportes"
git tag v1.1.0
git push origin main --tags
```

### 5. Deploy
- Vercel detecta automáticamente el nuevo tag
- Se ejecuta el deploy automático
- La nueva versión está disponible

## 📊 Historial de Versiones

### Versión 1.0.0 (Septiembre 18, 2025)
- 🎯 Sistema completo de admisión
- 👥 Gestión de usuarios por roles
- 📊 Dashboard de estadísticas
- 📝 Gestión de preguntas y categorías
- 🔐 Sistema de autenticación
- 📱 Interfaz responsive
- 📄 Generación de PDF y Excel

## 🔮 Próximas Versiones

### Versión 1.0.1 (Próxima)
- [ ] Correcciones menores de UI/UX
- [ ] Optimizaciones de rendimiento
- [ ] Mejoras en la experiencia móvil

### Versión 1.1.0 (Futuro)
- [ ] Notificaciones por email
- [ ] Exportación programada de reportes
- [ ] Dashboard de estadísticas mejorado
- [ ] Sistema de logs de auditoría

### Versión 2.0.0 (Largo plazo)
- [ ] Refactorización completa
- [ ] Nueva arquitectura
- [ ] Integración con sistemas externos
- [ ] API REST completa

## 📚 Referencias

- [Semantic Versioning](https://semver.org/lang/es/)
- [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/)
- [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/)

---

**Nota**: Este sistema de versionado se actualiza automáticamente con cada release. Para más detalles, consulta el `CHANGELOG.md`.
