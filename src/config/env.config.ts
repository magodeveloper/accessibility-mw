/**
 * Environment Configuration Loader
 *
 * Carga el archivo .env correcto según el entorno (development/production)
 * siguiendo el mismo patrón que los microservicios .NET
 *
 * RESPONSABILIDAD ÚNICA:
 * - Cargar archivo .env.{NODE_ENV}
 * - Validar variables críticas básicas (PORT, HOST, NODE_ENV)
 * - Logging simple de configuración cargada
 *
 * IMPORTANTE:
 * - NO valida JWT (responsabilidad de jwt.config.ts)
 * - NO valida Gateway Secret (responsabilidad de gateway.config.ts)
 * - Solo carga .env.{NODE_ENV}, NO usa archivo .env base
 */

import * as dotenv from 'dotenv';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Carga la configuración de entorno desde el archivo específico del ambiente
 *
 * Estrategia (igual que microservicios .NET):
 * 1. Variables de entorno del sistema (más alta prioridad)
 * 2. .env.{NODE_ENV} (ÚNICO archivo cargado)
 *
 * NO se usa archivo .env base para evitar conflictos y mantener
 * separación clara entre desarrollo y producción
 *
 * DOCKER MODE: Si la variable DOCKER_ENV=true, usa variables de entorno del sistema
 * directamente sin requerir archivo .env (igual que los microservicios .NET)
 */
export function loadEnvironmentConfig(): void {
  // Determinar el entorno actual
  const nodeEnv = process.env.NODE_ENV || 'development';

  // Modo Docker: usar variables de entorno directamente
  const isDockerMode = process.env.DOCKER_ENV === 'true';

  if (isDockerMode) {
    console.log(`[INFO] Modo Docker detectado (DOCKER_ENV=true)`);
    console.log(`[INFO] Usando variables de entorno del sistema directamente`);
    console.log(`[INFO] Entorno: ${nodeEnv}`);
    return; // Variables de entorno ya están cargadas por Docker Compose
  }

  // Modo local: cargar desde archivo .env.{NODE_ENV}
  const rootDir = path.resolve(__dirname, '../..');
  const envFilePath = path.join(rootDir, `.env.${nodeEnv}`);

  if (!fs.existsSync(envFilePath)) {
    throw new Error(
      `[ERROR] Archivo de configuración .env.${nodeEnv} no encontrado.\n` +
        `   Ruta esperada: ${envFilePath}\n` +
        `   Asegúrate de tener el archivo .env.${nodeEnv} en la raíz del proyecto.\n` +
        `   Puedes usar .env.template como base.\n` +
        `   Para Docker: asegúrate de que DOCKER_ENV=true esté configurado.`
    );
  }

  console.log(
    `[EnvConfig] [LOADING] Cargando configuración de ${nodeEnv} desde: .env.${nodeEnv}`
  );
  dotenv.config({ path: envFilePath });

  // Validar configuración crítica
  validateCriticalConfig();

  console.log(`[EnvConfig] [OK] Configuración de entorno cargada correctamente`);
  console.log(`[EnvConfig] [INFO] Entorno: ${nodeEnv}`);
}

/**
 * Valida que las configuraciones críticas estén presentes
 */
function validateCriticalConfig(): void {
  const required = ['PORT', 'HOST', 'NODE_ENV'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(
      `[ERROR] Configuración incompleta. Variables requeridas faltantes: ${missing.join(
        ', '
      )}\n` +
        `   Verifica tu archivo .env.${process.env.NODE_ENV || 'development'}`
    );
  }
}
