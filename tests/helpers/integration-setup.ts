/**
 * Global setup para tests de integración
 * Detecta automáticamente si usar servicios reales o mocks
 */

import { setupServices } from './mock-services';

let servicesConfig: { usingMocks: boolean } | null = null;

export default async function globalSetup(): Promise<void> {
  console.log('\n🔧 Setting up integration test environment...\n');

  // Check if we should use real services (CI environment)
  const useRealServices = process.env.CI === 'true' || process.env.USE_REAL_SERVICES === 'true';

  if (useRealServices) {
    console.log('🔗 CI environment detected - will attempt to use real services');
    console.log('⚠️  Make sure docker-compose.ci.yml is running!\n');
    servicesConfig = { usingMocks: false };
  } else {
    console.log('💻 Local environment detected - using mock services\n');
    servicesConfig = await setupServices();
  }

  // Store config for teardown
  (globalThis as any).__SERVICES_CONFIG__ = servicesConfig;
}
