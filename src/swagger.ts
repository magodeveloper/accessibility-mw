import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import { advancedLogger } from './services/logging.service';

// Cargar directamente el archivo YAML
// Intenta cargar desde múltiples ubicaciones:
// 1. dist/routes (producción/build)
// 2. src/routes (desarrollo con ts-node)
const possiblePaths = [
  path.resolve(process.cwd(), 'dist', 'routes', 'analyze.openapi.yaml'),
  path.resolve(process.cwd(), 'src', 'routes', 'analyze.openapi.yaml'),
];

let yamlSpec = {};
let loadedFrom = '';

for (const yamlPath of possiblePaths) {
  try {
    if (fs.existsSync(yamlPath)) {
      const yamlContent = fs.readFileSync(yamlPath, 'utf8');
      yamlSpec = yaml.load(yamlContent) as Record<string, unknown>;
      loadedFrom = yamlPath;
      advancedLogger.info('[OK] OpenAPI YAML loaded successfully', { yamlPath });
      break;
    }
  } catch (error) {
    advancedLogger.debug('[DEBUG] Failed to load from path', {
      yamlPath,
      error,
    });
  }
}

if (!loadedFrom) {
  advancedLogger.warn('[WARN] Could not load OpenAPI YAML file from any location', {
    attemptedPaths: possiblePaths,
  });
}

export const swaggerSpec = yamlSpec;
