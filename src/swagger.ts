import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';
import { advancedLogger } from './services/logging.service';

// Cargar directamente el archivo YAML
// En el contenedor Docker, siempre usamos dist/routes ya que src/ no se copia
const yamlPath = path.resolve(
  process.cwd(),
  'dist',
  'routes',
  'analyze.openapi.yaml'
);

let yamlSpec = {};
try {
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  yamlSpec = yaml.load(yamlContent) as Record<string, unknown>;
  advancedLogger.info('✅ OpenAPI YAML loaded successfully', { yamlPath });
} catch (error) {
  advancedLogger.warn('❌ Could not load OpenAPI YAML file', {
    yamlPath,
    error,
  });
}

export const swaggerSpec = yamlSpec;
