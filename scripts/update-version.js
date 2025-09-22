#!/usr/bin/env node

/**
 * Script para actualizar la versión del proyecto
 * Uso: node scripts/update-version.js [major|minor|patch] [mensaje]
 * 
 * Ejemplos:
 * node scripts/update-version.js patch "Corrección de bug en login"
 * node scripts/update-version.js minor "Nueva funcionalidad de reportes"
 * node scripts/update-version.js major "Refactorización completa"
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function getCurrentVersion() {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function updateVersion(type) {
  const currentVersion = getCurrentVersion();
  const [major, minor, patch] = currentVersion.split('.').map(Number);
  
  let newVersion;
  switch (type) {
    case 'major':
      newVersion = `${major + 1}.0.0`;
      break;
    case 'minor':
      newVersion = `${major}.${minor + 1}.0`;
      break;
    case 'patch':
      newVersion = `${major}.${minor}.${patch + 1}`;
      break;
    default:
      throw new Error('Tipo de versión inválido. Use: major, minor, o patch');
  }
  
  return newVersion;
}

function updatePackageJson(newVersion) {
  const packagePath = path.join(process.cwd(), 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageJson.version = newVersion;
  fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2) + '\n');
}

function updateLoginComponent(newVersion) {
  const loginPath = path.join(process.cwd(), 'src/components/Login.jsx');
  let content = fs.readFileSync(loginPath, 'utf8');
  
  // Actualizar la versión en el copyright
  content = content.replace(
    /© 2025 Sistema de Admisión, ver\. \d+\.\d+\.\d+/,
    `© 2025 Sistema de Admisión, ver. ${newVersion}`
  );
  
  fs.writeFileSync(loginPath, content);
}

function updateChangelog(newVersion, message, type) {
  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  let content = fs.readFileSync(changelogPath, 'utf8');
  
  const today = new Date().toISOString().split('T')[0];
  const versionSection = `## [${newVersion}] - ${today}`;
  
  // Determinar el tipo de cambio
  let changeType;
  switch (type) {
    case 'major':
      changeType = '### Cambiado';
      break;
    case 'minor':
      changeType = '### Agregado';
      break;
    case 'patch':
      changeType = '### Corregido';
      break;
  }
  
  const newEntry = `${versionSection}\n\n${changeType}\n- ${message}\n\n`;
  
  // Insertar después del header
  const headerEnd = content.indexOf('## [1.0.0]');
  if (headerEnd !== -1) {
    content = content.slice(0, headerEnd) + newEntry + content.slice(headerEnd);
  } else {
    content = newEntry + content;
  }
  
  fs.writeFileSync(changelogPath, content);
}

function main() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      log('❌ Uso: node scripts/update-version.js [major|minor|patch] [mensaje]', 'red');
      log('Ejemplo: node scripts/update-version.js patch "Corrección de bug en login"', 'yellow');
      process.exit(1);
    }
    
    const versionType = args[0];
    const message = args[1] || `Actualización ${versionType}`;
    
    if (!['major', 'minor', 'patch'].includes(versionType)) {
      log('❌ Tipo de versión inválido. Use: major, minor, o patch', 'red');
      process.exit(1);
    }
    
    const currentVersion = getCurrentVersion();
    const newVersion = updateVersion(versionType);
    
    log(`\n🚀 Actualizando versión...`, 'cyan');
    log(`   ${currentVersion} → ${newVersion}`, 'yellow');
    
    // Actualizar archivos
    updatePackageJson(newVersion);
    updateLoginComponent(newVersion);
    updateChangelog(newVersion, message, versionType);
    
    log(`\n✅ Versión actualizada exitosamente!`, 'green');
    log(`📝 Mensaje: ${message}`, 'blue');
    log(`📄 Archivos actualizados:`, 'blue');
    log(`   - package.json`, 'blue');
    log(`   - src/components/Login.jsx`, 'blue');
    log(`   - CHANGELOG.md`, 'blue');
    
    log(`\n💡 Próximos pasos:`, 'magenta');
    log(`   1. Revisar los cambios`, 'magenta');
    log(`   2. git add .`, 'magenta');
    log(`   3. git commit -m "v${newVersion}: ${message}"`, 'magenta');
    log(`   4. git tag v${newVersion}`, 'magenta');
    log(`   5. git push origin main --tags`, 'magenta');
    
  } catch (error) {
    log(`❌ Error: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
