/**
 * Global teardown para tests de integración
 * Limpia los servicios mock si fueron usados
 */

import { teardownServices } from './mock-services';

export default async function globalTeardown(): Promise<void> {
  const servicesConfig = (globalThis as any).__SERVICES_CONFIG__;

  if (servicesConfig?.usingMocks) {
    console.log('\n🧹 Cleaning up mock services...\n');
    await teardownServices(true);
  }

  console.log('✅ Teardown complete\n');
}
